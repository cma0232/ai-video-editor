/**
 * 验证分镜结果步骤
 * - 极简架构
 * - 添加输出数据返回
 * - 增强验证逻辑（数量、字段、时间戳范围）
 * - 完整的验证 + 修复 + 过滤流程（模块化架构）
 */

import { getDb } from '@/lib/db'
import * as stateManager from '@/lib/db/managers/state-manager'
import * as jobScenesDb from '@/lib/db/tables/job-scenes'
import * as jobVideosDb from '@/lib/db/tables/job-videos'
import { parseTimestamp } from '@/lib/utils/time'
import type { JobScene, VideoMetadata } from '@/types'
import type { ValidateStoryboardsOutput, WorkflowContext } from '../../types'
import { BaseStep } from '../base'
import { fixDurationSeconds, normalizeSceneTimestamps } from './fixers'
import {
  validateOriginalAudioCount,
  validateRequiredFields,
  validateTimestampRange,
} from './validators'

/**
 * 验证分镜结果
 * 完整的验证 + 修复 + 过滤流程
 */
export class ValidateStep extends BaseStep<ValidateStoryboardsOutput> {
  readonly id = 'validate_storyboards'
  readonly name = '验证分镜结果'

  /**
   * 返回完整输入数据（用于日志记录）
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    const storyboards = jobScenesDb.findByJobId(ctx.jobId)
    return {
      storyboards_count: storyboards.length,
      original_audio_count: storyboards.filter((s) => s.use_original_audio === 1).length,
      dubbed_audio_count: storyboards.filter((s) => s.use_original_audio === 0).length,
      config: {
        expected_storyboard_count: ctx.input.config.storyboard_count,
        expected_original_audio_count: ctx.input.config.original_audio_scene_count || 0,
      },
      storyboards: storyboards.map((s) => ({
        scene_id: s.id,
        use_original_audio: s.use_original_audio === 1,
        duration_seconds: s.duration_seconds,
      })),
    }
  }

  async execute(ctx: WorkflowContext): Promise<ValidateStoryboardsOutput> {
    // 【阶段1：加载数据】
    const videoMetadataMap = this.loadVideoMetadata(ctx.jobId)
    const scenes = jobScenesDb.findByJobId(ctx.jobId)

    if (scenes.length === 0) {
      throw new Error('No storyboards found in job_scenes table')
    }

    // 【阶段2：验证 + 修复 + 过滤】
    const result = this.processScenes(scenes, videoMetadataMap, ctx)

    // 【阶段3：批量写回】
    this.updateScenes(ctx.jobId, result.validScenes, result.skippedScenes)

    // 【阶段4：错误判断】
    if (result.fatalErrors.length > 0) {
      throw new Error(this.formatErrors(result.fatalErrors))
    }

    if (result.validScenes.length === 0) {
      throw new Error('所有分镜都无效或被跳过，无法继续')
    }

    // 【阶段5：数量验证】（允许继续，仅警告）
    const expectedCount = ctx.input.config.storyboard_count
    if (expectedCount && result.validScenes.length < expectedCount) {
      result.warnings.push(
        `有效分镜数量 (${result.validScenes.length}) 低于期望数量 (${expectedCount})，` +
          `已跳过 ${result.skippedScenes.length} 个超范围分镜`,
      )
    }

    // 【阶段6：原声分镜数量验证】
    const originalSceneCount = result.validScenes.filter((s) => s.use_original_audio === 1).length
    const expectedOriginalCount = ctx.input.config.original_audio_scene_count || 0
    const originalAudioResult = validateOriginalAudioCount(
      originalSceneCount,
      expectedOriginalCount,
    )
    if (!originalAudioResult.isValid && originalAudioResult.warning) {
      result.warnings.push(originalAudioResult.warning)
    }

    // 【阶段7：更新上下文】
    const dubbedSceneCount = result.validScenes.length - originalSceneCount

    ctx.features.totalScenes = result.validScenes.length
    ctx.features.originalSceneCount = originalSceneCount
    ctx.features.dubbedSceneCount = dubbedSceneCount
    ctx.features.hasOriginalAudio = originalSceneCount > 0

    stateManager.updateState(ctx.jobId, {
      step_context: {
        isSingleVideo: ctx.features.isSingleVideo,
        isMultiVideo: ctx.features.isMultiVideo,
        hasOriginalAudio: ctx.features.hasOriginalAudio,
        platform: ctx.features.platform,
        totalScenes: result.validScenes.length,
        originalSceneCount,
        dubbedSceneCount,
      },
    })

    return {
      isValid: true,
      totalScenes: result.validScenes.length,
      originalSceneCount,
      dubbedSceneCount,
      errors: [],
      warnings: result.warnings.map((msg) => ({ sceneId: '', message: msg })),
    }
  }

  /**
   * 加载视频元数据映射
   */
  private loadVideoMetadata(jobId: string): Map<number, VideoMetadata | null> {
    const videos = jobVideosDb.findByJobId(jobId)
    const map = new Map<number, VideoMetadata | null>()

    for (const video of videos) {
      let metadata: VideoMetadata | null = null
      if (video.metadata) {
        try {
          metadata = JSON.parse(video.metadata) as VideoMetadata
        } catch {
          console.warn(`[ValidateStep] Failed to parse metadata for video ${video.video_index}`)
        }
      }
      map.set(video.video_index, metadata)
    }

    return map
  }

  /**
   * 处理分镜（验证 + 修复 + 过滤）
   */
  private processScenes(
    scenes: JobScene[],
    videoMetadataMap: Map<number, VideoMetadata | null>,
    ctx: WorkflowContext,
  ) {
    // 【阶段 0：时间戳尺度预检测】
    // 修复 Gemini 返回 HH:MM:00.mmm 格式（把 MM:SS 写成 HH:MM:00）的错误
    scenes = this.detectAndFixTimestampScale(scenes, videoMetadataMap, ctx)

    const validScenes: JobScene[] = []
    const skippedScenes: Array<{ scene: JobScene; reason: string }> = []
    const fatalErrors: string[] = []
    const warnings: string[] = []

    for (let i = 0; i < scenes.length; i++) {
      let scene = scenes[i]
      const label = `分镜 ${i + 1} (${scene.id})`

      // 1️⃣ 字段完整性验证
      const fieldResult = validateRequiredFields(scene, i)

      // 致命错误：缺少关键字段
      if (fieldResult.errors.length > 0) {
        fatalErrors.push(...fieldResult.errors)
        continue
      }

      // 可跳过：缺少旁白等非关键字段
      if (fieldResult.shouldSkip) {
        ctx.logger.warn(`${label}: 已跳过`, { reason: fieldResult.skipReason })
        warnings.push(fieldResult.skipReason || `${label}: 字段不完整，已跳过`)
        skippedScenes.push({ scene, reason: fieldResult.skipReason || '字段不完整' })
        continue
      }

      // 2️⃣ 视频索引验证（致命错误）
      const videoMetadata = videoMetadataMap.get(scene.source_video_index)
      if (!videoMetadata) {
        fatalErrors.push(`${label}: 找不到对应的源视频 (index=${scene.source_video_index})`)
        continue
      }

      // 3️⃣ 时间戳标准化（修复）
      const normalizeResult = normalizeSceneTimestamps(scene)
      scene = normalizeResult.scene
      if (normalizeResult.changes.length > 0) {
        // ✅ 写入 job_logs 表（INFO 级别）
        ctx.logger.info(`${label}: 时间戳已标准化`, {
          changes: normalizeResult.changes,
        })
      }

      // 4️⃣ 时长修复（修复，阈值=0.1秒）+ 时间戳顺序修复
      const durationResult = fixDurationSeconds(scene)
      scene = durationResult.scene

      // 记录时间戳交换（AI 生成的 start/end 顺序错误）
      if (durationResult.swapped) {
        ctx.logger.warn(`${label}: 时间戳顺序已修正（start/end 已交换）`, {
          corrected_start: scene.source_start_time,
          corrected_end: scene.source_end_time,
        })
        warnings.push(`${label}: 时间戳顺序已修正（start/end 已交换）`)
      }

      if (durationResult.fixed) {
        // ✅ 写入 job_logs 表（WARN 级别）
        ctx.logger.warn(`${label}: 时长已修正`, {
          old: durationResult.oldValue,
          new: durationResult.newValue,
        })
        warnings.push(
          `${label}: 时长已修正 (${durationResult.oldValue}s → ${durationResult.newValue}s)`,
        )
      }

      // 5️⃣ 时间戳范围验证（超范围则跳过）
      const rangeResult = validateTimestampRange(scene, videoMetadata, i)
      if (rangeResult.shouldSkip) {
        // ✅ 写入 job_logs 表（WARN 级别）
        ctx.logger.warn(`${label}: 已跳过`, {
          reason: rangeResult.warnings[0],
        })
        warnings.push(...rangeResult.warnings)
        skippedScenes.push({ scene, reason: rangeResult.warnings[0] })
        continue
      }
      if (!rangeResult.isValid) {
        fatalErrors.push(...rangeResult.errors)
        continue
      }

      // 6️⃣ 通过验证
      validScenes.push(scene)
    }

    return { validScenes, skippedScenes, fatalErrors, warnings }
  }

  /**
   * 批量更新分镜
   */
  private updateScenes(
    jobId: string,
    validScenes: JobScene[],
    skippedScenes: Array<{ scene: JobScene; reason: string }>,
  ) {
    const db = getDb()
    const now = Date.now()

    // 更新有效分镜（标准化时间戳 + duration_seconds）
    const updateValid = db.prepare(`
      UPDATE job_scenes
      SET source_start_time = ?, source_end_time = ?, duration_seconds = ?, updated_at = ?
      WHERE job_id = ? AND id = ?
    `)

    for (const scene of validScenes) {
      updateValid.run(
        scene.source_start_time,
        scene.source_end_time,
        scene.duration_seconds,
        now,
        jobId,
        scene.id,
      )
    }

    // 标记跳过的分镜（使用 is_skipped 字段，而非 status）
    // 注意：status 字段约束只允许 pending/processing/completed/failed
    const updateSkipped = db.prepare(`
      UPDATE job_scenes
      SET is_skipped = 1, updated_at = ?
      WHERE job_id = ? AND id = ?
    `)

    for (const { scene } of skippedScenes) {
      updateSkipped.run(now, jobId, scene.id)
    }
  }

  /**
   * 格式化错误信息
   */
  private formatErrors(errors: string[]): string {
    return [
      `分镜验证失败，发现 ${errors.length} 个错误：`,
      ...errors.map((e, i) => `  ${i + 1}. ${e}`),
    ].join('\n')
  }

  // ============================================================================
  // 时间戳尺度修复（处理 Gemini 把 MM:SS 写成 HH:MM:00 的错误）
  // ============================================================================

  /**
   * 检测并修复时间戳尺度错误
   *
   * 触发条件（必须全部满足）：
   * 1. 所有分镜的 endTime 都超出视频时长
   * 2. 视频时长 < 1 小时（排除真实长视频）
   * 3. 所有时间戳符合 HH:MM:00.mmm 模式（秒位是 00）
   * 4. 修复后所有分镜都在视频时长范围内
   */
  private detectAndFixTimestampScale(
    scenes: JobScene[],
    videoMetadataMap: Map<number, VideoMetadata | null>,
    ctx: WorkflowContext,
  ): JobScene[] {
    // 1. 获取最大视频时长
    const durations = Array.from(videoMetadataMap.values())
      .filter((m): m is VideoMetadata => m !== null)
      .map((m) => m.duration)

    if (durations.length === 0) return scenes

    const maxDuration = Math.max(...durations)

    // 安全检查：视频 >= 1 小时，不触发（可能是真实时间戳）
    if (maxDuration >= 3600) return scenes

    // 2. 检查是否所有分镜都超范围
    const allOutOfRange = scenes.every((scene) => {
      const end = parseTimestamp(scene.source_end_time)
      return end > maxDuration
    })

    if (!allOutOfRange) return scenes

    // 3. 检查是否符合 HH:MM:00 错误模式
    const allMatchPattern = scenes.every(
      (scene) =>
        this.isScaleErrorPattern(scene.source_start_time) &&
        this.isScaleErrorPattern(scene.source_end_time),
    )

    if (!allMatchPattern) return scenes

    // 4. 尝试修复：HH:MM:00.mmm → 00:HH:MM.mmm
    const fixedScenes = scenes.map((scene) => ({
      ...scene,
      source_start_time: this.rescaleTimestamp(scene.source_start_time),
      source_end_time: this.rescaleTimestamp(scene.source_end_time),
    }))

    // 5. 验证修复后是否在范围内
    const allInRange = fixedScenes.every((scene) => {
      const end = parseTimestamp(scene.source_end_time)
      return end <= maxDuration
    })

    if (allInRange) {
      ctx.logger.warn(`时间戳尺度已修正: ${scenes.length} 个分镜从 HH:MM:00 修正为 00:HH:MM`, {
        original_sample: scenes[0]?.source_start_time,
        fixed_sample: fixedScenes[0]?.source_start_time,
        video_duration: maxDuration,
      })
      return fixedScenes
    }

    return scenes
  }

  /**
   * 检查是否符合尺度错误模式：HH:MM:00.mmm（秒位是 00）
   */
  private isScaleErrorPattern(timestamp: string): boolean {
    const match = timestamp.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/)
    if (!match) return false

    const [, hh, , ss] = match
    // 秒位是 00，且 HH < 60（可以当作分钟）
    return ss === '00' && Number.parseInt(hh, 10) < 60
  }

  /**
   * 重新解释时间戳尺度：HH:MM:00.mmm → 00:HH:MM.mmm
   * 例：02:44:00.000 → 00:02:44.000
   */
  private rescaleTimestamp(timestamp: string): string {
    const match = timestamp.match(/^(\d{2}):(\d{2}):00\.(\d{3})$/)
    if (match) {
      const [, hh, mm, ms] = match
      return `00:${hh}:${mm}.${ms}`
    }
    return timestamp
  }
}
