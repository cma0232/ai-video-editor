/**
 * 报告数据加载器
 * 供 Server Component 使用，直接查询数据库
 */

import { JobsRepository } from '@/lib/db/core/jobs'
import { runInTransaction } from '@/lib/db/core/transaction'
import { getState } from '@/lib/db/managers/state-manager'
import * as apiCallsDb from '@/lib/db/tables/api-calls'
import { type JobLog, queryJobLogs } from '@/lib/db/tables/job-logs'
import * as jobScenesDb from '@/lib/db/tables/job-scenes'
import * as jobStepHistoryDb from '@/lib/db/tables/job-step-history'
import * as jobVideosDb from '@/lib/db/tables/job-videos'
import * as sceneAudioCandidatesDb from '@/lib/db/tables/scene-audio-candidates'
import { analyzeJobErrors } from '@/lib/exporters/error-analyzer'
import { styleLoader } from '@/lib/workflow/style-loader'
import type { ApiCall, JobScene, SceneAudioCandidate } from '@/types'
import type {
  AudioSyncPromptInfo,
  DataIntegrityCheck,
  JobReportData,
  JobReportStats,
} from '@/types/api/job-report'

/**
 * 加载任务报告完整数据
 * 使用单个事务减少数据库锁竞争
 */
export function loadJobReportDirect(jobId: string): JobReportData | null {
  return runInTransaction(
    () => {
      const jobsRepo = new JobsRepository()
      const job = jobsRepo.getById(jobId)

      if (!job) return null

      // 批量加载所有关联数据
      const state = getState(jobId)
      const videos = jobVideosDb.findByJobId(jobId)
      const scenes = jobScenesDb.findAllByJobId(jobId)
      const stepHistory = jobStepHistoryDb.findByJobId(jobId, { limit: 2000 })
      const apiCalls = apiCallsDb.findByJobId(jobId) as unknown as ApiCall[]
      const logs = queryJobLogs({ jobId, limit: 2000 }) as JobLog[]

      // 加载音频候选
      const audioCandidates: SceneAudioCandidate[] = []
      for (const scene of scenes) {
        const candidates = sceneAudioCandidatesDb.findBySceneId(scene.id)
        audioCandidates.push(...candidates)
      }

      // 分析错误（仅失败任务）
      const errorSummary =
        job.status === 'failed' ? analyzeJobErrors({ job, stepHistory, logs, scenes }) : null

      // 计算统计信息
      const stats = calculateStats({ scenes, stepHistory, apiCalls, logs })

      // 执行数据完整性检查
      const integrityCheck = checkDataIntegrity({ scenes, audioCandidates })

      // 加载音画同步提示词
      const audioSyncPrompt = loadAudioSyncPrompt(job.style_id, job.style_name)

      return {
        job,
        state,
        videos,
        scenes,
        audioCandidates,
        stepHistory,
        apiCalls,
        logs,
        errorSummary,
        stats,
        integrityCheck,
        audioSyncPrompt,
      }
    },
    { mode: 'DEFERRED' },
  )
}

/**
 * 加载音画同步提示词信息
 */
function loadAudioSyncPrompt(
  styleId: string,
  styleName?: string | null,
): AudioSyncPromptInfo | null {
  try {
    const style = styleLoader.load(styleId)

    // 获取创意层（风格配置或系统默认）
    const creativeLayer =
      style.audio_sync_creative_layer || styleLoader.getDefaultAudioSyncCreativeLayer()
    const isDefaultCreativeLayer = !style.audio_sync_creative_layer

    // 获取参数层模板
    const paramsTemplate = styleLoader.getSystemTemplate('batch_audio_sync_params')

    return {
      creativeLayer,
      paramsTemplate,
      isDefaultCreativeLayer,
      styleName: styleName || style.name || styleId,
    }
  } catch (error: unknown) {
    console.error(`[报告加载器] 加载风格 ${styleId} 的音画同步提示词失败:`, error)
    return null
  }
}

/**
 * 计算统计信息
 */
function calculateStats(params: {
  scenes: JobScene[]
  stepHistory: {
    status: string
    started_at?: number
    completed_at?: number
    duration_ms?: number
  }[]
  apiCalls: ApiCall[]
  logs: JobLog[]
}): JobReportStats {
  const { scenes, stepHistory, apiCalls, logs } = params

  // 分镜统计
  const totalScenes = scenes.length
  const completedScenes = scenes.filter((s) => s.status === 'completed').length
  const failedScenes = scenes.filter((s) => s.status === 'failed').length
  const skippedScenes = scenes.filter((s) => s.is_skipped).length

  // 日志统计
  const totalLogs = logs.length
  const errorLogs = logs.filter((log) => log.log_level === 'error').length
  const warnLogs = logs.filter((log) => log.log_level === 'warn').length

  // API 调用统计
  const totalApiCalls = apiCalls.length
  const geminiCalls = apiCalls.filter((c) => c.service.toLowerCase() === 'gemini').length
  const fishAudioCalls = apiCalls.filter(
    (c) => c.service.toLowerCase() === 'fish_audio' || c.service.toLowerCase() === 'fishaudio',
  ).length

  // 计算总耗时
  const totalDuration = stepHistory.reduce((sum, step) => {
    const duration =
      step.duration_ms ||
      (step.started_at && step.completed_at ? step.completed_at - step.started_at : 0)
    return sum + duration
  }, 0)

  return {
    totalScenes,
    completedScenes,
    failedScenes,
    skippedScenes,
    totalLogs,
    errorLogs,
    warnLogs,
    totalApiCalls,
    geminiCalls,
    fishAudioCalls,
    totalDuration,
  }
}

/**
 * 检查数据完整性
 */
function checkDataIntegrity(params: {
  scenes: JobScene[]
  audioCandidates: SceneAudioCandidate[]
}): DataIntegrityCheck {
  const { scenes } = params
  const warnings: string[] = []

  // 检查缺少拆条视频的分镜
  const scenesWithoutSplit = scenes
    .filter((s) => !s.split_video_url && s.status !== 'pending' && !s.is_skipped)
    .map((s) => s.id)

  // 检查缺少最终视频的分镜（仅配音分镜）
  const scenesWithoutFinal = scenes
    .filter(
      (s) =>
        !s.final_video_url && s.status === 'completed' && !s.use_original_audio && !s.is_skipped,
    )
    .map((s) => s.id)

  // 检查缺少音频的配音分镜
  const scenesWithoutAudio = scenes
    .filter(
      (s) =>
        !s.selected_audio_url && !s.use_original_audio && s.status !== 'pending' && !s.is_skipped,
    )
    .map((s) => s.id)

  // 生成警告信息
  if (scenesWithoutSplit.length > 0) {
    warnings.push(`${scenesWithoutSplit.length} 个分镜缺少拆条视频`)
  }
  if (scenesWithoutFinal.length > 0) {
    warnings.push(`${scenesWithoutFinal.length} 个已完成的配音分镜缺少最终视频`)
  }
  if (scenesWithoutAudio.length > 0) {
    warnings.push(`${scenesWithoutAudio.length} 个配音分镜缺少音频`)
  }

  const isComplete = warnings.length === 0

  return {
    isComplete,
    warnings,
    scenesWithoutSplit,
    scenesWithoutFinal,
    scenesWithoutAudio,
  }
}
