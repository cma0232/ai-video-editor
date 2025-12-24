/**
 * FFmpeg 批量拆条步骤
 * 使用本地 FFmpeg 替代 NCA Toolkit
 *
 * v12.3: 移除 File API URI 检测（PrepareVideoStep 保证所有视频都有 local_path）
 */

import * as jobScenesDb from '@/lib/db/tables/job-scenes'
import * as jobVideosDb from '@/lib/db/tables/job-videos'
import { trackFFmpegCall } from '@/lib/media'
import type { ResolutionConfig } from '@/lib/media/types'
import { ensureDiskSpace, formatBytes } from '@/lib/utils/disk-check'
import type { JobScene, JobVideo } from '@/types'
import type { SceneVideo, SceneVideosOutput, WorkflowContext } from '../../types'
import { BaseStep } from '../base'

// ============================================================================
// 辅助函数：计算目标分辨率
// ============================================================================

/**
 * 计算目标分辨率（用于统一多视频混剪时的分辨率）
 *
 * 策略：使用出现次数最多的分辨率（众数），最小化需要重编码的分镜数量
 * 回退：如果无法确定，使用 1080x1920（移动端标准竖屏）
 */
function calculateTargetResolution(videos: JobVideo[]): ResolutionConfig | undefined {
  // 1. 提取所有视频的分辨率
  const resolutions: Array<{ width: number; height: number }> = []
  for (const video of videos) {
    try {
      const meta = JSON.parse(video.metadata || '{}')
      if (meta.width > 0 && meta.height > 0) {
        resolutions.push({ width: meta.width, height: meta.height })
      }
    } catch {
      // 跳过无效元数据
    }
  }

  // 单个视频或无有效分辨率时，不需要归一化
  if (resolutions.length <= 1) return undefined

  // 2. 检查是否所有分辨率都相同
  const firstRes = resolutions[0]
  const allSame = resolutions.every(
    (r) => r.width === firstRes.width && r.height === firstRes.height,
  )
  if (allSame) return undefined // 无需归一化

  // 3. 统计分辨率频次
  const freqMap = new Map<string, { count: number; width: number; height: number }>()
  for (const r of resolutions) {
    const key = `${r.width}x${r.height}`
    const existing = freqMap.get(key)
    if (existing) {
      existing.count++
    } else {
      freqMap.set(key, { count: 1, width: r.width, height: r.height })
    }
  }

  // 4. 找出众数分辨率
  let maxCount = 0
  let targetRes = { width: 1080, height: 1920 } // 默认竖屏
  for (const [, value] of freqMap) {
    if (value.count > maxCount) {
      maxCount = value.count
      targetRes = { width: value.width, height: value.height }
    }
  }

  return { targetWidth: targetRes.width, targetHeight: targetRes.height }
}

/**
 * FFmpeg 批量拆条
 * 按源视频分组，批量拆分成分镜视频
 */
export class FFmpegBatchSplitStep extends BaseStep<SceneVideosOutput> {
  readonly id = 'ffmpeg_batch_split'
  readonly name = 'FFmpeg 批量拆条'

  /**
   * 返回完整输入数据（用于日志记录）
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    const storyboards = jobScenesDb.findByJobId(ctx.jobId)
    const geminiVideos = jobVideosDb.findByJobId(ctx.jobId)

    // 按源视频分组构建 segments 详情
    const segmentsDetail: Record<
      string,
      Array<{
        sceneId: string
        start: string
        end: string
        duration: number
        source_video_url?: string
      }>
    > = {}
    const videoGroups = new Map<string, JobScene[]>()

    for (const scene of storyboards) {
      const sourceVideo = scene.source_video_label
      if (!videoGroups.has(sourceVideo)) {
        videoGroups.set(sourceVideo, [])
      }
      videoGroups.get(sourceVideo)?.push(scene)
    }

    for (const [sourceVideo, scenes] of videoGroups.entries()) {
      const videoIndex = scenes[0]?.source_video_index
      const videoInput = videoIndex !== undefined ? geminiVideos[videoIndex] : undefined

      segmentsDetail[sourceVideo] = scenes.map((scene) => ({
        sceneId: scene.id,
        start: scene.source_start_time,
        end: scene.source_end_time,
        duration: scene.duration_seconds,
        source_video_url: videoInput?.original_url,
      }))
    }

    return {
      total_scenes: storyboards.length,
      video_groups: videoGroups.size,
      segments_by_video: segmentsDetail,
      ffmpeg_config: {
        codec: 'libx264',
        preset: 'medium',
        crf: 23,
      },
    }
  }

  async execute(ctx: WorkflowContext): Promise<SceneVideosOutput> {
    // 1. 加载分镜和视频数据
    const storyboards = jobScenesDb.findByJobId(ctx.jobId)
    const geminiVideos = jobVideosDb.findByJobId(ctx.jobId)

    // 前置检查：确保有分镜数据
    if (!storyboards.length) {
      throw new Error('No storyboards found. Previous analysis step may have failed.')
    }

    // 前置检查：确保所有视频都有 local_path（PrepareVideoStep 保证）
    const missingLocalPath = geminiVideos.filter((v) => !v.local_path)
    if (missingLocalPath.length > 0) {
      const labels = missingLocalPath.map((v) => v.label || `video-${v.video_index + 1}`)
      throw new Error(`视频 ${labels.join(', ')} 缺少 local_path，请确保 PrepareVideoStep 已执行`)
    }

    // 2. 前置磁盘空间检查（从 metadata JSON 中解析文件大小）
    const totalVideoSize = geminiVideos.reduce((sum, v) => {
      if (!v.metadata) return sum
      try {
        const meta = JSON.parse(v.metadata) as { file_size?: number }
        return sum + (meta.file_size || 0)
      } catch {
        return sum
      }
    }, 0)
    if (totalVideoSize > 0) {
      ctx.logger.info(`[FFmpeg] 检查磁盘空间，视频总大小: ${formatBytes(totalVideoSize)}`, {
        jobId: ctx.jobId,
      })
      await ensureDiskSpace(ctx.services.ffmpeg.outputDir, totalVideoSize, storyboards.length)
    }

    // 3. 检测各视频音轨状态 + 补充缺失分辨率
    const videoAudioStatus = new Map<number, boolean>()
    for (const video of geminiVideos) {
      const index = geminiVideos.indexOf(video)
      try {
        // 统一使用 local_path（PrepareVideoStep 保证存在）
        const videoUrl = video.local_path as string

        const metadata = await ctx.services.ffmpeg.getMetadata(videoUrl)
        const hasAudio = !!metadata.audio
        videoAudioStatus.set(index, hasAudio)
        if (!hasAudio) {
          ctx.logger.warn(`[FFmpeg] 视频 ${video.label || `#${index}`} 无音轨，将输出纯视频`, {
            jobId: ctx.jobId,
            videoIndex: index,
          })
        }

        // 补充缺失的分辨率（修复 P1: AI Studio File API 不返回分辨率导致多视频混剪分辨率不统一）
        const existingMeta = JSON.parse(video.metadata || '{}')
        if (
          (!existingMeta.width || existingMeta.width === 0) &&
          metadata.video?.width &&
          metadata.video?.height
        ) {
          ctx.logger.info(`[FFmpeg] 补充视频分辨率 ${video.label || `#${index}`}`, {
            jobId: ctx.jobId,
            videoIndex: index,
            width: metadata.video.width,
            height: metadata.video.height,
          })
          // 更新数据库
          jobVideosDb.updateResolution(
            ctx.jobId,
            index,
            metadata.video.width,
            metadata.video.height,
          )
          // 同步更新内存对象（供后续 calculateTargetResolution 使用）
          existingMeta.width = metadata.video.width
          existingMeta.height = metadata.video.height
          video.metadata = JSON.stringify(existingMeta)
        }
      } catch {
        // 元数据获取失败时假设有音轨（安全默认）
        videoAudioStatus.set(index, true)
      }
    }

    // 4. 计算目标分辨率（多视频混剪时统一分辨率）
    const targetResolution = calculateTargetResolution(geminiVideos)
    if (targetResolution) {
      ctx.logger.info(
        `[FFmpeg] 检测到多分辨率输入，将统一为 ${targetResolution.targetWidth}x${targetResolution.targetHeight}`,
        {
          jobId: ctx.jobId,
          targetResolution,
        },
      )
    }

    // 5. 按源视频分组
    const videoGroups = new Map<string, JobScene[]>()
    for (const scene of storyboards) {
      const sourceVideo = scene.source_video_label
      if (!videoGroups.has(sourceVideo)) {
        videoGroups.set(sourceVideo, [])
      }
      videoGroups.get(sourceVideo)?.push(scene)
    }

    // 6. 构建 sceneId 到场景的映射（用于安全匹配）
    const sceneMap = new Map<string, JobScene>()
    for (const scene of storyboards) {
      sceneMap.set(scene.id, scene)
    }

    // 7. 逐个视频拆条
    const allSceneVideos: SceneVideo[] = []
    const failedSources: string[] = []

    for (const [sourceVideo, scenes] of videoGroups.entries()) {
      const videoIndex = scenes[0]?.source_video_index
      if (videoIndex === undefined || videoIndex < 0 || videoIndex >= geminiVideos.length) {
        ctx.logger.error(`Invalid video index for source_video: ${sourceVideo}`, {
          jobId: ctx.jobId,
          videoIndex,
        })
        failedSources.push(sourceVideo)
        continue
      }

      const videoInput = geminiVideos[videoIndex]
      if (!videoInput) {
        ctx.logger.error(`Video not found at index ${videoIndex}: ${sourceVideo}`, {
          jobId: ctx.jobId,
        })
        failedSources.push(sourceVideo)
        continue
      }

      // 构建 segments（包含全局 sceneIndex 避免多视频命名冲突）
      const segments = scenes.map((scene) => ({
        sceneId: scene.id,
        sceneIndex: scene.scene_index,
        start: scene.source_start_time,
        end: scene.source_end_time,
      }))

      // 获取该视频的音轨状态
      const hasAudio = videoAudioStatus.get(videoIndex) ?? true

      ctx.logger.info(`[FFmpeg] 拆分视频 ${sourceVideo}，共 ${segments.length} 个片段`, {
        jobId: ctx.jobId,
        sourceVideo,
        segmentCount: segments.length,
        hasAudio,
      })

      try {
        // 统一使用 local_path（PrepareVideoStep 保证存在）
        const videoUrl = videoInput.local_path as string

        // 调用 FFmpeg 拆条（带追踪）
        const splitResult = await trackFFmpegCall(
          {
            jobId: ctx.jobId,
            operation: 'split_video',
            requestParams: {
              source_video: sourceVideo,
              input_url: videoUrl,
              segments_count: segments.length,
              has_audio: hasAudio,
              codec: 'libx264',
              preset: 'medium',
              crf: 23,
              target_resolution: targetResolution,
            },
          },
          () =>
            ctx.services.ffmpeg.splitVideoBatch(videoUrl, segments, {
              codec: 'libx264',
              preset: 'medium',
              crf: 23,
              hasAudio,
              targetResolution,
            }),
        )

        // 映射结果：使用 sceneId 查找匹配场景（避免并发乱序问题）
        const sceneVideos = splitResult.segments.map((segment) => {
          const sceneId = segment.sceneId
          if (!sceneId) {
            throw new Error('FFmpeg 返回的 sceneId 为空，无法映射分镜')
          }

          const scene = sceneMap.get(sceneId)
          if (!scene) {
            throw new Error(`找不到 sceneId: ${sceneId}`)
          }

          return {
            scene_id: sceneId,
            url: segment.outputPath,
            duration: segment.duration ?? scene.duration_seconds ?? 0,
            metadata: {},
          }
        })

        allSceneVideos.push(...sceneVideos)
      } catch (error) {
        ctx.logger.error(`[FFmpeg] 拆分视频失败: ${sourceVideo}`, {
          jobId: ctx.jobId,
          error: error instanceof Error ? error.message : String(error),
        })
        failedSources.push(sourceVideo)
      }
    }

    // 检查是否有失败的视频
    if (failedSources.length > 0) {
      throw new Error(`Failed to split videos: ${failedSources.join(', ')}`)
    }

    ctx.logger.info(`[FFmpeg] 拆条完成，共 ${allSceneVideos.length} 个分镜视频`, {
      jobId: ctx.jobId,
      totalScenes: allSceneVideos.length,
    })

    return { sceneVideos: allSceneVideos }
  }
}
