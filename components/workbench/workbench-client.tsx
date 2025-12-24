/**
 * 工作台客户端组件
 * 显示任务信息、控制按钮和运行日志
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { CostSummaryCard } from '@/components/workbench/CostSummaryCard'
import { LogsPanel } from '@/components/workbench/LogsPanel'
import type { JobDetailResponse } from '@/lib/loaders/job-loaders'
import { fetchWithTimeout } from '@/lib/utils/fetch-client'

interface WorkbenchClientProps {
  jobId: string
  initialData: {
    jobDetail: JobDetailResponse
    analysisData?: unknown
    scenesData?: unknown
    stats?: unknown
  }
}

// 格式化时间戳（北京时间，精确到分钟）
const formatTimestamp = (createdAt: number): string => {
  const date = new Date(createdAt)
  const beijingDate = date.toLocaleString('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  // "2025-12-04 21:30" → "20251204-2130"
  return beijingDate.replace(/[-: ]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2')
}

export function WorkbenchClient({ jobId, initialData }: WorkbenchClientProps) {
  // 使用 useState 管理任务状态，支持客户端更新
  const [job, setJob] = useState(initialData.jobDetail.job)

  // 使用 ref 跟踪页面可见性和挂载状态（避免闭包竞态）
  // 注意：SSR 阶段 document 不存在，初始值设为 true，在 useEffect 中更新
  const isVisibleRef = useRef(true)
  const isMountedRef = useRef(true)

  // 智能轮询机制（Page Visibility API + 动态间隔 + 超时控制）
  useEffect(() => {
    isMountedRef.current = true
    isVisibleRef.current = !document.hidden
    let interval: NodeJS.Timeout | null = null

    const fetchJobStatus = async () => {
      // 页面不可见或组件已卸载时跳过轮询
      if (!isVisibleRef.current || !isMountedRef.current) return

      try {
        // 使用带超时的 fetch（10 秒超时）
        const response = await fetchWithTimeout(`/api/jobs/${jobId}`, {}, 10000)
        if (!isMountedRef.current) return

        if (response.ok) {
          const data = await response.json()
          setJob(data.job)
        }
      } catch {
        // 超时或网络错误时静默处理，避免打扰用户
      }
    }

    // 根据任务状态动态调整轮询间隔
    const getPollingInterval = () => {
      switch (job.status) {
        case 'processing':
          return 3000 // 处理中：3 秒
        default:
          return null // 其他状态：停止轮询
      }
    }

    const pollingInterval = getPollingInterval()

    if (pollingInterval) {
      interval = setInterval(fetchJobStatus, pollingInterval)
    }

    // 监听页面可见性变化（更新 ref）
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden
      if (isVisibleRef.current && isMountedRef.current) {
        // 页面重新可见时立即刷新一次
        fetchJobStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMountedRef.current = false
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [jobId, job.status])

  // 格式化时间
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
    }
    return statusMap[status] || status
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'text-claude-orange-600 bg-claude-orange-50 border-claude-orange-200'
      case 'completed':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-claude-dark-600 bg-claude-cream-50 border-claude-cream-200'
    }
  }

  return (
    <div className="w-full py-8">
      {/* 任务信息卡片 */}
      <Card className="mb-6 border-slate-200 shadow-xs">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            {/* 左侧：任务信息 */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">任务 #{jobId}</h2>
                <span
                  className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(job.status)}`}
                >
                  {getStatusText(job.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-slate-500">剪辑风格：</span>
                  <span className="font-medium text-slate-900">{job.style_name || '未知风格'}</span>
                </div>
                <div>
                  <span className="text-slate-500">创建时间：</span>
                  <span className="font-medium text-slate-900">{formatDate(job.created_at)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">视频地址：</span>
                  <div className="font-medium text-slate-700">
                    {job.input_videos && job.input_videos.length > 0 ? (
                      job.input_videos.map((v, i) => (
                        <div
                          key={v.label || `input-video-${i}`}
                          className="mt-1 first:mt-0 break-all"
                        >
                          <span className="text-xs text-slate-500">{v.label}: </span>
                          <span>{v.url}</span>
                        </div>
                      ))
                    ) : (
                      <span className="break-all">未知</span>
                    )}
                  </div>
                </div>

                {/* 剪辑结果 - 仅任务完成时显示 */}
                {job.status === 'completed' && (
                  <div className="col-span-2">
                    <span className="text-slate-500">剪辑结果：</span>
                    <div className="mt-1">
                      <a
                        href={`/api/jobs/${jobId}/download`}
                        download={`${formatTimestamp(job.created_at)}-${jobId}-final.mp4`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg
                          role="img"
                          aria-label="下载"
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        下载视频
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* 显示错误信息 */}
              {job.error_message && (
                <div className="p-3 bg-red-50/50 border border-red-200/60 rounded-lg">
                  <p className="text-sm text-red-700">{job.error_message}</p>
                  {job.error_metadata?.userGuidance && (
                    <p className="text-xs text-red-600 mt-1">
                      💡 {job.error_metadata.userGuidance}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 成本摘要 - 任务完成或失败时显示 */}
      {(job.status === 'completed' || job.status === 'failed') && (
        <div className="mb-6">
          <CostSummaryCard jobId={jobId} />
        </div>
      )}

      {/* 运行日志 - 传递任务状态用于智能轮询控制 */}
      <LogsPanel jobId={jobId} jobStatus={job.status} />
    </div>
  )
}
