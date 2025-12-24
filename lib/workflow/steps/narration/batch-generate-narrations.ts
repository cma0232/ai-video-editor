/**
 * 批量旁白生成步骤
 *
 * v16.0 隐式缓存模式：
 * - 直接使用 gemini_uri（GCS/File API）
 * - 视频放 prompt 开头提高缓存命中率
 * - 无需显式缓存管理
 */

import { CONFIG_DEFAULTS, CONFIG_KEYS } from '@/lib/config/defaults'
import { configsRepo } from '@/lib/db/core/configs'
import { saveJobLog } from '@/lib/db/tables/job-logs'
import * as jobScenesDb from '@/lib/db/tables/job-scenes'
import * as jobVideosDb from '@/lib/db/tables/job-videos'
import { detectVideoMimeType } from '@/lib/utils/video-mime'
import { styleLoader } from '@/lib/workflow/style-loader'
import { resolveNarrationLanguage } from '@/lib/workflow/tts-config-resolver'
import type { BatchSceneInfo, JobScene } from '@/types'
import type { WorkflowContext } from '../../types'
import { BaseStep } from '../base'

/**
 * 批量旁白生成输出
 */
export interface BatchGenerateNarrationsOutput {
  /** 总分镜数 */
  totalScenes: number
  /** 批次数 */
  totalBatches: number
  /** 每批大小 */
  batchSize: number
  /** 各批次结果 */
  batches: BatchResult[]
  /** 总 token 使用 */
  totalTokenUsage: {
    input: number
    output: number
    cached?: number
  }
}

/**
 * 单批次结果
 */
interface BatchResult {
  batchIndex: number
  sceneCount: number
  sceneIds: string[]
  tokenUsage: {
    input: number
    output: number
  }
}

/**
 * 批量旁白生成步骤
 *
 * 工作流程：
 * 1. 从 job_scenes 获取所有分镜
 * 2. 按配置的 batch_size 分组
 * 3. 使用 Context Cache 调用 Gemini 批量生成旁白
 * 4. 将结果保存到 job_scenes 表（narration_v1/v2/v3）
 */
export class BatchGenerateNarrationsStep extends BaseStep<BatchGenerateNarrationsOutput> {
  readonly id = 'batch_generate_narrations'
  readonly name = '批量生成旁白'

  /**
   * 返回完整输入数据（用于日志记录）
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    const scenes = jobScenesDb.findByJobId(ctx.jobId)
    const jobVideos = jobVideosDb.findByJobId(ctx.jobId)
    const batchSize = this.getBatchSize()

    return {
      job_id: ctx.jobId,
      total_scenes: scenes.length,
      batch_size: batchSize,
      total_batches: Math.ceil(scenes.length / batchSize),
      video_count: jobVideos.length,
      video_uris: jobVideos.map((v) => v.gemini_uri).filter(Boolean),
      platform: ctx.features.platform,
    }
  }

  async execute(ctx: WorkflowContext): Promise<BatchGenerateNarrationsOutput> {
    // 1. 获取视频 URI（用于隐式缓存）
    const jobVideos = jobVideosDb.findByJobId(ctx.jobId)
    const videosWithMime = jobVideos
      .filter((v) => v.gemini_uri)
      .map((v) => ({
        uri: v.gemini_uri as string,
        mimeType: detectVideoMimeType(v.original_url || v.gcs_https_url || ''),
      }))

    if (videosWithMime.length === 0) {
      throw new Error('未找到视频 Gemini URI，请先完成 prepare_gemini 步骤')
    }

    // 1.1 加载分析提示词和分析响应（用于多轮对话）
    const analysisPrompt = jobVideos[0]?.analysis_prompt || ''
    const analysisResponse = jobVideos[0]?.analysis_response || ''

    if (!analysisPrompt) {
      throw new Error(
        '未找到分析提示词（analysis_prompt），多轮对话无法正确构建。请重新运行分析步骤',
      )
    }

    if (!analysisResponse) {
      throw new Error(
        '未找到分析响应（analysis_response），多轮对话无法正确构建。请重新运行分析步骤',
      )
    }

    // 2. 获取所有分镜
    const scenes = jobScenesDb.findByJobId(ctx.jobId)
    if (scenes.length === 0) {
      throw new Error('未找到分镜数据')
    }

    // 过滤出需要配音的分镜（非原声分镜）
    const dubbedScenes = scenes.filter((s) => !s.use_original_audio)

    this.log(ctx, '开始批量生成旁白', {
      totalScenes: scenes.length,
      dubbedScenes: dubbedScenes.length,
      originalAudioScenes: scenes.length - dubbedScenes.length,
      videoCount: videosWithMime.length,
    })

    // 如果没有需要配音的分镜，直接返回
    if (dubbedScenes.length === 0) {
      this.log(ctx, '无需配音的分镜，跳过旁白生成')
      return {
        totalScenes: scenes.length,
        totalBatches: 0,
        batchSize: this.getBatchSize(),
        batches: [],
        totalTokenUsage: { input: 0, output: 0, cached: 0 },
      }
    }

    // 3. 分组处理
    const batchSize = this.getBatchSize()
    const batches = this.splitIntoBatches(dubbedScenes, batchSize)

    this.log(ctx, '分组完成', {
      batchSize,
      totalBatches: batches.length,
    })

    // 4. 加载风格配置
    const style = styleLoader.load(ctx.input.styleId)

    // 5. 逐批次处理
    // 注意：v12.2 移除 global_context，分析对话已缓存到 Context Cache
    const results: BatchResult[] = []
    let totalInput = 0
    let totalOutput = 0
    let totalCached = 0

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const batchIndex = i + 1

      // 构建批量提示词
      const batchSceneInfos: BatchSceneInfo[] = batch.map((scene) => ({
        scene_id: scene.id,
        scene_index: scene.scene_index,
        source_video: scene.source_video_label, // 源视频标签（多视频场景关键）
        source_start_time: scene.source_start_time,
        source_end_time: scene.source_end_time,
        duration_seconds: scene.duration_seconds,
        narration_script: scene.narration_script || '',
      }))

      const prompt = styleLoader.buildBatchAudioSyncPrompt(style, {
        batch_index: batchIndex,
        total_batches: batches.length,
        batch_size: batch.length,
        language: resolveNarrationLanguage(),
        speech_rates: style.config.speech_rates,
        scenes: batchSceneInfos,
      })

      // 记录批次输入（写入数据库，前端可见）
      saveJobLog({
        jobId: ctx.jobId,
        logType: 'info',
        logLevel: 'info',
        message: `批次 ${batchIndex}/${batches.length} 输入`,
        details: {
          batch_index: batchIndex,
          total_batches: batches.length,
          // 分镜列表（含完整时间戳和旁白脚本）
          scenes: batchSceneInfos.map((s) => ({
            scene_id: s.scene_id,
            scene_index: s.scene_index,
            source_start_time: s.source_start_time,
            source_end_time: s.source_end_time,
            duration_seconds: s.duration_seconds,
            narration_script: s.narration_script,
          })),
          // 完整提示词
          full_prompt: prompt,
          // 视频信息
          video_count: videosWithMime.length,
        },
        majorStep: ctx.runtime.currentStage,
        subStep: this.id,
        stepNumber: ctx.numberingMap.stepNumbers.get(this.id),
        stageNumber: ctx.runtime.currentStage
          ? ctx.numberingMap.stageNumbers.get(ctx.runtime.currentStage)
          : undefined,
      })

      // 调用 Gemini 批量生成（多轮对话模式）
      // contents 结构: [user(视频+分析提示词), model(分析响应), user(音画同步提示词)]
      // 这样 Gemini 明确知道第 1 轮对话已完成，当前是第 2 轮新任务
      const result = await ctx.services.gemini.batchOptimizeNarration({
        analysisPrompt, // 第 1 轮：用户请求分析
        analysisResponse, // 第 1 轮：模型返回分析结果
        prompt, // 第 2 轮：用户请求旁白生成
        videoUris: videosWithMime,
        platform: ctx.features.platform,
        jobId: ctx.jobId,
        batchIndex,
      })

      // 检查返回数量是否匹配
      const isValidResponse = result.data.scenes && result.data.scenes.length === batch.length

      let narrationUpdates: Array<{
        scene_id: string
        narration_v1: string
        narration_v2: string
        narration_v3: string
      }>

      if (isValidResponse) {
        // 数量匹配：使用 AI 生成的旁白
        narrationUpdates = result.data.scenes.map((s) => ({
          scene_id: s.scene_id,
          narration_v1: s.narration_v1,
          narration_v2: s.narration_v2,
          narration_v3: s.narration_v3,
        }))
      } else {
        // 数量不匹配：整个批次使用原始脚本
        this.log(ctx, `批次 ${batchIndex} 返回数量不匹配，使用原始脚本`, {
          expected: batch.length,
          actual: result.data.scenes?.length || 0,
        })

        saveJobLog({
          jobId: ctx.jobId,
          logType: 'warning',
          logLevel: 'warn',
          message: `批次 ${batchIndex} AI 返回 ${result.data.scenes?.length || 0}/${batch.length}，使用原始脚本`,
          details: {
            batch_index: batchIndex,
            expected: batch.length,
            actual: result.data.scenes?.length || 0,
          },
          majorStep: ctx.runtime.currentStage,
          subStep: this.id,
          stepNumber: ctx.numberingMap.stepNumbers.get(this.id),
          stageNumber: ctx.runtime.currentStage
            ? ctx.numberingMap.stageNumbers.get(ctx.runtime.currentStage)
            : undefined,
        })

        // 全部使用原始脚本
        narrationUpdates = batch.map((scene) => {
          const fallbackText = scene.narration_script || ''
          return {
            scene_id: String(scene.id),
            narration_v1: fallbackText,
            narration_v2: fallbackText,
            narration_v3: fallbackText,
          }
        })
      }

      // 保存到数据库
      jobScenesDb.updateNarrations(narrationUpdates)

      // 记录结果
      results.push({
        batchIndex,
        sceneCount: batch.length,
        sceneIds: batch.map((s) => s.id),
        tokenUsage: result.tokenUsage,
      })

      totalInput += result.tokenUsage.input
      totalOutput += result.tokenUsage.output
      totalCached += result.tokenUsage.cached ?? 0

      // 记录批次输出（写入数据库，前端可见）
      saveJobLog({
        jobId: ctx.jobId,
        logType: 'info',
        logLevel: 'info',
        message: `批次 ${batchIndex}/${batches.length} 输出`,
        details: {
          batch_index: batchIndex,
          total_batches: batches.length,
          scene_count: result.data.scenes.length,
          // Gemini 完整响应（含三个版本旁白）
          scenes: result.data.scenes.map((s) => ({
            scene_id: s.scene_id,
            narration_v1: s.narration_v1,
            narration_v2: s.narration_v2,
            narration_v3: s.narration_v3,
          })),
          // Token 使用统计
          token_usage: {
            input: result.tokenUsage.input,
            output: result.tokenUsage.output,
            cached: result.tokenUsage.cached,
          },
        },
        majorStep: ctx.runtime.currentStage,
        subStep: this.id,
        stepNumber: ctx.numberingMap.stepNumbers.get(this.id),
        stageNumber: ctx.runtime.currentStage
          ? ctx.numberingMap.stageNumbers.get(ctx.runtime.currentStage)
          : undefined,
      })
    }

    this.log(ctx, '批量旁白生成完成', {
      totalBatches: batches.length,
      totalTokenUsage: { input: totalInput, output: totalOutput, cached: totalCached },
    })

    return {
      totalScenes: scenes.length,
      totalBatches: batches.length,
      batchSize,
      batches: results,
      totalTokenUsage: {
        input: totalInput,
        output: totalOutput,
        cached: totalCached,
      },
    }
  }

  /**
   * 获取批次大小配置
   */
  private getBatchSize(): number {
    const value = configsRepo.get(CONFIG_KEYS.NARRATION_BATCH_SIZE)
    if (value) {
      const parsed = Number.parseInt(value, 10)
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 40) {
        return parsed
      }
    }
    return CONFIG_DEFAULTS.NARRATION_BATCH_SIZE
  }

  /**
   * 将分镜分组
   */
  private splitIntoBatches(scenes: JobScene[], batchSize: number): JobScene[][] {
    const batches: JobScene[][] = []
    for (let i = 0; i < scenes.length; i += batchSize) {
      batches.push(scenes.slice(i, i + batchSize))
    }
    return batches
  }
}
