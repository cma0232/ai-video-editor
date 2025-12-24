export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyApiKey } from '@/lib/api-keys/verify'
import { isAuthEnabled } from '@/lib/auth/config'
import { authenticate } from '@/lib/auth/unified-auth'
import { apiKeysRepo } from '@/lib/db/core/api-keys'
import { noCacheResponse } from '@/lib/utils/api-response'
import type { ApiKeyService } from '@/types'

const saveKeySchema = z.object({
  service: z.enum([
    'google_vertex',
    'google_ai_studio',
    'fish_audio_vertex',
    'fish_audio_ai_studio',
    'google_storage',
  ]),
  credentials: z.record(z.string(), z.string()),
})

export async function GET(request: NextRequest) {
  // 认证检查：AUTH_ENABLED=true 时必须登录
  if (isAuthEnabled()) {
    const auth = await authenticate(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
  }

  const status = apiKeysRepo.getAllStatus()
  return noCacheResponse({ keys: status })
}

export async function POST(req: NextRequest) {
  // 认证检查：AUTH_ENABLED=true 时必须登录
  if (isAuthEnabled()) {
    const auth = await authenticate(req)
    if (!auth.authenticated) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
  }

  try {
    const body = await req.json()
    const data = saveKeySchema.parse(body)

    // 直接调用验证函数（避免 Server Component 自调用问题）
    const verifyResult = await verifyApiKey(data.service as ApiKeyService, data.credentials)

    if (!verifyResult.valid) {
      return NextResponse.json(
        { error: '密钥验证失败', message: verifyResult.message },
        { status: 400 },
      )
    }

    // 验证成功，保存密钥
    apiKeysRepo.save(data.service as ApiKeyService, data.credentials)

    // 标记为已验证
    apiKeysRepo.markVerified(data.service as ApiKeyService)

    return NextResponse.json({
      success: true,
      message: '保存成功并已验证',
      verification: verifyResult,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
