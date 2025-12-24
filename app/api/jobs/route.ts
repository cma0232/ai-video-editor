/** POST: 创建任务（校验 → 入库 → 入队列） | GET: 分页查询任务列表 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getMaxConcurrentScenes } from '@/lib/ai/gemini/credentials-provider'
import { normalizeVideoUrl } from '@/lib/ai/gemini/utils/url-converter'
import { authenticate } from '@/lib/auth/unified-auth'
import { jobsRepo } from '@/lib/db/core/jobs'
import { initState } from '@/lib/db/managers/state-manager'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'
import { noCacheResponse } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { styleLoader } from '@/lib/workflow/style-loader'
import { QUEUE_FULL_ERROR, taskQueue } from '@/lib/workflow/task-queue'
import { selectWorkflow } from '@/lib/workflow/workflows'
import type { JobStatus, StylePreset } from '@/types'

function extractLabelFromUrl(url: string, fallbackIndex: number): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop()

    if (filename && filename !== '') {
      let decoded: string
      try {
        decoded = decodeURIComponent(filename)
      } catch {
        decoded = filename
      }

      const label = decoded
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 30)

      if (label.length > 0) {
        return label
      }
    }
  } catch {}

  return `video_${fallbackIndex}`
}

/** 支持本地路径、File API URI、GCS URI、HTTP/HTTPS */
function validateVideoUrl(url: string): { valid: boolean; message?: string } {
  if (url.startsWith('/')) {
    if (!url.toLowerCase().endsWith('.mp4')) {
      return { valid: false, message: '不支持的视频格式，请使用 MP4 格式' }
    }
    return { valid: true }
  }
  if (url.includes('generativelanguage.googleapis.com/v1beta/files/')) return { valid: true }
  if (url.startsWith('gs://')) return { valid: true }

  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, message: '视频 URL 必须是 HTTP 或 HTTPS 协议' }
    }
  } catch {
    return { valid: false, message: '视频 URL 格式无效' }
  }

  return { valid: true }
}

const videoInputSchema = z.object({
  url: z.string().min(1, '视频 URL 不能为空'),
  label: z.string().max(50, '视频标签最多 50 个字符').optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  local_path: z.string().optional(),
})

const createJobSchema = z.object({
  input_videos: z.array(videoInputSchema).min(1, '至少需要 1 个视频').max(10, '最多支持 10 个视频'),
  style_id: z.string().min(1, 'style_id 不能为空'),
  config: z
    .object({
      max_concurrent_scenes: z.number().int().min(1).max(8).optional(),
      storyboard_count: z.number().int().min(3).max(100).optional(),
      gemini_platform: z.enum(['vertex', 'ai-studio']).optional(),
      script_outline: z.string().max(5000).optional(),
      original_audio_scene_count: z.number().int().min(0).max(500).optional(),
      bgm_url: z.string().url().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req)

    if (auth.source === 'token' && auth.tokenId) {
      const rateLimit = checkRateLimit(`${auth.tokenId}:create`, RATE_LIMIT_PRESETS.CREATE_JOB)
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

    logger.info('Received job creation request', { authSource: auth.source, tokenId: auth.tokenId })
    const body = await req.json()
    const data = createJobSchema.parse(body)

    for (const video of data.input_videos) {
      const urlCheck = validateVideoUrl(video.url)
      if (!urlCheck.valid) {
        return NextResponse.json(
          { error: 'Invalid request body', message: urlCheck.message },
          { status: 400 },
        )
      }
    }

    if (!data.input_videos.length) {
      return NextResponse.json({ error: 'Missing input_videos' }, { status: 400 })
    }

    const inputVideos = data.input_videos.map((v, i) => {
      const url = v.url.startsWith('/') ? v.url : normalizeVideoUrl(v.url)

      return {
        ...v,
        url,
        label: v.label?.trim() || extractLabelFromUrl(v.url, i + 1),
        local_path: v.local_path,
      }
    })

    let style: StylePreset
    try {
      style = styleLoader.load(data.style_id)
    } catch {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    const defaultStoryboardCount = 6
    const storyboardCount =
      data.config?.storyboard_count && Number.isFinite(data.config.storyboard_count)
        ? data.config.storyboard_count
        : defaultStoryboardCount
    const defaultConcurrency = getMaxConcurrentScenes()

    const finalConfig = {
      max_concurrent_scenes: data.config?.max_concurrent_scenes || defaultConcurrency,
      storyboard_count: storyboardCount,
      gemini_platform: data.config?.gemini_platform,
      script_outline: data.config?.script_outline,
      original_audio_scene_count: data.config?.original_audio_scene_count ?? 0,
      bgm_url: data.config?.bgm_url,
    }

    const jobId = jobsRepo.create({
      input_videos: inputVideos,
      style_id: data.style_id,
      style_name: style.name,
      config: finalConfig,
      source: auth.source === 'token' ? 'api' : 'web',
      api_token_id: auth.tokenId || undefined,
    })

    // 同步初始化（解决查询时 state 为空的时序问题）
    initState(jobId)

    logger.info('Job created successfully ', {
      jobId,
      styleId: data.style_id,
      videoCount: inputVideos.length,
      storyboardCount,
    })

    const workflow = selectWorkflow(inputVideos.length)

    try {
      await taskQueue.enqueue(jobId, workflow)
      const queueStatus = taskQueue.getStatus()

      return NextResponse.json({
        job_id: jobId,
        video_count: inputVideos.length,
        queue_status: {
          running: queueStatus.running,
          max_concurrent: queueStatus.maxConcurrent,
        },
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (errorMessage === QUEUE_FULL_ERROR) {
        logger.warn(`[API] 任务已满，拒绝创建 ${jobId}`)
        jobsRepo.delete(jobId)
        return NextResponse.json(
          {
            error: '已有任务正在运行，请等待完成后再创建',
            code: QUEUE_FULL_ERROR,
          },
          { status: 409 },
        )
      }

      logger.error(`[API] 启动任务失败 ${jobId}`, { error: errorMessage })
      jobsRepo.update(jobId, {
        status: 'failed',
        error_message: `启动失败: ${errorMessage}`,
      })
      return NextResponse.json(
        { error: 'Failed to start job', message: errorMessage },
        { status: 500 },
      )
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid job creation request', { errors: error.issues })
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400 },
      )
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to create job', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: errorMessage,
      },
      { status: 500 },
    )
  }
}

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

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const allowedStatuses: JobStatus[] = ['pending', 'processing', 'completed', 'failed']
  const status = allowedStatuses.includes(statusParam as JobStatus)
    ? (statusParam as JobStatus)
    : undefined
  const parsedLimit = Number(searchParams.get('limit'))
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20
  const parsedOffset = Number(searchParams.get('offset'))
  const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0

  // Token 认证只返回该 Token 创建的任务
  if (auth.source === 'token' && auth.tokenId) {
    const jobs = jobsRepo.listByTokenId(auth.tokenId, { status, limit, offset })
    const total = jobsRepo.countByTokenId(auth.tokenId, { status })
    return noCacheResponse({ jobs, total, limit, offset })
  }

  const jobs = jobsRepo.list({ status, limit, offset })
  const total = jobsRepo.count({ status })

  return noCacheResponse({ jobs, total, limit, offset })
}
