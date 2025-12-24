# AI 集成

## 核心服务

| 服务 | 入口 | 类型 | 功能 |
|------|------|------|------|
| `geminiClient` | `lib/ai/gemini` | 云端 AI | 视频分析、旁白优化（隐式缓存） |
| `ttsManager` | `lib/ai/tts` | 云端 AI | TTS 文本转语音（多提供商支持） |
| `ffmpegService` | `lib/media` | 本地媒体 | 拆条、调速、合成、拼接、元数据（FFmpeg 8.0.1） |

## Gemini 双平台架构

统一使用 `@google/genai` SDK 支持双平台。

```
┌─────────────────────────────────────────────────┐
│         GeminiClient (统一接口)                  │
├─────────────────────────────────────────────────┤
│ SDK: @google/genai                              │
│ Platform: 'vertex' | 'ai-studio'                │
│ • 自动检测可用平台                               │
│ • 优先级：Vertex AI > AI Studio                  │
└─────────────────────────────────────────────────┘
         ↓                    ↓
   ┌─────────────┐      ┌──────────────┐
   │  Vertex AI  │      │  AI Studio   │
   ├─────────────┤      ├──────────────┤
   │ Auth: GCP   │      │ Auth: API Key│
   │ SA JSON     │      │ Direct Token │
   │ GCS URI     │      │ File API URI │
   │ 企业级       │      │ 限制500MB/1h │
   └─────────────┘      └──────────────┘
```

**平台选择**：
- **Vertex AI**：企业级，需要 GCP 服务账号
- **AI Studio**：个人用户，限制 500MB/1 小时，API Key 直接认证

## 核心 API

### Gemini

```typescript
import { geminiClient } from '@/lib/ai/gemini'

// 视频分析 - 提取分镜脚本
await geminiClient.analyzeVideo({
  videoUrls: string[]       // 视频 URL 列表
  prompt: string            // 分析提示词（会保存到数据库用于缓存复用）
  jobId: string             // 任务 ID（用于追踪）
  platform?: 'vertex' | 'ai-studio'
})
// 返回：{ data: { storyboards: Storyboard[] }, tokenUsage }
// 注意：分析提示词会保存到 job_videos.analysis_prompt 字段

// 批量旁白优化 - 多轮对话模式（v16.0）
await geminiClient.batchOptimizeNarration({
  analysisPrompt: string    // 分析提示词（第 1 轮 user 消息）
  analysisResponse: string  // 分析响应（第 1 轮 model 消息，用于多轮对话）
  prompt: string            // 音画同步提示词（第 2 轮 user 消息）
  videoUris: Array<{ uri: string; mimeType: string }>  // 视频 URI 列表
  platform?: 'vertex' | 'ai-studio'
  jobId?: string            // 任务 ID（用于日志记录）
  batchIndex?: number       // 批次序号（用于日志记录）
})
// 返回：{ data: { scenes: [{ scene_id, narration_v1, narration_v2, narration_v3 }...] }, tokenUsage }
// 多轮对话：contents 结构 [user(视频+分析提示词), model(分析响应), user(音画同步提示词)]
```

### FFmpeg Service（本地视频处理）

> **v12.1 架构升级**：NCA Toolkit 已被本地 FFmpeg 8.0.1 替代，消除网络延迟，处理速度提升 3x

```typescript
import { createFFmpegService } from '@/lib/media'

const ffmpeg = createFFmpegService()

// 批量拆条 - 按时间码切分视频（支持远程 URL）
await ffmpeg.splitVideoBatch(videoUrl: string, segments: VideoSegment[])
// segments: { id: string, start: string, end: string }[]
// 返回：{ segments: { sceneId, outputPath, duration }[] }

// 调速 - 音画同步
await ffmpeg.adjustSpeed(videoUrl: string, speedFactor: number, sceneIndex: number, options?: EncodingOptions)
// speedFactor: 0.5 ~ 5.0
// sceneIndex: 分镜索引，用于输出文件命名
// 返回：本地文件路径（scenes/scene-{index}/adjusted.mp4）

// 音画合成 - 替换音轨
await ffmpeg.mergeAudioVideo(videoUrl: string, audioUrl: string, sceneIndex: number, options?: MergeOptions)
// sceneIndex: 分镜索引，用于输出文件命名
// options: { copyVideo?: boolean, audioDuration?: number }
// 返回：本地文件路径（scenes/scene-{index}/final.mp4）

// 拼接 - 最终成片
await ffmpeg.concatenateVideos(videoUrls: string[], options?: ConcatOptions)
// options: { useDemuxer?: boolean }
// 返回：本地文件路径

// 背景音乐混合
await ffmpeg.mixBgm(videoUrl: string, bgmUrl: string, options?: BgmOptions)
// options: { volume?: number, loop?: boolean }
// 返回：本地文件路径

// 字幕烧录
await ffmpeg.burnSubtitle(videoUrl: string, subtitlePath: string, options?: SubtitleOptions)
// 返回：本地文件路径

// 元数据
await ffmpeg.getMetadata(mediaUrl: string)
// 返回：{ duration, width, height, fps, bitrate, codec, format }
```

**技术特性**：
- FFmpeg 8.0.1 静态二进制（Docker 镜像内置）
- 支持远程 URL 直接处理（http/https/gs://）
- 统一音频参数：44100Hz 采样率、双声道、AAC 128kbps
- 视频编码：libx264、medium preset、CRF 23
- 临时文件自动管理（`/tmp/ffmpeg/`）

### TTS 语音合成（多提供商）

> **v12.1.0 架构升级**：TTS 系统支持多提供商，统一接口管理

```typescript
// 推荐：使用 TTS 管理器（自动选择提供商）
import { ttsManager } from '@/lib/ai/tts'

// 或直接使用特定提供商
import { FishAudioProvider } from '@/lib/ai/tts/fish-audio-provider'
import { EdgeTTSProvider } from '@/lib/ai/tts/edge-tts-provider'

// 单个语音合成
await ttsManager.generateSpeech({
  text: string
  voice?: {
    voiceId?: string        // Fish Audio 音色 ID
    rate?: number           // 语速调节
    volume?: number         // 音量调节
    pitch?: number          // 音调调节
  }
  jobId?: string
  sceneId?: string
  outputPath?: string
})
// 返回：{ audioUrl, duration, raw? }

// 批量合成
await ttsManager.generateMultiple(texts: string[], {
  voice?: TTSVoiceConfig
  maxConcurrent?: number    // 默认 3
})
```

**支持的 TTS 提供商**：

| 提供商 | 质量 | 费用 | 配置 |
|-------|------|------|------|
| **Fish Audio** | 高质量 | 付费 | API Key + Voice ID |
| **Edge TTS** | 中等 | 免费 | 无需配置 |

> **默认行为**：未配置 Fish Audio API Key 时自动回退到 Edge TTS

**向后兼容**：

```typescript
// 旧代码仍可使用（不推荐）
import { fishAudioClient } from '@/lib/ai/fish-audio-client'
```

## 错误处理模式

### 自动重试

所有 AI 客户端内置重试机制：
- 最大次数：3 次
- 退避策略：指数退避（2 倍）
- 可重试错误：网络超时、速率限制、临时服务不可用

### 模型回退

Gemini 特有：
- 指定模型不存在 → 使用回退模型 `gemini-2.5-pro`

### 错误分类

```typescript
import { ErrorClassifier } from '@/lib/utils/error-classifier'

const { category, isRetryable, userGuidance } = ErrorClassifier.classify(error)
// category: 'retryable' | 'config' | 'input' | 'system' | 'unknown'
```

## 完整数据流

> **v16.0 优化**：多轮对话模式 + 隐式缓存（~74% 成本节省）

```
用户上传视频
  ↓
[Gemini] analyzeVideo() → 分镜脚本
  │   └─ parts: [分析提示词, 视频...]（提示词在前，语义更清晰）
  │   └─ 保存到 job_videos: analysis_prompt, analysis_response
  ↓
[Gemini] batchOptimizeNarration() → 批量生成旁白（多轮对话 + 隐式缓存）
  │   └─ contents: [
  │   │     user(分析提示词+视频),    ← 第 1 轮：分析请求
  │   │     model(分析响应),          ← 第 1 轮：分析结果
  │   │     user(音画同步提示词)      ← 第 2 轮：旁白请求
  │   │   ]
  │   └─ 隐式缓存：前两轮固定，Gemini 自动缓存 ~74% token
  │   └─ 每批 10 个分镜（可配置 1-40）
  ↓
[FFmpeg] splitVideoBatch() → 场景视频片段（本地处理）
  │
  ↓ 并行处理多个场景（读取预生成旁白）
  ├─ [FFmpeg] trimJumpcutsIfNeeded() → 跳切修剪
  ├─ [Fish Audio] generateSpeech() → 3 版本音频
  ├─ [FFmpeg] adjustSpeed() → 调速后视频（本地处理）
  └─ [FFmpeg] mergeAudioVideo() → 音画合成（本地处理）
  │
  ↓
[FFmpeg] concatenateVideos() → 最终成片（本地处理）
```

## 多视频显式标签

> **v16.2 引入**：解决多视频场景下 Gemini 无法准确识别视频来源的问题

### 问题背景

多视频场景下，Parts 数组中的视频文件没有显式标签：

```typescript
// ❌ 错误：视频没有标签
parts: [
  { text: "分析提示词... video-1: 25s, video-2: 27s..." },
  { fileData: { fileUri: "gs://...video-1.mp4" } },  // Gemini 不知道这是 video-1
  { fileData: { fileUri: "gs://...video-2.mp4" } },  // Gemini 不知道这是 video-2
]
```

Gemini 只能通过文件名、时长等推断，导致多视频场景下音画不同步。

### 解决方案

在每个视频文件前插入显式标签：

```typescript
// ✅ 正确：带显式标签
parts: [
  { text: "分析提示词..." },
  { text: "【视频文件：video-1】" },
  { fileData: { fileUri: "gs://...video-1.mp4" } },
  { text: "【视频文件：video-2】" },
  { fileData: { fileUri: "gs://...video-2.mp4" } },
]
```

### 实现位置

| 方法 | 文件 | 说明 |
|------|------|------|
| `buildVideoParts` | `lib/ai/gemini/index.ts` | 视频分析阶段 |
| `buildLabeledVideoParts` | `lib/ai/gemini/index.ts` | 批量旁白阶段 |

## 多轮对话机制

> **v16.0 引入**：解决单轮对话导致 Gemini 返回错误格式的问题

### 问题背景

单轮对话模式下，所有内容放在同一个 `user` 消息中：

```typescript
// ❌ 错误：单轮模式
const contents = [
  { role: 'user', parts: [视频, 分析提示词, 音画同步提示词] }
]
```

Gemini 无法区分「分析任务」和「旁白任务」，导致返回 `storyboards` 而非 `scenes`。

### 解决方案

使用正确的多轮对话格式（提示词在前，语义更清晰）：

```typescript
// ✅ 正确：多轮模式
const contents = [
  { role: 'user', parts: [分析提示词, 视频...] },  // 第 1 轮：分析请求
  { role: 'model', parts: [分析响应JSON] },        // 第 1 轮：分析结果
  { role: 'user', parts: [音画同步提示词] },       // 第 2 轮：旁白请求
]
```

### 数据存储

| 字段 | 位置 | 用途 |
|------|------|------|
| `analysis_prompt` | `job_videos` | 分析提示词（第 1 轮 user） |
| `analysis_response` | `job_videos` | 分析响应（第 1 轮 model） |

### 隐式缓存

多轮对话仍支持 Gemini 隐式缓存：
- 每个批次的 `contents` 前两轮完全相同
- Gemini 自动缓存固定前缀（~8000 token）
- 实测缓存命中率：**~74%**

## 关键配置

### API 密钥配置

API 密钥通过 `/settings` 页面配置，AES-256-GCM 加密存储在数据库 `api_keys` 表中。

**Gemini 配置**：
- **Vertex AI**：Service Account JSON、Project ID、Location、Model ID
- **AI Studio**：API Key、Model ID

**Fish Audio 配置**：API Key、Voice ID

### 安全设置

Gemini 默认关闭所有安全过滤：
- `HARM_CATEGORY_HATE_SPEECH` → `BLOCK_NONE`
- `HARM_CATEGORY_DANGEROUS_CONTENT` → `BLOCK_NONE`
- `HARM_CATEGORY_SEXUALLY_EXPLICIT` → `BLOCK_NONE`
- `HARM_CATEGORY_HARASSMENT` → `BLOCK_NONE`

## 类型定义

详见 `types/ai/` 目录：
- `gemini.ts` - Gemini 平台和凭证类型
- `fish-audio.ts` - Fish Audio 类型
- `clients.ts` - 客户端接口定义

详见 `lib/media/` 目录：
- `types.ts` - FFmpeg 服务类型定义
- `ffmpeg-service.ts` - 核心服务实现
