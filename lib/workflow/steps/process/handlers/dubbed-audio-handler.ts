/**
 * 配音分镜处理器
 * 处理需要配音的分镜（音画同步处理）
 * 支持分镜级重试和容错
 * - 使用本地 FFmpeg 替代 NCA API
 */

// 统一音频采样率（与 Fish Audio 输出一致，44100Hz）
// 确保所有分镜输出相同采样率，避免拼接时音频错乱
const AUDIO_SAMPLE_RATE = 44100

import * as path from 'node:path'

import { nanoid } from 'nanoid'
import { CONFIG_DEFAULTS } from '@/lib/config/defaults'
import { configsRepo } from '@/lib/db/core/configs'
import * as jobScenesDb from '@/lib/db/tables/job-scenes'
import * as jobStepHistoryDb from '@/lib/db/tables/job-step-history'
import { trackFFmpegCall } from '@/lib/media'
import { trimJumpCuts } from '@/lib/media/operations/trim-jumpcuts'
import {
  generateSegmentedASS,
  getFontPath,
  saveSubtitleFile,
  splitIntoSegments,
} from '@/lib/subtitle'
import { logger } from '@/lib/utils/logger'
import { isRetryableError, withRetry } from '@/lib/utils/retry'
import { resolveTTSConfig } from '@/lib/workflow/tts-config-resolver'
import type { WorkflowContext } from '@/lib/workflow/types'
import type { JobScene, ProcessedScene } from '@/types'
import { TTS_CONFIG_KEYS, TTS_DEFAULTS } from '@/types/ai/tts'
import { analyzeAllCandidates, selectBestAudioMatch } from '../utils/audio-matcher'

/**
 * 分镜处理结果（支持容错）
 */
export interface SceneProcessResult {
  success: boolean
  scene_id: string
  data?: ProcessedScene
  error?: string
  retryCount?: number
}

/**
 * 分镜重试配置
 */
const SCENE_RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: 2000,
  backoff: 2,
}

/**
 * 音频候选类型
 */
interface AudioCandidate {
  audioUrl: string
  duration?: number
}

/**
 * 检查中止信号，如果已中止则抛出错误
 * 错误消息统一为 '任务已中止'，便于上层识别和处理
 */
function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('任务已中止')
  }
}

/**
 * 处理配音分镜（带重试和容错）
 * 返回 SceneProcessResult 而非直接抛出异常
 */
export async function processDubbedScene(
  ctx: WorkflowContext,
  scene: JobScene,
  videoDuration: number,
  signal?: AbortSignal,
): Promise<SceneProcessResult> {
  const sceneId = scene.id
  let retryCount = 0

  try {
    const result = await withRetry(
      async () => {
        // 检查中止信号
        if (signal?.aborted) throw new Error('任务已中止')
        return await processDubbedSceneCore(ctx, scene, videoDuration, signal)
      },
      {
        ...SCENE_RETRY_CONFIG,
        shouldRetry: (error) => {
          if (signal?.aborted) return false
          return isRetryableError(error)
        },
        onRetry: (attempt, error) => {
          retryCount = attempt
          logger.warn(`[配音分镜] ${sceneId} 第 ${attempt} 次重试`, {
            error: error instanceof Error ? error.message : String(error),
          })
        },
      },
    )

    return { success: true, scene_id: sceneId, data: result, retryCount }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn(`[配音分镜] ${sceneId} 处理失败（已重试 ${retryCount} 次），将跳过`, {
      error: message,
    })

    return { success: false, scene_id: sceneId, error: message, retryCount }
  }
}

/**
 * 配音分镜核心处理逻辑
 *
 * 流程：读取预生成旁白 → 语音合成 → 音频选择 → 视频调速 → 音画合成
 * 旁白已在 batch_generate_narrations 步骤中批量生成，存储在 job_scenes 表
 */
async function processDubbedSceneCore(
  ctx: WorkflowContext,
  scene: JobScene,
  videoDuration: number,
  signal?: AbortSignal,
): Promise<ProcessedScene> {
  const sceneId = scene.id

  // ✅ 检查中止信号（开始前）
  checkAborted(signal)

  // 1. 读取预生成的旁白（来自 batch_generate_narrations 步骤）
  const narrations = jobScenesDb.getNarrations(sceneId)
  if (!narrations) {
    throw new Error(
      `未找到分镜 ${sceneId} 的预生成旁白，请确保 batch_generate_narrations 步骤已完成`,
    )
  }

  const narrationCandidates = [
    narrations.narration_v1,
    narrations.narration_v2,
    narrations.narration_v3,
  ]

  // 验证旁白内容
  if (narrationCandidates.some((n) => !n || n.trim() === '')) {
    throw new Error(`分镜 ${sceneId} 的旁白内容不完整`)
  }

  logger.info(`[配音分镜] ${sceneId} 读取预生成旁白`, {
    v1_length: narrations.narration_v1.length,
    v2_length: narrations.narration_v2.length,
    v3_length: narrations.narration_v3.length,
  })

  // 2. 批量合成音频（使用 TTS Manager，根据用户配置选择 Provider）
  // ✅ 检查中止信号（TTS 调用前）
  checkAborted(signal)

  // 从系统 TTS 配置获取音色 ID
  const ttsConfig = resolveTTSConfig()
  const resolvedVoiceId = ttsConfig.voiceId
  const sceneIndex = scene.scene_index

  // 构建音频输出路径（按分镜组织：scenes/scene-{index}/audio/v{1,2,3}.mp3）
  const audioOutputPaths = [1, 2, 3].map((version) =>
    ctx.services.ffmpeg.tempManager.getAudioPath(sceneIndex, version),
  )

  const audioOptions = {
    voice: {
      voiceId: resolvedVoiceId,
      rate: ttsConfig.rate,
    },
    jobId: ctx.jobId,
    sceneId: sceneId,
    outputPaths: audioOutputPaths,
  }

  const audios = await ctx.services.tts.generateMultiple(narrationCandidates, audioOptions)

  // ✅ 检查中止信号（TTS 调用后）
  checkAborted(signal)

  // 3. 获取音频元数据（使用本地 FFmpeg）
  await Promise.all(
    audios.map(async (audio: AudioCandidate, audioIndex: number) => {
      try {
        const metadata = await ctx.services.ffmpeg.getMetadata(audio.audioUrl)
        if (metadata.duration && Number.isFinite(metadata.duration)) {
          audios[audioIndex].duration = metadata.duration
        }
        return metadata.duration
      } catch (error: unknown) {
        // 记录错误但不中断流程
        logger.warn(`获取音频元数据失败: v${audioIndex + 1}`, { error })
        return null
      }
    }),
  )

  // 记录 synthesize_audio 子步骤
  await recordSubStep(
    ctx,
    'synthesize_audio',
    sceneId,
    {
      narration_candidates: narrationCandidates,
      voice_id: resolvedVoiceId,
      platform: ctx.features.platform,
    },
    {
      audio_candidates: audios.map((audio: AudioCandidate, i: number) => ({
        version: i + 1,
        audio_url: audio.audioUrl,
        duration: audio.duration,
      })),
    },
  )

  // 4. 跳切修剪（v12.2 新增）
  // ✅ 检查中止信号（跳切修剪前）
  checkAborted(signal)

  const splitVideoUrl = scene.split_video_url
  if (!splitVideoUrl) throw new Error('split_video_url 不存在')

  // 执行跳切检测和修剪
  const trimOutputPath = ctx.services.ffmpeg.tempManager.getTrimmedPath(sceneIndex)
  const trimResult = await trimJumpCuts(
    splitVideoUrl,
    trimOutputPath,
    ctx.services.ffmpeg.getConfig(),
    { signal },
  )

  // 使用修剪后的视频和时长
  const videoToProcess = trimResult.outputPath
  const actualVideoDuration = trimResult.newDuration

  // 保存修剪结果到数据库
  if (!trimResult.skipped) {
    jobScenesDb.updateTrimResult(sceneId, {
      trimmed_video_url: trimResult.outputPath,
      trimmed_start: trimResult.trimmedStart,
      trimmed_end: trimResult.trimmedEnd,
      trimmed_duration: trimResult.newDuration,
    })
  }

  // 记录 trim_jumpcuts 子步骤
  await recordSubStep(
    ctx,
    'trim_jumpcuts',
    sceneId,
    {
      input_video: splitVideoUrl,
      threshold: 8,
      scan_range: 1.3,
    },
    {
      skipped: trimResult.skipped,
      original_duration: trimResult.originalDuration,
      trimmed_start: trimResult.trimmedStart,
      trimmed_end: trimResult.trimmedEnd,
      new_duration: trimResult.newDuration,
      scene_changes_count: trimResult.sceneChanges.length,
      output_video: trimResult.outputPath,
    },
  )

  logger.info('[配音分镜] 跳切修剪完成', {
    sceneId,
    skipped: trimResult.skipped,
    originalDuration: trimResult.originalDuration.toFixed(3),
    trimmedStart: trimResult.trimmedStart.toFixed(3),
    trimmedEnd: trimResult.trimmedEnd.toFixed(3),
    newDuration: trimResult.newDuration.toFixed(3),
    sceneChanges: trimResult.sceneChanges.length,
  })

  // 5. 选择最佳音频方案（基于修剪后的视频时长）
  const bestMatch = selectBestAudioMatch(actualVideoDuration, audios)
  const allCandidatesAnalysis = analyzeAllCandidates(actualVideoDuration, audios)

  // 记录 select_best_match 子步骤
  await recordSubStep(
    ctx,
    'select_best_match',
    sceneId,
    {
      video_duration: actualVideoDuration,
      original_duration: videoDuration,
      trimmed: !trimResult.skipped,
      audio_candidates: audios.map((a: AudioCandidate) => ({
        url: a.audioUrl,
        duration: a.duration,
      })),
    },
    {
      selected_index: bestMatch.audioIndex,
      selected_audio_url: bestMatch.audio.audioUrl,
      selected_audio_duration: bestMatch.audio.duration,
      speed_factor: bestMatch.speedFactor,
      adjusted_speed_factor: bestMatch.adjustedSpeedFactor,
      loop_count: bestMatch.loopCount,
      need_trim: bestMatch.needTrim,
      all_candidates_analysis: allCandidatesAnalysis,
    },
  )

  // 6. 处理速度因子边界情况（视频过短/过长）
  // ✅ 检查中止信号（边界处理前）
  checkAborted(signal)

  let videoForSpeed = videoToProcess

  if (bestMatch.loopCount && bestMatch.loopCount > 1) {
    // 视频太短，需要循环延长
    const loopCount = bestMatch.loopCount
    const targetDuration = actualVideoDuration * loopCount
    logger.info('[配音分镜] 视频过短，循环延长', {
      sceneId,
      originalSpeedFactor: bestMatch.speedFactor,
      loopCount,
      originalDuration: actualVideoDuration,
      targetDuration,
      adjustedSpeedFactor: bestMatch.adjustedSpeedFactor,
    })

    videoForSpeed = await trackFFmpegCall(
      {
        jobId: ctx.jobId,
        sceneId,
        operation: 'loop_video',
        requestParams: {
          input: videoToProcess,
          loop_count: loopCount,
          target_duration: targetDuration,
        },
      },
      () => ctx.services.ffmpeg.loopVideo(videoToProcess, loopCount, targetDuration, sceneIndex),
    )
  }

  if (bestMatch.needTrim) {
    // 视频太长，需要裁剪
    const audioDuration = bestMatch.audio.duration || 0
    const targetDuration = audioDuration * 5.0 // SPEED_MAX = 5.0
    logger.info('[配音分镜] 视频过长，裁剪处理', {
      sceneId,
      originalSpeedFactor: bestMatch.speedFactor,
      originalDuration: actualVideoDuration,
      targetDuration,
      adjustedSpeedFactor: bestMatch.adjustedSpeedFactor,
    })

    videoForSpeed = await trackFFmpegCall(
      {
        jobId: ctx.jobId,
        sceneId,
        operation: 'trim_video_for_speed',
        requestParams: {
          input: videoToProcess,
          start_time: 0,
          duration: targetDuration,
        },
      },
      () => ctx.services.ffmpeg.trimVideoForSpeed(videoToProcess, targetDuration, sceneIndex),
    )
  }

  // 7. 调速视频（使用本地 FFmpeg）
  // ✅ 检查中止信号（FFmpeg 调速前）
  checkAborted(signal)

  // 使用处理后的速度因子（始终在 [0.5, 5.0] 范围内）
  const effectiveSpeedFactor = bestMatch.adjustedSpeedFactor

  // 调速时跳过音频处理（配音分镜最终会替换为 Fish Audio 音频）
  logger.info('[配音分镜] 视频调速 - 跳过音频处理', {
    sceneId,
    action: '仅处理视频流',
    reason: '最终会替换为 Fish Audio 生成的配音',
    originalSpeedFactor: bestMatch.speedFactor,
    effectiveSpeedFactor,
    inputVideo: videoForSpeed,
    videoWasLooped: !!bestMatch.loopCount,
    videoWasTrimmed: !!bestMatch.needTrim,
  })

  const adjustedVideoPath = await trackFFmpegCall(
    {
      jobId: ctx.jobId,
      sceneId,
      operation: 'adjust_speed',
      requestParams: {
        input: videoForSpeed, // 使用预处理后的视频
        speed_factor: effectiveSpeedFactor,
        skip_audio: true, // 配音分镜跳过音频处理，最终会替换为 Fish Audio
      },
    },
    () =>
      ctx.services.ffmpeg.adjustSpeed(videoForSpeed, effectiveSpeedFactor, sceneIndex, {
        skipAudio: true, // 跳过音频处理，避免不必要的 atempo 处理和潜在的破音问题
      }),
  )

  // 安全检查：确保输出路径存在
  if (!adjustedVideoPath) {
    throw new Error(`调速失败: ${sceneId}，FFmpeg 输出为空`)
  }

  // 记录 adjust_video_speed 子步骤
  await recordSubStep(
    ctx,
    'adjust_video_speed',
    sceneId,
    {
      original_video_url: videoToProcess,
      preprocessed_video_url: videoForSpeed,
      original_speed_factor: bestMatch.speedFactor,
      effective_speed_factor: effectiveSpeedFactor,
      loop_count: bestMatch.loopCount,
      was_trimmed: bestMatch.needTrim,
    },
    {
      adjusted_video_url: adjustedVideoPath,
      method: 'local_ffmpeg',
    },
  )

  // 7. 合成音画（使用本地 FFmpeg）
  // ✅ 检查中止信号（FFmpeg 音画合成前）
  checkAborted(signal)

  // 获取调速后视频时长，用于验证音画同步
  const adjustedVideoMetadata = await ctx.services.ffmpeg.getMetadata(adjustedVideoPath)
  const adjustedVideoDuration = adjustedVideoMetadata.duration || 0
  const audioDuration = bestMatch.audio.duration || 0
  const durationDiff = adjustedVideoDuration - audioDuration // 正值=视频长，负值=视频短

  // 音画时长差异日志（用于调试音画同步问题）
  // 理论上调速后视频时长 ≈ 音频时长（因为 speedFactor = 原视频时长 / 音频时长）
  if (Math.abs(durationDiff) > 0.1) {
    // 超过 100ms 差异才记录警告
    logger.warn('[配音分镜] 音画时长差异超出预期', {
      sceneId,
      adjustedVideoDuration: adjustedVideoDuration.toFixed(3),
      audioDuration: audioDuration.toFixed(3),
      durationDiff: durationDiff.toFixed(3),
      impact: durationDiff > 0 ? '视频将被截断' : '最后一帧可能微延长',
    })
  } else {
    logger.debug('[配音分镜] 音画时长匹配正常', {
      sceneId,
      adjustedVideoDuration: adjustedVideoDuration.toFixed(3),
      audioDuration: audioDuration.toFixed(3),
      durationDiff: durationDiff.toFixed(3),
    })
  }

  // 读取配音音量配置
  const dubVolumeStr = configsRepo.get(TTS_CONFIG_KEYS.DUBBED_VOLUME)
  const dubVolume = dubVolumeStr ? parseFloat(dubVolumeStr) : TTS_DEFAULTS.DUBBED_VOLUME

  // 音频声道处理说明（合成时）
  logger.info('[配音分镜] 音画合成 - Fish Audio 单声道 upmix 到立体声', {
    sceneId,
    outputChannels: 2,
    dubVolume,
    reason: 'Fish Audio 输出单声道，复制到左右声道生成立体声，与原声分镜保持一致',
  })

  const mergedVideoPath = await trackFFmpegCall(
    {
      jobId: ctx.jobId,
      sceneId,
      operation: 'merge_audio_video',
      requestParams: {
        video_input: adjustedVideoPath,
        audio_input: bestMatch.audio.audioUrl,
        sample_rate: AUDIO_SAMPLE_RATE,
        channels: 2,
        copy_video: true,
        audio_duration: audioDuration,
        dub_volume: dubVolume,
      },
    },
    () =>
      ctx.services.ffmpeg.mergeAudioVideo(adjustedVideoPath, bestMatch.audio.audioUrl, sceneIndex, {
        sampleRate: AUDIO_SAMPLE_RATE,
        channels: 2, // 立体声输出，Fish Audio 单声道会 upmix 到立体声
        copyVideo: true,
        audioDuration, // 使用音频时长精确控制输出，确保声音完整
        dubVolume, // 配音音量（0 静音，1.0 正常，2.0 最大增益）
      }),
  )

  // 安全检查：确保输出路径存在
  if (!mergedVideoPath) {
    throw new Error(`音画合成失败: ${sceneId}，FFmpeg 输出为空`)
  }

  // 记录 merge_audio_video 子步骤
  await recordSubStep(
    ctx,
    'merge_audio_video',
    sceneId,
    {
      video_url: adjustedVideoPath,
      audio_url: bestMatch.audio.audioUrl,
    },
    {
      final_video_url: mergedVideoPath,
      method: 'local_ffmpeg',
    },
  )

  // 8. 字幕烧录（如果启用）
  // ✅ 检查中止信号（字幕烧录前）
  checkAborted(signal)

  // 字幕开关优先级：任务配置 > 系统配置 > 默认值
  const getSubtitleEnabled = (): boolean => {
    // 任务配置明确指定（true 或 false）
    if (ctx.input.config.subtitle_enabled !== undefined) {
      return ctx.input.config.subtitle_enabled
    }
    // 系统配置（存储为字符串 'true'/'false'）
    const systemConfig = configsRepo.get('subtitle_enabled')
    if (systemConfig !== null) {
      return systemConfig !== 'false'
    }
    // 默认值
    return CONFIG_DEFAULTS.SUBTITLE_ENABLED
  }
  const subtitleEnabled = getSubtitleEnabled()
  let finalVideoPath = mergedVideoPath

  if (subtitleEnabled) {
    // 获取选中的配音文本（跟随音频版本）
    const selectedNarration = narrationCandidates[bestMatch.audioIndex]

    // 获取视频分辨率（从合成后视频获取，确保准确）
    const mergedVideoMetadata = await ctx.services.ffmpeg.getMetadata(mergedVideoPath)
    const videoSize = {
      width: mergedVideoMetadata.video?.width || 1920,
      height: mergedVideoMetadata.video?.height || 1080,
    }

    // 分段字幕：按标点切分，按字符数均分时间
    const segments = splitIntoSegments(selectedNarration, audioDuration, { maxChars: 15 })

    logger.info('[配音分镜] 生成分段字幕', {
      sceneId,
      narrationLength: selectedNarration.length,
      audioVersion: bestMatch.audioIndex + 1,
      videoSize,
      segmentCount: segments.length,
    })

    // 生成 ASS 字幕内容（多条 Dialogue，逐句切换）
    const subtitleContent = generateSegmentedASS({
      segments,
      videoSize,
    })

    // 保存字幕文件
    const subtitlePath = ctx.services.ffmpeg.tempManager.getSubtitlePath(sceneIndex)
    await saveSubtitleFile(subtitleContent, subtitlePath)

    // 获取字体目录（用于 FFmpeg fontsdir 参数）
    const fontPath = getFontPath()
    const fontsDir = path.dirname(fontPath)

    // 烧录字幕
    const subtitledVideoPath = await trackFFmpegCall(
      {
        jobId: ctx.jobId,
        sceneId,
        operation: 'burn_subtitle',
        requestParams: {
          video_input: mergedVideoPath,
          subtitle_path: subtitlePath,
          fonts_dir: fontsDir,
        },
      },
      () => ctx.services.ffmpeg.burnSubtitle(mergedVideoPath, subtitlePath, sceneIndex, fontsDir),
    )

    // 安全检查：确保输出路径存在
    if (!subtitledVideoPath) {
      throw new Error(`字幕烧录失败: ${sceneId}，FFmpeg 输出为空`)
    }

    // 更新最终视频路径
    finalVideoPath = subtitledVideoPath

    // 记录 burn_subtitle 子步骤
    await recordSubStep(
      ctx,
      'burn_subtitle',
      sceneId,
      {
        video_url: mergedVideoPath,
        narration: selectedNarration,
        audio_version: bestMatch.audioIndex + 1,
        video_size: videoSize,
      },
      {
        subtitle_path: subtitlePath,
        subtitled_video_url: subtitledVideoPath,
        method: 'local_ffmpeg',
      },
    )

    logger.info('[配音分镜] 字幕烧录完成', {
      sceneId,
      subtitlePath,
      subtitledVideoPath,
    })
  }

  return {
    scene_id: sceneId,
    selected_audio_url: bestMatch.audio.audioUrl,
    final_video_url: finalVideoPath,
    audio_duration: bestMatch.audio.duration,
    speed_factor: effectiveSpeedFactor, // 使用实际生效的速度因子
    metadata: {
      narration_candidates: narrationCandidates.map((text, i) => ({
        version: i + 1,
        text: text,
        length: text.length,
      })),
      audio_candidates: audios,
      all_candidates_analysis: allCandidatesAnalysis,
      narration_choice: {
        audioIndex: bestMatch.audioIndex,
        originalSpeedFactor: bestMatch.speedFactor,
        effectiveSpeedFactor,
        loopCount: bestMatch.loopCount,
        wasTrimmed: bestMatch.needTrim,
      },
      adjusted_video_url: adjustedVideoPath,
      subtitle_enabled: subtitleEnabled,
    },
  }
}

/**
 * 记录循环内子步骤的输入和输出
 */
async function recordSubStep(
  ctx: WorkflowContext,
  subStepId: string,
  sceneId: string,
  inputData: Record<string, unknown>,
  outputData: Record<string, unknown>,
): Promise<void> {
  const stepId = nanoid(10)
  const now = Date.now()

  // 1. 插入步骤历史记录
  jobStepHistoryDb.insert({
    id: stepId,
    job_id: ctx.jobId,
    scene_id: sceneId,
    major_step: 'process_scenes',
    sub_step: subStepId,
    status: 'completed',
    started_at: now,
    completed_at: now,
    duration_ms: 0, // 循环内步骤不单独计时
    step_metadata: JSON.stringify(inputData),
  })

  // 2. 更新输出数据
  jobStepHistoryDb.updateOutputData(ctx.jobId, subStepId, sceneId, outputData)

  // 3. 同时写入 job_logs 表（用于前端日志面板展示）
  ctx.logger.logStepInput({
    jobId: ctx.jobId,
    stepId: `${subStepId}:${sceneId}`,
    stageId: 'process_scenes',
    inputData,
    numberingMap: ctx.numberingMap,
  })

  ctx.logger.logStepOutput({
    jobId: ctx.jobId,
    stepId: `${subStepId}:${sceneId}`,
    stageId: 'process_scenes',
    outputData,
    duration: 0,
    numberingMap: ctx.numberingMap,
  })
}
