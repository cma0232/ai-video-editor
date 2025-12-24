'use client'

import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/base/button'
import { cn } from '@/lib/utils'
import { useTaskCreationStore, WIZARD_STEP_COUNT, WIZARD_STEPS } from '@/store/task-creation-store'
import { WizardProgress } from './wizard-progress'

// ============================================================================
// WizardFooter - Sticky 底部导航栏
// 固定在视口底部，始终可见
// ============================================================================

interface WizardFooterProps {
  onSubmit: () => Promise<void>
  isSubmitting: boolean
  onBackToSelection: () => void
}

export function WizardFooter({ onSubmit, isSubmitting, onBackToSelection }: WizardFooterProps) {
  const { currentStep, nextStep, prevStep, canProceedToNext } = useTaskCreationStore()

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === WIZARD_STEP_COUNT - 1
  const canProceed = canProceedToNext()

  // 处理下一步/提交
  const handleNext = () => {
    if (isLastStep) {
      onSubmit()
    } else {
      nextStep()
    }
  }

  return (
    <footer className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* ==================== 左侧：返回任务选择 + 上一步 ==================== */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onBackToSelection}
            disabled={isSubmitting}
            className="gap-2 h-10 text-slate-600 hover:text-slate-900 bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回任务选择</span>
            <span className="sm:hidden">返回</span>
          </Button>

          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={isFirstStep || isSubmitting}
            className={cn(
              'gap-2 h-10 text-slate-600 hover:text-slate-900',
              isFirstStep && 'invisible',
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">上一步</span>
          </Button>
        </div>

        {/* ==================== 进度点（移动端） ==================== */}
        <WizardProgress className="lg:hidden" />

        {/* ==================== 桌面端步骤信息 ==================== */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500">
          <span>{WIZARD_STEPS[currentStep].title}</span>
          <span className="text-slate-300">·</span>
          <span>
            {currentStep + 1}/{WIZARD_STEP_COUNT}
          </span>
        </div>

        {/* ==================== 下一步/提交 ==================== */}
        <Button
          onClick={handleNext}
          disabled={!canProceed || isSubmitting}
          className="bg-claude-orange-500 hover:bg-claude-orange-600 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              处理中
            </>
          ) : isLastStep ? (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              创建任务
            </>
          ) : (
            <>
              下一步
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </footer>
  )
}
