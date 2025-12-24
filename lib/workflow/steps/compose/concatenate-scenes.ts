/**
 * 拼接分镜步骤
 * - 使用本地 FFmpeg 替代 NCA API
 */

import * as jobScenesDb from '@/lib/db/tables/job-scenes'
import { trackFFmpegCall } from '@/lib/media'
import type { FinalVideoOutput, WorkflowContext } from '../../types'
import { BaseStep } from '../base'

/**
 * 拼接所有分镜成最终视频
 * 使用本地 FFmpeg
 */
export class ConcatenateScenesStep extends BaseStep<FinalVideoOutput> {
  readonly id = 'concatenate'
  readonly name = '拼接分镜'

  /**
   * 返回完整输入数据（用于日志记录）
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    const scenes = jobScenesDb.findByJobId(ctx.jobId)
    const sortedScenes = [...scenes].sort((a, b) => a.scene_index - b.scene_index)
    const failedScenes = sortedScenes.filter((s) => s.status === 'failed')
    const successScenes = sortedScenes.filter((s) => s.final_video_url)

    return {
      total_scenes: scenes.length,
      success_scenes: successScenes.length,
      failed_scenes: failedScenes.length,
      failed_scene_ids: failedScenes.map((s) => s.id),
      video_urls_in_order: successScenes.map((s) => ({
        scene_id: s.id,
        scene_index: s.scene_index,
        final_video_url: s.final_video_url,
      })),
      method: 'local_ffmpeg',
    }
  }

  async execute(ctx: WorkflowContext): Promise<FinalVideoOutput> {
    // 1. 加载所有处理完成的分镜
    const scenes = jobScenesDb.findByJobId(ctx.jobId)
    this.log(ctx, `加载了 ${scenes.length} 个分镜`)

    if (scenes.length === 0) {
      throw new Error('No scenes found to concatenate')
    }

    // 2. 提取 final_video_url（按 scene_index 排序）
    const sortedScenes = [...scenes].sort((a, b) => a.scene_index - b.scene_index)

    // 统计失败分镜（分镜级容错）
    const failedScenes = sortedScenes.filter((s) => s.status === 'failed')
    if (failedScenes.length > 0) {
      this.log(
        ctx,
        `⚠️ 跳过 ${failedScenes.length} 个失败分镜: ${failedScenes.map((s) => s.id).join(', ')}`,
      )
    }

    // 只合成有 final_video_url 的分镜
    const successScenes = sortedScenes.filter((s) => s.final_video_url)
    const videoUrls = successScenes.map((scene) => scene.final_video_url) as string[]
    this.log(ctx, `准备合成 ${videoUrls.length} 个成功分镜`)

    // 增强错误诊断
    if (videoUrls.length === 0) {
      this.logError(ctx, '❌ concatenate 失败：未找到任何 final_video_url', {
        totalScenes: scenes.length,
        sceneDetails: scenes.map((s) => ({
          scene_id: s.id,
          scene_index: s.scene_index,
          use_original_audio: s.use_original_audio,
          status: s.status,
          has_split_video_url: !!s.split_video_url,
          has_final_video_url: !!s.final_video_url,
          final_video_url: s.final_video_url,
        })),
      })
      throw new Error(
        `No final_video_url found. Total scenes: ${scenes.length}. All scenes missing final_video_url.`,
      )
    }

    // 3. 调用本地 FFmpeg 拼接（带追踪）
    const outputPath = await trackFFmpegCall(
      {
        jobId: ctx.jobId,
        operation: 'concatenate_videos',
        requestParams: {
          input_count: videoUrls.length,
          use_demuxer: true,
        },
      },
      () => ctx.services.ffmpeg.concatenateVideos(videoUrls, { useDemuxer: true }),
    )

    if (!outputPath) {
      throw new Error('Concatenate failed: no output file path')
    }

    return {
      url: outputPath,
      localPath: outputPath,
      publicUrl: undefined,
      gsUri: undefined,
    }
  }
}
