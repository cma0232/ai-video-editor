/**
 * 原声分镜处理器
 * 处理使用原声的分镜（重新编码视频，修复画面静止问题）
 * 支持分镜级重试和容错
 * - 使用本地 FFmpeg 替代 NCA API
 */

// 统一音频采样率（与 Fish Audio 输出一致，44100Hz）
// 确保所有分镜输出相同采样率，避免拼接时音频错乱
const AUDIO_SAMPLE_RATE = 44100

import { nanoid } from 'nanoid'
import * as jobScenesDb from '@/lib/db/tables/job-scenes'
import * as jobStepHistoryDb from '@/lib/db/tables/job-step-history'
import { trackFFmpegCall } from '@/lib/media'
import { trimJumpCuts } from '@/lib/media/operations/trim-jumpcuts'
import { logger } from '@/lib/utils/logger'
import { isRetryableError, withRetry } from '@/lib/utils/retry'
import type { WorkflowContext } from '@/lib/workflow/types'
import type { JobScene, ProcessedScene } from '@/types'
import type { SceneProcessResult } from './dubbed-audio-handler'

/**
 * 分镜重试配置
 */
const SCENE_RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: 2000,
  backoff: 2,
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
 * 处理原声分镜（带重试和容错）
 * 返回 SceneProcessResult 而非直接抛出异常
 */
export async function processOriginalAudioScene(
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
        if (signal?.aborted) throw new Error('任务已中止')
        return await processOriginalAudioSceneCore(ctx, scene, videoDuration, signal)
      },
      {
        ...SCENE_RETRY_CONFIG,
        shouldRetry: (error) => {
          if (signal?.aborted) return false
          return isRetryableError(error)
        },
        onRetry: (attempt, error) => {
          retryCount = attempt
          logger.warn(`[原声分镜] ${sceneId} 第 ${attempt} 次重试`, {
            error: error instanceof Error ? error.message : String(error),
          })
        },
      },
    )

    return { success: true, scene_id: sceneId, data: result, retryCount }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn(`[原声分镜] ${sceneId} 处理失败（已重试 ${retryCount} 次），将跳过`, {
      error: message,
    })

    return { success: false, scene_id: sceneId, error: message, retryCount }
  }
}

/**
 * 原声分镜核心处理逻辑
 * 使用本地 FFmpeg 重新编码
 */
async function processOriginalAudioSceneCore(
  ctx: WorkflowContext,
  scene: JobScene,
  _videoDuration: number,
  signal?: AbortSignal,
): Promise<ProcessedScene> {
  const sceneId = scene.id

  // ✅ 检查中止信号（开始前）
  checkAborted(signal)

  const splitVideoUrl = scene.split_video_url
  if (!splitVideoUrl) throw new Error('split_video_url 不存在')
  const sceneIndex = scene.scene_index

  // 1. 跳切修剪（v12.2 新增）
  const trimOutputPath = ctx.services.ffmpeg.tempManager.getTrimmedPath(sceneIndex)
  const trimResult = await trimJumpCuts(
    splitVideoUrl,
    trimOutputPath,
    ctx.services.ffmpeg.getConfig(),
    { signal },
  )

  // 使用修剪后的视频
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

  logger.info('[原声分镜] 跳切修剪完成', {
    sceneId,
    skipped: trimResult.skipped,
    originalDuration: trimResult.originalDuration.toFixed(3),
    trimmedStart: trimResult.trimmedStart.toFixed(3),
    trimmedEnd: trimResult.trimmedEnd.toFixed(3),
    newDuration: trimResult.newDuration.toFixed(3),
    sceneChanges: trimResult.sceneChanges.length,
  })

  // 2. 重新编码（使用修剪后的视频）
  // ✅ 检查中止信号（FFmpeg 调用前）
  checkAborted(signal)

  // 记录子步骤输入
  const inputData = {
    scene_id: sceneId,
    video_url: videoToProcess,
    video_duration: actualVideoDuration,
    speed_factor: 1.0,
    use_original_audio: true,
  }

  // 音频声道处理说明
  logger.info('[原声分镜] 音频声道保持', {
    sceneId,
    action: '保持立体声',
    reason: '避免立体声下混到单声道时产生的削波破音问题',
  })

  // 使用本地 FFmpeg 重新编码（保留原声）
  const reencodedVideoPath = await trackFFmpegCall(
    {
      jobId: ctx.jobId,
      sceneId,
      operation: 'reencode_video',
      requestParams: {
        input: videoToProcess, // 使用修剪后的视频
        sample_rate: AUDIO_SAMPLE_RATE,
        channels: 1,
        purpose: 'reencode_original_audio',
      },
    },
    () =>
      ctx.services.ffmpeg.reencodeVideo(videoToProcess, sceneIndex, {
        sampleRate: AUDIO_SAMPLE_RATE,
        channels: 2,
      }),
  )

  // 安全检查：确保输出路径存在
  if (!reencodedVideoPath) {
    throw new Error(`原声分镜 ${sceneId} 重新编码失败：FFmpeg 输出为空`)
  }

  // 记录子步骤输出
  const outputData = {
    final_video_url: reencodedVideoPath,
    method: 'local_ffmpeg',
  }

  await recordSubStep(ctx, 'reencode_original_audio', sceneId, inputData, outputData)

  return {
    scene_id: sceneId,
    selected_audio_url: '', // 原声分镜没有单独的音频 URL
    final_video_url: reencodedVideoPath,
    audio_duration: actualVideoDuration, // 使用修剪后的时长
    speed_factor: 1.0,
    metadata: {
      use_original_audio: true,
      original_video_url: scene.split_video_url,
      trimmed_video_url: trimResult.skipped ? null : trimResult.outputPath,
      trimmed_start: trimResult.trimmedStart,
      trimmed_end: trimResult.trimmedEnd,
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
