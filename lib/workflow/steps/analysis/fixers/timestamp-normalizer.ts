/**
 * 时间戳标准化器
 * 支持多种格式 → 统一输出 HH:MM:SS.mmm 标准格式
 *
 * 委托给 lib/utils/timestamp-normalizer.ts 的智能解析器
 * 支持 Gemini 常见错误格式如 00:06:500（毫秒误写为秒位）
 */

import { parseTimestamp } from '@/lib/utils/time'
import { normalizeTimestamp as smartNormalize } from '@/lib/utils/timestamp-normalizer'
import type { JobScene } from '@/types'

export interface NormalizeResult {
  normalized: boolean
  original: string
  standardized: string
  seconds: number
}

/**
 * 标准化单个时间戳
 * 使用智能解析器处理各种格式（包括 Gemini 常见错误）
 */
export function normalizeTimestamp(timestamp: string): NormalizeResult {
  // 使用智能规范化器（能处理 00:06:500 等异常格式）
  const standardized = smartNormalize(timestamp)
  // 从标准格式解析秒数
  const seconds = parseTimestamp(standardized)

  return {
    normalized: timestamp !== standardized,
    original: timestamp,
    standardized,
    seconds,
  }
}

/**
 * 标准化分镜的起止时间戳
 */
export function normalizeSceneTimestamps(scene: JobScene): {
  scene: JobScene
  changes: string[]
} {
  const changes: string[] = []

  // 标准化起始时间
  const startResult = normalizeTimestamp(scene.source_start_time)
  if (startResult.normalized) {
    changes.push(`起始时间: ${startResult.original} → ${startResult.standardized}`)
    scene.source_start_time = startResult.standardized
  }

  // 标准化结束时间
  const endResult = normalizeTimestamp(scene.source_end_time)
  if (endResult.normalized) {
    changes.push(`结束时间: ${endResult.original} → ${endResult.standardized}`)
    scene.source_end_time = endResult.standardized
  }

  return { scene, changes }
}
