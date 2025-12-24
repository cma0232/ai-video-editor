export const dynamic = 'force-dynamic'
export const revalidate = 0

import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticate } from '@/lib/auth/unified-auth'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'
import { styleLoader } from '@/lib/workflow/style-loader'

const STYLES_DIR = join(process.cwd(), 'styles')

const updateStyleSchema = z.object({
  name: z.string().min(1, '名称不能为空').optional(),
  description: z.string().optional(),
  analysis_creative_layer: z.string().min(1, '分析创意层不能为空').optional(),
  audio_sync_creative_layer: z.string().optional(),
  config: z
    .object({
      channel_name: z.string().optional(),
      min_duration: z.number().optional(),
      max_duration: z.number().optional(),
      speech_rate_v1: z.number().optional(),
      speech_rate_v2: z.number().optional(),
      speech_rate_v3: z.number().optional(),
    })
    .optional(),
})

const escapeString = (value: string): string => value.replace(/"/g, '\\"')

const toBlock = (label: string, text: string) => {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  const body = normalized
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')
  return `${label}: |\n${body}\n`
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 统一认证
    const auth = await authenticate(req)

    // Token 认证：检查速率限制（查询操作）
    if (auth.source === 'token' && auth.tokenId) {
      const rateLimit = checkRateLimit(`${auth.tokenId}:query`, RATE_LIMIT_PRESETS.QUERY)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Rate limited', retry_after: Math.ceil(rateLimit.resetIn / 1000) },
          { status: 429 },
        )
      }
    }

    const { id } = await params
    const style = styleLoader.load(id)

    return NextResponse.json({ style })
  } catch (_error: unknown) {
    return NextResponse.json({ error: 'Style not found' }, { status: 404 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 统一认证
    const auth = await authenticate(req)

    // Token 认证：检查速率限制（修改操作）
    if (auth.source === 'token' && auth.tokenId) {
      const rateLimit = checkRateLimit(`${auth.tokenId}:modify`, RATE_LIMIT_PRESETS.MODIFY)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Rate limited', retry_after: Math.ceil(rateLimit.resetIn / 1000) },
          { status: 429 },
        )
      }
    }

    const { id } = await params
    const body = await req.json()
    const data = updateStyleSchema.parse(body)

    // 加载现有风格
    const existingStyle = styleLoader.load(id)

    // 合并数据
    const name = data.name || existingStyle.name
    const description = data.description || existingStyle.description
    const analysisCreative = (data.analysis_creative_layer || existingStyle.analysis_creative_layer)
      .replace(/\r\n/g, '\n')
      .trim()
    const audioCreative = (
      data.audio_sync_creative_layer ||
      existingStyle.audio_sync_creative_layer ||
      ''
    )
      .replace(/\r\n/g, '\n')
      .trim()

    // 构建YAML
    const header = `id: ${id}\nname: "${escapeString(name)}"\ndescription: "${escapeString(description)}"\n\n# 双层架构 - 分析提示词创意层\n`
    const analysisBlock = toBlock('analysis_creative_layer', analysisCreative)
    const audioBlock = audioCreative
      ? `\n# 双层架构 - 音画同步提示词创意层（可选，不写则使用系统默认）\n${toBlock('audio_sync_creative_layer', audioCreative)}`
      : ''

    // 构建config块
    const configLines = [
      '# 双层架构说明:',
      '# - 参数层(输入信息、输出规范)使用系统默认模板(styles/_templates/analysis_params.yaml)',
      '# - 系统会自动组合：你的创意层 + 参数层（变量替换后）',
      '',
      'config:',
    ]

    const channelName = data.config?.channel_name || existingStyle.config.channel_name || name
    configLines.push(`  channel_name: "${escapeString(channelName)}"`)

    // duration_range
    configLines.push('  duration_range:')
    const minDuration = data.config?.min_duration || existingStyle.config.duration_range.min
    const maxDuration = data.config?.max_duration || existingStyle.config.duration_range.max
    configLines.push(`    min: ${minDuration}`)
    configLines.push(`    max: ${maxDuration}`)

    // speech_rates
    const speechRates = existingStyle.config.speech_rates
    configLines.push('  speech_rates:')
    for (const rate of speechRates) {
      configLines.push(`    - ${rate}`)
    }

    const fileContent = `${header}${analysisBlock}${audioBlock}\n${configLines.join('\n')}\n`
    const filePath = join(STYLES_DIR, `${id}.yaml`)

    await writeFile(filePath, fileContent, 'utf-8')
    styleLoader.clearCache(id)

    const updatedStyle = styleLoader.load(id)

    return NextResponse.json({
      style: {
        id: updatedStyle.id,
        name: updatedStyle.name,
        description: updatedStyle.description,
        config: {
          channel_name: updatedStyle.config.channel_name,
        },
      },
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: '更新风格失败',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 统一认证
    const auth = await authenticate(req)

    // Token 认证：检查速率限制（修改操作）
    if (auth.source === 'token' && auth.tokenId) {
      const rateLimit = checkRateLimit(`${auth.tokenId}:modify`, RATE_LIMIT_PRESETS.MODIFY)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Rate limited', retry_after: Math.ceil(rateLimit.resetIn / 1000) },
          { status: 429 },
        )
      }
    }

    const { id } = await params
    const filePath = join(STYLES_DIR, `${id}.yaml`)

    // 确认风格存在
    styleLoader.load(id)

    await unlink(filePath)
    styleLoader.clearCache(id)

    return NextResponse.json({ success: true })
  } catch (_error: unknown) {
    return NextResponse.json({ error: '删除风格失败' }, { status: 400 })
  }
}
