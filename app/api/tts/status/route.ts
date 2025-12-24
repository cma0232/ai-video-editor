/** GET: 获取所有 TTS Provider 的状态 */

import { NextResponse } from 'next/server'
import { ttsManager } from '@/lib/ai/tts'

export async function GET() {
  try {
    const providers = ttsManager.getAllProvidersStatus()
    const defaultProvider = ttsManager.getDefaultProvider()

    return NextResponse.json({
      providers,
      defaultProvider,
      available: ttsManager.isAvailable(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取 TTS 状态失败' },
      { status: 500 },
    )
  }
}
