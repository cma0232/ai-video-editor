'use client'

import { cn } from '@/lib/utils'
import { useTaskCreationStore, WIZARD_STEPS } from '@/store/task-creation-store'

// ============================================================================
// WizardProgress - 进度指示器
// 移动端使用的圆点进度指示
// ============================================================================

interface WizardProgressProps {
  className?: string
}

export function WizardProgress({ className }: WizardProgressProps) {
  const { currentStep } = useTaskCreationStore()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {WIZARD_STEPS.map((step, idx) => (
        <div
          key={step.id}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            idx < currentStep && 'w-2 bg-claude-orange-500',
            idx === currentStep && 'w-6 bg-claude-orange-500',
            idx > currentStep && 'w-2 bg-slate-300',
          )}
        />
      ))}
    </div>
  )
}
