import { SectionCard } from '@/components/guide/section-card'
import type { JobReportData } from '@/types/api/job-report'

interface SummarySectionProps {
  data: JobReportData
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}分${remainingSeconds}秒`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}小时${remainingMinutes}分`
}

export function SummarySection({ data }: SummarySectionProps) {
  const { state, stats, stepHistory } = data

  // 计算阶段耗时
  const stages = ['analysis', 'extract_scenes', 'process_scenes', 'compose']
  const stageNames: Record<string, string> = {
    analysis: '视频分析',
    extract_scenes: '分镜提取',
    process_scenes: '音画同步',
    compose: '最终合成',
  }

  const stageDurations = stages.map((stage) => {
    const stageSteps = stepHistory.filter((s) => s.major_step === stage)
    const totalMs = stageSteps.reduce((sum, s) => {
      const duration =
        s.duration_ms || (s.started_at && s.completed_at ? s.completed_at - s.started_at : 0)
      return sum + duration
    }, 0)
    return { stage, name: stageNames[stage], totalMs }
  })

  const totalDuration = stageDurations.reduce((sum, s) => sum + s.totalMs, 0)

  return (
    <section id="summary">
      <SectionCard title="🎯 任务总结">
        <div className="space-y-6">
          {/* 分镜处理统计 */}
          <div>
            <p className="text-sm font-medium text-claude-dark-700 mb-3">分镜处理统计</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryItem label="总分镜数" value={stats.totalScenes} />
              <SummaryItem
                label="已处理"
                value={state?.processed_scenes || stats.completedScenes}
                color="green"
              />
              <SummaryItem label="失败分镜" value={stats.failedScenes} color="red" />
              <SummaryItem label="跳过分镜" value={stats.skippedScenes} color="gray" />
            </div>
          </div>

          {/* 最终视频 */}
          {state?.final_video_url && (
            <div>
              <p className="text-sm font-medium text-claude-dark-700 mb-2">最终视频</p>
              <a
                href={state.final_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-claude-orange-600 hover:underline break-all"
              >
                {state.final_video_url}
              </a>
            </div>
          )}

          {/* 资源统计 */}
          <div>
            <p className="text-sm font-medium text-claude-dark-700 mb-3">资源统计</p>
            <div className="grid gap-2 text-sm">
              <ResourceRow label="Gemini API 调用" value={`${stats.geminiCalls} 次`} />
              <ResourceRow label="Fish Audio 调用" value={`${stats.fishAudioCalls} 次`} />
              <ResourceRow label="总 API 调用" value={`${stats.totalApiCalls} 次`} />
            </div>
          </div>

          {/* 阶段耗时分布 */}
          {totalDuration > 0 && (
            <div>
              <p className="text-sm font-medium text-claude-dark-700 mb-3">阶段耗时分布</p>
              <div className="space-y-2">
                {stageDurations
                  .filter((s) => s.totalMs > 0)
                  .map(({ stage, name, totalMs }) => {
                    const percentage = (totalMs / totalDuration) * 100
                    return (
                      <div key={stage}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-claude-dark-600">{name}</span>
                          <span className="text-claude-dark-500">
                            {formatDuration(totalMs)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-claude-cream-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-claude-orange-400 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                <div className="pt-2 border-t border-claude-cream-200 flex justify-between text-sm font-medium">
                  <span>总耗时</span>
                  <span>{formatDuration(totalDuration)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 报告生成时间 */}
          <div className="pt-4 border-t border-claude-cream-200 text-xs text-claude-dark-400 text-center">
            报告生成时间: {new Date().toLocaleString('zh-CN')}
          </div>
        </div>
      </SectionCard>
    </section>
  )
}

function SummaryItem({
  label,
  value,
  color = 'default',
}: {
  label: string
  value: number
  color?: 'default' | 'green' | 'red' | 'gray'
}) {
  const colorClasses = {
    default: 'text-claude-dark-800',
    green: 'text-green-600',
    red: 'text-red-600',
    gray: 'text-claude-dark-400',
  }

  return (
    <div className="text-center p-3 bg-claude-cream-100 rounded-lg">
      <p className="text-xs text-claude-dark-500">{label}</p>
      <p className={`text-xl font-semibold ${colorClasses[color]}`}>{value}</p>
    </div>
  )
}

function ResourceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-claude-dark-500">{label}</span>
      <span className="text-claude-dark-800">{value}</span>
    </div>
  )
}
