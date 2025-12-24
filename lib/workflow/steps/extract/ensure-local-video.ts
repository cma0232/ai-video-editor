/**
 * 确保本地视频步骤
 *
 * 在 FFmpeg 拆条之前执行，确保所有视频都有本地副本
 *
 * 场景：
 * - 本地文件已存在 → 跳过
 * - GCS URL + Vertex 模式 → PrepareGeminiStep 未下载，此处下载
 * - AI Studio 模式 → PrepareGeminiStep 已下载，此处跳过
 */

import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import * as path from 'node:path'
import { normalizeVideoUrl } from '@/lib/ai/gemini/utils/url-converter'
import * as jobVideosDb from '@/lib/db/tables/job-videos'
import { downloadWithResume } from '@/lib/media/utils/download'
import { getJobTempDir } from '@/lib/utils/paths'
import type { WorkflowContext } from '../../types'
import { BaseStep } from '../base'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 步骤输出
 */
export interface EnsureLocalVideoOutput {
  totalCount: number
  downloadedCount: number
  skippedCount: number
  localPaths: string[]
}

// ============================================================================
// 核心步骤实现
// ============================================================================

/**
 * 确保本地视频步骤
 * 在 FFmpeg 拆条之前确保所有视频都有本地副本
 */
export class EnsureLocalVideoStep extends BaseStep<EnsureLocalVideoOutput> {
  readonly id = 'ensure_local_video'
  readonly name = '准备本地视频'

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
        has_local_path: !!v.local_path,
        local_path_exists: v.local_path ? existsSync(v.local_path) : false,
      })),
    }
  }

  async execute(ctx: WorkflowContext): Promise<EnsureLocalVideoOutput> {
    const jobVideos = jobVideosDb.findByJobId(ctx.jobId)
    const localPaths: string[] = []
    const updateList: Array<{ index: number; local_path: string }> = []
    let downloadedCount = 0
    let skippedCount = 0

    this.log(ctx, '开始确保本地视频副本', { videoCount: jobVideos.length })

    for (let i = 0; i < jobVideos.length; i++) {
      const video = jobVideos[i]

      // 已有本地副本且文件存在，跳过
      if (video.local_path && existsSync(video.local_path)) {
        this.log(ctx, `视频 ${i + 1} 已有本地副本，跳过`, {
          localPath: video.local_path,
        })
        localPaths.push(video.local_path)
        skippedCount++
        continue
      }

      // 需要下载
      this.log(ctx, `视频 ${i + 1} 需要下载`, {
        originalUrl: video.original_url,
        gcsHttpsUrl: video.gcs_https_url,
      })

      // 优先使用 GCS HTTPS URL（如果有），否则使用原始 URL
      const downloadUrl = video.gcs_https_url || video.original_url
      const localPath = await this.downloadToLocal(ctx, downloadUrl, i)

      localPaths.push(localPath)
      updateList.push({ index: i, local_path: localPath })
      downloadedCount++
    }

    // 批量更新数据库
    if (updateList.length > 0) {
      jobVideosDb.updateLocalPaths(ctx.jobId, updateList)
    }

    this.log(ctx, '本地视频准备完成', {
      totalCount: jobVideos.length,
      downloadedCount,
      skippedCount,
    })

    return {
      totalCount: jobVideos.length,
      downloadedCount,
      skippedCount,
      localPaths,
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

    this.log(ctx, `视频 ${videoIndex + 1} 开始下载`, {
      url: normalizedUrl,
      localPath,
    })

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
