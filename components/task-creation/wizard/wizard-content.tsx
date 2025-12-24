'use client'

import { useTaskCreationStore } from '@/store/task-creation-store'
import type { StyleSummary } from '@/types'
import { StepAdvanced } from '../steps/step-advanced'
import { StepConfig } from '../steps/step-config'
import { StepVideo } from '../steps/step-video'

// ============================================================================
// WizardContent - 右侧内容区
// 标题 + 步骤内容
// ============================================================================

interface WizardContentProps {
  builtinStyles: StyleSummary[]
  customStyles: StyleSummary[]
  availablePlatforms: ('vertex' | 'ai-studio')[]
}

export function WizardContent({
  builtinStyles,
  customStyles,
  availablePlatforms,
}: WizardContentProps) {
  const { currentStep, taskType } = useTaskCreationStore()

  // v12.4 步骤顺序：配置 → 高级设置 → 视频
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepConfig
            builtinStyles={builtinStyles}
            customStyles={customStyles}
            availablePlatforms={availablePlatforms}
          />
        )
      case 1:
        return <StepAdvanced />
      case 2:
        return <StepVideo availablePlatforms={availablePlatforms} />
      default:
        return (
          <StepConfig
            builtinStyles={builtinStyles}
            customStyles={customStyles}
            availablePlatforms={availablePlatforms}
          />
        )
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col space-y-4">
      {/* ==================== 桌面端：标题 ==================== */}
      <div className="hidden lg:block space-y-2 shrink-0">
        <h2 className="text-2xl font-bold text-slate-900">
          {currentStep === 0 && '选择配置'}
          {currentStep === 1 && '高级设置'}
          {currentStep === 2 && '添加视频'}
        </h2>
        <p className="text-slate-500">
          {currentStep === 0 && '选择剪辑风格和 AI 平台'}
          {currentStep === 1 && '可选：配置分镜数量、文案大纲等高级选项'}
          {currentStep === 2 &&
            (taskType === 'single' ? '输入要剪辑的视频链接' : '添加要混剪的多个视频')}
        </p>
      </div>

      {/* ==================== 步骤内容 ==================== */}
      <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
        {renderStepContent()}
      </div>
    </div>
  )
}
