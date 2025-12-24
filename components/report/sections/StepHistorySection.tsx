'use client'

import { SectionCard } from '@/components/guide/section-card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/feedback/accordion'
import type { JobStepHistory } from '@/types'

interface StepHistorySectionProps {
  stepHistory: JobStepHistory[]
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

const getStatusIcon = (status: string) => {
  if (status === 'completed') return '✅'
  if (status === 'failed') return '❌'
  if (status === 'running') return '▶️'
  if (status === 'skipped') return '⏭️'
  return '⏳'
}

export function StepHistorySection({ stepHistory }: StepHistorySectionProps) {
  // 按 major_step 分组
  const groupedSteps: Record<string, JobStepHistory[]> = {}
  for (const step of stepHistory) {
    if (!groupedSteps[step.major_step]) {
      groupedSteps[step.major_step] = []
    }
    groupedSteps[step.major_step].push(step)
  }

  return (
    <section id="step-history">
      <SectionCard title={`🔧 执行步骤历史 (${stepHistory.length}个)`}>
        {/* 概览表格 */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-claude-cream-200">
                <th className="text-left py-2 px-2 text-claude-dark-500 font-medium">大步骤</th>
                <th className="text-left py-2 px-2 text-claude-dark-500 font-medium">小步骤</th>
                <th className="text-left py-2 px-2 text-claude-dark-500 font-medium">分镜</th>
                <th className="text-left py-2 px-2 text-claude-dark-500 font-medium">状态</th>
                <th className="text-left py-2 px-2 text-claude-dark-500 font-medium">耗时</th>
              </tr>
            </thead>
            <tbody>
              {stepHistory.slice(0, 20).map((step) => (
                <tr key={step.id} className="border-b border-claude-cream-100">
                  <td className="py-2 px-2">{step.major_step}</td>
                  <td className="py-2 px-2">{step.sub_step}</td>
                  <td className="py-2 px-2 text-claude-dark-500">
                    {step.scene_id ? (
                      <code className="text-xs">{step.scene_id.slice(0, 8)}...</code>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <span className="flex items-center gap-1">
                      {getStatusIcon(step.status)} {step.status}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-claude-dark-500">
                    {step.duration_ms
                      ? formatDuration(step.duration_ms)
                      : step.started_at && step.completed_at
                        ? formatDuration(step.completed_at - step.started_at)
                        : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stepHistory.length > 20 && (
            <p className="text-xs text-claude-dark-500 mt-2 text-center">
              显示前 20 条，共 {stepHistory.length} 条记录
            </p>
          )}
        </div>

        {/* 按大步骤分组的详细信息 */}
        <div className="border-t border-claude-cream-200 pt-4">
          <p className="text-sm font-medium text-claude-dark-700 mb-3">按大步骤分组详情</p>
          <Accordion type="multiple" className="space-y-2">
            {Object.keys(groupedSteps).map((majorStep) => {
              const steps = groupedSteps[majorStep]
              return (
                <AccordionItem key={majorStep} value={majorStep} className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{majorStep}</span>
                      <span className="text-sm text-claude-dark-500">({steps.length} 个步骤)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
                      {steps.map((step, index) => (
                        <div
                          key={step.id}
                          className="text-sm border border-claude-cream-200 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span>{getStatusIcon(step.status)}</span>
                            <span className="font-medium">
                              {index + 1}. {step.sub_step}
                            </span>
                            {step.scene_id && (
                              <code className="text-xs text-claude-dark-500">{step.scene_id}</code>
                            )}
                          </div>

                          <div className="grid gap-1 text-xs text-claude-dark-500">
                            {step.started_at && <div>开始: {formatTimestamp(step.started_at)}</div>}
                            {step.completed_at && (
                              <div>完成: {formatTimestamp(step.completed_at)}</div>
                            )}
                            {step.error_message && (
                              <div className="text-red-600 mt-2">错误: {step.error_message}</div>
                            )}
                          </div>

                          {/* 输入/输出数据 - 折叠显示 */}
                          {(step.input_data || step.output_data) && (
                            <details className="mt-2">
                              <summary className="text-xs text-claude-dark-500 cursor-pointer hover:text-claude-dark-700">
                                查看数据详情
                              </summary>
                              <div className="mt-2 space-y-2">
                                {step.input_data && (
                                  <div>
                                    <p className="text-xs text-claude-dark-500 mb-1">输入数据:</p>
                                    <pre className="text-xs bg-claude-cream-100 p-2 rounded overflow-x-auto max-h-40">
                                      {formatJson(step.input_data)}
                                    </pre>
                                  </div>
                                )}
                                {step.output_data && (
                                  <div>
                                    <p className="text-xs text-claude-dark-500 mb-1">输出数据:</p>
                                    <pre className="text-xs bg-claude-cream-100 p-2 rounded overflow-x-auto max-h-40">
                                      {formatJson(step.output_data)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </SectionCard>
    </section>
  )
}

function formatJson(jsonStr: string): string {
  try {
    const obj = JSON.parse(jsonStr)
    return JSON.stringify(obj, null, 2)
  } catch {
    return jsonStr
  }
}
