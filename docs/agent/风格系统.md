# 风格系统

## 概述

风格系统采用双层提示词架构：
- **创意层**（风格 YAML）：定义风格特色和创意方向
- **参数层**（系统模板）：定义输入信息和输出规范

## 目录结构

```
styles/
├── style-1000.yaml ~ style-1019.yaml  # 20 个风格预设
└── _templates/                         # 系统模板（5 个文件）
    ├── README.md                       # 模板使用说明
    ├── analysis_params.yaml            # 分析阶段参数层
    ├── audio_sync_creative_default.yaml # 音画同步默认创意层
    ├── batch_audio_sync_params.yaml    # 音画同步参数层（批量模式）
    └── template-variables.md           # 占位符参考手册
```

## 风格 YAML 结构

```yaml
id: "1000"
name: "风格名称"
description: "风格描述"

# 视频分析阶段的创意层（必需）
analysis_creative_layer: |
  你是一位专业的视频解说脚本创作者...

# 音画同步阶段的创意层（可选，不设置则使用默认）
audio_sync_creative_layer: |
  调整旁白长度的要求...

# 配置参数
config:
  channel_name: "频道名称"
  duration_range:
    min: 6                          # 最小分镜时长（秒）
    max: 12                         # 最大分镜时长（秒）
  speech_rates:                     # 三版本语速（字/秒）：[v1慢速, v2中速, v3快速]
    - 4                             # v1: 较慢语速，生成较长旁白
    - 4.5                           # v2: 中等语速
    - 5.5                           # v3: 较快语速，生成较短旁白
  voice_id: "xxx"                   # Fish Audio 音色 ID（可选）
  original_audio_scene_count: 0     # 原声分镜数量（0 表示全部配音）
```

## 模板引擎

支持 Mustache 风格占位符（`{{variable}}`）：

```yaml
analysis_creative_layer: |
  频道名称：{{config.channel_name}}
  时长范围：{{config.min_duration}}-{{config.max_duration}} 秒
```

核心文件：`lib/utils/template-engine.ts`

## 常用占位符

### 分析阶段

| 占位符 | 说明 |
|--------|------|
| `{{config.channel_name}}` | 频道名称 |
| `{{config.min_duration}}` | 最小分镜时长 |
| `{{config.max_duration}}` | 最大分镜时长 |
| `{{config.total_duration}}` | 目标总时长 |
| `{{config.speech_rate}}` | 语速设置 |

### 音画同步阶段

| 占位符 | 说明 |
|--------|------|
| `{{scene.narration}}` | 原始旁白 |
| `{{scene.duration}}` | 分镜时长 |
| `{{target_audio_duration}}` | 目标音频时长 |

完整占位符参考：`styles/_templates/template-variables.md`

## 创建新风格

1. 在 `styles/` 目录创建 `style-{id}.yaml`
2. 填写必需字段：`id`、`name`、`analysis_creative_layer`、`config`
3. 可选添加 `audio_sync_creative_layer`（不设置则使用默认）

## 风格加载器

核心文件：`lib/workflow/style-loader.ts`

```typescript
import { styleLoader } from '@/lib/workflow/style-loader'

// 加载风格
const style = styleLoader.load('1000')

// 构建分析提示词
const analysisPrompt = styleLoader.buildAnalysisPrompt(style, context)

// 构建批量音画同步提示词
const batchPrompt = styleLoader.buildBatchAudioSyncPrompt(style, batchContext)
```

## 类型定义

位于 `types/core/style.ts`：

| 类型 | 说明 |
|------|------|
| `StylePreset` | 完整风格定义 |
| `StyleConfig` | 风格配置参数 |
| `PromptBuildContext` | 分析提示词构建上下文 |
| `BatchAudioSyncPromptContext` | 批量音画同步提示词构建上下文 |
