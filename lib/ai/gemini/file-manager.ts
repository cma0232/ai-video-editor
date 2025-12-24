/**
 * Google GenAI 文件管理器
 * 统一管理文件上传（AI Studio 和 Vertex AI）
 *
 * v12.2: 重构为流式上传，消除 temp 目录依赖
 * v12.2.2: 集成速率限制器，处理 429 限流
 */

import * as fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import type { File as GenAIFile, GoogleGenAI } from '@google/genai'
import { MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_SIZE_DISPLAY } from '@/lib/constants/video'
import { logger } from '@/lib/utils/logger'
import { isRetryableError, withRetry } from '@/lib/utils/retry'
import { detectVideoMimeType } from '@/lib/utils/video-mime'
import type { GeminiPlatform } from '@/types/ai/gemini'
import { geminiRateLimiter } from './core/rate-limiter'

// ============================================================================
// 常量配置
// ============================================================================

// 文件处理轮询配置
// v12.2.1: 降低超时避免僵尸进程
// v16.0.1: 增大超时支持大文件（3GB+ 视频处理需要更长时间）
const FILE_PROCESSING_POLL_INTERVAL_MS = 3000
const FILE_PROCESSING_MAX_WAIT_MS = 1800_000 // 30 分钟（3GB+ 大文件处理）
const FILE_PROCESSING_MAX_ATTEMPTS = 600 // 配合 30 分钟超时（3s × 600 = 1800s）
const MAX_SAME_STATE_COUNT = 300 // 连续 300 次相同状态（15分钟）则认为卡住

// ============================================================================
// 类型定义
// ============================================================================

export interface FileUploadResult {
  uri: string
  mimeType: string
  name: string
}

export interface UploadFromUrlOptions {
  displayName?: string
  jobId?: string
  videoIndex?: number
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 等待文件处理完成（轮询 File API 状态）
 * @param client GoogleGenAI 客户端
 * @param uploadResult 上传结果
 * @param mimeType MIME 类型
 */
async function waitForFileProcessing(
  client: GoogleGenAI,
  uploadResult: GenAIFile,
  mimeType: string,
): Promise<FileUploadResult> {
  let file = uploadResult
  let pollAttempts = 0
  let sameStateCount = 0
  let lastState = file.state
  const startTime = Date.now()

  while (file.state === 'PROCESSING') {
    pollAttempts++
    const elapsed = Date.now() - startTime

    // 超时检查
    if (elapsed > FILE_PROCESSING_MAX_WAIT_MS) {
      throw new Error(`文件处理超时：等待 ${Math.round(elapsed / 1000)} 秒后仍未完成`)
    }

    // 最大轮询次数检查
    if (pollAttempts > FILE_PROCESSING_MAX_ATTEMPTS) {
      throw new Error(`文件处理失败：超过最大轮询次数 ${FILE_PROCESSING_MAX_ATTEMPTS}`)
    }

    // 状态卡住检测（v12.2.1: 避免僵尸进程）
    if (file.state === lastState) {
      sameStateCount++
      if (sameStateCount >= MAX_SAME_STATE_COUNT) {
        throw new Error(
          `文件处理状态卡住：连续 ${sameStateCount} 次返回 ${file.state}，可能 File API 异常`,
        )
      }
    } else {
      sameStateCount = 0
    }
    lastState = file.state

    logger.info('[FileManager] 等待文件处理...', {
      uri: file.uri,
      state: file.state,
      attempt: pollAttempts,
      elapsedMs: elapsed,
      sameStateCount,
    })

    await new Promise((resolve) => setTimeout(resolve, FILE_PROCESSING_POLL_INTERVAL_MS))

    // 获取最新状态
    if (!file.name) throw new Error('File name is missing')
    file = await client.files.get({ name: file.name })
  }

  if (file.state === 'FAILED') {
    throw new Error(`File API 处理失败: ${file.error?.message || 'Unknown error'}`)
  }

  logger.info('[FileManager] 文件处理完成', {
    uri: file.uri,
    state: file.state,
  })

  if (!file.uri || !file.name) {
    throw new Error('File upload incomplete: missing uri or name')
  }

  return {
    uri: file.uri,
    mimeType,
    name: file.name,
  }
}

/**
 * 从 URL 提取文件扩展名
 */
function extractExtensionFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop() || ''
    const ext = filename.split('.').pop()?.toLowerCase()
    const validExts = [
      'mp4',
      'mov',
      'avi',
      'mkv',
      'webm',
      'mpeg',
      'mpg',
      '3gp',
      '3g2',
      'wmv',
      'flv',
      'm4v',
    ]
    return ext && validExts.includes(ext) ? ext : null
  } catch {
    return null
  }
}

// ============================================================================
// 核心上传函数
// ============================================================================

/**
 * 上传本地文件到 Gemini File API
 *
 * 双层重试策略：
 * - 外层：geminiRateLimiter 处理 429 限流（长等待 + 多重试）
 * - 内层：withRetry 处理其他可重试错误（短等待）
 *
 * @param client GoogleGenAI 客户端
 * @param localFilePath 本地文件路径
 * @param displayName 显示名称（可选）
 */
export async function uploadFile(
  client: GoogleGenAI,
  localFilePath: string,
  displayName?: string,
): Promise<FileUploadResult> {
  const mimeType = detectVideoMimeType(localFilePath)

  logger.info('[FileManager] 上传本地文件到 File API', {
    localFilePath,
    displayName,
    mimeType,
  })

  // 外层：速率限制器处理 429 错误（File API 仅用于 AI Studio）
  return geminiRateLimiter.execute(
    async () => {
      // 内层：withRetry 处理其他可重试错误
      return withRetry(
        async () => {
          // 检查文件大小
          const stats = fs.statSync(localFilePath)
          if (stats.size > MAX_VIDEO_SIZE_BYTES) {
            const fileSizeMB = stats.size / (1024 * 1024)
            throw new Error(
              `文件大小 ${fileSizeMB.toFixed(0)} MB 超过限制（${MAX_VIDEO_SIZE_DISPLAY}）。请压缩视频后重试。`,
            )
          }

          logger.info('[FileManager] 文件大小检查通过', {
            fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          })

          // 异步读取文件内容
          const fileBuffer = await readFile(localFilePath)
          const arrayBuffer = fileBuffer.buffer.slice(
            fileBuffer.byteOffset,
            fileBuffer.byteOffset + fileBuffer.byteLength,
          ) as ArrayBuffer
          const blob = new Blob([arrayBuffer], { type: mimeType })

          // 上传到 File API
          const uploadResult = await client.files.upload({
            file: blob,
            config: {
              mimeType,
              displayName: displayName || path.basename(localFilePath),
            },
          })

          logger.info('[FileManager] 文件上传成功，等待处理', {
            uri: uploadResult.uri,
            name: uploadResult.name,
            state: uploadResult.state,
          })

          // 等待文件处理完成
          return waitForFileProcessing(client, uploadResult, mimeType)
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          backoff: 2,
          shouldRetry: isRetryableError, // 429 由外层 rate-limiter 处理
          onRetry: (attempt, error) => {
            logger.warn('[FileManager] 重试本地文件上传', {
              attempt,
              localFilePath,
              error: error instanceof Error ? error.message : String(error),
            })
          },
        },
      )
    },
    {
      platform: 'ai-studio', // File API 仅用于 AI Studio
      operation: `uploadFile(${path.basename(localFilePath)})`,
    },
  )
}

/**
 * 从 URL 流式上传视频到 File API（不落盘、分块读取）
 *
 * v12.2: 消除 temp 目录依赖，使用流式处理减少内存峰值
 * v12.2.1: 支持 file:// 协议的本地文件
 * v12.2.2: 集成速率限制器，处理 429 限流
 *
 * @param client GoogleGenAI 客户端
 * @param videoUrl 视频 URL（支持 http/https/file 协议）
 * @param options 上传选项
 */
export async function uploadFromUrl(
  client: GoogleGenAI,
  videoUrl: string,
  options?: UploadFromUrlOptions,
): Promise<FileUploadResult> {
  const videoLabel = options?.videoIndex ? `video-${options.videoIndex}` : 'video'

  // 检测是否为本地文件路径（file:// 协议）
  if (videoUrl.startsWith('file://')) {
    const localPath = videoUrl.replace('file://', '')
    logger.info(`[FileManager] 检测到本地文件，使用直接上传: ${videoLabel}`, {
      localPath,
      jobId: options?.jobId,
    })
    return uploadFile(client, localPath, options?.displayName)
  }

  const originalExt = extractExtensionFromUrl(videoUrl) || 'mp4'
  const mimeType = detectVideoMimeType(videoUrl)

  logger.info(`[FileManager] 开始流式下载并上传 ${videoLabel}`, {
    videoUrl,
    originalExt,
    mimeType,
    jobId: options?.jobId,
  })

  // 外层：速率限制器处理 429 错误（File API 仅用于 AI Studio）
  return geminiRateLimiter.execute(
    async () => {
      // 内层：withRetry 处理其他可重试错误
      return withRetry(
        async () => {
          // 1. 获取远程文件（流式）
          const response = await fetch(videoUrl)
          if (!response.ok || !response.body) {
            throw new Error(`下载失败: ${response.status} ${response.statusText}`)
          }

          // 2. 检查文件大小（从 Content-Length）
          const contentLength = response.headers.get('content-length')
          const fileSize = contentLength ? Number.parseInt(contentLength, 10) : 0

          if (fileSize > MAX_VIDEO_SIZE_BYTES) {
            const fileSizeMB = fileSize / (1024 * 1024)
            throw new Error(
              `${videoLabel} 文件大小 ${fileSizeMB.toFixed(0)} MB 超过限制（${MAX_VIDEO_SIZE_DISPLAY}）。请压缩视频后重试。`,
            )
          }

          logger.info(`[FileManager] ${videoLabel} 开始流式读取`, {
            jobId: options?.jobId,
            fileSizeMB: fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : 'unknown',
            mimeType,
          })

          // 3. 分块读取流数据构建 Blob
          const chunks: BlobPart[] = []
          const reader = response.body.getReader()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            // 转换 Uint8Array 为 ArrayBuffer 避免 TypeScript 类型兼容问题
            chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
          }

          const blob = new Blob(chunks, { type: mimeType })

          logger.info(`[FileManager] ${videoLabel} 流式读取完成，开始上传`, {
            jobId: options?.jobId,
            blobSize: blob.size,
          })

          // 4. 上传到 File API
          const displayName = options?.displayName || `${videoLabel}.${originalExt}`
          const uploadResult = await client.files.upload({
            file: blob,
            config: { mimeType, displayName },
          })

          logger.info(`[FileManager] ${videoLabel} 上传成功，等待处理`, {
            uri: uploadResult.uri,
            name: uploadResult.name,
            state: uploadResult.state,
            jobId: options?.jobId,
          })

          // 5. 等待文件处理完成
          return waitForFileProcessing(client, uploadResult, mimeType)
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          backoff: 2,
          shouldRetry: isRetryableError, // 429 由外层 rate-limiter 处理
          onRetry: (attempt, error) => {
            logger.warn(`[FileManager] 重试 ${videoLabel} 流式上传`, {
              attempt,
              videoUrl,
              jobId: options?.jobId,
              error: error instanceof Error ? error.message : String(error),
            })
          },
        },
      )
    },
    {
      platform: 'ai-studio', // File API 仅用于 AI Studio
      operation: `uploadFromUrl(${videoLabel})`,
    },
  )
}

/**
 * 构建视频 Part（用于 generateContent）
 */
export function buildVideoPart(
  uri: string,
  mimeType: string,
  _platform: GeminiPlatform,
  fps?: number,
) {
  return {
    fileData: {
      fileUri: uri,
      mimeType,
    },
    ...(fps && { videoMetadata: { fps } }),
  }
}

/**
 * 删除已上传的文件
 */
export async function deleteFile(client: GoogleGenAI, fileName: string): Promise<void> {
  try {
    await client.files.delete({ name: fileName })
    logger.info('[FileManager] 文件已删除', { fileName })
  } catch (error: unknown) {
    logger.warn('[FileManager] 删除文件失败', {
      fileName,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ============================================================================
// 文件元数据获取
// ============================================================================

/**
 * 秒数转时间戳格式
 * 例如：65.5 → "00:01:05.500"
 */
function secondsToTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const h = hours.toString().padStart(2, '0')
  const m = minutes.toString().padStart(2, '0')
  const s = secs.toFixed(3).padStart(6, '0')

  return `${h}:${m}:${s}`
}

/**
 * 文件元数据结果接口
 */
export interface FileMetadataResult {
  duration: number
  durationFormatted: string
  mimeType?: string
  sizeBytes?: number
}

/**
 * 从 Gemini File API 获取文件元数据
 * 用于 AI Studio 模式上传的视频，FFprobe 无法访问 File API URI
 *
 * @param client GoogleGenAI 客户端
 * @param fileName 文件名（格式：files/xxx）
 * @returns 文件元数据（包含时长信息）
 */
export async function getFileMetadata(
  client: GoogleGenAI,
  fileName: string,
): Promise<FileMetadataResult> {
  logger.info('[FileManager] 获取文件元数据', { fileName })

  const file = await client.files.get({ name: fileName })

  // videoMetadata 包含 videoDuration 字段
  // 格式为 "123.456s" 或 "123s"
  const videoMetadata = file.videoMetadata as { videoDuration?: string } | undefined
  const durationStr = videoMetadata?.videoDuration || '0s'

  // 解析时长（移除 's' 后缀）
  const duration = Number.parseFloat(durationStr.replace('s', '')) || 0

  logger.info('[FileManager] 文件元数据获取成功', {
    fileName,
    duration,
    durationStr,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
  })

  return {
    duration,
    durationFormatted: secondsToTimestamp(duration),
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes ? Number(file.sizeBytes) : undefined,
  }
}
