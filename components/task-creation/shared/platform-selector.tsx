'use client'

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'

// ============================================================================
// Gemini 平台选择器组件
// 从 single-video-form 和 multi-video-form 抽取的共享组件
// ============================================================================

type GeminiPlatform = 'vertex' | 'ai-studio' | ''

interface PlatformSelectorProps {
  value: GeminiPlatform
  onChange: (platform: GeminiPlatform) => void
  availablePlatforms: ('vertex' | 'ai-studio')[]
  error?: string
}

export function PlatformSelector({
  value,
  onChange,
  availablePlatforms,
  error,
}: PlatformSelectorProps) {
  const handleChange = (val: string) => {
    onChange(val as GeminiPlatform)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="platform" className="text-base font-medium text-claude-dark-800">
        Gemini 平台 <span className="text-red-500">*</span>
      </Label>
      <Select value={value} onValueChange={handleChange} disabled={availablePlatforms.length === 0}>
        <SelectTrigger
          id="platform"
          className={`h-14 text-base rounded-xl ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        >
          <SelectValue placeholder={availablePlatforms.length === 0 ? '未配置平台' : '选择平台'} />
        </SelectTrigger>
        <SelectContent>
          {availablePlatforms.length === 0 ? (
            <SelectItem value="none" disabled>
              请先在设置页面配置平台
            </SelectItem>
          ) : (
            <>
              {availablePlatforms.includes('vertex') && (
                <SelectItem value="vertex">Google Vertex AI</SelectItem>
              )}
              {availablePlatforms.includes('ai-studio') && (
                <SelectItem value="ai-studio">Google AI Studio</SelectItem>
              )}
            </>
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {availablePlatforms.length === 0 && (
        <p className="text-sm text-amber-600">请先在设置页面配置 Gemini 平台</p>
      )}
    </div>
  )
}
