/**
 * 数量验证器
 * 验证分镜数量和原声分镜数量
 */

export interface CountValidationResult {
  isValid: boolean
  error?: string
  warning?: string
}

/**
 * 验证分镜总数量
 */
export function validateStoryboardCount(
  actualCount: number,
  expectedCount: number,
): CountValidationResult {
  if (actualCount !== expectedCount) {
    return {
      isValid: false,
      error: `分镜数量不匹配：期望 ${expectedCount} 个，实际 ${actualCount} 个`,
    }
  }
  return { isValid: true }
}

/**
 * 验证原声分镜数量
 */
export function validateOriginalAudioCount(
  actualCount: number,
  expectedCount: number,
): CountValidationResult {
  if (actualCount !== expectedCount) {
    return {
      isValid: false,
      warning: `原声分镜数量不匹配：期望 ${expectedCount} 个，实际 ${actualCount} 个`,
    }
  }
  return { isValid: true }
}
