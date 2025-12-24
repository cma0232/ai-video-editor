/**
 * 任务数据加载器
 *
 * 重要说明：
 * - Server Component 必须使用 *Direct() 版本（直接访问数据库）
 * - Client Component 可以使用 HTTP 版本（通过 API Routes）
 * - HTTP 版本在服务端调用会导致 ECONNREFUSED 错误
 */

import { JobsRepository } from '@/lib/db/core/jobs'
import { runInTransaction } from '@/lib/db/core/transaction'
import { getState, parseStepContext } from '@/lib/db/managers/state-manager'
import { findByJobId as getJobStepHistory } from '@/lib/db/tables/job-step-history'
import { getBaseUrl, isServerSide } from '@/lib/utils/api-client'
import type { StepContext, StepRecord } from '@/lib/workflow/step-definitions'
import type { Job, JobState } from '@/types'

// ========== 类型定义 ==========

// 任务详情响应（简化类型，避免复杂交叉类型）
export interface JobDetailResponse {
  job: Job
}

// 批量加载结果
export interface JobWithDetails {
  job: Job | null
  stepHistory: StepRecord[]
  state: JobState | null
}

// ========== 数据加载函数 ==========

/**
 * 【事务批量加载】获取任务及其所有关联数据
 * 使用单个事务减少数据库锁竞争，提高性能
 *
 * @param jobId 任务 ID
 * @returns 任务详情、步骤历史和状态
 */
export function loadJobWithDetailsBatch(jobId: string): JobWithDetails {
  const jobsRepo = new JobsRepository()

  return runInTransaction(
    () => {
      const job = jobsRepo.getById(jobId)
      if (!job) {
        return { job: null, stepHistory: [], state: null }
      }

      const stepHistory = getJobStepHistory(jobId) as unknown as StepRecord[]
      const rawState = getState(jobId)

      // 转换为 JobState 类型
      const state: JobState | null = rawState
        ? {
            current_major_step: rawState.current_major_step,
            current_sub_step: rawState.current_sub_step,
            step_context: parseStepContext(rawState) as Record<string, unknown> | undefined,
            total_scenes: rawState.total_scenes,
            processed_scenes: rawState.processed_scenes,
            final_video_url: rawState.final_video_url,
            final_video_public_url: rawState.final_video_public_url,
            final_video_gs_uri: rawState.final_video_gs_uri,
            final_video_local_path: rawState.final_video_local_path,
            updated_at: rawState.updated_at,
          }
        : null

      return { job, stepHistory, state }
    },
    { mode: 'DEFERRED' }, // 只读查询使用 DEFERRED 模式
  )
}

/**
 * 【直接数据库版本】获取任务详情
 * 供 Server Component 使用，直接查询数据库，避免 HTTP 自调用
 * @returns 任务详情,如果任务不存在返回 null
 */
export async function loadJobDetailDirect(jobId: string): Promise<JobDetailResponse | null> {
  const jobsRepo = new JobsRepository()
  const job = jobsRepo.getById(jobId)

  if (!job) {
    return null
  }

  // 加载关联数据
  const state = getState(jobId)
  const stepHistory = getJobStepHistory(jobId)

  // 安全解析 step_context
  const parseStepContext = (ctx: unknown): StepContext | undefined => {
    if (!ctx) return undefined
    if (typeof ctx === 'object') return ctx as StepContext
    if (typeof ctx === 'string') {
      try {
        return JSON.parse(ctx) as StepContext
      } catch {
        console.warn('[job-loaders] 解析 step_context 失败')
        return undefined
      }
    }
    return undefined
  }

  // 构建完整的 Job 对象（包含 state 和 stepHistory）
  const fullJob: Job = {
    ...job,
    state: state
      ? {
          current_major_step: state.current_major_step,
          current_sub_step: state.current_sub_step,
          step_context: parseStepContext(state.step_context),
          total_scenes: state.total_scenes,
          processed_scenes: state.processed_scenes,
          final_video_url: state.final_video_url,
          final_video_public_url: state.final_video_public_url,
          final_video_gs_uri: state.final_video_gs_uri,
          final_video_local_path: state.final_video_local_path,
          updated_at: state.updated_at,
        }
      : undefined,
    // 数据库返回 JobStepHistory[]，类型兼容 StepRecord[]
    stepHistory: stepHistory as unknown as StepRecord[],
  }

  return { job: fullJob }
}

/**
 * 【HTTP 版本】获取任务详情
 * 仅供 Client Component 使用，通过 API Routes 获取
 *
 * ⚠️ 警告：不要在 Server Component 中调用此函数！
 * Server Component 请使用 loadJobDetailDirect()
 *
 * @returns 任务详情,如果任务不存在返回 null
 */
export async function loadJobDetail(jobId: string): Promise<JobDetailResponse | null> {
  // 服务端调用警告
  if (isServerSide()) {
    console.warn(
      '[loadJobDetail] 警告：在服务端调用 HTTP 版本加载器，' +
        '可能导致 ECONNREFUSED 错误。请改用 loadJobDetailDirect()',
    )
  }

  const baseUrl = getBaseUrl()
  const response = await fetch(`${baseUrl}/api/jobs/${jobId}`, {
    cache: 'no-store', // 完全禁用缓存
  })

  // 404 表示任务不存在,返回 null
  if (response.status === 404) {
    return null
  }

  // 其他错误抛出异常
  if (!response.ok) {
    throw new Error(`获取任务详情失败: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * 【直接数据库版本】获取任务列表
 * 供 Server Component 使用，直接查询数据库，避免 HTTP 自调用
 */
export async function loadJobsListDirect(params?: { limit?: number; offset?: number }): Promise<{
  jobs: Job[]
  total: number
  limit: number
  offset: number
}> {
  const { limit = 20, offset = 0 } = params || {}

  const jobsRepo = new JobsRepository()
  const jobs = jobsRepo.list({ limit, offset })
  const total = jobsRepo.count()

  return {
    jobs,
    total,
    limit,
    offset,
  }
}

/**
 * 【HTTP 版本】获取任务列表
 * 仅供 Client Component 使用，通过 API Routes 获取
 *
 * ⚠️ 警告：不要在 Server Component 中调用此函数！
 * Server Component 请使用 loadJobsListDirect()
 */
export async function loadJobsList(params?: { limit?: number; offset?: number }): Promise<{
  jobs: Job[]
  total: number
  limit: number
  offset: number
}> {
  // 服务端调用警告
  if (isServerSide()) {
    console.warn(
      '[loadJobsList] 警告：在服务端调用 HTTP 版本加载器，' +
        '可能导致 ECONNREFUSED 错误。请改用 loadJobsListDirect()',
    )
  }

  const baseUrl = getBaseUrl()
  const { limit = 20, offset = 0 } = params || {}

  const response = await fetch(`${baseUrl}/api/jobs?limit=${limit}&offset=${offset}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('获取任务列表失败')
  }

  return response.json()
}

/**
 * 组合加载器：获取日志页所需数据
 * 简化版 - 只加载任务详情
 * 使用直接数据库版本，避免 Server Component 中 HTTP 自调用问题
 * @returns 工作台数据,如果任务不存在返回 null
 */
export async function loadWorkbenchData(jobId: string) {
  const jobDetail = await loadJobDetailDirect(jobId)

  // 任务不存在
  if (!jobDetail) {
    return null
  }

  return {
    jobDetail,
    analysisData: null,
    scenesData: null,
    stats: null,
  }
}
