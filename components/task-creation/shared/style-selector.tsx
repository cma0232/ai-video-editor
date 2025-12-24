'use client'

import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import type { StyleSummary } from '@/types'

// ============================================================================
// 风格选择器组件
// 从 single-video-form 和 multi-video-form 抽取的共享组件
// ============================================================================

interface StyleSelectorProps {
  value: string
  onChange: (styleId: string) => void
  builtinStyles: StyleSummary[]
  customStyles: StyleSummary[]
  error?: string
}

export function StyleSelector({
  value,
  onChange,
  builtinStyles,
  customStyles,
  error,
}: StyleSelectorProps) {
  const allStyles = [...builtinStyles, ...customStyles]
  const currentStyle = allStyles.find((s) => s.id === value)

  return (
    <div className="space-y-2">
      <Label htmlFor="style" className="text-base font-medium text-claude-dark-800">
        剪辑风格 <span className="text-red-500">*</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id="style"
          className={`h-14 text-base rounded-xl ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        >
          <SelectValue placeholder="选择一个风格" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {customStyles.length > 0 && (
            <SelectGroup>
              <SelectLabel>自定义风格</SelectLabel>
              {customStyles.map((style) => (
                <SelectItem key={style.id} value={style.id}>
                  {style.config.channel_name} - {style.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {builtinStyles.length > 0 && (
            <SelectGroup>
              <SelectLabel>预设风格</SelectLabel>
              {builtinStyles.map((style) => (
                <SelectItem key={style.id} value={style.id}>
                  {style.config.channel_name} - {style.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {currentStyle && <p className="text-sm text-claude-dark-400">{currentStyle.description}</p>}
    </div>
  )
}
