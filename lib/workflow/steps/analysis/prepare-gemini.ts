/**
 * 准备 Gemini 输入步骤
 *
 * 智能路由：根据视频来源和平台决定最优上传策略
 *
 * Vertex AI 模式：
 * - 本地文件 → 上传到 GCS
 * - GCS URL → 直接转 gs:// URI（零传输）
 * - R2/S3/HTTP URL → 流式转发到 GCS（不落本地）
 *
 * AI Studio 模式：
 * - 本地文件 → 上传到 File API
 * - 任何 URL → 下载到本地 → 上传到 File API
 */

import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import * as path from 'node:path'
import { uploadFile } from '@/lib/ai/gemini/file-manager'
import {
  convertToGsUri,
  detectUrlType,
  normalizeVideoUrl,
  type UrlStorageType,
} from '@/lib/ai/gemini/utils/url-converter'
import * as jobVideosDb from '@/lib/db/tables/job-videos'
import { downloadWithResume } from '@/lib/media/utils/download'
import { getJobTempDir } from '@/lib/utils/paths'
import type { JobVideo } from '@/types'
import type { WorkflowContext } from '../../types'
import { BaseStep } from '../base'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 单个视频的准备结果
 */
interface GeminiPrepareResult {
  index: number
  gemini_uri: string
  gcs_gs_uri?: string
  gcs_https_url?: string
  local_path?: string
}

/**
 * 步骤输出
 */
export interface PrepareGeminiOutput {
  platform: 'vertex' | 'ai-studio'
  results: GeminiPrepareResult[]
  uploadMethod: string
  stats: {
    directGcs: number // GCS URL 直接转换数量
    streamTransfer: number // 流式转发数量
    localUpload: number // 本地文件上传数量
    downloaded: number // 下载后上传数量
  }
}

// ============================================================================
// 核心步骤实现
// ============================================================================

/**
 * 准备 Gemini 输入步骤
 * 智能路由：根据视频来源和平台决定最优上传策略
 */
export class PrepareGeminiStep extends BaseStep<PrepareGeminiOutput> {
  readonly id = 'prepare_gemini'
  readonly name = '准备 Gemini 输入'

  /**
   * 返回完整输入数据（用于日志记录）
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    const jobVideos = jobVideosDb.findByJobId(ctx.jobId)
    return {
      platform: ctx.features.platform,
      video_count: jobVideos.length,
      videos: jobVideos.map((v, i) => ({
        index: i,
        original_url: v.original_url,
        url_type: detectUrlType(v.original_url),
        has_local_path: !!v.local_path,
      })),
    }
  }

  async execute(ctx: WorkflowContext): Promise<PrepareGeminiOutput> {
    const platform = ctx.features.platform
    const jobVideos = jobVideosDb.findByJobId(ctx.jobId)

    this.log(ctx, `开始准备 Gemini 输入 (${platform})`, {
      videoCount: jobVideos.length,
    })

    const results: GeminiPrepareResult[] = []
    const stats = {
      directGcs: 0,
      streamTransfer: 0,
      localUpload: 0,
      downloaded: 0,
    }

    for (let i = 0; i < jobVideos.length; i++) {
      const video = jobVideos[i]
      const urlType = detectUrlType(video.original_url)

      this.log(ctx, `处理视频 ${i + 1}`, {
        originalUrl: video.original_url,
        urlType,
        hasLocalPath: !!video.local_path,
      })

      let result: GeminiPrepareResult

      if (platform === 'vertex') {
        const prepareResult = await this.prepareForVertex(ctx, video, i, urlType)
        result = prepareResult.result
        // 更新统计
        if (prepareResult.method === 'direct_gcs') stats.directGcs++
        else if (prepareResult.method === 'stream_transfer') stats.streamTransfer++
        else if (prepareResult.method === 'local_upload') stats.localUpload++
      } else {
        const prepareResult = await this.prepareForAiStudio(ctx, video, i, urlType)
        result = prepareResult.result
        // 更新统计
        if (prepareResult.method === 'local_upload') stats.localUpload++
        else if (prepareResult.method === 'downloaded') stats.downloaded++
      }

      results.push(result)
    }

    // 批量更新数据库
    jobVideosDb.updateGeminiUris(ctx.jobId, results)

    const uploadMethod =
      platform === 'vertex'
        ? `GCS (直接: ${stats.directGcs}, 流式: ${stats.streamTransfer}, 上传: ${stats.localUpload})`
        : `File API (上传: ${stats.localUpload}, 下载: ${stats.downloaded})`

    this.log(ctx, '准备完成', {
      platform,
      uploadMethod,
      stats,
    })

    return {
      platform,
      results,
      uploadMethod,
      stats,
    }
  }

  // ============================================================================
  // Vertex AI 模式
  // ============================================================================

  private async prepareForVertex(
    ctx: WorkflowContext,
    video: JobVideo,
    index: number,
    urlType: UrlStorageType,
  ): Promise<{ result: GeminiPrepareResult; method: string }> {
    // 场景 1: 本地文件 → 上传到 GCS
    // 包括：video.local_path 存在，或 original_url 本身就是本地路径
    let localPath = video.local_path
    if (urlType === 'local') {
      localPath = localPath || video.original_url
    }

    if (localPath && existsSync(localPath)) {
      this.log(ctx, `视频 ${index + 1} 从本地上传到 GCS`, {
        localPath,
      })

      const destination = `jobs/${ctx.jobId}/video-${index + 1}-${Date.now()}.mp4`
      const { gsUri, publicUrl } = await ctx.services.gcs.uploadFile(localPath, {
        destination,
        contentType: 'video/mp4',
        publicRead: true,
      })

      return {
        result: {
          index,
          gemini_uri: gsUri,
          gcs_gs_uri: gsUri,
          gcs_https_url: publicUrl,
          local_path: localPath,
        },
        method: 'local_upload',
      }
    }

    // 场景 2: GCS URL → 直接转 gs:// URI（零传输）
    if (urlType === 'gcs') {
      const gsUri = convertToGsUri(video.original_url)
      const httpsUrl = normalizeVideoUrl(video.original_url)

      this.log(ctx, `视频 ${index + 1} GCS 直接转换（零传输）`, {
        gsUri,
      })

      return {
        result: {
          index,
          gemini_uri: gsUri,
          gcs_gs_uri: gsUri,
          gcs_https_url: httpsUrl,
        },
        method: 'direct_gcs',
      }
    }

    // 场景 3: R2/S3/HTTP URL → 流式转发到 GCS（不落本地）
    this.log(ctx, `视频 ${index + 1} 流式转发到 GCS`, {
      sourceUrl: video.original_url,
      urlType,
    })

    const destination = `jobs/${ctx.jobId}/video-${index + 1}-${Date.now()}.mp4`
    const sourceUrl = normalizeVideoUrl(video.original_url)

    const { gsUri, publicUrl } = await ctx.services.gcs.uploadFromUrlStreaming(sourceUrl, {
      destination,
      contentType: 'video/mp4',
      publicRead: true,
    })

    return {
      result: {
        index,
        gemini_uri: gsUri,
        gcs_gs_uri: gsUri,
        gcs_https_url: publicUrl,
      },
      method: 'stream_transfer',
    }
  }

  // ============================================================================
  // AI Studio 模式
  // ============================================================================

  private async prepareForAiStudio(
    ctx: WorkflowContext,
    video: JobVideo,
    index: number,
    urlType: UrlStorageType,
  ): Promise<{ result: GeminiPrepareResult; method: string }> {
    let localPath = video.local_path
    let method = 'local_upload'

    // 场景 1: original_url 本身就是本地路径（前端上传场景）
    if (urlType === 'local') {
      // 优先使用 local_path，否则使用 original_url
      localPath = localPath || video.original_url
      if (!existsSync(localPath)) {
        throw new Error(`本地视频文件不存在: ${localPath}`)
      }
      this.log(ctx, `视频 ${index + 1} 使用本地文件`, { localPath })
    }
    // 场景 2: 有 local_path 且文件存在
    else if (localPath && existsSync(localPath)) {
      this.log(ctx, `视频 ${index + 1} 使用已有本地文件`, { localPath })
    }
    // 场景 3: 需要从远程 URL 下载
    else {
      this.log(ctx, `视频 ${index + 1} 下载到本地`, {
        sourceUrl: video.original_url,
        urlType,
      })

      localPath = await this.downloadToLocal(ctx, video.original_url, index)
      method = 'downloaded'
    }

    // 上传到 File API
    this.log(ctx, `视频 ${index + 1} 上传到 File API`, {
      localPath,
    })

    const client = ctx.services.gemini.getClient('ai-studio')
    const uploadResult = await uploadFile(client, localPath, `${ctx.jobId}-video-${index + 1}`)

    return {
      result: {
        index,
        gemini_uri: uploadResult.uri,
        local_path: localPath,
      },
      method,
    }
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 下载视频到本地（支持断点续传）
   */
  private async downloadToLocal(
    ctx: WorkflowContext,
    url: string,
    videoIndex: number,
  ): Promise<string> {
    const tempDir = getJobTempDir(ctx.jobId)
    await mkdir(tempDir, { recursive: true })

    const localPath = path.join(tempDir, `video-${videoIndex + 1}.mp4`)
    const normalizedUrl = normalizeVideoUrl(url)

    // 使用稳定下载器（支持断点续传 + 自动重试，默认 20 次 × 60 秒 = 20 分钟）
    const result = await downloadWithResume({
      url: normalizedUrl,
      destPath: localPath,
      onProgress: (downloaded, total) => {
        const percent = ((downloaded / total) * 100).toFixed(1)
        const downloadedMB = (downloaded / (1024 * 1024)).toFixed(1)
        const totalMB = (total / (1024 * 1024)).toFixed(1)
        this.log(ctx, `视频 ${videoIndex + 1} 下载进度: ${percent}% (${downloadedMB}/${totalMB}MB)`)
      },
    })

    const fileSizeMB = (result.size / (1024 * 1024)).toFixed(2)
    this.log(ctx, `视频 ${videoIndex + 1} 下载完成`, {
      localPath,
      fileSizeMB: `${fileSizeMB}MB`,
      resumed: result.resumed,
    })

    return localPath
  }
}
