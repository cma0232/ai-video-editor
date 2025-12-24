/**
 * 工作流步骤定义系统
 *
 * 提供两层步骤结构：
 * - 大步骤（Major Step）：5 个核心阶段（分析/旁白生成/分镜提取/音画同步/合成）
 * - 小步骤（Sub Step）：每个大步骤内部的细粒度操作
 *
 * 支持根据任务类型动态调整步骤列表
 */

import type { JobStep } from '@/types'

/**
 * 大步骤定义（JobStep 别名，用于工作流引擎）
 */
export type MajorStep = JobStep

/**
 * 小步骤定义
 *
 * 工作流顺序（5 阶段）：
 * 分析 → 旁白生成 → 分镜提取 → 音画同步 → 合成
 */
export type SubStep =
  // Step 1: analysis - 视频分析
  | 'fetch_metadata' // 获取视频元数据（HTTP URL 直接读取）
  | 'prepare_gemini' // 准备 Gemini 输入（智能路由：GCS 直转/流式转发/File API）
  | 'gemini_analysis' // Gemini 分析生成分镜脚本
  | 'validate_storyboards' // 验证分镜脚本

  // Step 2: generate_narrations - 旁白生成（隐式缓存模式）
  | 'batch_generate_narrations' // 批量生成旁白

  // Step 3: extract_scenes - 分镜提取
  | 'group_by_source' // 按来源视频分组（多视频）
  | 'ensure_local_video' // 确保本地视频（按需下载）
  | 'ffmpeg_batch_split' // FFmpeg 批量拆条

  // Step 4: process_scenes - 音画同步处理
  | 'scene_loop_start' // 分镜处理循环开始（标记）
  | 'synthesize_audio' // Fish Audio 批量语音合成
  | 'trim_jumpcuts' // 跳切修剪（v12.2 新增）
  | 'select_best_match' // 智能音频匹配
  | 'adjust_video_speed' // FFmpeg 视频调速
  | 'merge_audio_video' // FFmpeg 音画合成
  | 'burn_subtitle' // 字幕烧录
  | 'reencode_original_audio' // 重新编码原声视频
  | 'scene_loop_end' // 分镜处理循环结束（标记）

  // Step 5: compose - 最终合成
  | 'concatenate_scenes' // FFmpeg 视频拼接
  | 'download_to_local' // 下载到本地

/**
 * 步骤状态
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

/**
 * 步骤上下文（任务特征）
 */
export interface StepContext {
  isSingleVideo: boolean // 是否单视频
  isMultiVideo: boolean // 是否多视频
  hasOriginalAudio: boolean // 是否包含原声分镜
  platform: 'vertex' | 'ai-studio' // Gemini 平台
  totalScenes: number // 总分镜数
  originalSceneCount: number // 原声分镜数量
  dubbedSceneCount: number // 配音分镜数量
}

/**
 * 步骤记录
 */
export interface StepRecord {
  majorStep: MajorStep
  subStep: SubStep
  status: StepStatus
  startedAt?: number
  completedAt?: number
  error?: string
  metadata?: Record<string, unknown> // 步骤特定数据（如分镜索引、耗时等）
}

/**
 * 小步骤定义
 */
export interface SubStepDefinition {
  id: SubStep
  label: string
  description?: string
}

/**
 * 大步骤定义
 */
export interface MajorStepDefinition {
  id: MajorStep
  label: string
  description?: string
  subSteps: SubStepDefinition[]
}

/**
 * 根据任务上下文获取步骤列表
 *
 * 新工作流顺序（5 阶段）：
 * 分析 → 旁白生成 → 分镜提取 → 音画同步 → 合成
 */
export function getStepsForContext(context: Partial<StepContext>): MajorStepDefinition[] {
  const { isMultiVideo = false, hasOriginalAudio = false, platform = 'vertex' } = context

  const steps: MajorStepDefinition[] = [
    // Step 1: 视频分析
    {
      id: 'analysis',
      label: '视频分析',
      description: '获取视频元数据并生成分镜脚本',
      subSteps: [
        {
          id: 'fetch_metadata',
          label: '获取视频元数据',
          description: 'FFprobe 读取视频元数据（HTTP URL 直接读取）',
        },
        {
          id: 'prepare_gemini',
          label: platform === 'vertex' ? '准备 Gemini 输入' : '上传到 File API',
          description:
            platform === 'vertex'
              ? 'GCS URL 直接转换 / 其他 URL 流式转发到 GCS'
              : '下载到本地 → 上传到 File API',
        },
        {
          id: 'gemini_analysis',
          label: '生成分镜脚本',
          description: isMultiVideo ? '使用多视频提示词生成混剪方案' : '分析视频内容生成分镜脚本',
        },
        { id: 'validate_storyboards', label: '验证分镜' },
      ],
    },

    // Step 2: 旁白生成（隐式缓存模式）
    {
      id: 'generate_narrations',
      label: '生成旁白',
      description: '批量生成多版本旁白（隐式缓存模式）',
      subSteps: [
        {
          id: 'batch_generate_narrations',
          label: '批量生成旁白',
          description: '使用隐式缓存批量生成 v1/v2/v3 三版本旁白',
        },
      ],
    },

    // Step 3: 分镜提取
    {
      id: 'extract_scenes',
      label: '分镜提取',
      description: '根据分镜脚本拆分视频',
      subSteps: [
        ...(isMultiVideo
          ? [
              {
                id: 'group_by_source' as SubStep,
                label: '按来源视频分组',
                description: '将分镜按 source_video 分组准备拆条',
              },
            ]
          : []),
        {
          id: 'ensure_local_video',
          label: '准备本地视频',
          description: '按需下载视频到本地（已有本地副本则跳过）',
        },
        { id: 'ffmpeg_batch_split', label: 'FFmpeg 批量拆条' },
      ],
    },

    // Step 4: 音画同步处理
    {
      id: 'process_scenes',
      label: '音画同步处理',
      description: hasOriginalAudio ? '处理配音和原声分镜' : '读取预生成旁白并合成音频',
      subSteps: [
        { id: 'scene_loop_start', label: '开始处理分镜' },
        {
          id: 'synthesize_audio',
          label: hasOriginalAudio ? '语音合成（配音分镜）' : '语音合成',
          description: '读取预生成旁白，通过 Fish Audio 批量合成音频',
        },
        {
          id: 'trim_jumpcuts',
          label: '跳切修剪',
          description: '检测并修剪分镜开头/结尾的跳切帧',
        },
        { id: 'select_best_match', label: '智能音频匹配' },
        {
          id: 'adjust_video_speed',
          label: hasOriginalAudio ? '视频调速/重新编码' : '视频调速',
          description: hasOriginalAudio
            ? '配音分镜调速，原声分镜重新编码'
            : 'FFmpeg 调整视频速度以匹配音频时长',
        },
        {
          id: 'merge_audio_video',
          label: hasOriginalAudio ? '音画合成（配音分镜）' : '音画合成',
          description: 'FFmpeg 合成视频和音频',
        },
        {
          id: 'burn_subtitle',
          label: '字幕烧录',
          description: '生成并烧录字幕到视频',
        },
        ...(hasOriginalAudio
          ? [
              {
                id: 'reencode_original_audio' as SubStep,
                label: '重新编码原声视频',
                description: '统一编码格式避免拼接问题',
              },
            ]
          : []),
        { id: 'scene_loop_end', label: '完成所有分镜' },
      ],
    },

    // Step 5: 最终合成
    {
      id: 'compose',
      label: '最终合成',
      description: '拼接所有分镜并导出最终成片',
      subSteps: [
        { id: 'concatenate_scenes', label: '拼接所有分镜' },
        { id: 'download_to_local', label: '下载到本地' },
      ],
    },
  ]

  return steps
}

/**
 * 获取步骤的显示标签
 */
export function getStepLabel(
  majorStep: MajorStep,
  subStep?: SubStep,
  context?: Partial<StepContext>,
): string {
  if (!subStep) {
    const steps = getStepsForContext(context || {})
    const major = steps.find((s) => s.id === majorStep)
    return major?.label || majorStep
  }

  const steps = getStepsForContext(context || {})
  const major = steps.find((s) => s.id === majorStep)
  const sub = major?.subSteps.find((s) => s.id === subStep)
  return sub?.label || subStep
}

/**
 * 获取大步骤的状态
 * @param majorStep 大步骤 ID
 * @param stepHistory 步骤历史记录
 * @param checkpointData 可选的 checkpoint 数据（用于向后兼容旧任务）
 */
export function getMajorStepStatus(
  majorStep: MajorStep,
  stepHistory: StepRecord[],
  checkpointData?: Record<string, unknown>,
  jobStatus?: 'pending' | 'processing' | 'completed' | 'failed',
): StepStatus {
  const majorStepRecords = stepHistory.filter((r) => r.majorStep === majorStep)

  // 优先使用 stepHistory（新任务）
  if (majorStepRecords.length > 0) {
    const hasRunning = majorStepRecords.some((r) => r.status === 'running')
    if (hasRunning) {
      // 如果任务已失败，不再显示 running 状态
      if (jobStatus === 'failed') {
        return 'pending'
      }
      return 'running'
    }

    const hasFailed = majorStepRecords.some((r) => r.status === 'failed')
    if (hasFailed) {
      return 'failed'
    }

    const allCompleted = majorStepRecords.every(
      (r) => r.status === 'completed' || r.status === 'skipped',
    )
    if (allCompleted) {
      return 'completed'
    }

    return 'pending'
  }

  // Fallback：根据 checkpoint_data 推断状态（旧任务向后兼容）
  if (checkpointData) {
    const sceneVideos = checkpointData.scene_videos as unknown[] | undefined
    const processedScenes = checkpointData.processed_scenes as unknown[] | undefined

    switch (majorStep) {
      case 'analysis':
        return checkpointData.video_analysis ? 'completed' : 'pending'
      case 'extract_scenes':
        return sceneVideos && sceneVideos.length > 0 ? 'completed' : 'pending'
      case 'process_scenes':
        return processedScenes && processedScenes.length > 0 ? 'completed' : 'pending'
      case 'compose':
        return checkpointData.final_video_url ? 'completed' : 'pending'
    }
  }

  return 'pending'
}

/**
 * 计算任务进度百分比
 */
export function calculateProgress(
  stepHistory: StepRecord[],
  context: Partial<StepContext>,
): number {
  const steps = getStepsForContext(context)
  const totalSubSteps = steps.reduce((sum, major) => sum + major.subSteps.length, 0)

  if (totalSubSteps === 0) {
    return 0
  }

  const completedSteps = stepHistory.filter(
    (r) => r.status === 'completed' || r.status === 'skipped',
  ).length

  return Math.round((completedSteps / totalSubSteps) * 100)
}

/**
 * 获取当前步骤的分镜进度（仅用于 process_scenes）
 */
export function getSceneProgress(
  stepHistory: StepRecord[],
  totalScenes: number,
): { current: number; total: number } | null {
  const processSceneRecords = stepHistory.filter((r) => r.majorStep === 'process_scenes')

  if (processSceneRecords.length === 0) {
    return null
  }

  // 查找最新的分镜处理记录
  // 使用类型安全的方式获取 sceneIndex
  const getSceneIndex = (r: { metadata?: Record<string, unknown> }): number => {
    const idx = r.metadata?.sceneIndex
    return typeof idx === 'number' ? idx : 0
  }

  const sceneRecords = processSceneRecords
    .filter((r) => typeof r.metadata?.sceneIndex === 'number')
    .sort((a, b) => getSceneIndex(b) - getSceneIndex(a))

  if (sceneRecords.length === 0) {
    return { current: 0, total: totalScenes }
  }

  const latestSceneIndex = getSceneIndex(sceneRecords[0])
  return { current: latestSceneIndex, total: totalScenes }
}
