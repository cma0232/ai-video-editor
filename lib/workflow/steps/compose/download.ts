/**
 * 下载最终成片步骤
 * - 极简架构（可选）
 */

import { copyFile } from 'node:fs/promises'
import * as stateManager from '@/lib/db/managers/state-manager'
import { downloadFile } from '@/lib/utils/download-file'
import { ensureDir } from '@/lib/utils/fs-utils'
import type { FinalVideoOutput, WorkflowContext } from '../../types'
import { BaseStep } from '../base'

/** 判断是否为网络 URL */
function isRemoteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('gs://')
}

/**
 * 下载最终成片到本地
 * 可选步骤，通过 condition 控制是否执行
 */
export class DownloadStep extends BaseStep<FinalVideoOutput> {
  readonly id = 'download'
  readonly name = '下载最终成片到本地'

  /**
   * 返回完整输入数据（用于日志记录）
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    const state = stateManager.getState(ctx.jobId)
    // 使用 TempFileManager 获取统一的路径格式
    const localPath = ctx.services.ffmpeg.tempManager.getFinalPath()
    return {
      final_video_url: state?.final_video_url || '',
      download_destination: localPath,
      output_filename: 'final.mp4',
    }
  }

  async execute(ctx: WorkflowContext): Promise<FinalVideoOutput> {
    // 1. 获取最终视频 URL
    const state = stateManager.getState(ctx.jobId)
    const finalVideoUrl = state?.final_video_url

    if (!finalVideoUrl) {
      throw new Error('Final video URL not found in state')
    }

    // 2. 使用 TempFileManager 获取统一的输出路径（output/{YYYYMMDD}-{jobId}/final.mp4）
    const localPath = ctx.services.ffmpeg.tempManager.getFinalPath()

    // 本地路径直接复制，网络 URL 则下载
    if (isRemoteUrl(finalVideoUrl)) {
      await downloadFile(finalVideoUrl, localPath)
    } else {
      await ensureDir(ctx.services.ffmpeg.tempManager.getJobDir())
      await copyFile(finalVideoUrl, localPath)
    }

    return {
      url: finalVideoUrl,
      publicUrl: state?.final_video_public_url,
      gsUri: state?.final_video_gs_uri,
      localPath,
    }
  }
}
