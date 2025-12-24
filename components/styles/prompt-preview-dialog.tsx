'use client'

import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui'

interface PromptPreviewDialogProps {
  trigger: React.ReactNode
  title: string
  styleId: string
  type: 'analysis' | 'audio_sync'
  // 原始提示词内容（用于未保存的风格）
  analysisCreativeLayer?: string
  audioSyncCreativeLayer?: string
  config: {
    channel_name: string
    // storyboard_count 已移除 - 预览时使用默认值
    min_duration: number
    max_duration: number
    speech_rate_v1: number
    speech_rate_v2: number
    speech_rate_v3: number
    original_audio_scene_count: number
  }
}

export function PromptPreviewDialog({
  trigger,
  title,
  styleId,
  type,
  analysisCreativeLayer,
  audioSyncCreativeLayer,
  config,
}: PromptPreviewDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullPrompt, setFullPrompt] = useState('')
  const [stats, setStats] = useState<{ length: number; lines: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSelected, setIsSelected] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // 切换全选/取消全选
  const toggleSelection = () => {
    if (!contentRef.current) return

    const selection = window.getSelection()
    if (!selection) return

    if (isSelected) {
      // 取消全选
      selection.removeAllRanges()
      setIsSelected(false)
    } else {
      // 全选
      const range = document.createRange()
      range.selectNodeContents(contentRef.current)
      selection.removeAllRanges()
      selection.addRange(range)
      setIsSelected(true)
    }
  }

  // 高亮占位符函数：将 {{变量名}} 转换为带颜色的 JSX
  const highlightPlaceholders = (text: string) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g)
    return parts.map((part, index) => {
      if (part.match(/^\{\{[^}]+\}\}$/)) {
        return (
          <span key={`placeholder-${index}-${part}`} className="text-blue-600 font-semibold">
            {part}
          </span>
        )
      }
      return part
    })
  }

  // 当对话框打开时，获取完整提示词
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen)

    // ✅ 每次打开都重新获取最新预览（移除 !fullPrompt 条件）
    if (isOpen) {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/styles/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            style_id: styleId,
            type,
            // 原始提示词内容（用于未保存的风格）
            analysis_creative_layer: analysisCreativeLayer,
            audio_sync_creative_layer: audioSyncCreativeLayer,
            config: {
              channel_name: config.channel_name,
              storyboard_count: 6, // 预览时使用固定默认值
              min_duration: config.min_duration,
              max_duration: config.max_duration,
              speech_rate_v1: config.speech_rate_v1,
              speech_rate_v2: config.speech_rate_v2,
              speech_rate_v3: config.speech_rate_v3,
              original_audio_scene_count: config.original_audio_scene_count,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '获取预览失败')
        }

        const data = await response.json()
        setFullPrompt(data.full_prompt)
        setStats(data.stats)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '获取预览失败')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>完整提示词预览（创意层 + 参数层 + 变量替换）</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-claude-orange-500" />
              <span className="ml-2 text-claude-dark-400">正在生成预览...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">
                <strong>错误：</strong> {error}
              </p>
            </div>
          )}

          {!loading && !error && fullPrompt && (
            <>
              {/* 统计信息 */}
              {stats && (
                <div className="bg-claude-cream-50 border border-claude-cream-200 rounded-lg p-4">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-claude-dark-400 font-medium">字符数：</span>
                      <span className="text-claude-dark-900">{stats.length.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-claude-dark-400 font-medium">行数：</span>
                      <span className="text-claude-dark-900">{stats.lines}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 提示词内容 */}
              <div className="bg-claude-cream-50 border border-claude-cream-200 rounded-lg p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelection}
                      className="text-xs"
                    >
                      {isSelected ? '取消全选' : '全选'}
                    </Button>
                    <span className="text-xs text-claude-dark-400">
                      💡 点击全选按钮后，按 Ctrl+C（或 Cmd+C）复制
                    </span>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">
                    蓝色文本 = 运行时动态替换的变量
                  </span>
                </div>
                <div
                  ref={contentRef}
                  className="text-xs font-mono whitespace-pre-wrap text-claude-dark-900 overflow-x-auto cursor-text select-text bg-white p-4 rounded border border-claude-cream-200"
                >
                  {highlightPlaceholders(fullPrompt)}
                </div>
              </div>

              {/* 说明 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  💡 <strong>说明：</strong>
                  此为系统实际发送给 Gemini AI 的完整提示词。包含：
                </p>
                <ul className="text-sm text-amber-800 mt-2 ml-4 space-y-1">
                  <li>• 创意层：你手动编写的方法论和风格指导</li>
                  <li>• 参数层：系统自动添加的输入信息和输出规范</li>
                  <li>
                    • 动态变量：
                    <span className="text-blue-600 font-semibold">{'{{蓝色高亮}}'}</span>{' '}
                    的部分会在任务执行时替换为实际值
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
