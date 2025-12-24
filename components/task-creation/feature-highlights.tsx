'use client'

import { Palette, Sparkles, Target, Zap } from 'lucide-react'

export function FeatureHighlights() {
  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-6 h-[420px]">
      {/* Gemini 双平台 - 大卡片（2x2）*/}
      <div className="col-span-2 row-span-2 p-8 rounded-3xl border-2 border-claude-orange-200 bg-linear-to-br from-white via-claude-orange-50/30 to-claude-cream-50 hover:border-claude-orange-400 hover:shadow-2xl transition-all duration-300 flex flex-col relative overflow-hidden group">
        {/* 装饰背景 */}
        <div className="absolute top-8 right-8 w-32 h-32 bg-claude-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-8 left-8 w-24 h-24 bg-claude-orange-100/40 rounded-full blur-2xl" />

        <div className="relative z-10">
          {/* 图标容器 */}
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-claude-orange-400 to-claude-orange-600 flex items-center justify-center mb-6 shadow-lg">
            <Target className="w-9 h-9 text-white" />
          </div>

          <h4 className="text-2xl font-bold text-claude-dark-900 mb-5">Gemini 双平台</h4>
          <div className="space-y-3 text-claude-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-claude-orange-500 rounded-full shrink-0" />
              <p className="text-base leading-relaxed">Vertex AI / AI Studio 双模式</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-claude-orange-500 rounded-full shrink-0" />
              <p className="text-base leading-relaxed">智能视频内容分析</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-claude-orange-500 rounded-full shrink-0" />
              <p className="text-base leading-relaxed">自动生成分镜脚本</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI 智能配音 - 小卡片 */}
      <div className="col-span-1 row-span-1 p-5 rounded-2xl border border-claude-cream-200 bg-white hover:bg-linear-to-br hover:from-blue-50 hover:to-white hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <Sparkles className="w-10 h-10 text-blue-500 mb-3" />
        <h4 className="text-lg font-semibold text-claude-dark-900 mb-2.5">AI 智能配音</h4>
        <div className="space-y-1.5">
          <p className="text-sm text-claude-dark-600">高质量语音合成</p>
          <p className="text-sm text-claude-dark-600">自然流畅的语音</p>
          <p className="text-sm text-claude-dark-600">多音色可选</p>
        </div>
      </div>

      {/* 云端高速处理 - 小卡片 */}
      <div className="col-span-1 row-span-1 p-5 rounded-2xl border border-claude-cream-200 bg-white hover:bg-linear-to-br hover:from-green-50 hover:to-white hover:border-green-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <Zap className="w-10 h-10 text-green-500 mb-3" />
        <h4 className="text-lg font-semibold text-claude-dark-900 mb-2.5">云端处理</h4>
        <div className="space-y-1.5">
          <p className="text-sm text-claude-dark-600">视频云端调速</p>
          <p className="text-sm text-claude-dark-600">智能音画同步</p>
          <p className="text-sm text-claude-dark-600">自动容错重试</p>
        </div>
      </div>

      {/* 15+ 剪辑风格 - 横跨卡片（2x1）*/}
      <div className="col-span-2 row-span-1 p-4 rounded-2xl border border-claude-cream-200 bg-linear-to-r from-purple-50/50 to-pink-50/50 hover:border-purple-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 relative overflow-hidden group">
        {/* 装饰背景 */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-linear-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-2xl" />

        <div className="relative z-10 flex items-center gap-4 w-full">
          <Palette className="w-10 h-10 text-purple-500 shrink-0" />
          <div className="flex-1">
            <h4 className="text-xl font-semibold text-claude-dark-900 mb-1.5">15+ 剪辑风格</h4>
            <div className="flex gap-3 text-sm text-claude-dark-600">
              <span>✓ 内置精选风格</span>
              <span>✓ 支持自定义</span>
              <span>✓ 灵活配置</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
