'use client'

import { FileText, Music, SlidersHorizontal } from 'lucide-react'
import { Input, Label, Textarea } from '@/components/ui'
import { StoryboardSlider } from './storyboard-slider'

// ============================================================================
// 高级配置区块组件
// 移除 Accordion，使用视觉层次区分：
// - 生成参数区块（米白背景 + 橙色竖线）
// - 音频设置区块（更浅背景）
// ============================================================================

interface AdvancedConfigProps {
  // 分镜数量
  storyboardCount: number
  onStoryboardCountChange: (value: number) => void
  storyboardError?: string

  // 文案大纲
  scriptOutline: string
  onScriptOutlineChange: (value: string) => void

  // 原声分镜数量
  originalAudioSceneCount: number
  onOriginalAudioSceneCountChange: (value: number) => void

  // 背景音乐
  bgmUrl: string
  onBgmUrlChange: (value: string) => void
}

export function AdvancedConfig({
  storyboardCount,
  onStoryboardCountChange,
  storyboardError,
  scriptOutline,
  onScriptOutlineChange,
  originalAudioSceneCount,
  onOriginalAudioSceneCountChange,
  bgmUrl,
  onBgmUrlChange,
}: AdvancedConfigProps) {
  const scriptLength = scriptOutline.length
  const maxScriptLength = 5000

  // 字数颜色
  const getScriptLengthColor = () => {
    if (scriptLength > maxScriptLength) return 'text-red-500'
    if (scriptLength > maxScriptLength * 0.9) return 'text-amber-500'
    return 'text-claude-dark-400'
  }

  return (
    <div className="space-y-6">
      {/* 生成参数区块 */}
      <div className="relative rounded-xl bg-claude-cream-50 p-6 border-l-4 border-claude-orange-500">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="h-5 w-5 text-claude-orange-500" />
          <h4 className="text-base font-medium text-claude-dark-800">生成参数</h4>
          <span className="text-xs text-claude-dark-400 bg-claude-orange-100 px-2 py-0.5 rounded-full">
            推荐调整
          </span>
        </div>

        <div className="space-y-6">
          {/* 分镜数量滑块 */}
          <StoryboardSlider
            value={storyboardCount}
            onChange={onStoryboardCountChange}
            error={storyboardError}
          />

          {/* 文案大纲 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-claude-dark-400" />
              <Label
                htmlFor="script-outline"
                className="text-base font-medium text-claude-dark-800"
              >
                文案大纲
              </Label>
            </div>
            <Textarea
              id="script-outline"
              placeholder="输入视频的文案大纲，AI 将参考此大纲生成分镜..."
              value={scriptOutline}
              onChange={(e) => onScriptOutlineChange(e.target.value)}
              className="min-h-[120px] text-base rounded-xl resize-none"
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-claude-dark-400">
                可选。提供文案大纲可以让 AI 更准确地生成分镜
              </p>
              <span className={`text-sm ${getScriptLengthColor()}`}>
                {scriptLength}/{maxScriptLength} 字
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 音频设置区块 */}
      <div className="relative rounded-xl bg-claude-cream-50/50 p-6 border-l-4 border-claude-cream-200">
        <div className="flex items-center gap-2 mb-4">
          <Music className="h-5 w-5 text-claude-dark-400" />
          <h4 className="text-base font-medium text-claude-dark-800">音频设置</h4>
          <span className="text-xs text-claude-dark-400">可选</span>
        </div>

        <div className="space-y-6">
          {/* 原声分镜数量 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium text-claude-dark-800">原声分镜数量</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={originalAudioSceneCount}
                  onChange={(e) =>
                    onOriginalAudioSceneCountChange(parseInt(e.target.value, 10) || 0)
                  }
                  min={0}
                  max={500}
                  className="w-20 h-10 text-center text-base rounded-lg"
                />
                <span className="text-sm text-claude-dark-400">个</span>
              </div>
            </div>
            <p className="text-sm text-claude-dark-400">
              保留原声的分镜数量（0 表示全部使用 AI 配音，默认 0）
            </p>
            {originalAudioSceneCount === 0 && (
              <div className="text-xs text-claude-orange-500 bg-claude-orange-50 px-3 py-1.5 rounded-lg inline-block">
                当前设置：全部 AI 配音
              </div>
            )}
          </div>

          {/* 背景音乐 */}
          <div className="space-y-2">
            <Label htmlFor="bgm-url" className="text-base font-medium text-claude-dark-800">
              背景音乐
            </Label>
            <Input
              id="bgm-url"
              type="url"
              placeholder="https://example.com/music.mp3"
              value={bgmUrl}
              onChange={(e) => onBgmUrlChange(e.target.value)}
              className="h-12 text-base rounded-xl"
            />
            <p className="text-sm text-claude-dark-400">
              输入音乐直链，支持 MP3/AAC 格式。留空则不添加配乐。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
