export const dynamic = 'force-dynamic'
export const revalidate = 0

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import YAML from 'yaml'
import { z } from 'zod'
import { styleLoader } from '@/lib/workflow/style-loader'
import type { StylePreset } from '@/types'

const previewSchema = z.object({
  style_id: z.string().optional(), // 可选，如果是 'new' 则使用原始内容
  type: z.enum(['analysis', 'audio_sync'], {
    message: 'type必须是analysis或audio_sync',
  }),
  // 原始内容（用于未保存的风格）
  analysis_creative_layer: z.string().optional(),
  audio_sync_creative_layer: z.string().optional(),
  config: z.object({
    channel_name: z.string().optional(),
    storyboard_count: z.number().optional(),
    min_duration: z.number().optional(),
    max_duration: z.number().optional(),
    speech_rate_v1: z.number().optional(),
    speech_rate_v2: z.number().optional(),
    speech_rate_v3: z.number().optional(),
    original_audio_scene_count: z.number().optional(),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = previewSchema.parse(body)

    // 判断是加载已保存的风格还是使用原始内容
    let style: StylePreset

    // 优先使用前端传递的参数（用于编辑页面实时预览）
    // 如果没有传递创意层内容，才从文件加载
    const hasCustomCreativeLayer =
      (data.type === 'analysis' && data.analysis_creative_layer) ||
      (data.type === 'audio_sync' && data.audio_sync_creative_layer)

    if (data.style_id && data.style_id !== 'new' && !hasCustomCreativeLayer) {
      // 情况1: 从文件加载已保存的风格（风格卡片页面）
      style = styleLoader.load(data.style_id)
    } else {
      // 情况2: 使用传递的原始内容构建临时风格对象（编辑页面 + 新建风格）
      // 根据预览类型检查必需的创意层
      if (data.type === 'analysis' && !data.analysis_creative_layer) {
        return NextResponse.json(
          { error: '预览剪辑提示词时必须提供 analysis_creative_layer' },
          { status: 400 },
        )
      }
      style = {
        id: 'preview',
        name: '预览',
        description: '临时预览',
        analysis_creative_layer: data.analysis_creative_layer || '',
        audio_sync_creative_layer: data.audio_sync_creative_layer,
        config: {
          channel_name: data.config.channel_name || '频道名称',
          duration_range: {
            min: data.config.min_duration || 6,
            max: data.config.max_duration || 12,
          },
          speech_rates: [
            data.config.speech_rate_v1 || 4.0,
            data.config.speech_rate_v2 || 4.5,
            data.config.speech_rate_v3 || 5.5,
          ],
        },
      }
    }

    let fullPrompt = ''

    // 辅助函数：直接读取系统模板（不经过 YAML 解析）
    const getSystemTemplateRaw = (templateName: string): string => {
      const filePath = join(process.cwd(), 'styles', '_templates', `${templateName}.yaml`)
      try {
        const content = readFileSync(filePath, 'utf-8')
        const parsed = YAML.parse(content)
        return parsed.template || ''
      } catch {
        return ''
      }
    }

    if (data.type === 'analysis') {
      // 预览模式：直接组合创意层 + 参数层模板（不替换占位符）
      // 让用户看到完整的模板结构
      const creativeLayer = style.analysis_creative_layer || ''
      const paramsTemplate = getSystemTemplateRaw('analysis_params')
      fullPrompt = `${creativeLayer}\n\n${paramsTemplate}`.trim()
    } else {
      // 预览模式：直接组合创意层 + 批量参数层模板（不替换占位符）
      const creativeLayer =
        style.audio_sync_creative_layer || getSystemTemplateRaw('audio_sync_creative_default')
      const paramsTemplate = getSystemTemplateRaw('batch_audio_sync_params')
      fullPrompt = `${creativeLayer}\n\n${paramsTemplate}`.trim()
    }

    return NextResponse.json({
      full_prompt: fullPrompt,
      stats: {
        length: fullPrompt.length,
        lines: fullPrompt.split('\n').length,
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
