'use client'

import { ArrowLeft, ArrowRight, Check, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useConfirmDialog } from '@/components/dialogs/use-confirm-dialog'
import { ValidationDialog, type ValidationError } from '@/components/dialogs/validation-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { AnalysisPromptStep } from '@/components/styles/edit/analysis-prompt-step'
import { BasicInfoStep } from '@/components/styles/edit/basic-info-step'
import { ConfigStep } from '@/components/styles/edit/config-step'
import { SyncPromptStep } from '@/components/styles/edit/sync-prompt-step'
import type { StyleFormData } from '@/components/styles/edit/types'
import { Button, Card, CardContent } from '@/components/ui'

/**
 * 风格编辑器表单组件（内部使用 useSearchParams）
 */
function StyleEditorForm() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { confirm } = useConfirmDialog()

  const id = params.id as string
  const isNewStyle = id === 'new'
  const templateId = searchParams.get('template')

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(!isNewStyle)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 验证弹窗状态
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [showValidation, setShowValidation] = useState(false)

  const [formData, setFormData] = useState<StyleFormData>({
    name: '',
    description: '',
    analysis_creative_layer: '',
    audio_sync_creative_layer: '',
    config: {
      channel_name: '',
      duration_range: { min: 6, max: 12 },
      speech_rates: [4, 4.5, 5.5],
      original_audio_scene_count: 0,
    },
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: 初始化加载，依赖 isNewStyle 和 templateId
  useEffect(() => {
    if (isNewStyle && templateId) {
      loadTemplate(templateId)
    } else if (!isNewStyle) {
      loadStyle()
    }
  }, [isNewStyle, templateId])

  const loadStyle = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/styles/${id}`)

      if (!response.ok) throw new Error('风格不存在')

      const data = await response.json()

      setFormData({
        name: data.style.name || '',
        description: data.style.description || '',
        analysis_creative_layer:
          data.style.analysis_creative_layer || data.style.analysis_prompt || '',
        audio_sync_creative_layer:
          data.style.audio_sync_creative_layer || data.style.audio_sync_prompt || '',
        config: {
          channel_name: data.style.config?.channel_name || '',
          duration_range: data.style.config?.duration_range || { min: 6, max: 12 },
          speech_rates: data.style.config?.speech_rates || [4, 4.5, 5.5],
          original_audio_scene_count: data.style.config?.original_audio_scene_count ?? 0,
        },
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/styles/${templateId}`)

      if (!response.ok) throw new Error('风格不存在')

      const data = await response.json()

      setFormData({
        name: `${data.style.name}（副本）`,
        description: data.style.description || '',
        analysis_creative_layer:
          data.style.analysis_creative_layer || data.style.analysis_prompt || '',
        audio_sync_creative_layer:
          data.style.audio_sync_creative_layer || data.style.audio_sync_prompt || '',
        config: {
          channel_name: data.style.config?.channel_name || '',
          duration_range: data.style.config?.duration_range || { min: 6, max: 12 },
          speech_rates: data.style.config?.speech_rates || [4, 4.5, 5.5],
          original_audio_scene_count: data.style.config?.original_audio_scene_count ?? 0,
        },
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载风格失败')
    } finally {
      setLoading(false)
    }
  }

  const validateStep = (step: number): boolean => {
    const errors: ValidationError[] = []

    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          errors.push({ field: '风格名称', message: '请填写风格名称' })
        }
        break
      case 2:
        if (!formData.analysis_creative_layer.trim()) {
          errors.push({ field: '剪辑提示词创意层', message: '请填写剪辑提示词创意层' })
        }
        break
      case 3:
        // 音画同步创意层可选
        break
      case 4:
        if (!formData.config.channel_name.trim()) {
          errors.push({ field: '频道名称', message: '请填写频道名称' })
        }
        if (formData.config.duration_range.min >= formData.config.duration_range.max) {
          errors.push({ field: '分镜时长范围', message: '最小时长必须小于最大时长' })
        }
        if (formData.config.speech_rates.length !== 3) {
          errors.push({ field: '语速方案', message: '请填写 3 个语速方案' })
        }
        break
      default:
        break
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
      setShowValidation(true)
      return false
    }

    return true
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSave = async () => {
    // 验证所有步骤
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step)
        return
      }
    }

    try {
      setSaving(true)
      setError(null)

      const url = isNewStyle ? '/api/styles' : `/api/styles/${id}`
      const method = isNewStyle ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || data.message || '保存失败')
      }

      toast.success(isNewStyle ? '风格创建成功' : '风格保存成功')
      router.push('/styles')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '未知错误'
      setError(errorMsg)
      toast.error(`保存失败：${errorMsg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: '确定要取消吗？',
      description: '未保存的更改将丢失，此操作不可恢复。',
      variant: 'warning',
      confirmText: '确认取消',
      cancelText: '继续编辑',
    })

    if (confirmed) {
      router.push('/styles')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-claude-cream-50/30 via-white to-claude-cream-100/50">
        <Loader2 className="h-8 w-8 animate-spin text-claude-orange-500" />
      </div>
    )
  }

  if (error && !isNewStyle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-linear-to-br from-claude-cream-50/30 via-white to-claude-cream-100/50">
        <p className="text-red-600">{error}</p>
        <Button onClick={() => router.push('/styles')} variant="outline">
          返回风格库
        </Button>
      </div>
    )
  }

  const steps = [
    { number: 1, title: '基本信息', description: '风格名称和描述' },
    { number: 2, title: '剪辑提示词', description: '创意层编写' },
    { number: 3, title: '音画同步提示词', description: '创意层编写(可选)' },
    { number: 4, title: '高级配置', description: '参数层设置' },
  ]

  return (
    <div className="flex flex-col bg-linear-to-br from-claude-cream-50/30 via-white to-claude-cream-100/50 min-h-screen">
      {/* 页面头部 */}
      <PageHeader
        title={isNewStyle ? '创建自定义风格' : `编辑风格: ${formData.name}`}
        description={`第 ${currentStep} 步，共 4 步 - ${steps[currentStep - 1].title}: ${steps[currentStep - 1].description}`}
        actions={
          <Link href="/styles">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回风格库
            </Button>
          </Link>
        }
      />

      {/* 主内容区 */}
      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 步骤指示器 */}
        <div className="mb-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium claude-transition ${
                      currentStep > step.number
                        ? 'bg-emerald-500 text-white'
                        : currentStep === step.number
                          ? 'bg-claude-orange-500 text-white'
                          : 'bg-claude-cream-200 text-claude-dark-400'
                    }`}
                  >
                    {currentStep > step.number ? <Check className="h-5 w-5" /> : step.number}
                  </div>
                  <div className="mt-2 text-center min-w-[100px]">
                    <p
                      className={`text-sm font-medium ${
                        currentStep >= step.number ? 'text-claude-dark-900' : 'text-claude-dark-300'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-4 claude-transition ${
                      currentStep > step.number ? 'bg-emerald-500' : 'bg-claude-cream-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Card className="claude-card">
          <CardContent className="pt-6">
            {/* 步骤内容 */}
            {currentStep === 1 && <BasicInfoStep formData={formData} setFormData={setFormData} />}
            {currentStep === 2 && (
              <AnalysisPromptStep
                formData={formData}
                setFormData={setFormData}
                styleId={id}
                isNewStyle={isNewStyle}
              />
            )}
            {currentStep === 3 && (
              <SyncPromptStep
                formData={formData}
                setFormData={setFormData}
                styleId={id}
                isNewStyle={isNewStyle}
              />
            )}
            {currentStep === 4 && <ConfigStep formData={formData} setFormData={setFormData} />}

            {/* 底部操作按钮 */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-claude-cream-200">
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  取消
                </Button>
                {currentStep > 1 && (
                  <Button variant="outline" onClick={handlePrevious} disabled={saving}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一步
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                {currentStep < 4 ? (
                  <Button
                    onClick={handleNext}
                    disabled={saving}
                    className="bg-claude-orange-500 hover:bg-claude-orange-600 text-white"
                  >
                    下一步
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="min-w-[120px] bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        保存风格
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 验证失败弹窗 */}
      <ValidationDialog
        open={showValidation}
        onOpenChange={setShowValidation}
        errors={validationErrors}
      />
    </div>
  )
}

/**
 * 风格编辑器页面（包裹 Suspense）
 */
export default function StyleEditorPage() {
  return (
    <Suspense fallback={<div className="text-center p-8">加载中...</div>}>
      <StyleEditorForm />
    </Suspense>
  )
}
