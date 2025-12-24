export const dynamic = 'force-dynamic'

import { createReadStream, existsSync, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth/unified-auth'
import { jobsRepo } from '@/lib/db/core/jobs'
import * as stateManager from '@/lib/db/managers/state-manager'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * 格式化时间戳（北京时间，精确到分钟）
 * @param createdAt 任务创建时间（毫秒时间戳）
 * @returns 格式化字符串，如 "20251204-2130"
 */
function formatTimestamp(createdAt: number): string {
  const date = new Date(createdAt)
  const beijingDate = date.toLocaleString('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  // "2025-12-04 21:30" → "20251204-2130"
  return beijingDate.replace(/[-: ]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2')
}

/**
 * 下载最终成片
 * 统一下载入口，无论 AI Studio 或 Vertex AI 平台
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ========== 统一认证 ==========
  const auth = await authenticate(req)

  // Token 认证：检查速率限制
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

  const { id } = await params

  // 1. 检查任务是否存在
  const job = jobsRepo.getById(id)
  if (!job) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }

  // Token 认证：检查权限（只能访问自己创建的任务）
  if (auth.source === 'token' && auth.tokenId) {
    if (!jobsRepo.isOwnedByToken(id, auth.tokenId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // 2. 检查任务是否已完成
  if (job.status !== 'completed') {
    return NextResponse.json({ error: '任务尚未完成' }, { status: 400 })
  }

  // 生成带时间戳的文件名
  const filename = `${formatTimestamp(job.created_at)}-${id}-final.mp4`

  // 3. 获取视频文件路径
  const state = stateManager.getState(id)
  const localPath = state?.final_video_local_path

  if (!localPath) {
    return NextResponse.json({ error: '视频文件路径不存在' }, { status: 404 })
  }

  // 4. 检查文件是否存在
  if (!existsSync(localPath)) {
    return NextResponse.json({ error: '视频文件不存在' }, { status: 404 })
  }

  // 5. 获取文件信息
  const stat = statSync(localPath)
  const fileSize = stat.size

  // 6. 支持 Range 请求（视频拖动进度条）
  const range = req.headers.get('range')

  if (range) {
    // 解析 Range 头
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    const fileStream = createReadStream(localPath, { start, end })
    const webStream = Readable.toWeb(fileStream) as ReadableStream

    return new Response(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // 7. 完整文件下载
  const fileStream = createReadStream(localPath)
  const webStream = Readable.toWeb(fileStream) as ReadableStream

  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Accept-Ranges': 'bytes',
    },
  })
}
