export const dynamic = 'force-dynamic'
export const revalidate = 0

import { GoogleGenAI } from '@google/genai'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SAFETY_SETTINGS } from '@/lib/ai/gemini/constants/safety-settings'
import { parseServiceAccountJson } from '@/lib/ai/gemini-utils'
import { authenticate } from '@/lib/auth/unified-auth'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'

const vertexSchema = z.object({
  platform: z.literal('vertex'),
  project_id: z.string().min(1, 'Project ID 不能为空'),
  location: z.string().optional(),
  model_id: z.string().min(1, 'Model ID 不能为空'),
  service_account_json: z.string().min(1, 'Service Account JSON 不能为空'),
  prompt: z.string().optional(),
})

const aiStudioSchema = z.object({
  platform: z.literal('ai-studio'),
  api_key: z.string().min(1, 'API Key 不能为空'),
  model_id: z.string().min(1, 'Model ID 不能为空'),
  prompt: z.string().optional(),
})

const requestSchema = z.discriminatedUnion('platform', [vertexSchema, aiStudioSchema])

const DEFAULT_PROMPT = '你好，请简单介绍一下你的能力。'

const normalizeLocation = (location?: string) => {
  const normalized = (location || '').trim().toLowerCase()
  if (!normalized) return 'us-central1'
  if (normalized === 'global') return 'global'
  return normalized
}

const normalizeModelId = (modelId: string) => modelId.replace(/^models\//, '')

export async function POST(req: NextRequest) {
  try {
    // 统一认证
    const auth = await authenticate(req)

    // Token 认证：检查速率限制（测试接口）
    if (auth.source === 'token' && auth.tokenId) {
      const rateLimit = checkRateLimit(`${auth.tokenId}:test`, RATE_LIMIT_PRESETS.TEST)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Rate limited', retry_after: Math.ceil(rateLimit.resetIn / 1000) },
          { status: 429 },
        )
      }
    }

    const body = await req.json()
    const data = requestSchema.parse(body)

    if (data.platform === 'vertex') {
      return await testVertexAI(data)
    }
    return await testAIStudio(data)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数校验失败', details: error.flatten() }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: '测试调用失败',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

async function testVertexAI(data: z.infer<typeof vertexSchema>) {
  const location = normalizeLocation(data.location)
  const modelId = normalizeModelId(data.model_id)
  const prompt = (data.prompt || DEFAULT_PROMPT).trim() || DEFAULT_PROMPT

  // 解析 Service Account JSON
  const serviceAccount = parseServiceAccountJson(data.service_account_json)

  // 使用新 SDK 创建 Vertex AI 客户端
  const ai = new GoogleGenAI({
    vertexai: true,
    project: data.project_id,
    location,
    googleAuthOptions: {
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    },
  })

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 512,
        safetySettings: SAFETY_SETTINGS,
      },
    })

    return NextResponse.json({
      text: response.text || '',
      raw: response,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: '测试调用失败',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

async function testAIStudio(data: z.infer<typeof aiStudioSchema>) {
  const modelId = normalizeModelId(data.model_id)
  const prompt = (data.prompt || DEFAULT_PROMPT).trim() || DEFAULT_PROMPT

  // 使用新 SDK 创建 AI Studio 客户端
  const ai = new GoogleGenAI({ apiKey: data.api_key })

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 2048,
        safetySettings: SAFETY_SETTINGS,
      },
    })

    // 检查是否有响应文本
    if (!response.text) {
      // 检查是否被安全过滤器阻止
      const candidates = (response as { candidates?: Array<{ finishReason?: string }> }).candidates
      if (candidates?.[0]?.finishReason) {
        const finishReason = candidates[0].finishReason
        if (finishReason !== 'STOP') {
          return NextResponse.json({
            text: '',
            error: `内容生成被阻止：${finishReason}`,
            raw: response,
          })
        }
      }
    }

    return NextResponse.json({
      text: response.text || '',
      raw: response,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: '测试调用失败',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
