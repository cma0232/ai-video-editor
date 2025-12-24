/**
 * 风格配置 - 纯逻辑函数
 *
 * 设计原则：YAML 文件为唯一数据源
 * - 所有风格元数据通过 styleLoader 从 YAML 动态加载
 * - 本文件只提供 ID 范围判断和生成逻辑
 *
 * ID 分配策略：
 * - 预设风格：1000-1999
 * - 自定义风格：2000+
 */

/**
 * ID 范围常量
 */
export const ID_RANGES = {
  BUILTIN_START: 1000,
  BUILTIN_END: 1999,
  CUSTOM_START: 2000,
} as const

/**
 * 检查是否为预设风格（通过 ID 范围判断）
 */
export function isBuiltinStyle(id: string): boolean {
  // 提取数字部分（支持 style-1000 格式）
  const numStr = id.replace(/^style-/, '')
  const numId = Number.parseInt(numStr, 10)
  if (Number.isNaN(numId)) return false
  return numId >= ID_RANGES.BUILTIN_START && numId <= ID_RANGES.BUILTIN_END
}

/**
 * 生成新的自定义风格 ID
 * 从 style-2000 开始递增
 */
export function generateCustomStyleId(existingIds: string[]): string {
  // 获取所有自定义风格 ID（>= 2000）
  const customIds = existingIds
    .map((id) => {
      const numStr = id.replace(/^style-/, '')
      return Number.parseInt(numStr, 10)
    })
    .filter((id) => !Number.isNaN(id) && id >= ID_RANGES.CUSTOM_START)

  if (customIds.length === 0) {
    return `style-${ID_RANGES.CUSTOM_START}`
  }

  // 找到最大的 ID 并加 1
  const maxId = Math.max(...customIds)
  return `style-${maxId + 1}`
}
