import { Callout } from '@/components/guide/callout'
import { SectionCard } from '@/components/guide/section-card'
import type { DataIntegrityCheck, JobReportStats } from '@/types/api/job-report'

interface IntegritySectionProps {
  integrityCheck: DataIntegrityCheck
  stats: JobReportStats
}

export function IntegritySection({ integrityCheck, stats }: IntegritySectionProps) {
  const { isComplete, warnings, scenesWithoutSplit, scenesWithoutFinal, scenesWithoutAudio } =
    integrityCheck

  return (
    <section id="integrity">
      <SectionCard title="🔍 数据完整性检查">
        {/* 总体状态 */}
        {isComplete ? (
          <Callout type="tip" title="数据完整">
            所有数据检查通过，任务数据完整
          </Callout>
        ) : (
          <Callout type="warning" title="发现数据问题">
            {warnings.length} 个警告需要关注
          </Callout>
        )}

        {/* 数据记录数统计 */}
        <div className="mt-4">
          <p className="text-sm font-medium text-claude-dark-700 mb-3">数据记录数统计</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatItem label="总分镜数" value={stats.totalScenes} />
            <StatItem label="已完成" value={stats.completedScenes} color="green" />
            <StatItem label="已失败" value={stats.failedScenes} color="red" />
            <StatItem label="已跳过" value={stats.skippedScenes} color="gray" />
          </div>
        </div>

        {/* 详细检查结果 */}
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-claude-dark-700">详细检查结果</p>

          {/* 分镜完整性 */}
          <CheckGroup title="分镜数据检查">
            <CheckItem
              label="拆条视频"
              status={scenesWithoutSplit.length === 0}
              detail={
                scenesWithoutSplit.length > 0
                  ? `${scenesWithoutSplit.length} 个分镜缺少拆条视频`
                  : '所有分镜已完成拆条'
              }
            />
            <CheckItem
              label="最终视频"
              status={scenesWithoutFinal.length === 0}
              detail={
                scenesWithoutFinal.length > 0
                  ? `${scenesWithoutFinal.length} 个配音分镜缺少最终视频`
                  : '所有配音分镜已生成最终视频'
              }
            />
            <CheckItem
              label="音频文件"
              status={scenesWithoutAudio.length === 0}
              detail={
                scenesWithoutAudio.length > 0
                  ? `${scenesWithoutAudio.length} 个配音分镜缺少音频`
                  : '所有配音分镜已生成音频'
              }
            />
          </CheckGroup>

          {/* API 调用统计 */}
          <CheckGroup title="API 调用统计">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-claude-cream-100 rounded">
                <p className="text-claude-dark-500">Gemini</p>
                <p className="font-medium">{stats.geminiCalls} 次</p>
              </div>
              <div className="text-center p-2 bg-claude-cream-100 rounded">
                <p className="text-claude-dark-500">Fish Audio</p>
                <p className="font-medium">{stats.fishAudioCalls} 次</p>
              </div>
              <div className="text-center p-2 bg-claude-cream-100 rounded">
                <p className="text-claude-dark-500">总计</p>
                <p className="font-medium">{stats.totalApiCalls} 次</p>
              </div>
            </div>
          </CheckGroup>

          {/* 日志统计 */}
          <CheckGroup title="日志统计">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-claude-cream-100 rounded">
                <p className="text-claude-dark-500">总日志</p>
                <p className="font-medium">{stats.totalLogs} 条</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <p className="text-red-500">错误</p>
                <p className="font-medium text-red-600">{stats.errorLogs} 条</p>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <p className="text-yellow-600">警告</p>
                <p className="font-medium text-yellow-700">{stats.warnLogs} 条</p>
              </div>
            </div>
          </CheckGroup>
        </div>
      </SectionCard>
    </section>
  )
}

function StatItem({
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

function CheckGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-claude-cream-200 rounded-lg p-3">
      <p className="text-xs font-medium text-claude-dark-500 mb-2">{title}</p>
      {children}
    </div>
  )
}

function CheckItem({ label, status, detail }: { label: string; status: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span>{status ? '✅' : '⚠️'}</span>
      <div>
        <span className="font-medium">{label}:</span>
        <span className={status ? 'text-claude-dark-500' : 'text-yellow-600'}> {detail}</span>
      </div>
    </div>
  )
}
