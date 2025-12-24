/**
 * 步骤注册
 *
 * v16.0 简化流程（移除显式缓存）：
 * 元数据 → 准备 Gemini → 分析 → 旁白 → 确保本地 → 拆条 → 分镜处理 → 拼接
 */

// 导入所有步骤
import { FetchMetadataStep } from './analysis/fetch-metadata'
import { GeminiAnalysisStep } from './analysis/gemini-analysis'
import { PrepareGeminiStep } from './analysis/prepare-gemini'
import { ValidateStep } from './analysis/validate'
import { AddBgmStep } from './compose/add-bgm'
import { ConcatenateScenesStep } from './compose/concatenate-scenes'
import { DownloadStep } from './compose/download'
import { EnsureLocalVideoStep } from './extract/ensure-local-video'
import { FFmpegBatchSplitStep } from './extract/ffmpeg-batch-split'
import { BatchGenerateNarrationsStep } from './narration/batch-generate-narrations'
import { ProcessSceneLoopStep } from './process/process-scene-loop'
import { ProcessSceneLoopConcurrentStep } from './process/process-scene-loop-concurrent'
import { stepRegistry } from './registry'

/**
 * 注册所有步骤
 * 在应用启动时调用
 */
export function registerAllSteps(): void {
  stepRegistry.registerBatch({
    // 阶段 1: 分析（Analysis）
    fetch_metadata: FetchMetadataStep,
    prepare_gemini: PrepareGeminiStep, // 智能路由：GCS 直转/流式转发/File API
    gemini_analysis: GeminiAnalysisStep,
    validate_storyboards: ValidateStep,

    // 阶段 2: 旁白生成（隐式缓存模式）
    batch_generate_narrations: BatchGenerateNarrationsStep,

    // 阶段 3: 提取分镜（Extract Scenes）
    ensure_local_video: EnsureLocalVideoStep, // 按需下载（FFmpeg 前）
    ffmpeg_batch_split: FFmpegBatchSplitStep,

    // 阶段 4: 处理分镜（Process Scenes）
    process_scene_loop: ProcessSceneLoopStep, // 串行版本（默认）
    process_scene_loop_concurrent: ProcessSceneLoopConcurrentStep, // 并发版本

    // 阶段 5: 合成（Compose）
    concatenate: ConcatenateScenesStep,
    add_bgm: AddBgmStep,
    download: DownloadStep,
  })
}

// 导出步骤类（供单元测试使用）
export {
  FetchMetadataStep,
  PrepareGeminiStep,
  GeminiAnalysisStep,
  ValidateStep,
  BatchGenerateNarrationsStep,
  EnsureLocalVideoStep,
  FFmpegBatchSplitStep,
  ProcessSceneLoopStep,
  ProcessSceneLoopConcurrentStep,
  ConcatenateScenesStep,
  AddBgmStep,
  DownloadStep,
}
