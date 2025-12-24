'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BentoTaskSelector } from '@/components/task-creation/bento-task-selector'
import { FeatureHighlights } from '@/components/task-creation/feature-highlights'
import { WizardContainer } from '@/components/task-creation/wizard'
import { useJobStore } from '@/store/job-store'
import { useTaskCreationStore } from '@/store/task-creation-store'
import type { StyleSummary } from '@/types'

// ============================================================================
// 主页面（Wizard 重构版）
// Split Panel 布局 + Sticky Footer + 3 步向导
// ============================================================================

export default function Home() {
  const router = useRouter()
  const createJob = useJobStore((state) => state.createJob)

  // ========== 从 Store 获取表单状态 ==========
  const {
    taskType,
    setTaskType,
    videoUrl,
    singleVideoLocalPath,
    inputVideos,
    selectedStyle,
    setSelectedStyle,
    geminiPlatform,
    setGeminiPlatform,
    storyboardCount,
    scriptOutline,
    originalAudioSceneCount,
    bgmUrl,
    resetForm,
    isFormValid,
  } = useTaskCreationStore()

  // ========== 本地状态（不持久化） ==========
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [builtinStyles, setBuiltinStyles] = useState<StyleSummary[]>([])
  const [customStyles, setCustomStyles] = useState<StyleSummary[]>([])
  const [stylesLoading, setStylesLoading] = useState(false)
  const [styleFetchError, setStyleFetchError] = useState<string | null>(null)
  const [availablePlatforms, setAvailablePlatforms] = useState<('vertex' | 'ai-studio')[]>([])
  const [platformsLoading, setPlatformsLoading] = useState(false)

  // ========== 页面挂载时重置表单 ==========
  // 用户期望每次访问首页都是空白表单，不恢复旧草稿
  useEffect(() => {
    resetForm()
  }, [resetForm])

  // ========== 初始化加载 ==========
  useEffect(() => {
    const loadStyles = async () => {
      setStylesLoading(true)
      setStyleFetchError(null)
      try {
        const response = await fetch('/api/styles')
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || '加载风格失败')
        }

        const data = await response.json()
        // 按 ID 数字升序排序（style-1000 翔宇复刻在前）
        const getStyleOrder = (id: string) => parseInt(id.replace(/\D/g, ''), 10) || 0
        const builtin = (data.builtin || []).sort(
          (a: StyleSummary, b: StyleSummary) => getStyleOrder(a.id) - getStyleOrder(b.id),
        )
        const custom = (data.custom || []).sort(
          (a: StyleSummary, b: StyleSummary) => getStyleOrder(a.id) - getStyleOrder(b.id),
        )
        setBuiltinStyles(builtin)
        setCustomStyles(custom)

        // 仅当未选择风格时自动选择第一个（自定义优先）
        const allFetched = [...custom, ...builtin]
        if (allFetched.length > 0 && !selectedStyle) {
          setSelectedStyle(allFetched[0].id)
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : '加载风格失败'
        setStyleFetchError(errorMsg)
        toast.error('加载风格失败', { description: errorMsg })
      } finally {
        setStylesLoading(false)
      }
    }

    const loadPlatforms = async () => {
      setPlatformsLoading(true)
      try {
        const response = await fetch('/api/api-keys')
        // 401 未认证时静默处理，不阻塞页面
        if (!response.ok) {
          setAvailablePlatforms([])
          return
        }

        const data = await response.json()
        const keys = data.keys as Array<{
          service: string
          is_configured: boolean
          is_verified: boolean
        }>

        const platforms: ('vertex' | 'ai-studio')[] = []
        if (keys.some((k) => k.service === 'google_vertex' && k.is_configured)) {
          platforms.push('vertex')
        }
        if (keys.some((k) => k.service === 'google_ai_studio' && k.is_configured)) {
          platforms.push('ai-studio')
        }

        setAvailablePlatforms(platforms)

        // 仅当未选择平台时自动选择（优先 AI Studio）
        if (!geminiPlatform && platforms.length > 0) {
          setGeminiPlatform(platforms.includes('ai-studio') ? 'ai-studio' : platforms[0])
        }
      } catch {
        toast.warning('加载平台配置失败', { description: '请检查网络连接或刷新页面重试' })
      } finally {
        setPlatformsLoading(false)
      }
    }

    loadStyles()
    loadPlatforms()
  }, [selectedStyle, geminiPlatform, setSelectedStyle, setGeminiPlatform])

  // ========== 提交逻辑 ==========
  const handleSubmit = async () => {
    if (availablePlatforms.length === 0) {
      toast.warning('请先在设置页面配置 Gemini 平台')
      return
    }

    if (!isFormValid()) {
      toast.warning('请检查表单填写是否完整')
      return
    }

    setIsSubmitting(true)

    try {
      // 校验平台配置（仅单视频模式）
      if (taskType === 'single') {
        const validationResponse = await fetch('/api/jobs/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: geminiPlatform,
            videoUrl: videoUrl.trim(),
          }),
        })

        const validationResult = await validationResponse.json()
        if (!validationResult.valid) {
          toast.error(validationResult.message || validationResult.error || '校验失败')
          return
        }
      }

      // 构建任务数据
      // 包含 local_path（AI Studio 预上传时返回）
      const validVideos =
        taskType === 'single'
          ? [{ url: videoUrl.trim(), label: 'video-1', local_path: singleVideoLocalPath }]
          : inputVideos
              .filter((v) => v.url.trim())
              .map((v, index) => ({
                url: v.url.trim(),
                label: `video-${index + 1}`,
                local_path: v.local_path, // AI Studio 本地文件路径
              }))

      const jobData = {
        input_videos: validVideos,
        style_id: selectedStyle,
        config: {
          gemini_platform: geminiPlatform || undefined, // 空字符串转 undefined
          storyboard_count: storyboardCount,
          script_outline: scriptOutline.trim() || undefined,
          original_audio_scene_count: originalAudioSceneCount,
          bgm_url: bgmUrl.trim() || undefined,
        },
      }

      const createdJobId = await createJob(jobData)
      toast.success('任务创建成功')
      resetForm()
      router.push(`/jobs/${createdJobId}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '创建任务失败'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 返回任务选择
  const handleBackToSelection = () => {
    setTaskType(null)
  }

  // ========== 渲染 ==========
  return (
    <div className="flex-1 bg-linear-to-br from-claude-cream-50/30 via-white to-claude-cream-100/50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {stylesLoading || platformsLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <div className="animate-spin h-8 w-8 border-4 border-claude-orange-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-claude-dark-400">加载中...</p>
            </div>
          </div>
        ) : styleFetchError ? (
          <div className="py-24 text-center">
            <p className="text-sm text-red-600">{styleFetchError}</p>
          </div>
        ) : taskType === null ? (
          /* 任务选择页面 */
          <div className="space-y-12 max-w-5xl mx-auto">
            {/* Hero 标题 */}
            <div className="text-center space-y-6 pt-8 pb-4">
              <h1 className="text-5xl md:text-6xl font-bold text-claude-dark-900 tracking-tight">
                AI 驱动的视频剪辑工作流
              </h1>
              <p className="text-xl text-claude-dark-600 max-w-3xl mx-auto">
                自动分析视频、生成分镜、合成配音，让创作更高效
              </p>
            </div>

            <BentoTaskSelector onSelect={setTaskType} />
            <FeatureHighlights />
          </div>
        ) : (
          /* Wizard 向导页面 - 全屏布局 */
          <div className="-mx-6 -my-12">
            {/* Wizard 容器 */}
            <WizardContainer
              builtinStyles={builtinStyles}
              customStyles={customStyles}
              availablePlatforms={availablePlatforms}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              onBackToSelection={handleBackToSelection}
            />
          </div>
        )}
      </div>
    </div>
  )
}
