'use client'

import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/base/button'
import { useTaskCreationStore, WIZARD_STEP_COUNT, WIZARD_STEPS } from '@/store/task-creation-store'
import type { StyleSummary } from '@/types'
import { WizardContent } from './wizard-content'
import { WizardFooter } from './wizard-footer'
import { WizardSidebar } from './wizard-sidebar'

/** 任务向导：顶栏 + 左步骤栏 + 右内容区 */
interface WizardContainerProps {
  builtinStyles: StyleSummary[]
  customStyles: StyleSummary[]
  availablePlatforms: ('vertex' | 'ai-studio')[]
  onSubmit: () => Promise<void>
  isSubmitting: boolean
  onBackToSelection: () => void
}

export function WizardContainer({
  builtinStyles,
  customStyles,
  availablePlatforms,
  onSubmit,
  isSubmitting,
  onBackToSelection,
}: WizardContainerProps) {
  const { currentStep, nextStep, prevStep, canProceedToNext } = useTaskCreationStore()

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === WIZARD_STEP_COUNT - 1
  const canProceed = canProceedToNext()

  const handleNext = () => {
    if (isLastStep) {
      onSubmit()
    } else {
      nextStep()
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-claude-orange-50/30">
      <div className="mx-auto max-w-[1440px] px-0 lg:px-8 pb-5 lg:py-4 flex flex-col gap-4">
        {/* 桌面端操作栏 */}
        <div className="hidden lg:flex items-center h-14 border border-slate-200 bg-white/90 backdrop-blur-sm rounded-xl px-5 shadow-sm relative">
          <div className="flex-1 flex justify-start">
            <Button
              variant="outline"
              onClick={onBackToSelection}
              disabled={isSubmitting}
              className="gap-2 text-slate-700 hover:text-slate-900 bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              返回任务选择
            </Button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              {WIZARD_STEPS.map((step, i) => (
                <div
                  key={step.id}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i <= currentStep ? 'bg-claude-orange-500' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-slate-500">
              步骤 {currentStep + 1}/{WIZARD_STEP_COUNT}
            </span>
          </div>

          <div className="flex-1 flex justify-end items-center gap-2">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={isFirstStep || isSubmitting}
              className="gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              上一步
            </Button>
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
        </div>

        <div className="lg:flex lg:gap-5 lg:items-stretch flex-1">
          <aside className="hidden lg:flex lg:flex-col w-80 shrink-0 border border-slate-200/80 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm">
            <WizardSidebar builtinStyles={builtinStyles} customStyles={customStyles} />
          </aside>

          <main className="flex-1 pb-24 lg:pb-0 flex flex-col">
            {/* 移动端进度条 */}
            <div className="lg:hidden w-full max-w-2xl mx-auto px-6 pt-6">
              <div className="flex gap-1.5 mb-4">
                {WIZARD_STEPS.map((step, i) => (
                  <div
                    key={step.id}
                    className={`h-1 flex-1 rounded-full transition-all duration-400 ${
                      i <= currentStep ? 'bg-claude-orange-500' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                步骤 {Math.min(currentStep + 1, WIZARD_STEP_COUNT)}/{WIZARD_STEP_COUNT}
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                {WIZARD_STEPS[Math.min(currentStep, WIZARD_STEP_COUNT - 1)].title}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {WIZARD_STEPS[Math.min(currentStep, WIZARD_STEP_COUNT - 1)].description}
              </p>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-5 lg:px-8 lg:py-6">
              <WizardContent
                builtinStyles={builtinStyles}
                customStyles={customStyles}
                availablePlatforms={availablePlatforms}
              />
            </div>
          </main>
        </div>
      </div>

      {/* 移动端底栏 */}
      <div className="lg:hidden">
        <WizardFooter
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onBackToSelection={onBackToSelection}
        />
      </div>
    </div>
  )
}
