/**
 * Gemini 视频分析步骤
 * - 极简架构
 * - 修复元数据覆盖问题，每个视频使用独立时间戳（从 00:00:00 开始）
 */

import * as jobVideosDb from '@/lib/db/tables/job-videos'
import { styleLoader } from '@/lib/workflow/style-loader'
import { resolveNarrationLanguage } from '@/lib/workflow/tts-config-resolver'
import type { JobVideo, Storyboard, VideoInput, VideoMetadata } from '@/types'
import type { PureSceneId } from '@/types/core/scene-id'
import type { VideoAnalysisOutput, WorkflowContext } from '../../types'
import { BaseStep } from '../base'

/**
 * Gemini 原始分镜数据接口
 */
interface GeminiStoryboardRaw {
  scene_id?: string
  scene?: number
  source_video?: string
  source_start_time: string
  source_end_time: string
  duration_seconds: number
  narration_script: string
  use_original_audio?: boolean
}

/**
 * Gemini 视频分析
 * 调用 Gemini API 生成分镜脚本
 */
export class GeminiAnalysisStep extends BaseStep<VideoAnalysisOutput> {
  readonly id = 'gemini_analysis'
  readonly name = 'Gemini 视频分析'

  /**
   * 返回完整输入数据（用于日志记录）
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    // 1. 从 job_videos 表加载视频数据
    const geminiVideos = jobVideosDb.findByJobId(ctx.jobId)

    // 2. 构建视频描述列表（使用累计时间戳）
    const videoDescriptions = this.buildVideoDescriptions(geminiVideos)

    // 3. 加载风格配置
    const style = styleLoader.load(ctx.input.styleId)
    const storyboardCount =
      ctx.input.config.storyboard_count || this.calculateDefaultStoryboardCount(geminiVideos.length)

    // 4. 构建完整提示词
    const narrationLanguage = resolveNarrationLanguage()
    const fullPrompt = styleLoader.buildAnalysisPrompt(style, {
      video_count: geminiVideos.length,
      video_descriptions: videoDescriptions,
      storyboard_count: storyboardCount,
      language: narrationLanguage,
      channel_name: style.config.channel_name,
      duration_range: style.config.duration_range,
      script_outline: ctx.input.config.script_outline,
      original_audio_scene_count: ctx.input.config.original_audio_scene_count,
    })

    // 5. 返回完整输入数据
    return {
      gemini_uris: geminiVideos.map((v) => v.gemini_uri).filter(Boolean),
      video_count: geminiVideos.length,
      video_descriptions: videoDescriptions,
      style_id: ctx.input.styleId,
      style_name: style.name,
      config: {
        storyboard_count: storyboardCount,
        language: narrationLanguage,
        original_audio_scene_count: ctx.input.config.original_audio_scene_count,
        script_outline: ctx.input.config.script_outline,
        channel_name: style.config.channel_name,
      },
      analysis_creative_layer: style.analysis_creative_layer,
      full_prompt: fullPrompt,
      prompt_length_chars: fullPrompt.length,
    }
  }

  async execute(ctx: WorkflowContext): Promise<VideoAnalysisOutput> {
    // 1. 从 job_videos 表加载视频数据
    const geminiVideos = jobVideosDb.findByJobId(ctx.jobId)

    if (geminiVideos.length === 0) {
      throw new Error('No videos found in job_videos table')
    }

    // 2. 构建视频描述列表（使用累计时间戳）
    const videoDescriptions = this.buildVideoDescriptions(geminiVideos)

    // 3. 构建提示词
    const style = styleLoader.load(ctx.input.styleId)
    const storyboardCount =
      ctx.input.config.storyboard_count || this.calculateDefaultStoryboardCount(geminiVideos.length)

    // 记录分镜数量来源（调试分镜数量问题）
    ctx.logger.info('[Gemini Analysis] 分镜数量配置', {
      jobId: ctx.jobId,
      from_config: ctx.input.config.storyboard_count,
      final_storyboard_count: storyboardCount,
      default_value: geminiVideos.length === 1 ? 15 : 6,
      video_count: geminiVideos.length,
    })

    const prompt = styleLoader.buildAnalysisPrompt(style, {
      video_count: geminiVideos.length,
      video_descriptions: videoDescriptions,
      storyboard_count: storyboardCount,
      language: resolveNarrationLanguage(),
      channel_name: style.config.channel_name,
      duration_range: style.config.duration_range,
      script_outline: ctx.input.config.script_outline,
      original_audio_scene_count: ctx.input.config.original_audio_scene_count,
    })

    // 4. 调用 Gemini 分析
    const videoUris = geminiVideos.map((v) => v.gemini_uri).filter(Boolean) as string[]

    if (videoUris.length === 0) {
      throw new Error('No gemini_uri found in job_videos')
    }

    ctx.logger.info('[Gemini 分析] 准备分析视频', {
      jobId: ctx.jobId,
      platform: ctx.features.platform,
      video_count: geminiVideos.length,
      video_uris: videoUris,
      storyboard_count: storyboardCount,
    })

    const analysisResult = await ctx.services.gemini.analyzeVideo({
      videoUrls: videoUris, // 统一传递所有视频 URI（移除平台判断）
      prompt,
      platform: ctx.features.platform,
      jobId: ctx.jobId,
    })

    ctx.logger.info('[Gemini 分析] 分析完成', {
      jobId: ctx.jobId,
      received_storyboard_count: analysisResult.data.storyboards?.length || 0,
      token_usage: analysisResult.tokenUsage,
    })

    // 5. 解析分镜（新 SDK 直接返回解析后的数据）
    const parsed = analysisResult.data

    // P0-4 修复：增强 null/undefined 检查
    if (!parsed || !parsed.storyboards || !Array.isArray(parsed.storyboards)) {
      throw new Error('Gemini 返回无效响应：缺少 storyboards 数组')
    }

    if (parsed.storyboards.length === 0) {
      throw new Error('Gemini 返回空分镜列表，请检查视频内容或调整提示词')
    }

    const storyboards: Storyboard[] = parsed.storyboards.map(
      (s: GeminiStoryboardRaw, index: number) => {
        // P0-4 修复：增强字段验证，提供更多上下文信息
        if (!s) {
          throw new Error(`分镜 ${index + 1} 为 null/undefined`)
        }

        // 验证并映射 scene_id
        const sceneId = s.scene_id || (s.scene ? `scene-${s.scene}` : undefined)
        if (!sceneId) {
          throw new Error(
            `分镜 ${index + 1} 缺少 scene_id 字段: ${JSON.stringify(s).slice(0, 200)}`,
          )
        }

        // 验证必需的时间戳字段
        if (!s.source_start_time || !s.source_end_time) {
          throw new Error(
            `分镜 ${sceneId} 缺少时间戳字段: start=${s.source_start_time}, end=${s.source_end_time}`,
          )
        }

        // 验证 duration_seconds
        if (typeof s.duration_seconds !== 'number' || s.duration_seconds <= 0) {
          throw new Error(`分镜 ${sceneId} 的 duration_seconds 无效: ${s.duration_seconds}`)
        }

        // 验证 source_video
        let videoIndex = -1

        // 优先按 video-N 格式查找
        const videoIdMatch = s.source_video?.match(/^video-(\d+)$/)
        if (videoIdMatch) {
          const idx = Number.parseInt(videoIdMatch[1], 10) - 1
          if (idx >= 0 && idx < geminiVideos.length) {
            videoIndex = idx
          }
        }

        // 回退到按标签查找（向后兼容）
        if (videoIndex === -1) {
          videoIndex = geminiVideos.findIndex((v) => v.label === s.source_video)
        }

        if (videoIndex === -1) {
          throw new Error(
            `分镜 ${sceneId} 的 source_video 无效: ${s.source_video}。期望格式: video-1, video-2, ...`,
          )
        }

        return {
          scene_id: sceneId as PureSceneId,
          source_video: s.source_video || '',
          source_start_time: s.source_start_time,
          source_end_time: s.source_end_time,
          duration_seconds: s.duration_seconds,
          narration_script: s.narration_script,
          use_original_audio: s.use_original_audio ?? false,
          source_video_index: videoIndex,
        }
      },
    )

    const totalDuration = storyboards.reduce((sum, s) => sum + s.duration_seconds, 0)

    // 6. 转换为 VideoInput 格式（包含元数据）
    const gemini_videos: VideoInput[] = geminiVideos.map((v) => {
      let metadata: VideoMetadata | undefined
      if (v.metadata) {
        try {
          metadata = JSON.parse(v.metadata) as VideoMetadata
        } catch {
          console.warn(`[GeminiAnalysis] Failed to parse metadata for video ${v.label}`)
          metadata = undefined
        }
      }
      return {
        url: v.original_url,
        label: v.label,
        title: v.title || undefined,
        description: v.description || undefined,
        local_path: v.local_path || undefined, // AI Studio 本地文件路径（FFmpeg 用）
        gcs_https_url: v.gcs_https_url || undefined,
        gcs_gs_uri: v.gcs_gs_uri || undefined,
        gemini_uri: v.gemini_uri || undefined,
        metadata,
      }
    })

    return {
      gemini_videos,
      storyboards,
      total_duration: totalDuration,
      analysis_prompt: prompt,
      // 保存 Gemini 原始 JSON 响应（用于多轮对话）
      // 优先使用 rawResponse（原始文本），回退到 parsed（已解析对象）
      gemini_raw_response: analysisResult.rawResponse ?? JSON.stringify(parsed),
    }
  }

  /**
   * 构建视频描述列表（每个视频独立时间戳）
   * 修复：移除累计时间戳逻辑，每个视频都从 00:00:00 开始
   */
  private buildVideoDescriptions(geminiVideos: JobVideo[]): string {
    return geminiVideos
      .map((v, i) => {
        const index = i + 1
        const videoId = `video-${index}`
        let metadata: Record<string, unknown> = {}
        if (v.metadata) {
          try {
            metadata = JSON.parse(v.metadata)
          } catch {
            console.warn(`[GeminiAnalysis] Failed to parse metadata for video ${videoId}`)
          }
        }
        const duration = (metadata.duration as number) || 0
        const durationFormatted = (metadata.duration_formatted as string) || '00:00:00.000'

        // 验证元数据有效性
        if (duration === 0 || !metadata.duration) {
          throw new Error(
            `视频 ${videoId} 无法获取时长信息。请检查：1) 视频 URL 是否为公开可访问的直链地址；2) URL 是否正确（非网页链接）；3) 视频格式是否为常见格式（mp4/mov/webm）`,
          )
        }

        // ✅ 正确：每个视频都从 00:00:00.000 开始
        const startTime = '00:00:00.000'
        const endTime = durationFormatted

        return `**${videoId}**
   - 标签：${v.label}
   - 时长：${durationFormatted}（共 ${duration.toFixed(1)} 秒）
   - 时间戳范围：${startTime} ~ ${endTime}`
      })
      .join('\n\n')
  }

  /**
   * 计算默认分镜数量
   * - 优化多视频场景的分镜数量
   */
  private calculateDefaultStoryboardCount(videoCount: number): number {
    if (videoCount === 1) return 15 // 单视频：15 个分镜
    if (videoCount === 2) return 10 // 双视频：10 个分镜
    return 12 // 3 个及以上视频：12 个分镜
  }
}
