'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { CONFIG_DEFAULTS } from '@/lib/config'
import type { SystemConfig as SystemConfigType } from '@/types/api/config'

/** 预设区域选项 */
const LOCATION_PRESETS = [
  { value: 'global', label: 'Global（推荐，支持 Gemini 3）' },
  { value: 'us-central1', label: 'US Central 1' },
  { value: 'us-east4', label: 'US East 4' },
  { value: 'europe-west1', label: 'Europe West 1' },
  { value: 'asia-northeast1', label: 'Asia Northeast 1（东京）' },
  { value: 'custom', label: '自定义区域...' },
]

/** 预设模型选项 */
const MODEL_PRESETS = [
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'custom', label: '自定义模型...' },
]

/** 视频分辨率选项 */
const MEDIA_RESOLUTION_OPTIONS = [
  {
    value: 'MEDIA_RESOLUTION_LOW',
    label: '低分辨率（省钱模式）',
    description: '70 tokens/帧，推荐大多数场景',
  },
  {
    value: 'MEDIA_RESOLUTION_MEDIUM',
    label: '中分辨率（平衡模式）',
    description: '70 tokens/帧，细节与成本平衡',
  },
  {
    value: 'MEDIA_RESOLUTION_HIGH',
    label: '高分辨率（精细模式）',
    description: '280 tokens/帧，适合识别文字/小细节',
  },
]

/** 视频采样帧率（FPS）预设选项 */
const VIDEO_FPS_PRESETS = [
  // 低采样（节省 token）
  { value: '0.1', label: '0.1 帧/秒', description: '每 10 秒 1 帧，超长电影（90+ 分钟）' },
  { value: '0.2', label: '0.2 帧/秒', description: '每 5 秒 1 帧，超长视频（60+ 分钟）' },
  { value: '0.5', label: '0.5 帧/秒', description: '每 2 秒 1 帧，长视频（30-60 分钟）' },
  // 标准
  { value: '1.0', label: '1 帧/秒（默认）', description: '标准采样，平衡成本与精度' },
  // 高采样（更高精度）
  { value: '2.0', label: '2 帧/秒', description: '较高精度，动作视频' },
  { value: '5.0', label: '5 帧/秒', description: '高精度分析，短视频' },
  { value: '10.0', label: '10 帧/秒', description: '精细分析，高消耗' },
  { value: '24.0', label: '24 帧/秒', description: '帧级分析，极高消耗' },
  { value: 'custom', label: '自定义...' },
]

/** 系统并发数选项（1-8） */
const CONCURRENCY_OPTIONS = [
  { value: '1', label: '1 并发', description: '最低资源占用' },
  { value: '2', label: '2 并发', description: '低资源模式' },
  { value: '3', label: '3 并发（默认）', description: '平衡模式' },
  { value: '4', label: '4 并发', description: '中等性能' },
  { value: '5', label: '5 并发', description: '较高性能' },
  { value: '6', label: '6 并发', description: '高性能' },
  { value: '8', label: '8 并发', description: '最高性能' },
]

/** 旁白批量生成数量选项 */
const NARRATION_BATCH_SIZE_OPTIONS = [
  { value: '1', label: '1 个/批', description: '最高质量，逐个生成' },
  { value: '2', label: '2 个/批', description: '高质量，精细控制' },
  { value: '3', label: '3 个/批', description: '高质量，短视频' },
  { value: '4', label: '4 个/批', description: '较高质量' },
  { value: '5', label: '5 个/批', description: '质量与效率平衡点' },
  { value: '8', label: '8 个/批', description: '高效处理' },
  { value: '10', label: '10 个/批（推荐）', description: '平衡质量与成本' },
  { value: '12', label: '12 个/批', description: '批量处理' },
  { value: '15', label: '15 个/批', description: '大批量处理' },
  { value: '18', label: '18 个/批', description: '高效批量' },
  { value: '20', label: '20 个/批', description: '长视频处理' },
  { value: '25', label: '25 个/批', description: '超大批量' },
  { value: '30', label: '30 个/批', description: '极限批量' },
  { value: '40', label: '40 个/批（最大）', description: '最高效率' },
  { value: 'custom', label: '自定义...' },
]

interface SystemConfigProps {
  onConfigChange?: () => void
}

export function SystemConfig({ onConfigChange }: SystemConfigProps) {
  const [config, setConfig] = useState<SystemConfigType>({
    max_concurrent_scenes: CONFIG_DEFAULTS.MAX_CONCURRENT_SCENES,
    default_gemini_model: CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL,
    gemini_location: CONFIG_DEFAULTS.DEFAULT_GEMINI_LOCATION,
    gemini_media_resolution: CONFIG_DEFAULTS.DEFAULT_MEDIA_RESOLUTION,
    gemini_video_fps: CONFIG_DEFAULTS.DEFAULT_VIDEO_FPS,
    narration_batch_size: CONFIG_DEFAULTS.NARRATION_BATCH_SIZE,
    subtitle_enabled: CONFIG_DEFAULTS.SUBTITLE_ENABLED,
  })
  /** 是否显示自定义区域输入框 */
  const [showCustomLocation, setShowCustomLocation] = useState(false)
  /** 自定义区域输入值 */
  const [customLocation, setCustomLocation] = useState('')
  /** 是否显示自定义模型输入框 */
  const [showCustomModel, setShowCustomModel] = useState(false)
  /** 自定义模型输入值 */
  const [customModel, setCustomModel] = useState('')
  /** 是否显示自定义 FPS 输入框 */
  const [showCustomFps, setShowCustomFps] = useState(false)
  /** 自定义 FPS 输入值 */
  const [customFps, setCustomFps] = useState('')
  /** 是否显示自定义旁白批量数量输入框 */
  const [showCustomBatchSize, setShowCustomBatchSize] = useState(false)
  /** 自定义旁白批量数量输入值 */
  const [customBatchSize, setCustomBatchSize] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: 初始化加载
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/configs')
      const data = await response.json()

      if (data.configs) {
        // 处理区域配置
        const location = data.configs.gemini_location || 'global'
        const isLocationPreset = LOCATION_PRESETS.some(
          (p) => p.value === location && p.value !== 'custom',
        )

        // 处理模型配置
        const modelValue = data.configs.default_gemini_model || CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL
        const isModelPreset = MODEL_PRESETS.some(
          (p) => p.value === modelValue && p.value !== 'custom',
        )

        // 处理 FPS 配置
        const fpsValue = data.configs.gemini_video_fps || CONFIG_DEFAULTS.DEFAULT_VIDEO_FPS
        const isFpsPreset = VIDEO_FPS_PRESETS.some(
          (p) => p.value === fpsValue && p.value !== 'custom',
        )

        // 处理旁白批量数量配置
        const batchSizeValue = String(
          data.configs.narration_batch_size || CONFIG_DEFAULTS.NARRATION_BATCH_SIZE,
        )
        const isBatchSizePreset = NARRATION_BATCH_SIZE_OPTIONS.some(
          (p) => p.value === batchSizeValue && p.value !== 'custom',
        )

        setConfig({
          max_concurrent_scenes:
            Number(data.configs.max_concurrent_scenes) || CONFIG_DEFAULTS.MAX_CONCURRENT_SCENES,
          default_gemini_model: isModelPreset ? modelValue : 'custom',
          gemini_location: isLocationPreset ? location : 'custom',
          gemini_media_resolution:
            data.configs.gemini_media_resolution || CONFIG_DEFAULTS.DEFAULT_MEDIA_RESOLUTION,
          gemini_video_fps: isFpsPreset ? fpsValue : 'custom',
          narration_batch_size: isBatchSizePreset ? Number(batchSizeValue) : -1,
          subtitle_enabled: data.configs.subtitle_enabled ?? CONFIG_DEFAULTS.SUBTITLE_ENABLED,
        })

        // 如果是自定义区域，设置自定义输入值
        if (!isLocationPreset) {
          setShowCustomLocation(true)
          setCustomLocation(location)
        }

        // 如果是自定义模型，设置自定义输入值
        if (!isModelPreset) {
          setShowCustomModel(true)
          setCustomModel(modelValue)
        }

        // 如果是自定义 FPS，设置自定义输入值
        if (!isFpsPreset) {
          setShowCustomFps(true)
          setCustomFps(fpsValue)
        }

        // 如果是自定义批量数量，设置自定义输入值
        if (!isBatchSizePreset) {
          setShowCustomBatchSize(true)
          setCustomBatchSize(batchSizeValue)
        }

        // 处理字幕开关配置（字符串 'true'/'false' 转布尔值）
        const subtitleEnabled = data.configs.subtitle_enabled !== 'false'

        setConfig((prev) => ({
          ...prev,
          subtitle_enabled: subtitleEnabled,
        }))
      }
    } catch {
      // 静默处理加载错误
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      // 验证自定义 FPS 范围
      let fpsToSave = config.gemini_video_fps
      if (config.gemini_video_fps === 'custom') {
        const fpsNum = Number.parseFloat(customFps.trim())
        if (Number.isNaN(fpsNum) || fpsNum < 0.1 || fpsNum > 24.0) {
          toast.error('FPS 必须在 0.1 到 24.0 之间')
          setSaving(false)
          return
        }
        fpsToSave = customFps.trim()
      }

      // 验证自定义批量数量范围
      let batchSizeToSave = String(config.narration_batch_size)
      if (config.narration_batch_size === -1) {
        const batchNum = Number.parseInt(customBatchSize.trim(), 10)
        if (Number.isNaN(batchNum) || batchNum < 1 || batchNum > 100) {
          toast.error('批量数量必须在 1 到 100 之间')
          setSaving(false)
          return
        }
        batchSizeToSave = customBatchSize.trim()
      }

      const response = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: {
            max_concurrent_scenes: String(config.max_concurrent_scenes),
            default_gemini_model:
              config.default_gemini_model === 'custom'
                ? customModel.trim()
                : config.default_gemini_model,
            gemini_location:
              config.gemini_location === 'custom' ? customLocation.trim() : config.gemini_location,
            gemini_media_resolution: config.gemini_media_resolution,
            gemini_video_fps: fpsToSave,
            narration_batch_size: batchSizeToSave,
            subtitle_enabled: String(config.subtitle_enabled),
          },
        }),
      })

      if (response.ok) {
        toast.success('系统配置保存成功')
        onConfigChange?.()
      } else {
        const error = await response.json()
        toast.error(error.error || '保存系统配置失败')
      }
    } catch {
      toast.error('保存系统配置失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-claude-dark-300/20 bg-white/60 p-6">
        <p className="text-sm text-claude-dark-400">加载中...</p>
      </Card>
    )
  }

  return (
    <Card className="border-claude-dark-300/20 bg-white/60 p-6">
      <h3 className="mb-4 text-lg font-semibold text-claude-dark-900">系统配置</h3>

      <div className="space-y-4">
        {/* 系统并发数 */}
        <div className="space-y-2">
          <Label
            htmlFor="max_concurrent_scenes"
            className="text-sm font-medium text-claude-dark-900"
          >
            系统并发数
          </Label>
          <Select
            value={String(config.max_concurrent_scenes)}
            onValueChange={(value) =>
              setConfig({ ...config, max_concurrent_scenes: Number(value) })
            }
          >
            <SelectTrigger className="w-full max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20">
              <SelectValue placeholder="选择并发数" />
            </SelectTrigger>
            <SelectContent>
              {CONCURRENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-claude-dark-400">- {option.description}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-claude-dark-400">
            控制分镜处理、视频拆条、TTS 合成等所有并发操作。数值越大速度越快，但资源占用越高。
          </p>
        </div>

        {/* Gemini 区域配置 */}
        <div className="space-y-2">
          <Label htmlFor="gemini_location" className="text-sm font-medium text-claude-dark-900">
            Gemini API 区域
          </Label>
          <Select
            value={config.gemini_location}
            onValueChange={(value) => {
              setConfig({ ...config, gemini_location: value })
              setShowCustomLocation(value === 'custom')
              if (value !== 'custom') {
                setCustomLocation('')
              }
            }}
          >
            <SelectTrigger className="w-full max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20">
              <SelectValue placeholder="选择区域" />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showCustomLocation && (
            <Input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="输入自定义区域（如 asia-southeast1）"
              className="max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20"
            />
          )}
          <p className="text-xs text-claude-dark-400">
            Gemini 3 模型仅支持 global 端点。如需使用 Gemini 2.x 模型，可选择其他区域。
          </p>
        </div>

        {/* 默认 Gemini 模型 */}
        <div className="space-y-2">
          <Label htmlFor="gemini_model" className="text-sm font-medium text-claude-dark-900">
            默认 Gemini 模型
          </Label>
          <Select
            value={config.default_gemini_model}
            onValueChange={(value) => {
              setConfig({ ...config, default_gemini_model: value })
              setShowCustomModel(value === 'custom')
              if (value !== 'custom') {
                setCustomModel('')
              }
            }}
          >
            <SelectTrigger className="w-full max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showCustomModel && (
            <Input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="输入自定义模型 ID（如 gemini-2.0-flash-exp）"
              className="max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20"
            />
          )}
          <p className="text-xs text-claude-dark-400">
            推荐使用 Gemini 2.5 Pro，其他模型尚未充分测试。Vertex AI 和 AI Studio 共用此模型配置。
          </p>
        </div>

        {/* 视频分析分辨率 */}
        <div className="space-y-2">
          <Label
            htmlFor="gemini_media_resolution"
            className="text-sm font-medium text-claude-dark-900"
          >
            视频分析分辨率
          </Label>
          <Select
            value={config.gemini_media_resolution}
            onValueChange={(value) =>
              setConfig({
                ...config,
                gemini_media_resolution: value as SystemConfigType['gemini_media_resolution'],
              })
            }
          >
            <SelectTrigger className="w-full max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20">
              <SelectValue placeholder="选择分辨率" />
            </SelectTrigger>
            <SelectContent>
              {MEDIA_RESOLUTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-claude-dark-400">
            控制 Gemini 视频分析的精细度。分辨率越高识别越精准，但 token 消耗越大。
          </p>
        </div>

        {/* 视频采样帧率 (FPS) */}
        <div className="space-y-2">
          <Label htmlFor="gemini_video_fps" className="text-sm font-medium text-claude-dark-900">
            视频采样帧率 (FPS)
          </Label>
          <Select
            value={config.gemini_video_fps}
            onValueChange={(value) => {
              setConfig({ ...config, gemini_video_fps: value })
              setShowCustomFps(value === 'custom')
              if (value !== 'custom') {
                setCustomFps('')
              }
            }}
          >
            <SelectTrigger className="w-full max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20">
              <SelectValue placeholder="选择采样帧率" />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_FPS_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  <span className="flex items-center gap-2">
                    <span>{preset.label}</span>
                    {preset.description && (
                      <span className="text-xs text-claude-dark-400">- {preset.description}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showCustomFps && (
            <Input
              type="number"
              min="0.1"
              max="24.0"
              step="0.1"
              value={customFps}
              onChange={(e) => setCustomFps(e.target.value)}
              placeholder="输入 0.1 ~ 24.0"
              className="max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20"
            />
          )}
          <p className="text-xs text-claude-dark-400">
            FPS 越低，Token 消耗越少。长视频（60+ 分钟）建议使用 0.2~0.5，高精度分析使用 2.0 以上。
          </p>
        </div>

        {/* 旁白批量生成数量 */}
        <div className="space-y-2">
          <Label
            htmlFor="narration_batch_size"
            className="text-sm font-medium text-claude-dark-900"
          >
            旁白批量生成数量
          </Label>
          <Select
            value={
              config.narration_batch_size === -1 ? 'custom' : String(config.narration_batch_size)
            }
            onValueChange={(value) => {
              if (value === 'custom') {
                setShowCustomBatchSize(true)
                setConfig({ ...config, narration_batch_size: -1 })
              } else {
                setShowCustomBatchSize(false)
                setConfig({ ...config, narration_batch_size: Number(value) })
              }
            }}
          >
            <SelectTrigger className="w-full max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20">
              <SelectValue placeholder="选择每批生成数量" />
            </SelectTrigger>
            <SelectContent>
              {NARRATION_BATCH_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-claude-dark-400">- {option.description}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showCustomBatchSize && (
            <Input
              type="number"
              min="1"
              max="100"
              step="1"
              value={customBatchSize}
              onChange={(e) => setCustomBatchSize(e.target.value)}
              placeholder="输入 1 ~ 100"
              className="max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20"
            />
          )}
          <p className="text-xs text-claude-dark-400">
            使用 Gemini Context Cache 批量生成旁白。数量越大效率越高，但单批质量可能略有下降。
            推荐使用默认值 10。
          </p>
        </div>

        {/* 字幕开关 */}
        <div className="space-y-2">
          <Label htmlFor="subtitle_enabled" className="text-sm font-medium text-claude-dark-900">
            字幕功能
          </Label>
          <Select
            value={config.subtitle_enabled ? 'true' : 'false'}
            onValueChange={(value) => setConfig({ ...config, subtitle_enabled: value === 'true' })}
          >
            <SelectTrigger className="w-full max-w-md border-claude-dark-300/30 focus:border-claude-orange-500 focus:ring-claude-orange-500/20">
              <SelectValue placeholder="选择是否启用字幕" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">
                <span className="flex items-center gap-2">
                  <span>启用字幕</span>
                  <span className="text-xs text-claude-dark-400">- 为配音分镜添加旁白字幕</span>
                </span>
              </SelectItem>
              <SelectItem value="false">
                <span className="flex items-center gap-2">
                  <span>关闭字幕</span>
                  <span className="text-xs text-claude-dark-400">- 不添加字幕</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-claude-dark-400">
            为配音分镜自动添加旁白字幕（白字黑边，自适应分辨率）
          </p>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-claude-orange-500 hover:bg-claude-orange-600 text-white px-6"
        >
          {saving ? '保存中...' : '保存系统配置'}
        </Button>
      </div>
    </Card>
  )
}
