/**
 * 任务成本摘要卡片
 * 展示 API 调用成本明细
 */

'use client'

import { Cpu, DollarSign, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import type { CostBreakdown } from '@/lib/cost'

interface CostSummaryCardProps {
  jobId: string
}

export function CostSummaryCard({ jobId }: CostSummaryCardProps) {
  const [cost, setCost] = useState<CostBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCost = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/cost`)
        if (!response.ok) {
          throw new Error('获取成本数据失败')
        }
        const data = await response.json()
        setCost(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '未知错误')
      } finally {
        setLoading(false)
      }
    }

    fetchCost()
  }, [jobId])

  // 加载中
  if (loading) {
    return (
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded w-5/6" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 错误或无数据
  if (error || !cost) {
    return null
  }

  // 无成本数据（没有 API 调用）
  if (cost.total === 0 && cost.gemini.calls === 0 && cost.fish_audio.calls === 0) {
    return null
  }

  // 格式化成本
  const formatCost = (value: number): string => {
    if (value < 0.0001) return '< $0.0001'
    if (value < 0.01) return `$${value.toFixed(4)}`
    return `$${value.toFixed(2)}`
  }

  // 格式化 token 数量
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(2)}M`
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`
    }
    return tokens.toString()
  }

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)} 秒`
    const minutes = seconds / 60
    if (minutes < 60) return `${minutes.toFixed(1)} 分钟`
    const hours = minutes / 60
    return `${hours.toFixed(1)} 小时`
  }

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          API 成本估算
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* 总成本 */}
        <div className="text-2xl font-bold text-slate-900 mb-4">{formatCost(cost.total)}</div>

        {/* 分项成本 */}
        <div className="space-y-3 text-sm">
          {/* Gemini 成本 */}
          {cost.gemini.calls > 0 && (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Cpu className="h-4 w-4" />
                <span>Gemini AI</span>
              </div>
              <div className="text-right">
                <div className="font-medium text-slate-900">{formatCost(cost.gemini.cost)}</div>
                <div className="text-xs text-slate-400">
                  {cost.gemini.calls} 次调用 | {formatTokens(cost.gemini.input_tokens)} 输入 +{' '}
                  {formatTokens(cost.gemini.output_tokens)} 输出
                </div>
                {/* Context Cache 节省展示 */}
                {cost.gemini.cached_tokens > 0 &&
                  (() => {
                    // 计算节省金额：如果没有 Cache，需要支付全价
                    const fullPricePerMillion = cost.gemini.model_id?.includes('flash') ? 0.3 : 1.25
                    const cachedPricePerMillion = cost.gemini.model_id?.includes('flash')
                      ? 0.03
                      : 0.125
                    const savings =
                      (cost.gemini.cached_tokens / 1_000_000) *
                      (fullPricePerMillion - cachedPricePerMillion)

                    return (
                      <div className="text-xs text-green-600 mt-1">
                        🎯 Cache 节省: {formatTokens(cost.gemini.cached_tokens)} tokens (
                        {formatCost(savings)})
                      </div>
                    )
                  })()}
              </div>
            </div>
          )}

          {/* Fish Audio 成本 */}
          {cost.fish_audio.calls > 0 && (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Volume2 className="h-4 w-4" />
                <span>Fish Audio</span>
              </div>
              <div className="text-right">
                <div className="font-medium text-slate-900">{formatCost(cost.fish_audio.cost)}</div>
                <div className="text-xs text-slate-400">
                  {cost.fish_audio.calls} 次调用 |{' '}
                  {formatDuration(cost.fish_audio.total_duration_seconds)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 说明文字 */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
          * 成本基于当前 API 定价估算，实际账单以服务商为准
        </div>
      </CardContent>
    </Card>
  )
}
