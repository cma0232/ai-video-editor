/**
 * Gemini Client 主入口
 * 使用 @google/genai SDK 统一支持 AI Studio 和 Vertex AI
 *
 * v12.2.2: 集成速率限制器，处理 429 限流
 */

import type { Content, GoogleGenAI, Part } from '@google/genai'
import { apiCallsDb } from '@/lib/db/tables'
import { logger } from '@/lib/utils/logger'
import { withRetry } from '@/lib/utils/retry'
import { normalizeStoryboardTimestamps } from '@/lib/utils/timestamp-normalizer'
import { detectVideoMimeType } from '@/lib/utils/video-mime'
import type { Storyboard } from '@/types'
import type {
  GeminiAnalyzeOptions,
  GeminiBatchNarrationOptions,
  GeminiBatchNarrationResult,
  GeminiGenerateResult,
  IGeminiClient,
} from '@/types/ai/clients'
import type { GeminiPlatform } from '@/types/ai/gemini'
import { createAIStudioClient, createVertexClient } from './core/client'
import { generateContent } from './core/generate'
import {
  getAIStudioCredentials,
  getAvailablePlatforms,
  getMediaResolution,
  getVertexCredentials,
  getVideoFps,
} from './credentials-provider'
import { buildVideoPart, uploadFromUrl } from './file-manager'
import { safeParseJson } from './parsers/json-extractor'
import { BATCH_NARRATION_SCHEMA, repairJsonWithAI } from './parsers/json-repair'
import { convertToGsUri } from './utils/url-converter'

/**
 * 批次响应格式校验错误
 * 用于触发批次级重试（当 Gemini 返回错误格式如 storyboards 而非 scenes 时）
 */
class BatchFormatError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string,
    public readonly rawFormat: string,
  ) {
    super(message)
    this.name = 'BatchFormatError'
  }
}

export class GeminiClient implements IGeminiClient {
  private clientCache: Map<string, GoogleGenAI> = new Map()

  /**
   * 获取或创建客户端
   * 公开方法，供 File API 上传使用
   */
  getClient(platform: GeminiPlatform): GoogleGenAI {
    const cacheKey = platform
    let client = this.clientCache.get(cacheKey)

    if (!client) {
      if (platform === 'vertex') {
        const credentials = getVertexCredentials()
        client = createVertexClient(credentials)
      } else {
        const credentials = getAIStudioCredentials()
        client = createAIStudioClient(credentials)
      }
      this.clientCache.set(cacheKey, client)
    }

    return client
  }

  /**
   * 检测可用的平台
   */
  getAvailablePlatforms(): GeminiPlatform[] {
    return getAvailablePlatforms()
  }

  /**
   * 视频分析（生成分镜脚本）
   */
  async analyzeVideo(
    options: GeminiAnalyzeOptions,
  ): Promise<GeminiGenerateResult<{ storyboards: Storyboard[] }>> {
    // 自动检测平台
    let platform = options.platform
    if (!platform) {
      const available = getAvailablePlatforms()
      if (available.length === 0) {
        throw new Error('未配置任何 Gemini 平台（Vertex AI 或 AI Studio）')
      }
      platform = available[0]
      logger.info(`未指定平台，自动使用: ${platform}`)
    }

    const urls = Array.isArray(options.videoUrls) ? options.videoUrls : [options.videoUrls]

    const credentials = platform === 'vertex' ? getVertexCredentials() : getAIStudioCredentials()

    // 记录 API 调用（含模型 ID 用于计费）
    const apiCallId = options.jobId
      ? apiCallsDb.insert({
          job_id: options.jobId,
          service: 'gemini',
          operation: 'analyze_video',
          platform,
          request_params: {
            model_id: credentials.modelId,
            video_count: urls.length,
            video_urls: urls,
            prompt_length: options.prompt.length,
          },
          status: 'pending',
        })
      : undefined

    logger.logApiCall({
      jobId: options.jobId,
      service: 'Gemini',
      operation: 'analyze_video',
      request: { platform, video_count: urls.length, video_urls: urls },
    })

    const apiStartTime = Date.now()

    // 用于保存原始响应（在 catch 中也能访问，便于排查解析失败）
    let rawResponse: string | undefined

    try {
      const client = this.getClient(platform)
      const mediaResolution = getMediaResolution()
      const videoFps = getVideoFps()

      // 构建视频 Parts（v16.1: 传递 videoFps 参数，确保缓存一致性）
      const videoParts = await this.buildVideoParts(client, urls, platform, options.jobId, videoFps)

      // 生成内容（提示词在前，语义更清晰：先看任务说明，再看视频内容）
      const result = await generateContent(client, {
        modelId: credentials.modelId,
        parts: [{ text: options.prompt }, ...videoParts],
        mediaResolution,
        videoFps,
        responseMimeType: 'application/json',
        platform, // 传递平台信息给速率限制器
      })

      // 保存原始响应（用于排查）
      rawResponse = result.text

      // 解析响应
      const parsed = safeParseJson<{ storyboards: Storyboard[] }>(rawResponse)

      if (!Array.isArray(parsed.storyboards)) {
        throw new Error('Gemini response missing storyboards array')
      }

      // 规范化时间戳
      parsed.storyboards = parsed.storyboards.map(normalizeStoryboardTimestamps)

      // 更新 API 调用记录（保存完整 token_usage + 原始响应）
      if (apiCallId) {
        apiCallsDb.updateResponse(apiCallId, {
          status: 'success',
          response_data: { platform, storyboard_count: parsed.storyboards.length },
          token_usage: result.usage
            ? {
                input: result.usage.input,
                output: result.usage.output,
                cached: result.usage.cached ?? 0, // 显式存储 0 便于统计
              }
            : undefined,
          raw_response: rawResponse,
        })
      }

      logger.logApiResponse({
        jobId: options.jobId,
        service: 'Gemini',
        operation: 'analyze_video',
        response: {
          platform,
          storyboard_count: parsed.storyboards.length,
          token_usage: result.usage,
        },
        duration: Date.now() - apiStartTime,
      })

      return {
        data: { storyboards: parsed.storyboards },
        tokenUsage: result.usage || { input: 0, output: 0 },
        rawResponse, // 用于缓存对话历史
      }
    } catch (error: unknown) {
      if (apiCallId) {
        apiCallsDb.updateResponse(apiCallId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          raw_response: rawResponse, // 保存原始响应便于排查
        })
      }

      logger.logApiResponse({
        jobId: options.jobId,
        service: 'Gemini',
        operation: 'analyze_video',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - apiStartTime,
      })

      throw error
    }
  }

  /**
   * 批量旁白优化（多轮对话模式）
   *
   * 使用正确的多轮对话格式解决 Gemini 格式混淆问题：
   * - 第 1 轮 user: [视频, 分析提示词]
   * - 第 1 轮 model: [分析结果 JSON]
   * - 第 2 轮 user: [音画同步提示词]
   *
   * 这样 Gemini 明确知道第 1 轮已完成，当前是第 2 轮新任务。
   */
  async batchOptimizeNarration(
    options: GeminiBatchNarrationOptions,
  ): Promise<GeminiGenerateResult<GeminiBatchNarrationResult>> {
    // 自动检测平台
    let platform = options.platform
    if (!platform) {
      const available = getAvailablePlatforms()
      if (available.length === 0) {
        throw new Error('未配置任何 Gemini 平台（Vertex AI 或 AI Studio）')
      }
      platform = available[0]
      logger.info(`未指定平台，自动使用: ${platform}`)
    }

    // 校验必需参数
    if (!options.analysisResponse) {
      throw new Error('batchOptimizeNarration: 缺少 analysisResponse 参数（用于多轮对话）')
    }

    const credentials = platform === 'vertex' ? getVertexCredentials() : getAIStudioCredentials()

    // 记录 API 调用
    const apiCallId = options.jobId
      ? apiCallsDb.insert({
          job_id: options.jobId,
          service: 'gemini',
          operation: 'batch_optimize_narration',
          platform,
          request_params: {
            model_id: credentials.modelId,
            video_count: options.videoUris?.length || 0,
            batch_index: options.batchIndex,
          },
          status: 'pending',
        })
      : undefined

    logger.logApiCall({
      jobId: options.jobId,
      service: 'Gemini',
      operation: 'batch_optimize_narration',
      request: {
        platform,
        batch_index: options.batchIndex,
        video_count: options.videoUris?.length || 0,
        mode: 'multi-turn', // 标记使用多轮对话模式
      },
    })

    const apiStartTime = Date.now()
    let rawResponse: string | undefined

    try {
      const client = this.getClient(platform)
      const mediaResolution = getMediaResolution()
      const videoFps = getVideoFps()

      // 构建带标签的视频 Parts（v16.2: 确保 Gemini 准确识别多视频）
      const videoParts = this.buildLabeledVideoParts(options.videoUris || [], platform, videoFps)

      // ===== 构建多轮对话 contents =====
      // 格式：user(分析提示词+视频) → model(分析结果) → user(音画同步提示词)
      // 提示词在前，语义更清晰：先看任务说明，再看视频内容
      const contents: Content[] = [
        // 第 1 轮：用户请求分析
        {
          role: 'user',
          parts: [{ text: options.analysisPrompt }, ...videoParts],
        },
        // 第 1 轮：模型返回分析结果
        {
          role: 'model',
          parts: [{ text: options.analysisResponse }],
        },
        // 第 2 轮：用户请求旁白生成
        {
          role: 'user',
          parts: [{ text: options.prompt }],
        },
      ]

      logger.info('[Gemini] 多轮对话构建完成', {
        jobId: options.jobId,
        batchIndex: options.batchIndex,
        contentsCount: contents.length,
        videoParts: videoParts.length,
        analysisResponseLength: options.analysisResponse.length,
      })

      // ===== 批次级格式校验与重试 =====
      const {
        result,
        parsed,
        rawResponse: finalRawResponse,
      } = await withRetry(
        async () => {
          // 调用 Gemini API（多轮对话模式）
          const result = await generateContent(client, {
            modelId: credentials.modelId,
            contents, // 使用多轮对话格式
            mediaResolution,
            videoFps,
            responseMimeType: 'application/json',
            platform,
          })

          const rawResponse = result.text

          // 解析响应（支持 AI 修复）
          type SceneNarration = GeminiBatchNarrationResult['scenes'][number]
          let parsed: GeminiBatchNarrationResult

          try {
            const rawParsed = safeParseJson<GeminiBatchNarrationResult | SceneNarration[]>(
              rawResponse,
            )
            if (Array.isArray(rawParsed)) {
              parsed = { scenes: rawParsed }
            } else {
              parsed = rawParsed
            }
          } catch (parseError) {
            logger.warn('[Gemini] JSON 解析失败，启动 AI 修复', {
              error: parseError instanceof Error ? parseError.message : String(parseError),
            })

            const repairResult = await repairJsonWithAI<GeminiBatchNarrationResult>(client, {
              brokenJson: rawResponse,
              expectedSchema: BATCH_NARRATION_SCHEMA,
              contextHint: '视频分镜旁白数据',
            })

            if (!repairResult.success || !repairResult.data) {
              throw parseError
            }

            parsed = repairResult.data
            logger.info('[Gemini] AI 修复 JSON 成功')
          }

          // 格式校验（失败则抛出 BatchFormatError 触发重试）
          if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
            const rawFormat =
              typeof parsed === 'object' && parsed !== null
                ? Object.keys(parsed).join(',')
                : typeof parsed
            throw new BatchFormatError(
              `Gemini 批量旁白响应格式错误：期望 scenes 数组，实际 ${rawFormat}`,
              rawResponse,
              rawFormat,
            )
          }

          return { result, parsed, rawResponse }
        },
        {
          maxAttempts: 2, // 多轮对话格式更稳定，减少重试次数
          delayMs: 2000,
          backoff: 1,
          shouldRetry: (error) => {
            if (error instanceof BatchFormatError) {
              logger.warn('[Gemini] 多轮对话格式校验失败，触发重试', {
                jobId: options.jobId,
                batchIndex: options.batchIndex,
                rawFormat: error.rawFormat,
              })
              return true
            }
            return false
          },
          onRetry: (attempt) => {
            logger.info('[Gemini] 多轮对话重试', {
              jobId: options.jobId,
              batchIndex: options.batchIndex,
              attempt,
            })
          },
        },
      )

      rawResponse = finalRawResponse

      // 更新 API 调用记录
      if (apiCallId) {
        apiCallsDb.updateResponse(apiCallId, {
          status: 'success',
          response_data: { platform, scenes: parsed.scenes },
          token_usage: result.usage
            ? {
                input: result.usage.input,
                output: result.usage.output,
                cached: result.usage.cached ?? 0,
              }
            : undefined,
          raw_response: rawResponse,
        })
      }

      logger.logApiResponse({
        jobId: options.jobId,
        service: 'Gemini',
        operation: 'batch_optimize_narration',
        response: {
          platform,
          scene_count: parsed.scenes.length,
          token_usage: result.usage,
          mode: 'multi-turn',
        },
        duration: Date.now() - apiStartTime,
      })

      return {
        data: parsed,
        tokenUsage: result.usage || { input: 0, output: 0 },
      }
    } catch (error: unknown) {
      if (apiCallId) {
        apiCallsDb.updateResponse(apiCallId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          raw_response: rawResponse,
        })
      }

      logger.logApiResponse({
        jobId: options.jobId,
        service: 'Gemini',
        operation: 'batch_optimize_narration',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - apiStartTime,
      })

      throw error
    }
  }

  /**
   * 构建视频 Parts（带显式标签）
   *
   * v16.2: 为每个视频前添加显式标签，确保 Gemini 准确识别多视频
   * 返回格式：[label-1, video-1, label-2, video-2, ...]
   *
   * @param client - Gemini 客户端
   * @param urls - 视频 URL 列表
   * @param platform - 平台类型
   * @param jobId - 任务 ID（可选）
   * @param videoFps - 视频帧率（可选）
   */
  private async buildVideoParts(
    client: GoogleGenAI,
    urls: string[],
    platform: GeminiPlatform,
    jobId?: string,
    videoFps?: number,
  ): Promise<Part[]> {
    // 使用传入的 fps 或回退到配置读取（兼容性保留）
    const fps = videoFps ?? getVideoFps()

    if (platform === 'vertex') {
      // Vertex AI：使用 GCS URI
      const parts: Part[] = []
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        const gsUri = convertToGsUri(url)
        const mimeType = detectVideoMimeType(url)
        const label = `video-${i + 1}`

        logger.info('[GeminiClient] 构建 Vertex AI 视频 Part', { gsUri, mimeType, label })

        // 先添加标签，再添加视频
        parts.push({ text: `【视频文件：${label}】` })
        parts.push(buildVideoPart(gsUri, mimeType, platform, fps))
      }
      return parts
    }

    // AI Studio：检测是否已是 File API URI，避免重复上传
    const isFileApiUri = (url: string) =>
      url.includes('generativelanguage.googleapis.com') && url.includes('/files/')

    const uploadResults = await Promise.all(
      urls.map(async (url, index) => {
        if (isFileApiUri(url)) {
          // 已是 File API URI，直接使用（不重新下载上传）
          logger.info('[GeminiClient] 使用已有 File API URI', { uri: url, jobId })
          return { uri: url, mimeType: 'video/mp4', name: url.split('/').pop() || '' }
        }
        // 未上传，执行流式上传
        return uploadFromUrl(client, url, { videoIndex: index + 1, jobId })
      }),
    )

    // 构建带标签的 Parts
    const parts: Part[] = []
    for (let i = 0; i < uploadResults.length; i++) {
      const result = uploadResults[i]
      const label = `video-${i + 1}`

      // 先添加标签，再添加视频
      parts.push({ text: `【视频文件：${label}】` })
      parts.push(buildVideoPart(result.uri, result.mimeType, platform, fps))
    }
    return parts
  }

  /**
   * 构建带标签的视频 Parts（用于已有 URI 的场景）
   *
   * v16.2: 供 batchOptimizeNarration 等直接使用 URI 的场景调用
   *
   * @param videoUris - 视频 URI 和 MIME 类型列表
   * @param platform - 平台类型
   * @param fps - 视频帧率
   */
  private buildLabeledVideoParts(
    videoUris: Array<{ uri: string; mimeType: string }>,
    platform: GeminiPlatform,
    fps?: number,
  ): Part[] {
    const parts: Part[] = []
    for (let i = 0; i < videoUris.length; i++) {
      const video = videoUris[i]
      const label = `video-${i + 1}`

      // 先添加标签，再添加视频
      parts.push({ text: `【视频文件：${label}】` })
      parts.push(buildVideoPart(video.uri, video.mimeType, platform, fps))
    }
    return parts
  }
}

export const geminiClient = new GeminiClient()
