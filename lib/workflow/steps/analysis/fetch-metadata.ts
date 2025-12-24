/**
 * 获取视频元数据步骤
 *
 * v12.4 重构：
 * - 支持 HTTP URL 直接读取（FFprobe 支持流式读取头部）
 * - 本地文件优先（如果已存在）
 * - HTTP 读取失败时自动下载到本地再读取
 * - 下载的文件设置 local_path 供后续步骤复用
 */

import { createWriteStream, existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import * as path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { detectUrlType, normalizeVideoUrl } from '@/lib/ai/gemini/utils/url-converter'
import * as jobVideosDb from '@/lib/db/tables/job-videos'
import type { MediaMetadata } from '@/lib/media'
import { getJobTempDir } from '@/lib/utils/paths'
import type { WorkflowContext } from '../../types'
import { BaseStep } from '../base'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 元数据列表项类型
 */
interface MetadataListItem {
  index: number
  metadata: Record<string, unknown>
}

/**
 * 步骤输出
 */
interface FetchMetadataOutput {
  metadataByIndex: Record<number, Record<string, unknown>>
  downloadedCount: number
}

// ============================================================================
// 核心步骤实现
// ============================================================================

/**
 * 获取视频元数据
 * 支持本地文件和 HTTP URL 两种方式
 */
export class FetchMetadataStep extends BaseStep<FetchMetadataOutput> {
  readonly id = 'fetch_metadata'
  readonly name = '获取视频元数据'

  /**
   * 返回完整输入数据（用于日志记录）
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    const jobVideos = jobVideosDb.findByJobId(ctx.jobId)
    return {
      video_count: jobVideos.length,
      videos: jobVideos.map((v, i) => ({
        index: i,
        original_url: v.original_url,
        url_type: detectUrlType(v.original_url),
        has_local_path: !!v.local_path,
      })),
      method: 'ffprobe (HTTP URL 优先，失败则下载)',
    }
  }

  async execute(ctx: WorkflowContext): Promise<FetchMetadataOutput> {
    const jobVideos = jobVideosDb.findByJobId(ctx.jobId)
    const metadataList: MetadataListItem[] = []
    const localPathUpdates: Array<{ index: number; local_path: string }> = []
    let downloadedCount = 0

    this.log(ctx, '开始获取视频元数据', { videoCount: jobVideos.length })

    for (let i = 0; i < jobVideos.length; i++) {
      const video = jobVideos[i]
      const urlType = detectUrlType(video.original_url)

      // 确定读取路径：本地文件优先
      let readPath: string
      let needsDownloadOnFail = false

      if (video.local_path && existsSync(video.local_path)) {
        // 场景 1: 已有 local_path 且文件存在
        readPath = video.local_path
        this.log(ctx, `视频 ${i + 1} 使用本地文件`, { localPath: readPath })
      } else if (urlType === 'local') {
        // 场景 2: original_url 本身是本地路径（前端上传场景）
        readPath = video.original_url
        if (!existsSync(readPath)) {
          throw new Error(`本地视频文件不存在: ${readPath}`)
        }
        this.log(ctx, `视频 ${i + 1} 使用本地文件`, { localPath: readPath })
      } else {
        // 场景 3: HTTP URL，尝试直接读取
        readPath = normalizeVideoUrl(video.original_url)
        needsDownloadOnFail = true
        this.log(ctx, `视频 ${i + 1} 尝试从 URL 读取`, { url: readPath })
      }

      // 获取元数据
      let metadata: Record<string, unknown>
      try {
        const result = await this.getMetadataWithTimeout(ctx, readPath, 30000)
        metadata = this.convertMetadata(result, video.title, video.description)

        this.log(ctx, `视频 ${i + 1} 元数据获取成功`, {
          method: needsDownloadOnFail ? 'http_direct' : 'local',
          duration: metadata.duration,
          resolution: metadata.resolution,
        })
      } catch (error) {
        // HTTP 读取失败，尝试下载
        if (needsDownloadOnFail) {
          this.log(ctx, `视频 ${i + 1} HTTP 读取失败，改为下载`, {
            error: error instanceof Error ? error.message : String(error),
          })

          const localPath = await this.downloadToLocal(ctx, video.original_url, i)
          localPathUpdates.push({ index: i, local_path: localPath })
          downloadedCount++

          // 从本地文件读取
          const result = await ctx.services.ffmpeg.getMetadata(localPath)
          metadata = this.convertMetadata(result, video.title, video.description)

          this.log(ctx, `视频 ${i + 1} 元数据获取成功（下载后）`, {
            localPath,
            duration: metadata.duration,
            resolution: metadata.resolution,
          })
        } else {
          throw error
        }
      }

      metadataList.push({ index: i, metadata })
    }

    // 批量更新元数据
    jobVideosDb.updateBatchMetadata(ctx.jobId, metadataList)

    // 批量更新 local_path（如果有下载）
    if (localPathUpdates.length > 0) {
      jobVideosDb.updateLocalPaths(ctx.jobId, localPathUpdates)
    }

    this.log(ctx, '元数据获取完成', {
      count: metadataList.length,
      downloadedCount,
    })

    return {
      metadataByIndex: Object.fromEntries(
        metadataList.map(({ index, metadata }) => [index, metadata]),
      ),
      downloadedCount,
    }
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 带超时的元数据获取
   */
  private async getMetadataWithTimeout(
    ctx: WorkflowContext,
    path: string,
    timeoutMs: number,
  ): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`FFprobe 超时 (${timeoutMs}ms): ${path}`))
      }, timeoutMs)

      ctx.services.ffmpeg
        .getMetadata(path)
        .then((result) => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  /**
   * 转换 FFprobe 结果为元数据格式
   */
  private convertMetadata(
    result: MediaMetadata,
    title?: string | null,
    description?: string | null,
  ): Record<string, unknown> {
    return {
      duration: result.duration || 0,
      duration_formatted: result.durationFormatted || '00:00:00.000',
      resolution: result.video ? `${result.video.width}x${result.video.height}` : 'unknown',
      width: result.video?.width || 0,
      height: result.video?.height || 0,
      fps: result.video?.fps || 0,
      title: title || undefined,
      description: description || undefined,
    }
  }

  /**
   * 流式下载视频到本地
   */
  private async downloadToLocal(
    ctx: WorkflowContext,
    url: string,
    videoIndex: number,
  ): Promise<string> {
    const tempDir = getJobTempDir(ctx.jobId)
    await mkdir(tempDir, { recursive: true })

    const localPath = path.join(tempDir, `video-${videoIndex + 1}.mp4`)

    // 如果文件已存在，直接返回
    if (existsSync(localPath)) {
      return localPath
    }

    // 规范化 URL
    const normalizedUrl = normalizeVideoUrl(url)

    // 流式下载
    const response = await fetch(normalizedUrl)
    if (!response.ok || !response.body) {
      throw new Error(`下载视频失败: ${response.status} ${response.statusText} - ${normalizedUrl}`)
    }

    const writeStream = createWriteStream(localPath)
    const nodeStream = Readable.fromWeb(response.body as import('stream/web').ReadableStream)
    await pipeline(nodeStream, writeStream)

    const contentLength = response.headers.get('content-length')
    const fileSizeMB = contentLength
      ? (Number(contentLength) / (1024 * 1024)).toFixed(2)
      : 'unknown'

    this.log(ctx, `视频 ${videoIndex + 1} 下载完成`, { localPath, fileSizeMB })

    return localPath
  }
}
