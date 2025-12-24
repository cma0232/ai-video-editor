# 工作流引擎

核心文件：`lib/workflow/engine.ts`

## 五阶段流水线

> **v16.0 架构变更**：移除显式 Context Cache，改用隐式缓存模式（跨方法缓存复用）

**命名约定**：步骤 ID 使用下划线（snake_case），文件名使用连字符（kebab-case）。例如：`fetch_metadata` 步骤对应 `fetch-metadata.ts` 文件。

### 阶段 1：视频分析（analysis）

| 步骤 | 文件 | 说明 |
|-----|------|------|
| fetch_metadata | `steps/analysis/fetch-metadata.ts` | 获取视频元数据 |
| prepare_gemini | `steps/analysis/prepare-gemini.ts` | 准备 Gemini 输入（智能路由） |
| gemini_analysis | `steps/analysis/gemini-analysis.ts` | Gemini 分析生成分镜 |
| validate_storyboards | `steps/analysis/validate.ts` | 验证分镜脚本 |

### 阶段 2：旁白生成（generate_narrations）

| 步骤 | 文件 | 说明 |
|-----|------|------|
| batch_generate_narrations | `steps/narration/batch-generate-narrations.ts` | 批量生成 v1/v2/v3 旁白 |

> **优化效果**：使用隐式缓存（跨方法复用 `[视频, 分析提示词]` 前缀），降低 ~74% Token 成本

### 阶段 3：分镜提取（extract_scenes）

| 步骤 | 文件 | 说明 |
|-----|------|------|
| group_by_source | 引擎内置逻辑 | 多视频时按源分组（非独立步骤文件） |
| ensure_local_video | `steps/extract/ensure-local-video.ts` | 按需下载远程视频（FFmpeg 前） |
| ffmpeg_batch_split | `steps/extract/ffmpeg-batch-split.ts` | FFmpeg 批量拆条 |

### 阶段 4：音画同步（process_scenes）

> **注意**：此阶段只有一个大步骤 `process_scene_loop`，下表为其内部操作流程

| 大步骤 | 文件 | 说明 |
|-----|------|------|
| process_scene_loop | `steps/process/process-scene-loop.ts` | 串行处理所有分镜 |
| process_scene_loop_concurrent | `steps/process/process-scene-loop-concurrent.ts` | 并行处理（可选） |

**内部子步骤**（在 `step-definitions.ts` 中定义）：

| 步骤 ID | 说明 |
|-----|------|
| scene_loop_start | 分镜处理循环开始（标记） |
| synthesize_audio | Fish Audio 批量语音合成（读取预生成旁白） |
| trim_jumpcuts | 跳切修剪（v12.2 新增，检测并修剪开头/结尾跳切帧） |
| select_best_match | 智能音频匹配（速度因子最接近 1.0） |
| adjust_video_speed | FFmpeg 视频调速 |
| merge_audio_video | FFmpeg 音画合成 |
| burn_subtitle | 字幕烧录（生成并烧录 ASS 字幕） |
| reencode_original_audio | 重新编码原声视频（可选，保留原声模式） |
| scene_loop_end | 分镜处理循环结束（标记） |

### 阶段 5：最终合成（compose）

| 步骤 ID | 文件 | 说明 |
|-----|------|------|
| concatenate_scenes | `steps/compose/concatenate-scenes.ts` | 拼接所有分镜 |
| add_bgm | `steps/compose/add-bgm.ts` | 添加背景音乐（可选，按需调用） |
| download_to_local | `steps/compose/download.ts` | 下载到本地 |

> **注意**：`add_bgm` 步骤根据任务配置的 `bgm_url` 按需执行，不在主步骤定义中。

## 层次化步骤系统

- **5 个大步骤**（MajorStep）：`analysis`、`generate_narrations`、`extract_scenes`、`process_scenes`、`compose`
- **小步骤**（SubStep）：根据任务类型动态生成（单/多视频、原声/配音、Vertex/AI Studio）
- **步骤定义**：`lib/workflow/step-definitions.ts`

> **注意**：`generate_narration` 步骤已废弃（保留向后兼容），v11.2 起使用 `batch_generate_narrations` 替代

```typescript
// 动态生成步骤列表
getStepsForContext(context: StepContext): StepDefinition[]
```

## 步骤记录

- 每个任务有 `current_step` 记录当前步骤
- 每完成一步自动保存到 `job_step_history` 表
- 任务停止或失败后不可恢复，需创建新任务重试

## 音画同步策略

1. 为每个分镜生成 3 个不同长度的旁白（narration_v1/v2/v3）
2. Fish Audio 批量合成 3 个音频
3. 选择速度因子最接近 1.0 的方案
4. FFmpeg `adjustSpeed()` 本地调速视频
5. FFmpeg `mergeAudioVideo()` 本地合成音画

## 双平台架构

### Vertex AI 模式（企业级）

- 视频上传到 GCS，使用 `gs://` URI
- 需要 Service Account JSON、Project ID、Location
- Gemini 3 需使用 `global` 端点

### AI Studio 模式（个人用户）

- 配置简单，仅需 API Key
- 限制 500MB/1 小时
- 通过 File API 上传，48 小时自动删除

> **SDK 统一**：双平台均使用 `@google/genai` SDK

## 心跳机制

工作流引擎使用心跳机制检测僵尸任务，避免误杀大视频处理任务：

- **心跳超时**：30 分钟无响应视为僵尸任务
- **更新时机**：每个步骤执行前后更新心跳
- **清理频率**：每小时执行一次僵尸任务清理
- **临时文件清理**：每 6 小时清理 24 小时前的临时文件

## 状态管理模块

`lib/workflow/state/` 目录：

| 模块 | 职责 |
|-----|------|
| index.ts | 模块入口（统一导出） |
| context-manager.ts | 上下文创建和加载 |
| data-persistence.ts | 数据持久化 |
| lifecycle-manager.ts | 生命周期管理 |
| step-manager.ts | 步骤状态管理 |
