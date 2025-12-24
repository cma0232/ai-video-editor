/**
 * 任务报告数据类型定义
 * 用于 /jobs/:id/report 页面
 */

import type { JobCurrentState } from '@/lib/db/managers/state-manager'
import type { JobLog } from '@/lib/db/tables/job-logs'
import type { ErrorSummary } from '@/lib/exporters/error-analyzer'
import type { Job } from '@/types/core/job'
import type {
  ApiCall,
  JobScene,
  JobStepHistory,
  JobVideo,
  SceneAudioCandidate,
} from '@/types/db/structured-data'

/**
 * 音画同步提示词信息
 */
export interface AudioSyncPromptInfo {
  /** 创意层（来自风格配置或系统默认） */
  creativeLayer: string
  /** 参数层模板（系统级） */
  paramsTemplate: string
  /** 是否使用系统默认创意层 */
  isDefaultCreativeLayer: boolean
  /** 风格名称 */
  styleName: string
}

/**
 * 报告数据完整结构
 */
export interface JobReportData {
  // 核心数据（必需）
  job: Job
  state: JobCurrentState | null

  // 视频与分镜数据
  videos: JobVideo[]
  scenes: JobScene[]
  audioCandidates: SceneAudioCandidate[]

  // 执行历史数据
  stepHistory: JobStepHistory[]
  apiCalls: ApiCall[]
  logs: JobLog[]

  // 分析结果（失败任务）
  errorSummary: ErrorSummary | null

  // 统计信息
  stats: JobReportStats

  // 数据完整性检查
  integrityCheck: DataIntegrityCheck

  // 音画同步提示词
  audioSyncPrompt: AudioSyncPromptInfo | null
}

/**
 * 报告统计信息
 */
export interface JobReportStats {
  // 分镜统计
  totalScenes: number
  completedScenes: number
  failedScenes: number
  skippedScenes: number

  // 日志统计
  totalLogs: number
  errorLogs: number
  warnLogs: number

  // API 调用统计
  totalApiCalls: number
  geminiCalls: number
  fishAudioCalls: number

  // 耗时统计（毫秒）
  totalDuration: number
}

/**
 * 数据完整性检查结果
 */
export interface DataIntegrityCheck {
  isComplete: boolean
  warnings: string[]

  // 分镜数据检查
  scenesWithoutSplit: string[]
  scenesWithoutFinal: string[]
  scenesWithoutAudio: string[]
}

/**
 * 报告章节定义
 */
export interface ReportSection {
  id: string
  label: string
  icon: string
  conditional?: boolean
}

/**
 * 预定义的报告章节
 */
export const REPORT_SECTIONS: ReportSection[] = [
  { id: 'basic-info', label: '任务基本信息', icon: '📊' },
  { id: 'error-summary', label: '错误摘要', icon: '❌', conditional: true },
  { id: 'video-info', label: '输入视频信息', icon: '🎬' },
  { id: 'scene-detail', label: '分镜脚本详情', icon: '📝' },
  { id: 'audio-sync-prompt', label: '音画同步提示词', icon: '🎙️' },
  { id: 'step-history', label: '执行步骤历史', icon: '🔧' },
  { id: 'api-calls', label: 'API 调用记录', icon: '📋' },
  { id: 'logs', label: '运行日志', icon: '📋' },
  { id: 'integrity', label: '数据完整性检查', icon: '🔍' },
  { id: 'config', label: '任务配置', icon: '📦' },
  { id: 'summary', label: '任务总结', icon: '🎯' },
]
