import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import YAML from 'yaml'
import { TemplateEngine } from '@/lib/utils/template-engine'
import type {
  BatchAudioSyncPromptContext,
  PromptBuildContext,
  StylePreset,
  TemplateVariables,
} from '@/types'

class StyleLoader {
  private stylesDir = join(process.cwd(), 'styles')
  private templatesDir = join(process.cwd(), 'styles/_templates')
  private cache: Map<string, StylePreset> = new Map()
  private systemTemplatesCache: Map<string, string> = new Map()
  private templateEngine: TemplateEngine

  constructor() {
    this.templateEngine = new TemplateEngine({
      debug: process.env.NODE_ENV === 'development',
      onMissing: 'keep', // 保留未找到的占位符
    })
  }

  /**
   * 加载系统级参数模板（懒加载 + 缓存）
   * 使用统一模板引擎
   *
   * 公开方法，供预览 API 等外部调用
   */
  getSystemTemplate(
    templateName: 'analysis_params' | 'audio_sync_creative_default' | 'batch_audio_sync_params',
  ): string {
    if (this.systemTemplatesCache.has(templateName)) {
      // biome-ignore lint/style/noNonNullAssertion: has() 检查后必存在
      return this.systemTemplatesCache.get(templateName)!
    }

    const filePath = join(this.templatesDir, `${templateName}.yaml`)

    if (!existsSync(filePath)) {
      console.warn(`System template not found: ${filePath}`)
      return this.getFallbackTemplate(templateName)
    }

    try {
      const content = readFileSync(filePath, 'utf-8')
      const parsed = YAML.parse(content)

      // 统一使用 template 字段
      const template = parsed.template || ''

      this.systemTemplatesCache.set(templateName, template)
      return template
    } catch (error: unknown) {
      console.error(`Failed to load system template ${templateName}:`, error)
      return this.getFallbackTemplate(templateName)
    }
  }

  /**
   * 获取 fallback 模板（确保系统可用）
   * 返回简化的字符串格式
   */
  private getFallbackTemplate(templateName: string): string {
    // 最小化 fallback，确保系统不会崩溃
    if (templateName === 'analysis_params') {
      return `## 输入信息

你现在有 {{video_count}} 个视频可用于剪辑。

请生成 {{storyboard_count}} 个分镜，每个分镜包含 scene_id、source_video、source_start_time、source_end_time、duration_seconds、narration_script 字段。`
    }
    if (templateName === 'audio_sync_creative_default') {
      return '# 角色：短视频旁白导演\n\n你是一位专业的旁白导演，擅长优化旁白文案。'
    }
    if (templateName === 'batch_audio_sync_params') {
      return `## 任务说明

你正在为视频剪辑项目优化旁白。请为每个分镜生成 3 个版本的旁白。
**注意**：视频内容和分镜脚本已在 Context Cache 中缓存，你可以直接观看对应时间戳的画面。

## 当前批次分镜列表

{{scenes_detail}}

## 输出格式（JSON）

{
  "scenes": [
    {
      "scene_id": "分镜ID",
      "narration_v1": "版本1",
      "narration_v2": "版本2",
      "narration_v3": "版本3"
    }
  ]
}`
    }
    return ''
  }

  /**
   * 获取默认的音画同步创意层
   * 公开方法，供预览 API 等外部调用
   */
  getDefaultAudioSyncCreativeLayer(): string {
    return this.getSystemTemplate('audio_sync_creative_default')
  }

  /**
   * 加载并缓存风格
   */
  load(styleId: string): StylePreset {
    if (this.cache.has(styleId)) {
      // biome-ignore lint/style/noNonNullAssertion: has() 检查后必存在
      return this.cache.get(styleId)!
    }

    const filePath = join(this.stylesDir, `${styleId}.yaml`)
    const content = readFileSync(filePath, 'utf-8')
    const parsed = YAML.parse(content) as Record<string, unknown>
    const style = this.normalizeStyle(parsed)

    this.cache.set(styleId, style)
    return style
  }

  /**
   * 返回全部风格列表
   */
  listAll(): StylePreset[] {
    const files = readdirSync(this.stylesDir).filter(
      (file) => file.endsWith('.yaml') && !file.startsWith('_'),
    )
    const styles: StylePreset[] = []

    for (const file of files) {
      const styleId = basename(file, '.yaml')
      try {
        styles.push(this.load(styleId))
      } catch (error: unknown) {
        console.error(`Failed to load style ${styleId}:`, error)
      }
    }

    return styles
  }

  /**
   * 清理风格缓存
   */
  clearCache(styleId?: string): void {
    if (styleId) {
      this.cache.delete(styleId)
    } else {
      this.cache.clear()
    }
  }

  /**
   * 清除系统级模板缓存（开发模式使用）
   * 用于在修改 YAML 模板文件后，无需重启服务器即可加载最新模板
   */
  clearSystemTemplatesCache(): void {
    this.systemTemplatesCache.clear()
    console.log('[StyleLoader] System templates cache cleared')
  }

  /**
   * 构建视频分析提示词
   *
   * 组合逻辑：
   * 1. 创意层（风格YAML中的analysis_creative_layer）
   * 2. 参数层模板（系统级_templates/analysis_params.yaml）
   *    - 使用统一模板引擎替换所有占位符
   *    - 支持运行参数（video_descriptions, storyboard_count等）
   *    - 支持风格参数（channel_name, duration_range等）
   */
  buildAnalysisPrompt(style: StylePreset, context: PromptBuildContext): string {
    // === 第一层：加载创意层 ===
    const creativeLayer = style.analysis_creative_layer || ''
    if (!creativeLayer) {
      throw new Error(`Style ${style.id} missing analysis_creative_layer field`)
    }

    // === 第二层：加载参数层模板 ===
    const paramsTemplate = this.getSystemTemplate('analysis_params')

    // === 第三层：构建运行参数段落 ===

    // 3.1 文案大纲（可选）
    const scriptOutlineSection = context.script_outline
      ? `
**文案大纲（script_outline）**: ${context.script_outline.trim()}

**大纲使用说明**: 整个视频剪辑以文案为纲进行时间戳的选取。请严格按照文案大纲的逻辑顺序和内容要点，从原视频中精准选择对应的片段，确保每个分镜都能准确体现大纲中的某个核心观点，实现文案与画面的完美契合。

`
      : ''

    // 3.2 原声分镜数量设置
    const originalAudioSection =
      context.original_audio_scene_count && context.original_audio_scene_count > 0
        ? `
**使用原声的分镜数量（original_audio_scene_count）**: ${context.original_audio_scene_count}

**原声使用说明**: 请按照该数量（${context.original_audio_scene_count}个）设置分镜的 use_original_audio 字段为 true。要求从原视频中选取最合适、最具表现力的片段来使用原声开关，例如：关键对话、情感高潮、现场音效等，以达到最佳的剪辑效果和观众代入感。

`
        : `
**原声配置**: 全配音模式

**重要约束**: 所有分镜的 use_original_audio 字段必须设置为 false。请勿为任何分镜设置原声保留，所有分镜都将使用 AI 配音替换原声。

`

    // === 第四层：使用模板引擎替换所有占位符 ===
    const variables: Partial<TemplateVariables> = {
      // 运行参数
      video_count: context.video_count,
      video_descriptions: context.video_descriptions,
      storyboard_count: context.storyboard_count,
      script_outline_section: scriptOutlineSection,
      original_audio_scene_count_section: originalAudioSection,
      // 风格参数
      channel_name: context.channel_name,
      narration_language: context.language,
      min_duration: context.duration_range.min,
      max_duration: context.duration_range.max,
    }

    const finalParams = this.templateEngine.render(paramsTemplate, variables)

    // === 第五层：组合返回 ===
    return `${creativeLayer}\n\n${finalParams}`.trim()
  }

  /**
   * 构建批量音画同步提示词
   *
   * 用于 Context Cache 批量旁白生成
   * 组合：创意层 + 参数层模板
   */
  buildBatchAudioSyncPrompt(style: StylePreset, context: BatchAudioSyncPromptContext): string {
    // 1. 获取创意层（优先级：风格特定 > 系统默认）
    const creativeLayer = style.audio_sync_creative_layer || this.getDefaultAudioSyncCreativeLayer()

    // 2. 获取参数层（系统级模板）
    const paramsTemplate = this.getSystemTemplate('batch_audio_sync_params')

    // 3. 构建分镜详情列表
    const scenesDetail = this.buildBatchScenesDetail(context.scenes, context.speech_rates)

    // 4. 使用模板引擎替换参数层中的变量
    // 注意：v12.2 移除 global_context_summary，分析对话已缓存到 Context Cache
    const variables: Partial<TemplateVariables> = {
      batch_index: context.batch_index,
      total_batches: context.total_batches,
      batch_size: context.batch_size,
      narration_language: context.language,
      scenes_detail: scenesDetail,
    } as Record<string, unknown>

    const params = this.templateEngine.render(paramsTemplate, variables)

    // 5. 组合返回：创意层 + 参数层
    return `${creativeLayer}\n\n${params}`.trim()
  }

  /**
   * 构建批量分镜详情
   * 为每个分镜生成包含时间戳、旁白初稿和字数要求的详细信息（表格格式）
   */
  private buildBatchScenesDetail(
    scenes: BatchAudioSyncPromptContext['scenes'],
    speechRates: [number, number, number],
  ): string {
    const [rate1, rate2, rate3] = speechRates
    const lines: string[] = []

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]

      // 计算字数要求（字数 = 视频时长 × 语速）
      const wordCountV1 = Math.round(scene.duration_seconds * rate1)
      const wordCountV2 = Math.round(scene.duration_seconds * rate2)
      const wordCountV3 = Math.round(scene.duration_seconds * rate3)

      // 构建源视频行（多视频场景显示，单视频可省略）
      const sourceVideoRow = scene.source_video
        ? `| 源视频     | ${scene.source_video}（请在该视频中查看对应时间戳）                                      |\n`
        : ''

      lines.push(`### 分镜 ${i + 1}: ${scene.scene_id}

| 属性       | 内容                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------- |
${sourceVideoRow}| 视频时间戳 | ${scene.source_start_time} ~ ${scene.source_end_time}（请观看此时间段的画面）            |
| 分镜时长   | ${scene.duration_seconds} 秒                                                             |
| 旁白初稿   | ${scene.narration_script}                                                                |
| 目标长度   | v1=${wordCountV1}, v2=${wordCountV2}, v3=${wordCountV3}                                  |`)
    }

    return lines.join('\n\n')
  }

  /**
   * 解析并补全风格配置
   */
  private normalizeStyle(raw: Record<string, unknown>): StylePreset {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid style definition')
    }

    if (!raw.id || typeof raw.id !== 'string') {
      throw new Error('Style definition missing required field: id')
    }

    // 检查是否有创意层
    if (!raw.analysis_creative_layer || typeof raw.analysis_creative_layer !== 'string') {
      throw new Error(`Style ${raw.id} missing required field: analysis_creative_layer`)
    }

    const config = (raw.config as Record<string, unknown>) ?? {}
    const durationRange = (config.duration_range as Record<string, unknown>) ?? {}

    return {
      id: raw.id,
      name: (raw.name as string | undefined) ?? raw.id,
      description: (raw.description as string | undefined) ?? '',

      // 创意层（必须）
      analysis_creative_layer: raw.analysis_creative_layer,
      audio_sync_creative_layer: raw.audio_sync_creative_layer as string | undefined,

      // 注意：不再支持风格级别的 params_template
      // 所有参数层都使用系统级模板

      config: {
        channel_name:
          (config.channel_name as string | undefined) ?? (raw.name as string | undefined) ?? raw.id,
        duration_range: {
          min: typeof durationRange.min === 'number' ? durationRange.min : 6,
          max: typeof durationRange.max === 'number' ? durationRange.max : 12,
        },
        speech_rates: (Array.isArray(config.speech_rates) && config.speech_rates.length >= 3
          ? (config.speech_rates as Array<number | string>).slice(0, 3).map((rate) => Number(rate))
          : [4, 4.5, 5.5]) as [number, number, number],
      },
    }
  }
}

export const styleLoader = new StyleLoader()
