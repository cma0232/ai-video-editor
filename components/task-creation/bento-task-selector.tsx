'use client'

import { Check, Film, Layers, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'

type BentoTaskSelectorProps = {
  onSelect: (type: 'single' | 'multi') => void
}

export function BentoTaskSelector({ onSelect }: BentoTaskSelectorProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* 单视频剪辑卡片 */}
      <div className="group h-[420px] p-8 rounded-3xl border-2 border-claude-cream-200 bg-linear-to-br from-white via-claude-cream-50/50 to-claude-orange-50/30 hover:border-claude-orange-400 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col relative overflow-hidden">
        {/* 装饰元素 - 右上角点缀 */}
        <div className="absolute top-6 right-6 w-20 h-20 bg-claude-orange-200/20 rounded-full blur-2xl" />
        <div className="absolute top-10 right-10 w-2 h-2 bg-claude-orange-400 rounded-full" />
        <div className="absolute top-16 right-14 w-1.5 h-1.5 bg-claude-orange-300 rounded-full" />

        {/* 图标区域 */}
        <div className="flex justify-center mb-5 relative z-10">
          <div className="w-24 h-24 rounded-full bg-linear-to-br from-claude-orange-400 to-claude-orange-600 flex items-center justify-center shadow-lg">
            <Film className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* 标题和描述 */}
        <div className="text-center mb-5 relative z-10">
          <h3 className="text-2xl font-bold text-claude-dark-900 mb-2.5">单视频剪辑</h3>
          <p className="text-base text-claude-dark-600">上传完整视频，AI 智能分析并自动剪辑</p>
        </div>

        {/* 特性列表 */}
        <div className="space-y-2.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-claude-orange-500 shrink-0" />
            <span className="text-base text-claude-dark-700">智能分镜 - AI 自动识别精彩片段</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-claude-orange-500 shrink-0" />
            <span className="text-base text-claude-dark-700">AI 语音合成 - 自然流畅的配音</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-claude-orange-500 shrink-0" />
            <span className="text-base text-claude-dark-700">原声保留可选 - 灵活控制音频来源</span>
          </div>
        </div>

        {/* 按钮容器 - 推到底部并居中 */}
        <div className="mt-auto pt-6 flex justify-center relative z-10">
          <Button
            onClick={() => onSelect('single')}
            className="h-11 w-[180px] bg-linear-to-r from-claude-orange-500 to-claude-orange-600 hover:from-claude-orange-600 hover:to-claude-orange-700 text-white text-base shadow-lg hover:shadow-xl transition-all"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            立即开始
          </Button>
        </div>
      </div>

      {/* 多视频混剪卡片 */}
      <div className="group h-[420px] p-8 rounded-3xl border-2 border-claude-cream-200 bg-linear-to-br from-white via-claude-cream-50/50 to-claude-orange-50/30 hover:border-claude-orange-400 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col relative overflow-hidden">
        {/* 装饰元素 - 右上角点缀 */}
        <div className="absolute top-6 right-6 w-20 h-20 bg-claude-orange-200/20 rounded-full blur-2xl" />
        <div className="absolute top-10 right-10 w-2 h-2 bg-claude-orange-400 rounded-full" />
        <div className="absolute top-16 right-14 w-1.5 h-1.5 bg-claude-orange-300 rounded-full" />

        {/* 图标区域 */}
        <div className="flex justify-center mb-5 relative z-10">
          <div className="w-24 h-24 rounded-full bg-linear-to-br from-claude-orange-400 to-claude-orange-600 flex items-center justify-center shadow-lg">
            <Layers className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* 标题和描述 */}
        <div className="text-center mb-5 relative z-10">
          <h3 className="text-2xl font-bold text-claude-dark-900 mb-2.5">多视频混剪</h3>
          <p className="text-base text-claude-dark-600">上传多个片段，AI 智能拼接混剪</p>
        </div>

        {/* 特性列表 */}
        <div className="space-y-2.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-claude-orange-500 shrink-0" />
            <span className="text-base text-claude-dark-700">多素材混剪 - 智能拼接多个视频</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-claude-orange-500 shrink-0" />
            <span className="text-base text-claude-dark-700">
              风格统一 - 自动保持一致的剪辑风格
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-claude-orange-500 shrink-0" />
            <span className="text-base text-claude-dark-700">批量处理 - 支持 2-10 个视频素材</span>
          </div>
        </div>

        {/* 按钮容器 - 推到底部并居中 */}
        <div className="mt-auto pt-6 flex justify-center relative z-10">
          <Button
            onClick={() => onSelect('multi')}
            className="h-11 w-[180px] bg-linear-to-r from-claude-orange-500 to-claude-orange-600 hover:from-claude-orange-600 hover:to-claude-orange-700 text-white text-base shadow-lg hover:shadow-xl transition-all"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            立即开始
          </Button>
        </div>
      </div>
    </div>
  )
}
