'use client'

import { Check, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/base/badge'
import { cn } from '@/lib/utils'
import { useTaskCreationStore, WIZARD_STEPS } from '@/store/task-creation-store'
import type { StyleSummary } from '@/types'
import { WizardSummary } from './wizard-summary'

// ============================================================================
// WizardSidebar - 左侧边栏
// 包含：品牌标识、步骤导航、配置摘要
// ============================================================================

interface WizardSidebarProps {
  builtinStyles: StyleSummary[]
  customStyles: StyleSummary[]
}

export function WizardSidebar({ builtinStyles, customStyles }: WizardSidebarProps) {
  const { currentStep, goToStep, taskType } = useTaskCreationStore()

  return (
    <div className="flex flex-col h-full">
      {/* ==================== 头部：任务类型 ==================== */}
      <header className="p-5 border-b border-slate-100">
        <Badge
          variant="secondary"
          className="mb-2 bg-claude-orange-100 text-claude-orange-700 hover:bg-claude-orange-100"
        >
          {taskType === 'single' ? '单视频剪辑' : '多视频混剪'}
        </Badge>
        <h1 className="text-lg font-semibold text-slate-900">创建剪辑任务</h1>
        <p className="text-sm text-slate-500 mt-1">完成以下步骤创建任务</p>
      </header>

      {/* ==================== 步骤导航 ==================== */}
      <nav className="flex-1 p-5 space-y-2">
        {WIZARD_STEPS.map((step, idx) => {
          const isCompleted = idx < currentStep
          const isCurrent = idx === currentStep
          const isClickable = idx <= currentStep

          return (
            <button
              type="button"
              key={step.id}
              onClick={() => isClickable && goToStep(idx)}
              disabled={!isClickable}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left',
                'transition-all duration-200',
                isCurrent && 'bg-claude-orange-50 border border-claude-orange-200',
                isCompleted && 'hover:bg-slate-100 cursor-pointer',
                !isClickable && 'opacity-50 cursor-not-allowed',
              )}
            >
              {/* 步骤图标 */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  'transition-all duration-200',
                  isCompleted && 'bg-claude-orange-500 text-white',
                  isCurrent && 'bg-claude-orange-500 text-white ring-4 ring-claude-orange-100',
                  !isCompleted && !isCurrent && 'bg-slate-200 text-slate-500',
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
              </div>

              {/* 步骤文字 */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium truncate',
                    isCurrent ? 'text-slate-900' : 'text-slate-600',
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-slate-400 truncate">{step.description}</p>
              </div>

              {/* 完成标识 */}
              {isCompleted && <CheckCircle2 className="w-5 h-5 text-claude-orange-500 shrink-0" />}
            </button>
          )
        })}
      </nav>

      {/* ==================== 底部：实时摘要 ==================== */}
      <footer className="p-5 border-t border-slate-100 bg-slate-50/50">
        <WizardSummary builtinStyles={builtinStyles} customStyles={customStyles} />
      </footer>
    </div>
  )
}
