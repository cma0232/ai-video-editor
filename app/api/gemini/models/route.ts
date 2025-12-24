export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { listGeminiModels } from '@/lib/ai/gemini-utils'

const requestSchema = z.object({
  project_id: z.string().min(1, 'Project ID 不能为空'),
  service_account_json: z.string().min(1, 'Service Account JSON 不能为空'),
  location: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = requestSchema.parse(body)

    const models = await listGeminiModels({
      project_id: data.project_id,
      service_account_json: data.service_account_json,
      location: data.location,
    })

    return NextResponse.json({ models })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数校验失败', details: error.flatten() }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: '获取模型列表失败',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
