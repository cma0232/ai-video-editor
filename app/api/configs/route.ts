/** GET: 获取配置 | POST: 批量保存（仅 Web 端，需认证） */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth/unified-auth'
import { configsRepo } from '@/lib/db/core/configs'

export async function GET(req: NextRequest) {
  try {
    await authenticate(req)

    const configs = configsRepo.getAll()

    return NextResponse.json({
      configs,
      count: configsRepo.count(),
    })
  } catch {
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await authenticate(req)

    const body = await req.json()
    const { configs } = body

    if (!configs || typeof configs !== 'object') {
      return NextResponse.json({ error: '无效的配置数据' }, { status: 400 })
    }

    if (configs.max_concurrent_scenes !== undefined) {
      const value = Number(configs.max_concurrent_scenes)
      if (Number.isNaN(value) || value < 1 || value > 8) {
        return NextResponse.json({ error: '系统并发数必须在 1-8 之间' }, { status: 400 })
      }
    }

    if (configs.narration_batch_size !== undefined) {
      const value = Number(configs.narration_batch_size)
      if (Number.isNaN(value) || value < 1 || value > 40) {
        return NextResponse.json({ error: '旁白批量数量必须在 1-40 之间' }, { status: 400 })
      }
    }

    if (configs.gemini_video_fps !== undefined) {
      const value = Number.parseFloat(configs.gemini_video_fps)
      if (Number.isNaN(value) || value < 0.1 || value > 24.0) {
        return NextResponse.json({ error: '视频采样帧率必须在 0.1-24.0 之间' }, { status: 400 })
      }
    }

    configsRepo.setMany(configs)

    return NextResponse.json({
      success: true,
      configs: configsRepo.getAll(),
    })
  } catch {
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 })
  }
}
