/**
 * 单个配置项 API
 * GET    /api/configs/:key - 获取单个配置
 * PUT    /api/configs/:key - 更新配置
 * DELETE /api/configs/:key - 删除配置
 *
 * 注意：配置路由仅供 Web 端管理，需要 Session 认证
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth/unified-auth'
import { configsRepo } from '@/lib/db/core/configs'

interface RouteParams {
  params: Promise<{ key: string }>
}

/**
 * GET /api/configs/:key
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // 系统配置仅 Web 端可访问，需要认证
    await authenticate(req)

    const { key } = await params
    const value = configsRepo.get(key)

    if (value === null) {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 })
    }

    return NextResponse.json({ key, value })
  } catch {
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 })
  }
}

/**
 * PUT /api/configs/:key
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    // 系统配置仅 Web 端可访问，需要认证
    await authenticate(req)

    const { key } = await params
    const body = await req.json()
    const { value } = body

    if (value === undefined || value === null) {
      return NextResponse.json({ error: '缺少 value 字段' }, { status: 400 })
    }

    configsRepo.set(key, String(value))

    return NextResponse.json({
      success: true,
      key,
      value: configsRepo.get(key),
    })
  } catch {
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 })
  }
}

/**
 * DELETE /api/configs/:key
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    // 系统配置仅 Web 端可访问，需要认证
    await authenticate(req)

    const { key } = await params
    configsRepo.delete(key)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除配置失败' }, { status: 500 })
  }
}
