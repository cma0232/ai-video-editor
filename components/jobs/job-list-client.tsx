/**
 * 任务列表客户端组件
 * 处理交互、轮询和分页
 */

'use client'

import { AlertCircle, Film, MoreVertical, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useConfirmDialog } from '@/components/dialogs'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Pagination,
} from '@/components/ui'
import { useJobStore } from '@/store/job-store'
import type { Job } from '@/types'

interface JobListClientProps {
  initialJobs: Job[]
  totalJobs: number
  currentPage: number
  pageSize: number
}

export function JobListClient({
  initialJobs,
  totalJobs,
  currentPage,
  pageSize,
}: JobListClientProps) {
  const router = useRouter()
  const { confirm } = useConfirmDialog()
  const { jobs, setJobs, deleteJob } = useJobStore()
  const [mounted, setMounted] = useState(false)
  const [_isPending, startTransition] = useTransition()

  // 同步 initialJobs 到 store，确保状态统一
  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs, setJobs])

  // 优先使用 store 的 jobs，如果 store 还没初始化则回退到 initialJobs
  const displayJobs = jobs.length > 0 ? jobs : initialJobs

  const totalPages = Math.ceil(totalJobs / pageSize)

  // 只在客户端渲染时间相关内容，避免 hydration 错误
  useEffect(() => {
    setMounted(true)
  }, [])

  const handlePageChange = (newPage: number) => {
    router.push(`/jobs?page=${newPage}&pageSize=${pageSize}`)
  }

  const handleDelete = async (jobId: string) => {
    const confirmed = await confirm({
      title: '确定要删除此任务吗？',
      description:
        '此操作不可恢复，将永久删除任务的所有数据，包括视频分析结果、分镜数据和运行日志。',
      variant: 'danger',
      confirmText: '确认删除',
      cancelText: '取消',
    })

    if (!confirmed) return

    startTransition(async () => {
      try {
        await deleteJob(jobId)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : '删除任务失败，请重试')
      }
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const formatDuration = (startTime: number | null, endTime: number | null) => {
    if (!startTime) return '-'

    // 服务器端渲染时，如果没有结束时间，返回占位符避免 hydration 错误
    if (!mounted && !endTime) return '计算中...'

    const end = endTime || Date.now()
    const seconds = Math.floor((end - startTime) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}小时${minutes % 60}分钟`
    if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`
    return `${seconds}秒`
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      {/* 空状态 */}
      {totalJobs === 0 ? (
        <Card className="claude-card border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Film className="h-12 w-12 text-claude-dark-400" />
            <p className="text-lg font-semibold text-claude-dark-400">还没有创建任务</p>
            <p className="max-w-sm text-sm text-claude-dark-300">
              从首页导入第一条素材，我们将自动完成拆条、配音与合成。您也可以随时在此监控实时进度。
            </p>
            <Link
              href="/"
              className="mt-2 text-sm text-claude-orange-500 hover:text-claude-orange-600 underline"
            >
              前往首页创建任务
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* 任务列表 */
        <div className="space-y-6 min-h-[800px]">
          {displayJobs.map((job) => (
            <Card key={job.id} className="claude-card">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0 space-y-1">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <span className="font-semibold text-claude-dark-900">任务 #{job.id}</span>
                    <JobStatusBadge status={job.status} />
                  </CardTitle>
                  <CardDescription className="truncate text-xs text-claude-dark-300">
                    {job.input_videos?.[0]?.url}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="outline" size="sm">
                      运行日志
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDelete(job.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除任务
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Scheme 3: 增强错误信息显示 */}
                {job.error_message && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-600 space-y-1">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <p>
                        <span className="font-medium">错误：</span> {job.error_message}
                      </p>

                      {/* 显示用户指导 */}
                      {job.error_metadata?.userGuidance && (
                        <p className="text-xs text-rose-700 flex items-start gap-1">
                          <span className="font-semibold">💡</span>
                          <span>{job.error_metadata.userGuidance}</span>
                        </p>
                      )}

                      {/* 配置错误时提供设置链接 */}
                      {job.error_metadata?.category === 'config' && (
                        <a
                          href="/settings"
                          className="text-xs text-blue-600 hover:text-blue-800 underline block"
                        >
                          → 前往设置页面检查 API 密钥
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 text-sm text-claude-dark-400 md:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-claude-dark-400">
                      创建时间
                    </span>
                    <span className="font-medium text-claude-dark-900">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-claude-dark-400">
                      剪辑风格
                    </span>
                    <span className="font-medium text-claude-dark-900">
                      {job.style_name || '未知风格'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-claude-dark-400">
                      处理时长
                    </span>
                    <span className="font-medium text-claude-dark-900">
                      {formatDuration(job.started_at, job.completed_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 分页器 */}
      {totalJobs > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalJobs}
            pageSize={pageSize}
            showQuickJumper={totalPages > 5}
          />
        </div>
      )}
    </section>
  )
}
