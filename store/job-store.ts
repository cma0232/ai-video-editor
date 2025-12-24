import { create } from 'zustand'
import type { Job } from '@/types'

// API 响应类型
interface CreateJobSuccessResponse {
  job_id: string
}

interface ApiErrorResponse {
  error: string
}

// 类型守卫
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isApiError(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && typeof value.error === 'string'
}

function isCreateJobSuccess(value: unknown): value is CreateJobSuccessResponse {
  return isRecord(value) && typeof value.job_id === 'string'
}

interface JobStore {
  jobs: Job[]
  selectedJobId: string | null

  setJobs: (jobs: Job[]) => void
  addJob: (job: Job) => void
  updateJob: (jobId: string, updates: Partial<Job>) => void
  setSelectedJobId: (jobId: string | null) => void

  // Actions
  fetchJobs: () => Promise<void>
  createJob: (data: {
    input_videos: Array<{
      url: string
      label: string
      title?: string
      description?: string
    }>
    style_id: string
    config?: Record<string, unknown>
  }) => Promise<string>
  deleteJob: (jobId: string) => Promise<void>
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  selectedJobId: null,

  setJobs: (jobs) => set({ jobs }),
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job)),
    })),
  setSelectedJobId: (jobId) => set({ selectedJobId: jobId }),

  fetchJobs: async () => {
    const response = await fetch('/api/jobs')
    const data = await response.json()
    set({ jobs: data.jobs })
  },

  createJob: async (data) => {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const payload = isJson ? await response.json() : await response.text()

    if (!response.ok) {
      // 409：任务已满，直接使用 API 返回的错误信息
      if (response.status === 409 && isApiError(payload)) {
        throw new Error(payload.error)
      }

      const message = isApiError(payload)
        ? payload.error
        : typeof payload === 'string'
          ? payload.slice(0, 200)
          : '未知错误'
      throw new Error(`创建任务请求失败（HTTP ${response.status}）：${message}`)
    }

    if (!isCreateJobSuccess(payload)) {
      throw new Error(
        '创建任务成功，但服务器未返回 job_id。请检查服务端日志确保 /api/jobs 接口返回 JSON。',
      )
    }

    // 优化：后台刷新任务列表，不阻塞返回
    // 使用 setTimeout 让刷新在后台异步执行
    setTimeout(() => get().fetchJobs(), 100)

    return payload.job_id
  },

  deleteJob: async (jobId) => {
    const response = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '删除失败' }))
      throw new Error(error.error || `删除任务失败（HTTP ${response.status}）`)
    }

    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== jobId),
    }))
  },
}))
