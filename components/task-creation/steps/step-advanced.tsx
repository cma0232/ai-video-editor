'use client'

import { Settings2 } from 'lucide-react'
import { useTaskCreationStore } from '@/store/task-creation-store'
import { AdvancedConfig } from '../shared'

// ============================================================================
// Step 3: 高级设置步骤
// 分镜数量、文案大纲、音频设置（可选）
// ============================================================================

export function StepAdvanced() {
  const {
    storyboardCount,
    setStoryboardCount,
    scriptOutline,
    setScriptOutline,
    originalAudioSceneCount,
    setOriginalAudioSceneCount,
    bgmUrl,
    setBgmUrl,
    getStepErrors,
  } = useTaskCreationStore()

  const errors = getStepErrors(2)

  return (
    <div className="space-y-8">
      {/* Hero 区域 */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-claude-orange-100 p-5">
            <Settings2 className="h-12 w-12 text-claude-orange-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-claude-dark-900">高级设置</h3>
          <p className="text-sm text-claude-dark-400 max-w-md mx-auto">
            调整生成参数和音频设置，这些都是可选项，保持默认值也可以
          </p>
        </div>
      </div>

      {/* 高级配置表单 */}
      <div className="max-w-xl mx-auto">
        <AdvancedConfig
          storyboardCount={storyboardCount}
          onStoryboardCountChange={setStoryboardCount}
          storyboardError={errors.storyboardCount}
          scriptOutline={scriptOutline}
          onScriptOutlineChange={setScriptOutline}
          originalAudioSceneCount={originalAudioSceneCount}
          onOriginalAudioSceneCountChange={setOriginalAudioSceneCount}
          bgmUrl={bgmUrl}
          onBgmUrlChange={setBgmUrl}
        />
      </div>
    </div>
  )
}
