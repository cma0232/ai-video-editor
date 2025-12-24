#!/usr/bin/env tsx
/**
 * 授权码生成器 V3 - 极简离线格式（24 字符）
 *
 * 新格式：CCUT-{ENCODED_DATA}-{CRC}
 * - ENCODED_DATA: 12-13 字符（Base62 编码的加密数据）
 * - CRC: 4 字符（CRC16 校验码）
 * - 总长度：约 22-24 字符
 *
 * 使用方法：
 * ```bash
 * npx tsx scripts/license-generate-v3.ts \
 *   --customer 1 \
 *   --months 12 \
 *   --features 7 \
 *   --max-jobs 999
 * ```
 */

import { crc16, encodeBase62, packLicenseData, xorEncrypt } from '../lib/license/crypto-simple'

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const options: Record<string, string> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1]
      options[key] = value
      i++ // 跳过下一个参数
    }
  }

  return options
}

/**
 * 生成 V3 授权码
 */
function generateLicenseCodeV3(params: {
  customerIndex: number
  months: number
  features: number
  maxJobs: number
  maxDuration: number
}): string {
  // 1. 打包数据（6 字节）
  const packedData = packLicenseData({
    customerIndex: params.customerIndex,
    expireMonths: params.months,
    features: params.features,
    maxJobs: params.maxJobs,
    maxDuration: params.maxDuration,
  })

  // 2. XOR 加密
  const encrypted = xorEncrypt(packedData)

  // 3. Base62 编码
  const encoded = encodeBase62(encrypted)

  // 4. 计算 CRC16 校验码
  const checksum = crc16(encoded)

  // 5. 组合授权码
  return `CCUT-${encoded}-${checksum}`
}

/**
 * 解析功能标志
 */
function parseFeatures(featuresStr: string): number {
  const features = featuresStr.split(',')
  let flags = 0

  if (features.includes('single_video') || features.includes('1')) {
    flags |= 0b001
  }
  if (features.includes('multi_video') || features.includes('2')) {
    flags |= 0b010
  }
  if (features.includes('all_styles') || features.includes('4')) {
    flags |= 0b100
  }

  return flags
}

/**
 * 主函数
 */
function main() {
  const options = parseArgs()

  // 默认值
  const customerIndex = Number.parseInt(options.customer || '1', 10)
  const months = Number.parseInt(options.months || '12', 10)
  const featuresInput = options.features || '7'
  const maxJobs = Number.parseInt(options['max-jobs'] || '999', 10)
  const maxDuration = Number.parseInt(options['max-duration'] || '0', 10)

  // 解析功能标志
  let features: number
  if (/^\d+$/.test(featuresInput)) {
    // 数字格式（如 7 = 0b111）
    features = Number.parseInt(featuresInput, 10)
  } else {
    // 逗号分隔格式（如 single_video,multi_video）
    features = parseFeatures(featuresInput)
  }

  // 计算过期日期
  const baseDate = new Date('2025-01-01T00:00:00Z')
  const expiresAt = new Date(baseDate)
  expiresAt.setMonth(baseDate.getMonth() + months)

  // 生成授权码
  const licenseCode = generateLicenseCodeV3({
    customerIndex,
    months,
    features,
    maxJobs,
    maxDuration,
  })

  // 输出结果
  console.log('')
  console.log('✅ 授权码生成成功（V3 极简格式）！')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('授权码:')
  console.log(`  ${licenseCode}`)
  console.log(`  长度: ${licenseCode.length} 字符`)
  console.log('')
  console.log('授权信息:')
  console.log(`  客户索引: #${customerIndex}`)
  console.log(`  有效期: ${months} 个月`)
  console.log(`  过期时间: ${expiresAt.toLocaleString('zh-CN')}`)
  console.log('')
  console.log('功能权限:')
  const featureNames: string[] = []
  if (features & 0b001) featureNames.push('单视频剪辑')
  if (features & 0b010) featureNames.push('多视频混剪')
  if (features & 0b100) featureNames.push('全部风格')
  console.log(`  ${featureNames.join(', ')} (标志: ${features.toString(2).padStart(3, '0')})`)
  console.log('')
  console.log('资源限制:')
  console.log(`  最大并发任务: ${maxJobs}`)
  console.log(`  最大视频时长: ${maxDuration === 0 ? '无限制' : `${maxDuration} 小时`}`)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('💡 使用说明:')
  console.log('  1. 将授权码提供给客户')
  console.log('  2. 客户在部署时填写到 LICENSE_KEY 环境变量')
  console.log('  3. 应用启动时自动验证授权码')
  console.log('')
  console.log('📝 客户映射表:')
  console.log(`  请在 config/customer-mapping.json 中维护索引 ${customerIndex} 的客户信息`)
  console.log('')
  console.log('⚠️  注意:')
  console.log('  - V3 使用简单加密（XOR），安全性适中')
  console.log('  - 客户名称不包含在授权码中（仅索引号）')
  console.log("  - Docker 镜像显示客户为 'Customer #N'")
  console.log('')
  console.log('🔖 作者: 翔宇工作流')
  console.log('')
}

// 执行
main()
