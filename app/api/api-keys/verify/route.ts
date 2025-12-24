export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyApiKey } from '@/lib/api-keys/verify'
import type { ApiKeyService } from '@/types'

const verifyKeySchema = z.object({
  service: z.enum([
    'google_vertex',
    'google_ai_studio',
    'fish_audio_vertex',
    'fish_audio_ai_studio',
    'google_storage',
  ]),
  credentials: z.record(z.string(), z.string()),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = verifyKeySchema.parse(body)

    const result = await verifyApiKey(data.service as ApiKeyService, data.credentials)

    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
