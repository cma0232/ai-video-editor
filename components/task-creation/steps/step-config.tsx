'use client'

import { Palette } from 'lucide-react'
import { useTaskCreationStore } from '@/store/task-creation-store'
import type { StyleSummary } from '@/types'
import { PlatformSelector, StyleSelector } from '../shared'

/** 步骤 2：选择剪辑风格和 Gemini 平台 */
interface StepConfigProps {
  builtinStyles: StyleSummary[]
  customStyles: StyleSummary[]
  availablePlatforms: ('vertex' | 'ai-studio')[]
}

export function StepConfig({ builtinStyles, customStyles, availablePlatforms }: StepConfigProps) {
  const { selectedStyle, setSelectedStyle, geminiPlatform, setGeminiPlatform, getStepErrors } =
    useTaskCreationStore()

  const errors = getStepErrors(1)

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-claude-orange-100 p-5">
            <Palette className="h-12 w-12 text-claude-orange-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-claude-dark-900">选择配置</h3>
          <p className="text-sm text-claude-dark-400 max-w-md mx-auto">
            选择剪辑风格决定最终视频的调性，选择 AI 平台用于视频分析
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        <StyleSelector
          value={selectedStyle}
          onChange={setSelectedStyle}
          builtinStyles={builtinStyles}
          customStyles={customStyles}
          error={errors.selectedStyle}
        />

        <PlatformSelector
          value={geminiPlatform}
          onChange={setGeminiPlatform}
          availablePlatforms={availablePlatforms}
          error={errors.geminiPlatform}
        />
      </div>

      <div className="text-center">
        <p className="text-xs text-claude-dark-300">
          Vertex AI 适合企业用户（需 GCP 账号），AI Studio 适合个人用户
        </p>
      </div>
    </div>
  )
}
