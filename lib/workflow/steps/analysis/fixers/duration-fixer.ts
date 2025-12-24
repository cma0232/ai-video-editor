/**
 * 时长修复器
 * 当 duration_seconds 与实际计算值不一致时，自动修正
 * 当时间戳顺序错误（start > end）时，自动交换
 */

import { calculateDuration, parseTimestamp } from '@/lib/utils/time'
import type { JobScene } from '@/types'

export interface FixDurationResult {
  scene: JobScene
  fixed: boolean
  oldValue?: number
  newValue?: number
  /** 时间戳是否被交换 */
  swapped?: boolean
}

/**
 * 修正分镜时长
 * @param scene 分镜数据
 * @returns 修正结果（如需修正则返回修正后的值）
 */
export function fixDurationSeconds(scene: JobScene): FixDurationResult {
  // 解析时间戳
  const startSeconds = parseTimestamp(scene.source_start_time)
  const endSeconds = parseTimestamp(scene.source_end_time)

  // 检查时间戳顺序，如果错误则自动交换
  let swapped = false
  if (endSeconds < startSeconds) {
    const tempStart = scene.source_start_time
    scene.source_start_time = scene.source_end_time
    scene.source_end_time = tempStart
    swapped = true
  }

  // 根据时间戳计算实际时长
  const calculatedDuration = calculateDuration(scene.source_start_time, scene.source_end_time)

  // 计算误差
  const diff = Math.abs(calculatedDuration - scene.duration_seconds)

  // 允许 0.1 秒误差（按用户要求保持不变）
  if (diff > 0.1 || swapped) {
    const oldValue = scene.duration_seconds
    scene.duration_seconds = calculatedDuration

    return {
      scene,
      fixed: true,
      oldValue,
      newValue: calculatedDuration,
      swapped,
    }
  }

  // 无需修正（但可能有交换）
  return { scene, fixed: false, swapped }
}
