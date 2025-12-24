export const dynamic = 'force-dynamic'
export const revalidate = 0

import { type NextRequest, NextResponse } from 'next/server'
import { styleLoader } from '@/lib/workflow/style-loader'

/**
 * 开发模式缓存清除 API
 * 用于在修改 YAML 模板文件后，无需重启服务器即可加载最新内容
 *
 * 使用方法：
 * ```bash
 * curl -X POST http://localhost:8899/api/dev/clear-cache
 * ```
 */
export async function POST(_req: NextRequest) {
  // 仅在开发环境可用
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 },
    )
  }

  try {
    // 清除所有缓存
    styleLoader.clearCache() // 清除风格缓存
    styleLoader.clearSystemTemplatesCache() // 清除系统模板缓存

    return NextResponse.json({
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString(),
      caches_cleared: ['style_cache', 'system_templates_cache'],
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 },
    )
  }
}

/**
 * GET 方法返回当前缓存状态（仅开发模式）
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 },
    )
  }

  return NextResponse.json({
    message: 'Cache management endpoint',
    available_methods: ['POST'],
    usage: 'POST /api/dev/clear-cache to clear all caches',
  })
}
