/**
 * 风格相关类型定义
 */

// 风格摘要（用于列表展示和选择）
export interface StyleSummary {
  id: string // 风格唯一标识
  name: string // 风格名称
  description: string // 风格描述
  config: {
    channel_name: string // 频道名称
    original_audio_scene_count?: number // 原声分镜数量
  }
  is_builtin?: boolean // 是否为内置风格
}

/**
 * 风格预设完整定义（从 YAML 文件加载）
 */
export interface StylePreset {
  /** 风格唯一标识（文件名，如 'style-1000'） */
  id: string

  /** 风格名称 */
  name: string

  /** 风格描述 */
  description: string

  /** 创意层：视频分析阶段的方法论和风格指导 */
  analysis_creative_layer: string

  /** 创意层：音画同步阶段的方法论和风格指导（可选，未定义时使用系统默认） */
  audio_sync_creative_layer?: string

  /** 风格配置参数 */
  config: StyleConfig
}

/**
 * 风格配置参数
 */
export interface StyleConfig {
  /** 频道名称 */
  channel_name: string

  /** 推荐时长范围（秒） */
  duration_range: {
    min: number
    max: number
  }

  /** 语速候选（字/秒），用于生成多个旁白版本 */
  speech_rates: [number, number, number]

  /** 原声分镜数量（可选，默认 0） */
  original_audio_scene_count?: number
}

/**
 * 提示词构建上下文（统一参数传递）
 */
export interface PromptBuildContext {
  /** 视频数量 */
  video_count: number

  /** 视频元数据描述（格式化字符串） */
  video_descriptions: string

  /** 期望的分镜数量 */
  storyboard_count: number

  /** 旁白语言（如 'zh-CN', 'en-US'） */
  language: string

  /** 频道名称（从风格配置获取） */
  channel_name: string

  /** 文案大纲（可选） */
  script_outline?: string

  /** 使用原声的分镜数量（可选，默认 0） */
  original_audio_scene_count?: number

  /** 推荐时长范围 */
  duration_range: {
    min: number
    max: number
  }
}

/**
 * 分镜摘要（用于全局上下文）
 */
export interface SceneSummary {
  /** 分镜序号（0-based） */
  scene_index: number

  /** 分镜 ID（如 'scene-1'） */
  scene_id: string

  /** 旁白脚本（可能被截断） */
  narration_script: string

  /** 分镜时长（秒） */
  duration_seconds: number

  /** 是否为当前正在处理的分镜 */
  is_current: boolean
}

/**
 * 批量音画同步提示词构建上下文
 */
export interface BatchAudioSyncPromptContext {
  /** 当前批次序号（1-based） */
  batch_index: number

  /** 总批次数量 */
  total_batches: number

  /** 当前批次分镜数量 */
  batch_size: number

  /** 旁白语言 */
  language: string

  /** 语速候选 */
  speech_rates: [number, number, number]

  /** 当前批次的分镜列表 */
  scenes: BatchSceneInfo[]
}

/**
 * 批量分镜信息
 */
export interface BatchSceneInfo {
  /** 分镜 ID */
  scene_id: string

  /** 分镜序号（0-based） */
  scene_index: number

  /** 源视频标签（如 'video-1', 'video-2'，多视频场景必填） */
  source_video?: string

  /** 源视频时间戳（开始） */
  source_start_time: string

  /** 源视频时间戳（结束） */
  source_end_time: string

  /** 分镜时长（秒） */
  duration_seconds: number

  /** 旁白初稿 */
  narration_script: string
}

/**
 * 模板变量（所有可用占位符）
 *
 * 用于文档生成和类型约束
 */
export interface TemplateVariables {
  // === 视频分析阶段 ===

  /** 视频数量 */
  video_count: number

  /** 视频元数据描述 */
  video_descriptions: string

  /** 期望的分镜数量 */
  storyboard_count: number

  /** 频道名称 */
  channel_name: string

  /** 旁白语言 */
  narration_language: string

  /** 最小时长（秒） */
  min_duration: number

  /** 最大时长（秒） */
  max_duration: number

  /** 文案大纲段落（可选，带换行符） */
  script_outline_section?: string

  /** 原声使用说明段落（可选，带换行符） */
  original_audio_scene_count_section?: string

  // === 音画同步阶段 ===

  /** 分镜 ID */
  scene_id: string

  /** 当前分镜序号（1-based，用于显示） */
  scene_index: number

  /** 总分镜数量 */
  total_scenes: number

  /** 视频时长 */
  video_duration: number

  /** 分镜旁白脚本 */
  narration_script: string

  /** 语速候选（JSON 字符串） */
  speech_rates: string

  /** 目标字数（JSON 对象）- 已废弃，保留向后兼容 */
  target_word_counts: string

  /** 第一版目标字数（慢速） */
  word_count_v1: number

  /** 第二版目标字数（中速） */
  word_count_v2: number

  /** 第三版目标字数（快速） */
  word_count_v3: number
}
