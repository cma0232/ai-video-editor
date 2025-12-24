export const dynamic = 'force-dynamic'
export const revalidate = 0

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

const TEMPLATES_DIR = join(process.cwd(), 'styles/_templates')

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params

    // 只允许访问特定的模板文件
    const allowedFiles = [
      'audio_sync_creative_default.yaml',
      'batch_audio_sync_params.yaml',
      'analysis_params.yaml',
    ]

    if (!allowedFiles.includes(name)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    const filePath = join(TEMPLATES_DIR, name)
    const content = readFileSync(filePath, 'utf-8')

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error: unknown) {
    logger.error('[styles/templates] 读取模板文件失败', { error })
    return NextResponse.json({ error: '读取模板文件失败' }, { status: 500 })
  }
}
