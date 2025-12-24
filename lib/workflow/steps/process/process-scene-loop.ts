/**
 * 处理分镜循环步骤
 * - 极简架构
 * - 使用统一步骤标识格式
 * - 模块化重构：拆分处理器和工具函数
 */

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
import type { ProcessedScene } from '@/types'
import type { FailedScene, ProcessedScenesOutput, WorkflowContext } from '../../types'
import { BaseStep } from '../base'
import { processDubbedScene, type SceneProcessResult } from './handlers/dubbed-audio-handler'
import { processOriginalAudioScene } from './handlers/original-audio-handler'

/**
 * 处理分镜循环
 * 最复杂的步骤：遍历所有分镜，音画同步处理
 */
export class ProcessSceneLoopStep extends BaseStep<ProcessedScenesOutput> {
  readonly id = 'process_scene_loop'
  readonly name = '处理分镜循环'

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
      // 串行版本不使用并发，此处仅记录配置值用于日志
      mode: 'serial',
    }
  }

  async execute(ctx: WorkflowContext): Promise<ProcessedScenesOutput> {
    const stepStartTime = Date.now()

    // 1. 加载分镜数据
    const allScenes = jobScenesDb.findByJobId(ctx.jobId)
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

    // 2. 输出循环步骤开始
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
      },
      mode: 'serial', // 串行版本，逐个处理分镜
    }
    this.log(ctx, formatLoopStepStart(stepHeader, inputData, totalScenes))

    // 3. 逐个处理分镜（支持容错）
    const processedScenes: ProcessedScene[] = []
    const failedScenes: FailedScene[] = []

    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index]
      const sceneLabel = scene.id
      const sceneStartTime = Date.now()

      // 补齐视频元数据
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
      const result: SceneProcessResult = isOriginalAudio
        ? await processOriginalAudioScene(ctx, scene, videoDuration)
        : await processDubbedScene(ctx, scene, videoDuration)

      if (result.success && result.data) {
        // 成功：保存结果
        processedScenes.push(result.data)

        // 构建分镜输出数据
        const sceneOutputData = {
          scene_id: result.data.scene_id,
          final_video_url: result.data.final_video_url,
          selected_audio_url: result.data.selected_audio_url || undefined,
          speed_factor: result.data.speed_factor,
        }

        // 输出分镜框
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

        // 保存到数据库
        jobScenesDb.updateProcessedScenes(ctx.jobId, [
          {
            scene_id: result.data.scene_id,
            selected_audio_url: result.data.selected_audio_url,
            final_video_url: result.data.final_video_url,
            audio_duration: result.data.audio_duration,
            speed_factor: result.data.speed_factor,
          },
        ])
      } else {
        // 失败：记录并跳过
        failedScenes.push({ scene_id: result.scene_id, error: result.error || '未知错误' })
        jobScenesDb.updateFailureReason(result.scene_id, result.error || '未知错误')

        this.log(
          ctx,
          `⚠️ 分镜 ${result.scene_id} 处理失败（重试 ${result.retryCount || 0} 次后），已跳过: ${result.error}`,
        )
      }

      // 每处理完一个分镜，立即更新进度（用于前端实时显示）
      stateManager.updateState(ctx.jobId, {
        processed_scenes: index + 1,
      })
    }

    // 统计日志
    this.log(ctx, `✅ 处理完成: ${processedScenes.length} 成功, ${failedScenes.length} 失败`)

    // 全部失败则报错
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

    // 4. 输出循环步骤结束
    const totalDuration = Date.now() - stepStartTime
    const avgDurationPerScene =
      processedScenes.length > 0 ? totalDuration / processedScenes.length : 0

    const outputData = {
      // 必需字段（LoopStepOutputData 接口）
      processed_scenes_count: processedScenes.length,
      total_duration: totalDuration,
      average_duration_per_scene: `${calculateDuration(avgDurationPerScene).toFixed(2)}s`,
      // 额外字段（接口允许 [key: string]: unknown）
      total_scenes: totalScenes,
      processed_scenes: processedScenes.length,
      resumed_scenes: completedSceneIds.size, // P1-4: 断点续传跳过的分镜数
      success_count: processedScenes.filter((s) => s.final_video_url).length,
      failed_count: processedScenes.filter((s) => !s.final_video_url).length,
      average_speed_factor:
        processedScenes.length > 0
          ? processedScenes.reduce((sum, s) => sum + (s.speed_factor || 1.0), 0) /
            processedScenes.length
          : 1.0,
      total_processing_time: calculateDuration(stepStartTime),
    }
    const stepDuration = calculateDuration(stepStartTime)
    this.log(ctx, formatLoopStepEnd(outputData, stepDuration))

    return { processedScenes: allProcessedScenes, failedScenes }
  }
}
