export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_SIZE_DISPLAY } from '@/lib/constants/video'
import { apiKeysRepo } from '@/lib/db/core/api-keys'
import type { ApiKeyService } from '@/types'

const validateSchema = z.object({
  platform: z.enum(['vertex', 'ai-studio']),
  videoFile: z
    .object({
      size: z.number(),
      type: z.string(),
      name: z.string(),
    })
    .optional(),
  // videoUrl 可以是 URL 或本地路径（以 / 开头）
  videoUrl: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = validateSchema.parse(body)

    // 1. 检查平台服务配置完整性
    const platformCheck = checkPlatformServices(data.platform)

    if (!platformCheck.isComplete) {
      return NextResponse.json(
        {
          valid: false,
          error: '平台配置不完整',
          message: `缺少以下服务配置：${platformCheck.missingServices.join('、')}`,
          details: platformCheck,
        },
        { status: 400 },
      )
    }

    // 2. 如果是文件上传，检查文件大小和格式
    if (data.videoFile) {
      const fileCheck = validateVideoFile(data.videoFile, data.platform)
      if (!fileCheck.valid) {
        return NextResponse.json(
          {
            valid: false,
            error: '文件校验失败',
            message: fileCheck.message,
          },
          { status: 400 },
        )
      }
    }

    // 3. 如果是 URL，基本格式检查
    if (data.videoUrl) {
      const urlCheck = validateVideoUrl(data.videoUrl)
      if (!urlCheck.valid) {
        return NextResponse.json(
          {
            valid: false,
            error: 'URL 校验失败',
            message: urlCheck.message,
          },
          { status: 400 },
        )
      }
    }

    return NextResponse.json({
      valid: true,
      message: '校验通过',
      platform: data.platform,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { valid: false, error: '参数错误', details: error.issues },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        valid: false,
        error: '校验失败',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// 检查平台服务配置完整性
function checkPlatformServices(platform: 'vertex' | 'ai-studio') {
  const allStatuses = apiKeysRepo.getAllStatus()

  const requirements =
    platform === 'vertex'
      ? [
          { service: 'google_vertex' as ApiKeyService, name: 'Google Vertex AI' },
          { service: 'google_storage' as ApiKeyService, name: 'Google Cloud Storage' },
        ]
      : [{ service: 'google_ai_studio' as ApiKeyService, name: 'Google AI Studio' }]

  const requiredServices = requirements.map((req) => {
    const status = allStatuses.find((s) => s.service === req.service)
    return {
      service: req.service,
      name: req.name,
      configured: status?.is_configured || false,
      verified: status?.is_verified || false,
    }
  })

  const missingServices = requiredServices
    .filter((s) => !s.configured || !s.verified)
    .map((s) => s.name)

  return {
    platform,
    requiredServices,
    isComplete: missingServices.length === 0,
    missingServices,
  }
}

// 校验视频文件
function validateVideoFile(
  file: { size: number; type: string; name: string },
  _platform: 'vertex' | 'ai-studio',
) {
  // 统一文件大小限制
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      message: `文件大小超过限制（${MAX_VIDEO_SIZE_DISPLAY}），请压缩视频后重试`,
    }
  }

  // 检查文件格式
  const validTypes = ['video/mp4']
  if (!validTypes.includes(file.type) && !file.name.match(/\.mp4$/i)) {
    return {
      valid: false,
      message: '不支持的视频格式，请使用 MP4 格式',
    }
  }

  return { valid: true }
}

// 校验视频 URL（基本格式检查）
function validateVideoUrl(url: string) {
  // 本地路径（以 / 开头）直接通过
  if (url.startsWith('/')) {
    // 检查文件扩展名
    if (!url.toLowerCase().endsWith('.mp4')) {
      return {
        valid: false,
        message: '不支持的视频格式，请使用 MP4 格式',
      }
    }
    return { valid: true }
  }

  // File API URI 直接通过（AI Studio 预上传的视频）
  if (url.includes('generativelanguage.googleapis.com/v1beta/files/')) {
    return { valid: true }
  }

  // 检查是否为有效的 HTTP/HTTPS URL
  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        valid: false,
        message: '视频 URL 必须是 HTTP 或 HTTPS 协议',
      }
    }
  } catch {
    return {
      valid: false,
      message: '视频 URL 格式无效',
    }
  }

  // 检查文件扩展名（与前端 ACCEPTED_VIDEO_TYPES 保持一致）
  // File API URI 已在上方通过，此处只检查普通 URL
  const videoExtensions = ['.mp4']
  const hasVideoExtension = videoExtensions.some((ext) => url.toLowerCase().includes(ext))

  if (!hasVideoExtension) {
    return {
      valid: false,
      message: '视频 URL 应包含有效的视频文件扩展名（mp4）',
    }
  }

  return { valid: true }
}
