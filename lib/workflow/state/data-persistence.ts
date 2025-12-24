/**
 * 数据持久化管理器
 * 负责步骤输出、断点和步骤数据的持久化
 *
 * 使用事务保证数据一致性
 */

import { runInTransaction } from '@/lib/db/core/transaction'
import * as stateManager from '@/lib/db/managers/state-manager'
import * as jobScenesDb from '@/lib/db/tables/job-scenes'
import * as jobStepHistoryDb from '@/lib/db/tables/job-step-history'
import * as jobVideosDb from '@/lib/db/tables/job-videos'
import * as sceneAudioCandidatesDb from '@/lib/db/tables/scene-audio-candidates'
import { logger } from '@/lib/utils/logger'
import type {
  FinalVideoOutput,
  ProcessedScenesOutput,
  SceneVideosOutput,
  VideoAnalysisOutput,
} from '../types'

/**
 * ProcessedScene 元数据的类型化接口
 * 用于安全访问 metadata 字段中的已知属性
 */
interface ProcessedSceneMetadata {
  adjusted_video_url?: string
  narration_candidates?: Array<{ version: number; text: string; length: number }>
  audio_candidates?: Array<{
    audioUrl: string
    duration: number
    metadata?: Record<string, unknown>
  }>
  all_candidates_analysis?: Array<{
    index: number
    speedFactor: number
    diff: number
  }>
  narration_choice?: { audioIndex: number; speedFactor?: number }
  use_original_audio?: boolean
  original_video_url?: string
}

/**
 * 保存步骤输出
 */
export async function saveStepOutput<T = unknown>(
  jobId: string,
  stepId: string,
  output: T,
): Promise<void> {
  switch (stepId) {
    case 'fetch_metadata':
      // FetchMetadataStep: 保存 enriched videos
      if (Array.isArray(output)) {
        jobVideosDb.upsertBatch(jobId, output)
      }
      break

    case 'gemini_analysis':
      await saveVideoAnalysis(jobId, output as VideoAnalysisOutput)
      break

    case 'ffmpeg_batch_split':
      await saveSceneVideos(jobId, output as SceneVideosOutput)
      break

    case 'process_scene_loop':
      await saveProcessedScenes(jobId, output as ProcessedScenesOutput)
      break

    case 'concatenate':
    case 'download':
      // 合成阶段的步骤都保存最终视频
      await saveFinalVideo(jobId, output as FinalVideoOutput)
      break

    default:
      // 其他步骤的输出不需要保存（如 prepare_gemini, validate_storyboards, migrate_gcs）
      break
  }
}

/**
 * 保存步骤断点
 *
 * 注意：step_context 在数据库管理器中定义为 StepContext 接口，
 * 但这里用于保存任意步骤断点数据，使用类型断言兼容
 */
export async function saveStepCheckpoint<T = unknown>(
  jobId: string,
  stepId: string,
  data: T,
): Promise<void> {
  // 保存到 job_current_state 的 step_context
  const state = stateManager.getState(jobId)
  const currentContext = state?.step_context
  const stepContext =
    typeof currentContext === 'string'
      ? (JSON.parse(currentContext) as Record<string, unknown>)
      : (currentContext as Record<string, unknown> | undefined) || {}

  // 创建新的上下文对象，包含更新的步骤数据
  const updatedContext = { ...stepContext, [stepId]: data }

  stateManager.updateState(jobId, {
    // 使用 unknown 中转来避免严格类型检查
    // 因为 step_context 实际上是 JSON 字符串存储的任意数据
    step_context: updatedContext as unknown as Parameters<
      typeof stateManager.updateState
    >[1]['step_context'],
  })
}

/**
 * 加载步骤断点
 */
export async function loadStepCheckpoint<T>(jobId: string, stepId: string): Promise<T | null> {
  const state = stateManager.getState(jobId)
  if (!state || !state.step_context) {
    return null
  }

  const stepContext =
    typeof state.step_context === 'string' ? JSON.parse(state.step_context) : state.step_context

  return (stepContext[stepId] as T) || null
}

/**
 * 保存步骤输入数据到步骤历史表
 * 记录完整的输入参数
 * 添加 silent 参数，控制日志输出（用于简化日志）
 * 使用 updateInputData() 方法，写入 input_data 字段
 */
export async function saveStepInputData(
  jobId: string,
  stepId: string,
  inputData: Record<string, unknown>,
  options?: { silent?: boolean },
): Promise<void> {
  const silent = options?.silent ?? false
  jobStepHistoryDb.updateInputData(jobId, stepId, inputData)

  // 静默模式下不输出此日志（由 engine 输出更简洁的日志）
  if (!silent) {
    logger.info(`📥 步骤输入已记录: ${stepId}`, { jobId })
  }
}

/**
 * 保存步骤输出数据到步骤历史表
 * 极简版本，直接保存原始 JSON
 * 添加 silent 参数，控制日志输出（用于简化日志）
 */
export async function saveStepOutputData(
  jobId: string,
  stepId: string,
  outputData: Record<string, unknown>,
  options?: { silent?: boolean },
): Promise<void> {
  const silent = options?.silent ?? false
  jobStepHistoryDb.updateOutputData(jobId, stepId, null, outputData) // 传递 null 作为 sceneId（非场景级别步骤）

  // 静默模式下不输出此日志（由 engine 输出更简洁的日志）
  if (!silent) {
    logger.info(`📤 步骤输出已记录: ${stepId}`, { jobId })
  }
}

// ==================== 私有方法 ====================

/**
 * 保存视频分析结果
 * 添加详细日志和错误处理
 * 使用事务保证数据一致性
 */
async function saveVideoAnalysis(jobId: string, data: VideoAnalysisOutput): Promise<void> {
  logger.info('📝 开始保存视频分析结果（使用事务）', {
    jobId,
    gemini_videos_count: data.gemini_videos?.length || 0,
    storyboards_count: data.storyboards?.length || 0,
    has_analysis_prompt: !!data.analysis_prompt,
  })

  try {
    // 在事务中执行所有数据库操作
    runInTransaction(
      () => {
        // 1. 保存视频元数据
        jobVideosDb.upsertBatch(jobId, data.gemini_videos)
        logger.info(`✅ job_videos 保存成功 (${data.gemini_videos.length} 条)`, { jobId })

        // 2. 保存分镜数据
        if (data.storyboards && data.storyboards.length > 0) {
          jobScenesDb.upsertFromStoryboards(jobId, data.storyboards)
          logger.info(`✅ job_scenes 保存成功 (${data.storyboards.length} 条)`, { jobId })

          // 2.1 同步更新 job_videos.storyboards 字段（修复任务重跑时前端数据不更新问题）
          jobVideosDb.updateStoryboards(jobId, data.storyboards)
          logger.info('✅ job_videos.storyboards 同步成功', { jobId })
        } else {
          logger.warn('⚠️  storyboards 为空，跳过 job_scenes 保存', { jobId })
        }

        // 3. 更新任务状态
        stateManager.updateState(jobId, {
          total_scenes: data.storyboards.length,
        })
        logger.info(`✅ 任务状态已更新 (total_scenes: ${data.storyboards.length})`, { jobId })

        // 4. 保存分析提示词
        if (data.analysis_prompt) {
          jobVideosDb.updateAnalysisPrompt(jobId, data.analysis_prompt)
          logger.info('✅ 分析提示词已保存', { jobId })
        }

        // 5. 保存分析响应（用于多轮对话）
        if (data.gemini_raw_response) {
          const responseStr =
            typeof data.gemini_raw_response === 'string'
              ? data.gemini_raw_response
              : JSON.stringify(data.gemini_raw_response)
          jobVideosDb.updateAnalysisResponse(jobId, responseStr)
          logger.info('✅ 分析响应已保存（用于多轮对话）', { jobId })
        }
      },
      { mode: 'IMMEDIATE', maxRetries: 3, retryDelay: 500 },
    )

    logger.info('🎉 视频分析结果保存完成（事务已提交）', { jobId })
  } catch (error: unknown) {
    logger.error('❌ 保存视频分析结果失败（事务已回滚）', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      data_summary: {
        gemini_videos_count: data.gemini_videos?.length,
        storyboards_count: data.storyboards?.length,
      },
    })
    throw error
  }
}

/**
 * 保存分镜视频
 * 使用事务保证数据一致性
 */
async function saveSceneVideos(jobId: string, data: SceneVideosOutput): Promise<void> {
  runInTransaction(
    () => {
      jobScenesDb.updateSplitVideos(
        jobId,
        data.sceneVideos.map((sv) => ({
          scene_id: sv.scene_id,
          video_url: sv.url,
          duration_seconds: sv.duration,
          metadata: sv.metadata,
        })),
      )
    },
    { mode: 'IMMEDIATE', maxRetries: 3 },
  )

  logger.info('✅ 分镜视频已保存（事务已提交）', { jobId })
}

/**
 * 保存已处理分镜
 * 使用事务保证数据一致性
 */
async function saveProcessedScenes(jobId: string, data: ProcessedScenesOutput): Promise<void> {
  runInTransaction(
    () => {
      jobScenesDb.updateProcessedScenes(
        jobId,
        data.processedScenes.map((ps) => {
          const meta = ps.metadata as ProcessedSceneMetadata | undefined
          return {
            scene_id: ps.scene_id,
            final_video_url: ps.final_video_url,
            selected_audio_url: ps.selected_audio_url,
            adjusted_video_url: meta?.adjusted_video_url,
            speed_factor: ps.speed_factor,
            audio_duration: ps.audio_duration,
            metadata: ps.metadata,
          }
        }),
      )

      // 保存音频候选
      for (const ps of data.processedScenes) {
        const metadata = ps.metadata as ProcessedSceneMetadata | undefined
        if (metadata?.narration_candidates && metadata?.audio_candidates) {
          sceneAudioCandidatesDb.upsertCandidates(
            ps.scene_id,
            metadata.narration_candidates,
            metadata.audio_candidates,
            metadata.all_candidates_analysis,
            metadata.narration_choice?.audioIndex,
          )
        }
      }

      // 更新进度
      stateManager.updateState(jobId, {
        processed_scenes: data.processedScenes.length,
      })
    },
    { mode: 'IMMEDIATE', maxRetries: 3 },
  )

  logger.info('✅ 已处理分镜已保存（事务已提交）', { jobId })
}

/**
 * 保存最终视频
 * 使用事务保证数据一致性
 */
async function saveFinalVideo(jobId: string, data: FinalVideoOutput): Promise<void> {
  runInTransaction(
    () => {
      stateManager.updateState(jobId, {
        final_video_url: data.url,
        final_video_public_url: data.publicUrl,
        final_video_gs_uri: data.gsUri,
        final_video_local_path: data.localPath,
      })
    },
    { mode: 'IMMEDIATE', maxRetries: 3 },
  )

  logger.info('✅ 最终视频已保存（事务已提交）', { jobId })
}
