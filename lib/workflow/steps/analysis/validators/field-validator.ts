/**
 * 字段完整性验证器
 * 验证分镜必填字段是否完整
 */

import type { JobScene } from '@/types'

export interface FieldValidationResult {
  isValid: boolean
  errors: string[] // 致命错误（无法继续）
  shouldSkip: boolean // 是否应该跳过该分镜
  skipReason?: string // 跳过原因
}

/**
 * 验证分镜必填字段
 */
export function validateRequiredFields(scene: JobScene, index: number): FieldValidationResult {
  const errors: string[] = []
  const label = `分镜 ${index + 1} (${scene.id || `index-${index}`})`

  // 致命错误：缺少关键字段（无法继续）
  if (!scene.id) {
    errors.push(`${label}: 缺少 scene_id`)
  }

  if (!scene.source_start_time) {
    errors.push(`${label}: 缺少起始时间 (source_start_time)`)
  }

  if (!scene.source_end_time) {
    errors.push(`${label}: 缺少结束时间 (source_end_time)`)
  }

  if (scene.duration_seconds == null) {
    errors.push(`${label}: 缺少时长 (duration_seconds)`)
  }

  if (scene.duration_seconds != null && scene.duration_seconds <= 0) {
    errors.push(`${label}: 时长无效 (${scene.duration_seconds}s，必须 > 0)`)
  }

  // 可跳过：缺少旁白文案（跳过该分镜，继续处理其他）
  if (!scene.narration_script?.trim()) {
    return {
      isValid: false,
      errors: [],
      shouldSkip: true,
      skipReason: `${label}: 缺少旁白文案，已跳过`,
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    shouldSkip: false,
  }
}
