export const dynamic = 'force-dynamic'
export const revalidate = 0

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import YAML from 'yaml'
import { z } from 'zod'
import { styleLoader } from '@/lib/workflow/style-loader'

// 请求验证
const fullPreviewSchema = z.object({
  style_id: z.string().min(1, 'style_id 不能为空'),
})

// 辅助函数：直接读取系统模板
function getSystemTemplateRaw(templateName: string): string {
  const filePath = join(process.cwd(), 'styles', '_templates', `${templateName}.yaml`)
  try {
    const content = readFileSync(filePath, 'utf-8')
    const parsed = YAML.parse(content)
    return parsed.template || ''
  } catch {
    return ''
  }
}

// 计算统计信息
function getStats(text: string) {
  return {
    length: text.length,
    lines: text.split('\n').length,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = fullPreviewSchema.parse(body)

    // 清除缓存确保获取最新数据
    styleLoader.clearCache(data.style_id)

    // 加载完整风格
    const style = styleLoader.load(data.style_id)

    // 构建视频分析完整提示词（创意层 + 参数层模板）
    const analysisCreativeLayer = style.analysis_creative_layer || ''
    const analysisParamsTemplate = getSystemTemplateRaw('analysis_params')
    const analysisFullPrompt = `${analysisCreativeLayer}\n\n${analysisParamsTemplate}`.trim()

    // 构建音画同步完整提示词（创意层 + 参数层模板）
    const hasCustomAudioSync = !!style.audio_sync_creative_layer
    const audioSyncCreativeLayer = hasCustomAudioSync
      ? style.audio_sync_creative_layer
      : getSystemTemplateRaw('audio_sync_creative_default')
    const audioSyncParamsTemplate = getSystemTemplateRaw('batch_audio_sync_params')
    const audioSyncFullPrompt = `${audioSyncCreativeLayer}\n\n${audioSyncParamsTemplate}`.trim()

    return NextResponse.json({
      style: {
        name: style.name,
        description: style.description,
        config: {
          channel_name: style.config.channel_name,
          duration_range: style.config.duration_range,
          speech_rates: style.config.speech_rates,
          original_audio_scene_count: style.config.original_audio_scene_count,
        },
      },
      analysis_prompt: {
        full_prompt: analysisFullPrompt,
        stats: getStats(analysisFullPrompt),
      },
      audio_sync_prompt: {
        full_prompt: audioSyncFullPrompt,
        stats: getStats(audioSyncFullPrompt),
        is_default: !hasCustomAudioSync,
      },
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '请求参数错误', details: error.flatten() }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: '生成预览失败',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
