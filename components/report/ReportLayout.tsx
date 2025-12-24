'use client'

import type { JobReportData } from '@/types/api/job-report'
import { REPORT_SECTIONS } from '@/types/api/job-report'
import { ReportNavigation } from './ReportNavigation'
import {
  ApiCallsSection,
  AudioSyncPromptSection,
  BasicInfoSection,
  ConfigSection,
  ErrorSummarySection,
  IntegritySection,
  LogsSection,
  SceneDetailSection,
  StepHistorySection,
  SummarySection,
  VideoInfoSection,
} from './sections'

interface ReportLayoutProps {
  data: JobReportData
}

export function ReportLayout({ data }: ReportLayoutProps) {
  const { job, errorSummary, audioSyncPrompt } = data

  // 根据任务状态过滤显示的章节
  const visibleSections = REPORT_SECTIONS.filter((section) => {
    // 错误摘要仅在失败任务时显示
    if (section.id === 'error-summary') {
      return job.status === 'failed'
    }
    return true
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex gap-6">
        {/* 左侧导航 - 桌面端显示 */}
        <aside className="hidden lg:block w-56 shrink-0 print:hidden">
          <div className="sticky top-24">
            <ReportNavigation sections={visibleSections} />
          </div>
        </aside>

        {/* 右侧内容 */}
        <main className="flex-1 min-w-0 space-y-8 print:space-y-4">
          {/* 1. 任务基本信息 */}
          <BasicInfoSection data={data} />

          {/* 2. 错误摘要（仅失败任务） */}
          {errorSummary && <ErrorSummarySection errorSummary={errorSummary} />}

          {/* 3. 输入视频信息 */}
          <VideoInfoSection videos={data.videos} />

          {/* 4. 分镜脚本详情 */}
          <SceneDetailSection scenes={data.scenes} audioCandidates={data.audioCandidates} />

          {/* 5. 音画同步提示词 */}
          {audioSyncPrompt && <AudioSyncPromptSection audioSyncPrompt={audioSyncPrompt} />}

          {/* 6. 执行步骤历史 */}
          <StepHistorySection stepHistory={data.stepHistory} />

          {/* 7. API 调用记录 */}
          <ApiCallsSection apiCalls={data.apiCalls} />

          {/* 8. 运行日志 */}
          <LogsSection logs={data.logs} />

          {/* 9. 数据完整性检查 */}
          <IntegritySection integrityCheck={data.integrityCheck} stats={data.stats} />

          {/* 10. 任务配置 */}
          <ConfigSection job={data.job} />

          {/* 11. 任务总结 */}
          <SummarySection data={data} />
        </main>
      </div>
    </div>
  )
}
