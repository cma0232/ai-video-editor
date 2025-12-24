/**
 * 任务错误分析器
 * 分析失败任务的错误信息，生成可读的错误摘要和修复建议
 */

import type { JobLog } from '@/lib/db/tables/job-logs'
import type { Job } from '@/types/core/job'
import type { JobScene, JobStepHistory } from '@/types/db/structured-data'

export interface ErrorSummary {
  mainError: string
  failedStep: {
    major_step: string
    sub_step: string
  }
  failedScenes: string[]
  errorDetails: string
  suggestedAction: string
}

interface AnalysisData {
  job: Job
  stepHistory: JobStepHistory[]
  logs: JobLog[]
  scenes: JobScene[]
}

/**
 * 分析任务错误信息
 */
export function analyzeJobErrors(data: AnalysisData): ErrorSummary | null {
  const { job, stepHistory, logs, scenes } = data

  // 非失败任务不生成错误摘要
  if (job.status !== 'failed') {
    return null
  }

  // 1. 找出失败的步骤
  const failedSteps = stepHistory.filter((s) => s.status === 'failed')
  const mainFailedStep = failedSteps[failedSteps.length - 1] // 最后失败的步骤

  if (!mainFailedStep) {
    // 没有失败步骤记录，使用任务的 error_message
    return {
      mainError: job.error_message || '未知错误',
      failedStep: { major_step: 'unknown', sub_step: 'unknown' },
      failedScenes: [],
      errorDetails: job.error_message || '未找到详细错误信息',
      suggestedAction: '请检查任务日志以获取更多信息',
    }
  }

  // 2. 找出失败的分镜
  const failedScenes = scenes.filter((s) => s.status === 'failed').map((s) => s.id)

  // 3. 提取相关错误日志
  const errorLogs = logs
    .filter((log) => {
      return (
        log.log_level === 'error' &&
        (log.major_step === mainFailedStep.major_step || log.sub_step === mainFailedStep.sub_step)
      )
    })
    .slice(-10) // 只取最近 10 条错误日志

  // 4. 生成错误详情
  const errorDetails = formatErrorDetails({
    mainFailedStep,
    errorLogs,
  })

  // 5. 生成修复建议
  const suggestedAction = generateSuggestion({
    job,
    mainFailedStep,
    errorLogs,
  })

  return {
    mainError: job.error_message || mainFailedStep.error_message || '未知错误',
    failedStep: {
      major_step: mainFailedStep.major_step,
      sub_step: mainFailedStep.sub_step,
    },
    failedScenes,
    errorDetails,
    suggestedAction,
  }
}

/**
 * 安全解析 JSON
 */
function _safeJsonParse(jsonStr?: string): Record<string, unknown> | string | null {
  if (!jsonStr) return null
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>
  } catch {
    return jsonStr
  }
}

/**
 * 格式化错误详情
 */
function formatErrorDetails(params: {
  mainFailedStep: JobStepHistory
  errorLogs: JobLog[]
}): string {
  const { mainFailedStep, errorLogs } = params
  const lines: string[] = []

  // 主要错误
  lines.push(`步骤失败: ${mainFailedStep.major_step} > ${mainFailedStep.sub_step}`)
  if (mainFailedStep.error_message) {
    lines.push(`错误消息: ${mainFailedStep.error_message}`)
  }

  // 错误日志
  if (errorLogs.length > 0) {
    lines.push('\n错误日志:')
    for (const log of errorLogs) {
      const timestamp = new Date(log.created_at).toLocaleString('zh-CN')
      lines.push(`  [${timestamp}] ${log.message}`)
      if (log.details) {
        try {
          const details = JSON.parse(log.details)
          if (details.error || details.message) {
            lines.push(`    详情: ${details.error || details.message}`)
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  return lines.join('\n')
}

/**
 * 生成修复建议
 */
function generateSuggestion(params: {
  job: Job
  mainFailedStep: JobStepHistory
  errorLogs: JobLog[]
}): string {
  const { job, mainFailedStep, errorLogs } = params
  const suggestions: string[] = []

  // 根据失败步骤类型给出建议
  const { major_step, sub_step } = mainFailedStep

  // Gemini 相关错误
  if (
    major_step === 'analysis' &&
    (sub_step === 'prepare_gemini' || sub_step === 'gemini_analysis')
  ) {
    suggestions.push('1. 检查 Gemini API 配置是否正确（API Key、Project ID 等）')
    suggestions.push('2. 验证网络连接是否正常')
    suggestions.push('3. 检查视频文件是否符合 Gemini API 限制（大小、格式、时长）')

    // 检查是否是超时错误
    const hasTimeout = errorLogs.some(
      (log) =>
        log.message.toLowerCase().includes('timeout') || log.message.toLowerCase().includes('超时'),
    )
    if (hasTimeout) {
      suggestions.push('4. 增加 API 请求超时时间')
      suggestions.push('5. 尝试上传较小的视频文件')
    }

    // 检查是否是 AI Studio 文件大小限制
    if (job.config?.gemini_platform === 'ai-studio') {
      suggestions.push('6. AI Studio 有 2GB 文件大小限制，大文件请切换到 Vertex AI 平台')
    }
  }

  // Fish Audio 相关错误
  if (errorLogs.some((log) => log.service_name === 'fish_audio')) {
    suggestions.push('1. 检查 Fish Audio API 配置是否正确（API Key）')
    suggestions.push('2. 验证 Voice ID 是否有效')
    suggestions.push('3. 检查旁白文案长度是否在合理范围内')
  }

  // 分镜处理错误
  if (major_step === 'process_scenes') {
    suggestions.push('1. 检查失败的分镜视频是否存在且可访问')
    suggestions.push('2. 验证音频文件是否有效')
    suggestions.push('3. 检查速度因子是否在允许范围内')
  }

  // 最终合成错误
  if (major_step === 'compose') {
    suggestions.push('1. 检查所有分镜视频是否已成功处理')
    suggestions.push('2. 检查输出目录是否有写入权限')
    suggestions.push('3. 验证视频合成服务是否正常')
  }

  // 通用建议
  if (suggestions.length === 0) {
    suggestions.push('1. 查看详细日志以了解错误原因')
    suggestions.push('2. 尝试重新运行任务')
    suggestions.push('3. 检查所有外部服务（Gemini、Fish Audio）的配置和状态')
  }

  return suggestions.join('\n')
}
