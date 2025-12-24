/**
 * 时间戳范围验证器
 * 验证分镜时间戳是否在原视频有效范围内
 */

import { parseTimestamp } from '@/lib/utils/time'
import type { JobScene, VideoMetadata } from '@/types'

export interface TimestampValidationResult {
  isValid: boolean
  shouldSkip: boolean // 超范围时建议跳过（不阻塞任务）
  warnings: string[]
  errors: string[]
}

/**
 * 验证分镜时间戳范围
 */
export function validateTimestampRange(
  scene: JobScene,
  videoMetadata: VideoMetadata,
  index: number,
): TimestampValidationResult {
  const label = `分镜 ${index + 1} (${scene.id})`
  const warnings: string[] = []
  const errors: string[] = []

  let startTime: number
  let endTime: number

  // 解析时间戳（使用 lib/utils/time.ts 的通用工具）
  try {
    startTime = parseTimestamp(scene.source_start_time)
    endTime = parseTimestamp(scene.source_end_time)
  } catch (_error: unknown) {
    errors.push(
      `${label}: 时间戳格式无法解析 ` +
        `(start: ${scene.source_start_time}, end: ${scene.source_end_time})`,
    )
    return { isValid: false, shouldSkip: false, warnings, errors }
  }

  const videoDuration = videoMetadata.duration

  // 验证逻辑时间关系
  if (startTime >= endTime) {
    errors.push(
      `${label}: 起始时间 >= 结束时间 ` +
        `(${scene.source_start_time} >= ${scene.source_end_time})`,
    )
    return { isValid: false, shouldSkip: false, warnings, errors }
  }

  // 验证起始时间范围（超范围建议跳过）
  if (startTime < 0) {
    warnings.push(`${label}: 起始时间为负数，已自动跳过`)
    return { isValid: false, shouldSkip: true, warnings, errors }
  }

  // 验证结束时间范围（超范围建议跳过）
  if (endTime > videoDuration) {
    warnings.push(
      `${label}: 结束时间超出视频时长 ` +
        `(${scene.source_end_time} > ${videoMetadata.duration_formatted || `${videoDuration}s`})，已自动跳过`,
    )
    return { isValid: false, shouldSkip: true, warnings, errors }
  }

  // 验证通过
  return { isValid: true, shouldSkip: false, warnings, errors }
}
