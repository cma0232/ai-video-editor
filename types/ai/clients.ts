/**
 * AI 服务客户端接口定义
 */

import type { Storyboard } from '../core/job'
import type { TokenUsage } from './gemini'
import type {
  TTSBatchOptions,
  TTSProvider,
  TTSProviderStatus,
  TTSSpeechOptions,
  TTSSpeechResult,
  TTSVoiceInfo,
} from './tts'

// ========== Gemini 客户端接口 ==========

export interface GeminiAnalyzeOptions {
  videoUrls: string | string[]
  prompt: string
  platform?: 'vertex' | 'ai-studio'
  jobId?: string
}

/** 批量旁白优化选项（多轮对话模式） */
export interface GeminiBatchNarrationOptions {
  /** 分析提示词（来自 Step 1，用于构建对话历史） */
  analysisPrompt: string
  /** 分析响应（来自 Step 1，模型返回的 JSON，用于多轮对话） */
  analysisResponse: string
  /** 完整的音画同步提示词（由 StyleLoader.buildBatchAudioSyncPrompt 构建） */
  prompt: string
  /** 视频 URI 列表 */
  videoUris?: Array<{ uri: string; mimeType: string }>
  /** 平台 */
  platform?: 'vertex' | 'ai-studio'
  /** 任务 ID（用于日志记录） */
  jobId?: string
  /** 批次序号（用于日志记录） */
  batchIndex?: number
}

/** 批量旁白优化结果 */
export interface GeminiBatchNarrationResult {
  scenes: Array<{
    scene_id: string
    narration_v1: string
    narration_v2: string
    narration_v3: string
  }>
}

/** Gemini 生成结果（包含 Token 使用） */
export interface GeminiGenerateResult<T> {
  data: T
  tokenUsage: TokenUsage
  /** 原始响应文本（用于排查解析失败） */
  rawResponse?: string
}

export interface IGeminiClient {
  getAvailablePlatforms(): Array<'vertex' | 'ai-studio'>

  /** 获取底层 GoogleGenAI 客户端（用于 File API 上传） */
  getClient(platform: 'vertex' | 'ai-studio'): import('@google/genai').GoogleGenAI

  /** 视频分析 */
  analyzeVideo(
    options: GeminiAnalyzeOptions,
  ): Promise<GeminiGenerateResult<{ storyboards: Storyboard[] }>>

  /** 批量旁白优化（隐式缓存模式） */
  batchOptimizeNarration(
    options: GeminiBatchNarrationOptions,
  ): Promise<GeminiGenerateResult<GeminiBatchNarrationResult>>
}

// ========== Fish Audio 客户端接口 ==========

export interface FishAudioSpeechOptions {
  text: string
  voiceId?: string
  platform?: 'vertex' | 'ai-studio'
  jobId?: string
  sceneId?: string
}

export interface FishAudioSpeechResult {
  audioUrl: string
  duration: number
  raw?: unknown
}

export interface IFishAudioClient {
  getAvailablePlatforms(): Array<'vertex' | 'ai-studio'>
  generateSpeech(options: FishAudioSpeechOptions): Promise<FishAudioSpeechResult>
  generateMultiple(
    texts: string[],
    options?: {
      voiceId?: string
      maxConcurrent?: number
      platform?: 'vertex' | 'ai-studio'
      jobId?: string
      sceneId?: string
    },
  ): Promise<FishAudioSpeechResult[]>
}

// ========== TTS 客户端统一接口 ==========

/** TTS Provider 统一接口（支持 Fish Audio 和 Edge TTS） */
export interface ITTSClient {
  /** Provider 类型标识 */
  readonly provider: TTSProvider

  /** 检查是否可用 */
  isAvailable(): boolean

  /** 检查是否已配置（仅 Fish Audio 需要） */
  isConfigured?(): boolean

  /** 获取可用语音列表 */
  getVoices(language?: string): Promise<TTSVoiceInfo[]>

  /** 生成单条语音 */
  generateSpeech(options: TTSSpeechOptions): Promise<TTSSpeechResult>

  /** 批量生成语音（并发控制） */
  generateMultiple(texts: string[], options?: TTSBatchOptions): Promise<TTSSpeechResult[]>
}

/** TTS Manager 接口（扩展 ITTSClient，添加多 Provider 管理能力） */
export interface ITTSManager extends ITTSClient {
  /** 获取所有 Provider 状态 */
  getAllProvidersStatus(): TTSProviderStatus[]

  /** 设置默认 Provider */
  setDefaultProvider(provider: TTSProvider): void

  /** 获取当前默认 Provider */
  getDefaultProvider(): TTSProvider
}

// ========== GCS 客户端接口 ==========

export interface GCSUploadOptions {
  destination?: string
  contentType?: string
  publicRead?: boolean
}

export interface GCSUploadBufferOptions {
  destination: string
  contentType?: string
  publicRead?: boolean
}

export interface GCSUploadResult {
  gsUri: string
  publicUrl: string
}

export interface IGCSClient {
  uploadFile(localPath: string, options?: GCSUploadOptions): Promise<GCSUploadResult>
  uploadBuffer(buffer: Buffer, options: GCSUploadBufferOptions): Promise<GCSUploadResult>
  uploadFromUrl(sourceUrl: string, options: GCSUploadBufferOptions): Promise<GCSUploadResult>
  uploadFromUrlStreaming(
    sourceUrl: string,
    options: GCSUploadBufferOptions,
  ): Promise<GCSUploadResult>
}
