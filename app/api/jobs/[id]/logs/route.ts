/**
 * 任务日志 API
 * 从数据库获取任务运行日志，支持多种过滤和分组模式
 * 动态添加中文名称字段（majorStepName, subStepName）
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { authenticate } from '@/lib/auth/unified-auth'
import { jobsRepo } from '@/lib/db/core/jobs'
import {
  queryJobLogs,
  queryLogsByStep,
  queryLogsByStage,
  getLogCount,
  type LogType,
  type LogLevel,
} from '@/lib/db/tables/job-logs'
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'
import { noCacheResponse } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { getStepName, getStageName } from '@/lib/workflow/step-registry'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // ========== 统一认证 ==========
    const auth = await authenticate(req)

    // Token 认证：检查速率限制
    if (auth.source === 'token' && auth.tokenId) {
      const rateLimit = checkRateLimit(`${auth.tokenId}:query`, RATE_LIMIT_PRESETS.QUERY)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Rate limited', retry_after: Math.ceil(rateLimit.resetIn / 1000) },
          { status: 429 },
        )
      }
    }

    const { id: jobId } = await params

    // 验证 jobId
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid job ID', details: 'jobId must be a non-empty string' },
        { status: 400 },
      )
    }

    // Token 认证：权限检查（只能访问自己创建的任务）
    if (auth.source === 'token' && auth.tokenId) {
      const job = jobsRepo.getById(jobId)
      if (!job || job.api_token_id !== auth.tokenId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // 获取查询参数
    const searchParams = req.nextUrl.searchParams
    const logTypeParam = searchParams.get('logType') // 日志类型过滤（支持逗号分隔）
    const majorStep = searchParams.get('majorStep') // 大步骤过滤
    const subStep = searchParams.get('subStep') // 小步骤过滤
    const logLevel = searchParams.get('logLevel') as LogLevel | null // 日志级别过滤
    const groupByStep = searchParams.get('groupByStep') === 'true' // 按小步骤分组
    const groupByStage = searchParams.get('groupByStage') === 'true' // 按大步骤分组
    const limitParam = searchParams.get('limit') // 分页限制
    const offsetParam = searchParams.get('offset') // 分页偏移

    // 解析日志类型过滤（支持多选）
    let logTypes: LogType[] | undefined
    if (logTypeParam) {
      logTypes = logTypeParam.split(',').map((t) => t.trim()) as LogType[]
    }

    // 解析分页参数
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined
    const offset = offsetParam ? Number.parseInt(offsetParam, 10) : undefined

    // 模式 1: 按大步骤分组（层次结构）
    if (groupByStage) {
      // 支持增量加载参数
      const afterId = searchParams.get('afterId')
      const stageLimit = limit ?? 500 // 默认 500 条

      const rawGroupedLogs = queryLogsByStage(jobId, { limit: stageLimit, afterId: afterId || undefined })
      const totalCount = getLogCount(jobId)

      // 统计返回的日志数量（分别统计全部和非 unknown）
      let returnedCount = 0
      let displayedCount = 0 // 前端实际显示的日志数（排除 unknown 分组）
      let lastId: string | null = null

      // 格式化每个日志的 details 字段（解析 JSON）+ 添加中文名称
      const formattedGroupedLogs = Object.entries(rawGroupedLogs).reduce((acc, [majorStep, subSteps]) => {
        const isUnknown = majorStep === 'unknown'
        acc[majorStep] = Object.entries(subSteps).reduce((subAcc, [subStep, logs]) => {
          subAcc[subStep] = logs.map((log) => {
            returnedCount++
            if (!isUnknown) displayedCount++ // 只统计非 unknown 分组
            lastId = log.id // 记录最后一条日志 ID

            let parsedDetails: Record<string, unknown> | undefined
            try {
              parsedDetails = log.details ? (JSON.parse(log.details) as Record<string, unknown>) : undefined
            } catch (error: unknown) {
              logger.warn(`[logs API] Failed to parse JSON for log ${log.id}`, { error })
              parsedDetails = { _parseError: 'Invalid JSON', _raw: log.details }
            }

            return {
              id: log.id,
              timestamp: new Date(log.created_at).toISOString(),
              level: log.log_level.toUpperCase(),
              message: log.message,
              details: parsedDetails,
              logType: log.log_type,
              majorStep: log.major_step,
              majorStepName: log.major_step ? getStageName(log.major_step) : undefined,
              subStep: log.sub_step,
              subStepName: log.sub_step ? getStepName(log.sub_step) : undefined,
              sceneId: log.scene_id,
              stepNumber: log.step_number,
              stageNumber: log.stage_number,
              serviceName: log.service_name,
              operation: log.operation,
              apiDurationMs: log.api_duration_ms,
            }
          })
          return subAcc
        }, {} as Record<string, Array<Record<string, unknown>>>)
        return acc
      }, {} as Record<string, Record<string, Array<Record<string, unknown>>>>)

      return noCacheResponse({
        groupedByStage: formattedGroupedLogs,
        meta: {
          totalCount, // 数据库中所有日志总数
          returnedCount, // API 返回的日志数（含 unknown）
          displayedCount, // 前端实际显示的日志数（排除 unknown）
          lastId,
          hasMore: returnedCount < totalCount, // 是否还有更多日志未返回
          limit: stageLimit,
        },
      })
    }

    // 模式 2: 按小步骤分组（扁平结构）
    if (groupByStep) {
      const rawGroupedLogs = queryLogsByStep(jobId)

      // 格式化每个日志的 details 字段（解析 JSON）+ 添加中文名称
      const formattedGroupedLogs = Object.entries(rawGroupedLogs).reduce((acc, [stepKey, logs]) => {
        acc[stepKey] = logs.map((log) => {
          let parsedDetails: Record<string, unknown> | undefined
          try {
            parsedDetails = log.details ? (JSON.parse(log.details) as Record<string, unknown>) : undefined
          } catch (error: unknown) {
            logger.warn(`[logs API] Failed to parse JSON for log ${log.id}`, { error })
            parsedDetails = { _parseError: 'Invalid JSON', _raw: log.details }
          }

          return {
            id: log.id,
            timestamp: new Date(log.created_at).toISOString(),
            level: log.log_level.toUpperCase(),
            message: log.message,
            details: parsedDetails,
            logType: log.log_type,
            majorStep: log.major_step,
            majorStepName: log.major_step ? getStageName(log.major_step) : undefined,
            subStep: log.sub_step,
            subStepName: log.sub_step ? getStepName(log.sub_step) : undefined,
            sceneId: log.scene_id,
            stepNumber: log.step_number,
            stageNumber: log.stage_number,
            serviceName: log.service_name,
            operation: log.operation,
            apiDurationMs: log.api_duration_ms,
          }
        })
        return acc
      }, {} as Record<string, Array<Record<string, unknown>>>)

      return noCacheResponse({ groupedByStep: formattedGroupedLogs })
    }

    // 模式 3: 原始列表（支持过滤和分页）
    const logs = queryJobLogs({
      jobId,
      logType: logTypes,
      majorStep: majorStep || undefined,
      subStep: subStep || undefined,
      logLevel: logLevel || undefined,
      limit,
      offset,
    })

    // 格式化日志输出（将 details 从 JSON 字符串解析为对象）+ 添加中文名称
    const formattedLogs = logs.map((log) => {
      let parsedDetails: Record<string, unknown> | undefined
      try {
        parsedDetails = log.details ? (JSON.parse(log.details) as Record<string, unknown>) : undefined
      } catch (error: unknown) {
        logger.warn(`[logs API] Failed to parse JSON for log ${log.id}`, { error })
        parsedDetails = { _parseError: 'Invalid JSON', _raw: log.details }
      }

      return {
        id: log.id,
        timestamp: new Date(log.created_at).toISOString(),
        level: log.log_level.toUpperCase(),
        message: log.message,
        details: parsedDetails,
        logType: log.log_type,
        majorStep: log.major_step,
        majorStepName: log.major_step ? getStageName(log.major_step) : undefined,
        subStep: log.sub_step,
        subStepName: log.sub_step ? getStepName(log.sub_step) : undefined,
        sceneId: log.scene_id,
        stepNumber: log.step_number,
        stageNumber: log.stage_number,
        serviceName: log.service_name,
        operation: log.operation,
        apiDurationMs: log.api_duration_ms,
      }
    })

    return noCacheResponse({ logs: formattedLogs })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error('[logs API] Failed to query logs from database', {
      error: errorMessage,
      stack: errorStack,
    })

    return NextResponse.json(
      {
        error: 'Failed to query logs',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
