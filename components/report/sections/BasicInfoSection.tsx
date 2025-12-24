import { SectionCard } from '@/components/guide/section-card'
import { Badge } from '@/components/ui'
import type { JobReportData } from '@/types/api/job-report'

interface BasicInfoSectionProps {
  data: JobReportData
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
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

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
    completed: 'default',
    failed: 'destructive',
    processing: 'outline',
    pending: 'outline',
  }
  const labels: Record<string, string> = {
    completed: '已完成',
    failed: '失败',
    processing: '处理中',
    pending: '待处理',
  }
  return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>
}

export function BasicInfoSection({ data }: BasicInfoSectionProps) {
  const { job, state } = data

  return (
    <section id="basic-info">
      <SectionCard title="📊 任务基本信息">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <InfoRow label="任务 ID" value={<code className="text-sm">{job.id}</code>} />
            <InfoRow
              label="任务类型"
              value={job.input_videos.length === 1 ? '单视频剪辑' : '多视频混剪'}
            />
            <InfoRow label="任务状态" value={getStatusBadge(job.status)} />
            <InfoRow label="风格预设" value={job.style_name || job.style_id} />
          </div>
          <div className="space-y-3">
            <InfoRow label="创建时间" value={formatTimestamp(job.created_at)} />
            {job.started_at && <InfoRow label="开始时间" value={formatTimestamp(job.started_at)} />}
            {job.completed_at && (
              <>
                <InfoRow label="完成时间" value={formatTimestamp(job.completed_at)} />
                {job.started_at && (
                  <InfoRow
                    label="总耗时"
                    value={formatDuration(job.completed_at - job.started_at)}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* 处理进度 */}
        {state?.total_scenes && state.total_scenes > 0 && (
          <div className="mt-4 pt-4 border-t border-claude-cream-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-claude-dark-500">处理进度</span>
              <span className="text-sm font-medium">
                {state.processed_scenes || 0}/{state.total_scenes} 分镜
              </span>
            </div>
            <div className="h-2 bg-claude-cream-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-claude-orange-500 rounded-full transition-all"
                style={{
                  width: `${Math.round(((state.processed_scenes || 0) / state.total_scenes) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* 当前步骤 */}
        {state?.current_major_step && (
          <div className="mt-4 pt-4 border-t border-claude-cream-200">
            <InfoRow
              label="当前步骤"
              value={`${state.current_major_step} > ${state.current_sub_step || '未知'}`}
            />
          </div>
        )}

        {/* 最终视频 */}
        {state?.final_video_url && (
          <div className="mt-4 pt-4 border-t border-claude-cream-200">
            <InfoRow
              label="最终视频"
              value={
                <a
                  href={state.final_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-claude-orange-600 hover:underline break-all"
                >
                  {state.final_video_url}
                </a>
              }
            />
          </div>
        )}
      </SectionCard>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm text-claude-dark-500 shrink-0 w-20">{label}:</span>
      <span className="text-sm text-claude-dark-800 break-all">{value}</span>
    </div>
  )
}
