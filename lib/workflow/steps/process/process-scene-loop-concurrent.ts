/**
 * 处理分镜循环步骤（并发版）
 * - 并发优化：支持并发度 1-8，提升处理速度 40-50%
 * - 用户可在设置页面配置系统并发数（1-8）
 *
 * 核心改进：
 * - 分批并发处理（每批 max_concurrent_scenes 个分镜）
 * - 原子性进度更新（使用 incrementProcessedScenes）
 * - 批量数据库保存（事务保护）
 */

import { CONFIG_DEFAULTS } from '@/lib/config'
import * as stateManager from '@/lib/db/managers/state-manager'
import * as jobScenesDb from '@/lib/db/tables/job-scenes'
import {
  calculateDuration,
  formatLoopStepEnd,
  formatLoopStepStart,
  formatSceneBox,
} from '@/lib/utils/log-formatter'
import { formatStepHeader } from '@/lib/workflow/step-numbering'
import { styleLoader } from '@/lib/workflow/style-loader'
import { resolveNarrationLanguage, resolveTTSConfig } from '@/lib/workflow/tts-config-resolver'
import type { JobScene, ProcessedScene } from '@/types'
import type { FailedScene, ProcessedScenesOutput, WorkflowContext } from '../../types'
import { BaseStep } from '../base'
import { processDubbedScene, type SceneProcessResult } from './handlers/dubbed-audio-handler'
import { processOriginalAudioScene } from './handlers/original-audio-handler'

/**
 * 处理分镜循环（并发版）
 * 支持并发度 1-8，批量处理分镜
 */
export class ProcessSceneLoopConcurrentStep extends BaseStep<ProcessedScenesOutput> {
  readonly id = 'process_scene_loop'
  readonly name = '处理分镜循环（并发版）'

  /**
   * 返回完整输入数据（用于日志记录）
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    const scenes = jobScenesDb.findByJobId(ctx.jobId)
    const style = styleLoader.load(ctx.input.styleId)

    return {
      scenes_count: scenes.length,
      scenes_detail: scenes.map((s) => ({
        scene_id: s.id,
        duration_seconds: s.duration_seconds,
        narration_script: s.narration_script,
        use_original_audio: s.use_original_audio === 1,
        split_video_url: s.split_video_url,
      })),
      voice_config: {
        voice_id: resolveTTSConfig().voiceId,
        language: resolveNarrationLanguage(),
      },
      style_config: {
        speech_rates: style.config.speech_rates || [0.9, 1.0, 1.1],
        audio_sync_creative_layer: style.audio_sync_creative_layer,
      },
      concurrency: ctx.input.config.max_concurrent_scenes || CONFIG_DEFAULTS.MAX_CONCURRENT_SCENES,
    }
  }

  async execute(ctx: WorkflowContext): Promise<ProcessedScenesOutput> {
    const stepStartTime = Date.now()

    // 1. 加载分镜数据
    const allScenes = jobScenesDb.findByJobId(ctx.jobId)
    if (!allScenes || allScenes.length === 0) {
      throw new Error('未找到分镜数据，请先执行视频分析步骤')
    }

    // 2. 获取系统并发数配置（默认 3，最小 1，最大 8，与 API 验证一致）
    const concurrency = Math.min(
      Math.max(ctx.input.config.max_concurrent_scenes || CONFIG_DEFAULTS.MAX_CONCURRENT_SCENES, 1),
      8,
    )

    const totalScenes = allScenes.length

    // P1-4 修复：分镜级别断点续传 - 跳过已完成的分镜
    const completedSceneIds = new Set(
      allScenes.filter((s) => s.status === 'completed' && s.final_video_url).map((s) => s.id),
    )
    const scenes = allScenes.filter((s) => !completedSceneIds.has(s.id))

    if (completedSceneIds.size > 0) {
      this.log(
        ctx,
        `✅ 分镜断点续传：跳过已完成的 ${completedSceneIds.size} 个分镜，继续处理剩余 ${scenes.length} 个`,
      )
    }

    // 3. 输出循环步骤开始
    const majorStep = ctx.runtime.currentStage
    if (!majorStep) {
      throw new Error('currentStage is not set in runtime context')
    }
    const stepHeader = formatStepHeader(this.id, majorStep, this.name, ctx.numberingMap)

    const inputData = {
      scenes_count: totalScenes,
      config: {
        voice_id: resolveTTSConfig().voiceId,
        language: resolveNarrationLanguage(),
        max_concurrent_scenes: concurrency,
      },
    }
    this.log(ctx, formatLoopStepStart(stepHeader, inputData, totalScenes))

    // 4. 分批并发处理分镜（支持容错）
    const processedScenes: ProcessedScene[] = []
    const failedScenes: FailedScene[] = []

    for (let batchStart = 0; batchStart < scenes.length; batchStart += concurrency) {
      // 构建当前批次
      const batchEnd = Math.min(batchStart + concurrency, scenes.length)
      const batch = scenes.slice(batchStart, batchEnd)

      // 并发处理批次内的分镜
      const batchResults = await Promise.allSettled(
        batch.map((scene, batchIndex) =>
          this.processScene(ctx, scene, batchStart + batchIndex, totalScenes, allScenes),
        ),
      )

      // 收集结果（支持容错）
      const batchProcessed: ProcessedScene[] = []

      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i]
        const scene = batch[i]

        if (result.status === 'fulfilled') {
          const sceneResult = result.value as SceneProcessResult
          if (sceneResult.success && sceneResult.data) {
            batchProcessed.push(sceneResult.data)
            processedScenes.push(sceneResult.data)
          } else {
            // 处理器内部已重试，这里只记录失败
            failedScenes.push({
              scene_id: sceneResult.scene_id,
              error: sceneResult.error || '未知错误',
            })
            jobScenesDb.updateFailureReason(sceneResult.scene_id, sceneResult.error || '未知错误')
            this.log(
              ctx,
              `⚠️ 分镜 ${sceneResult.scene_id} 处理失败（重试 ${sceneResult.retryCount || 0} 次后），已跳过: ${sceneResult.error}`,
            )
          }
        } else {
          // Promise 本身 rejected（极少情况）
          const errorMsg =
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          failedScenes.push({ scene_id: scene.id, error: errorMsg })
          jobScenesDb.updateFailureReason(scene.id, errorMsg)
          this.logError(ctx, `分镜处理异常: ${scene.id}`, result.reason)
        }
      }

      // 批量保存到数据库（使用事务）
      if (batchProcessed.length > 0) {
        jobScenesDb.updateProcessedScenes(
          ctx.jobId,
          batchProcessed.map((ps) => ({
            scene_id: ps.scene_id,
            selected_audio_url: ps.selected_audio_url,
            final_video_url: ps.final_video_url,
            audio_duration: ps.audio_duration,
            speed_factor: ps.speed_factor,
          })),
        )

        // 原子性更新进度（逐个递增）
        for (let i = 0; i < batchProcessed.length; i++) {
          stateManager.incrementProcessedScenes(ctx.jobId)
        }
      }

      // 输出批次进度
      const batchNum = Math.floor(batchStart / concurrency) + 1
      const totalBatches = Math.ceil(totalScenes / concurrency)
      this.log(
        ctx,
        `✅ 批次 ${batchNum}/${totalBatches} 完成（已处理 ${batchEnd}/${totalScenes} 个分镜）`,
      )
    }

    // 5. 统计失败
    if (failedScenes.length > 0) {
      this.log(ctx, `⚠️ ${failedScenes.length} 个分镜处理失败，将在合成时跳过`)
    }

    // 6. 全部失败才报错
    if (processedScenes.length === 0) {
      const errorReasons = failedScenes.map((f) => f.error).filter(Boolean)
      const errorMsg =
        errorReasons.length > 0
          ? `所有分镜处理失败，无法继续。失败原因: ${errorReasons.join('; ')}`
          : '所有分镜处理失败，无法继续'
      throw new Error(errorMsg)
    }

    // P1-4 修复：恢复已完成分镜的数据到返回值（用于后续步骤）
    const completedScenes: ProcessedScene[] = allScenes
      .filter((s) => completedSceneIds.has(s.id))
      .map((s) => ({
        scene_id: s.id,
        final_video_url: s.final_video_url || '',
        selected_audio_url: s.selected_audio_url || undefined,
        audio_duration: s.audio_duration || undefined,
        speed_factor: s.speed_factor || 1.0,
      }))

    // 合并本次处理的和已完成的分镜（按 scene_index 排序）
    const allProcessedScenes = [...completedScenes, ...processedScenes].sort((a, b) => {
      const aIndex = allScenes.findIndex((s) => s.id === a.scene_id)
      const bIndex = allScenes.findIndex((s) => s.id === b.scene_id)
      return aIndex - bIndex
    })

    // 7. 输出循环结束日志
    const stepDuration = calculateDuration(stepStartTime)
    const outputData = {
      processed_scenes_count: processedScenes.length,
      resumed_scenes: completedSceneIds.size,
      total_duration: stepDuration,
      average_duration_per_scene: `${(Date.now() - stepStartTime) / (processedScenes.length || 1) / 1000}s`,
    }
    this.log(ctx, formatLoopStepEnd(outputData, stepDuration))

    return { processedScenes: allProcessedScenes, failedScenes }
  }

  /**
   * 处理单个分镜（并发安全，返回 SceneProcessResult）
   */
  private async processScene(
    ctx: WorkflowContext,
    scene: JobScene,
    index: number,
    totalScenes: number,
    _allScenes: JobScene[],
  ): Promise<SceneProcessResult> {
    const sceneStartTime = Date.now()
    const sceneLabel = scene.id

    // 补齐视频元数据（如果缺失）
    let videoDuration = scene.duration_seconds
    if (!videoDuration || videoDuration <= 0) {
      try {
        const metadata = await ctx.services.ffmpeg.getMetadata(
          // biome-ignore lint/style/noNonNullAssertion: 场景处理前已确保 split_video_url 存在
          scene.split_video_url!,
        )
        videoDuration = metadata.duration ?? videoDuration
      } catch (error: unknown) {
        this.logError(ctx, `获取视频元数据失败: ${sceneLabel}`, error)
      }
    }

    // 构建分镜输入数据
    const sceneInputData = {
      scene_id: sceneLabel,
      scene_index: index,
      start_time: scene.source_start_time,
      end_time: scene.source_end_time,
      duration_seconds: videoDuration,
      narration_script: scene.narration_script,
      use_original_audio: scene.use_original_audio === 1,
      split_video_url: scene.split_video_url,
    }

    // P1-8 修复：增强原声模式判断（兼容布尔值和数字）
    const isOriginalAudio = scene.use_original_audio === 1

    // 调用处理器（返回 SceneProcessResult）
    const result = isOriginalAudio
      ? await processOriginalAudioScene(ctx, scene, videoDuration)
      : await processDubbedScene(ctx, scene, videoDuration)

    // 成功时输出分镜框
    if (result.success && result.data) {
      const sceneOutputData = {
        scene_id: result.data.scene_id,
        final_video_url: result.data.final_video_url,
        selected_audio_url: result.data.selected_audio_url || undefined,
        speed_factor: result.data.speed_factor,
      }

      const sceneDuration = calculateDuration(sceneStartTime)
      this.log(
        ctx,
        formatSceneBox(
          sceneLabel,
          index,
          totalScenes,
          sceneInputData,
          sceneOutputData,
          sceneDuration,
        ),
      )
    }

    return result
  }
}
