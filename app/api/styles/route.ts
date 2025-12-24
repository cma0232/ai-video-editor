/** GET: 获取剪辑风格列表（预设 + 自定义） | POST: 创建自定义风格 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticate } from '@/lib/auth/unified-auth'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'
import { noCacheResponse } from '@/lib/utils/api-response'
import { generateCustomStyleId, isBuiltinStyle } from '@/lib/workflow/style-config'
import { styleLoader } from '@/lib/workflow/style-loader'

export async function GET(req: NextRequest) {
  const auth = await authenticate(req)

  if (auth.source === 'token' && auth.tokenId) {
    const rateLimit = checkRateLimit(auth.tokenId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limited', retry_after: Math.ceil(rateLimit.resetIn / 1000) },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        },
      )
    }
  }
  const allStyles = styleLoader.listAll()

  const builtinStyles = allStyles
    .filter((s) => isBuiltinStyle(s.id))
    .map((style) => ({
      id: style.id,
      name: style.name,
      description: style.description,
      config: {
        channel_name: style.config.channel_name,
        original_audio_scene_count: style.config.original_audio_scene_count ?? 0,
      },
      is_builtin: true,
    }))
    .sort((a, b) => {
      const numA = Number.parseInt(a.id.replace('style-', ''), 10)
      const numB = Number.parseInt(b.id.replace('style-', ''), 10)
      return numA - numB
    })

  const customStyles = allStyles
    .filter((s) => !isBuiltinStyle(s.id))
    .map((style) => ({
      id: style.id,
      name: style.name,
      description: style.description,
      config: {
        channel_name: style.config.channel_name,
        original_audio_scene_count: style.config.original_audio_scene_count ?? 0,
      },
      is_builtin: false,
    }))

  return noCacheResponse({
    builtin: builtinStyles,
    custom: customStyles,
  })
}

const createStyleSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  description: z.string().default(''),
  analysis_creative_layer: z.string().min(1, '剪辑提示词创意层不能为空'),
  audio_sync_creative_layer: z.string().optional().default(''),
  config: z.object({
    channel_name: z.string().min(1, '频道名称不能为空'),
    duration_range: z
      .object({
        min: z.number().min(1).max(60),
        max: z.number().min(1).max(60),
      })
      .default({ min: 6, max: 12 }),
    speech_rates: z.array(z.number()).length(3).default([4, 4.5, 5.5]),
    original_audio_scene_count: z.number().min(0).max(500).optional().default(0),
  }),
})

const STYLES_DIR = join(process.cwd(), 'styles')

const escapeString = (value: string): string => value.replace(/"/g, '\\"')

const toBlock = (label: string, text: string) => {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  const body = normalized
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')
  return `${label}: |\n${body}\n`
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req)

    if (auth.source === 'token' && auth.tokenId) {
      const rateLimit = checkRateLimit(`${auth.tokenId}:modify`, RATE_LIMIT_PRESETS.MODIFY)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Rate limited', retry_after: Math.ceil(rateLimit.resetIn / 1000) },
          { status: 429 },
        )
      }
    }

    const body = await req.json()
    const data = createStyleSchema.parse(body)

    const allStyles = styleLoader.listAll()
    const existingIds = allStyles.map((s) => s.id)
    const newId = generateCustomStyleId(existingIds)

    const analysisCreative = data.analysis_creative_layer.replace(/\r\n/g, '\n').trim()
    const audioCreative = data.audio_sync_creative_layer?.replace(/\r\n/g, '\n').trim() || ''

    const header = `id: "${newId}"\nname: "${escapeString(data.name)}"\ndescription: "${escapeString(data.description || `${data.name}模板`)}"\n`
    const analysisBlock = toBlock('analysis_creative_layer', analysisCreative)
    const audioBlock = audioCreative ? toBlock('audio_sync_creative_layer', audioCreative) : ''

    const configLines = ['config:']
    configLines.push(`  channel_name: "${escapeString(data.config.channel_name)}"`)
    configLines.push('  duration_range:')
    configLines.push(`    min: ${data.config.duration_range.min}`)
    configLines.push(`    max: ${data.config.duration_range.max}`)
    configLines.push('  speech_rates:')
    for (const rate of data.config.speech_rates) {
      configLines.push(`    - ${rate}`)
    }
    configLines.push(`  original_audio_scene_count: ${data.config.original_audio_scene_count}`)

    const fileContent = audioBlock
      ? `${header}\n${analysisBlock}\n${audioBlock}\n${configLines.join('\n')}\n`
      : `${header}\n${analysisBlock}\n${configLines.join('\n')}\n`

    const filePath = join(STYLES_DIR, `${newId}.yaml`)

    writeFileSync(filePath, fileContent, 'utf-8')
    styleLoader.clearCache(newId)

    const style = styleLoader.load(newId)

    return NextResponse.json(
      {
        style: {
          id: style.id,
          name: style.name,
          description: style.description,
          config: style.config,
        },
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create style',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
