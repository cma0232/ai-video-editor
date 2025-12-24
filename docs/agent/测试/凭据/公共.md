# 公共测试资源

## 测试视频素材

| 用途 | URL |
|------|-----|
| **单视频剪辑** | `https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-1.mp4` |
| **多视频混剪-视频2** | `https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-2.mp4` |
| **异常测试用视频** | `https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4` |
| **非视频文件测试** | `https://pub-b65afb21c951453a872a026d19411abe.r2.dev/test-image.png` |

## API 密钥配置

> 真实密钥请参考 [docs/agent/凭证.md](../../凭证.md) 或 `~/.claude/credentials/` 目录。

### AI Studio 平台

| 配置项 | 值 |
|--------|-----|
| **Gemini API Key** | `<YOUR_GEMINI_API_KEY>` |

### Vertex AI 平台

| 配置项 | 值 |
|--------|-----|
| **Project ID** | `<YOUR_PROJECT_ID>` |
| **Location** | `us-central1`（Gemini 3 使用 `global`） |
| **Service Account JSON** | 参考凭证文档 |

### Fish Audio

| 配置项 | 值 |
|--------|-----|
| **API Key** | `<YOUR_FISH_AUDIO_API_KEY>` |
| **Voice ID** | `<YOUR_VOICE_ID>` |

## Token 格式说明

| 类型 | 格式 |
|------|------|
| API Token | 以 `cca_` 开头 |
| Session Cookie | `session=xxx` |

## 默认测试风格

| 风格 ID | 名称 |
|---------|------|
| `style-1000` | 专业解说（默认） |
