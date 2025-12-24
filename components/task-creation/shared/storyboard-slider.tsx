'use client'

import { Input, Label, Slider } from '@/components/ui'

// ============================================================================
// 分镜数量滑块组件
// 使用 Slider + Input 组合，提供更直观的数值选择体验
// ============================================================================

interface StoryboardSliderProps {
  value: number
  onChange: (value: number) => void
  sliderMin?: number // 滑块最小值
  sliderMax?: number // 滑块最大值
  inputMin?: number // 输入框最小值
  inputMax?: number // 输入框最大值
  error?: string
}

export function StoryboardSlider({
  value,
  onChange,
  sliderMin = 3,
  sliderMax = 50,
  inputMin = 3,
  inputMax = 100,
  error,
}: StoryboardSliderProps) {
  const handleSliderChange = (values: number[]) => {
    onChange(values[0])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (!Number.isNaN(val)) {
      // 限制在输入框范围内
      const clamped = Math.max(inputMin, Math.min(inputMax, val))
      onChange(clamped)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium text-claude-dark-800">
          分镜数量 <span className="text-red-500">*</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={inputMin}
            max={inputMax}
            className="w-20 h-10 text-center text-base rounded-lg"
          />
          <span className="text-sm text-claude-dark-400">个</span>
        </div>
      </div>

      <Slider
        value={[Math.min(value, sliderMax)]}
        onValueChange={handleSliderChange}
        min={sliderMin}
        max={sliderMax}
        step={1}
        className="w-full"
      />

      <div className="flex justify-between text-xs text-claude-dark-400">
        <span>3</span>
        <span className="text-claude-dark-300">|</span>
        <span>10</span>
        <span className="text-claude-dark-300">|</span>
        <span>15</span>
        <span className="text-claude-dark-300">|</span>
        <span>25</span>
        <span className="text-claude-dark-300">|</span>
        <span>35</span>
        <span className="text-claude-dark-300">|</span>
        <span>45</span>
        <span className="text-claude-dark-300">|</span>
        <span>50</span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <p className="text-sm text-claude-dark-400">AI 将生成的分镜数量（推荐 3-50）</p>
    </div>
  )
}
