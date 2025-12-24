'use client'

import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'

// API 响应类型
interface FullPreviewResponse {
  style: {
    name: string
    description: string
    config: {
      channel_name: string
      duration_range: { min: number; max: number }
      speech_rates: [number, number, number]
      original_audio_scene_count?: number
    }
  }
  analysis_prompt: {
    full_prompt: string
    stats: { length: number; lines: number }
  }
  audio_sync_prompt: {
    full_prompt: string
    stats: { length: number; lines: number }
    is_default: boolean
  }
}

interface StyleFullPreviewDialogProps {
  trigger: React.ReactNode
  styleId: string
}

export function StyleFullPreviewDialog({ trigger, styleId }: StyleFullPreviewDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FullPreviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'analysis' | 'audio_sync'>('analysis')
  const [isSelected, setIsSelected] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // 切换全选/取消全选
  const toggleSelection = () => {
    if (!contentRef.current) return

    const selection = window.getSelection()
    if (!selection) return

    if (isSelected) {
      selection.removeAllRanges()
      setIsSelected(false)
    } else {
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

  // 获取完整预览数据
  const fetchPreview = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/styles/full-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style_id: styleId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取预览失败')
      }

      const result = await response.json()
      setData(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '获取预览失败')
    } finally {
      setLoading(false)
    }
  }, [styleId])

  // 每次打开对话框时重新获取数据（动态更新）
  useEffect(() => {
    if (open) {
      fetchPreview()
      setActiveTab('analysis')
      setIsSelected(false)
    }
  }, [open, fetchPreview])

  // 处理标签切换
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'analysis' | 'audio_sync')
    setIsSelected(false)
  }

  // 当前活动标签的统计信息
  const currentStats =
    activeTab === 'analysis' ? data?.analysis_prompt.stats : data?.audio_sync_prompt.stats

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>风格预览：{data?.style.name || '加载中...'}</DialogTitle>
        </DialogHeader>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-claude-orange-500" />
            <span className="ml-2 text-claude-dark-400">正在加载风格信息...</span>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">
              <strong>错误：</strong> {error}
            </p>
          </div>
        )}

        {/* 内容区域 */}
        {!loading && !error && data && (
          <div className="space-y-4">
            {/* 描述 */}
            {data.style.description && (
              <p className="text-sm text-claude-dark-500">{data.style.description}</p>
            )}

            {/* 配置参数卡片区 */}
            <div className="flex flex-wrap gap-3">
              <ConfigCard label="频道名称" value={data.style.config.channel_name} />
              <ConfigCard
                label="分镜时长"
                value={`${data.style.config.duration_range.min}-${data.style.config.duration_range.max} 秒`}
              />
              <ConfigCard
                label="原声分镜"
                value={`${data.style.config.original_audio_scene_count || 0} 个`}
              />
              <ConfigCard
                label="语速方案"
                value={data.style.config.speech_rates.join(' / ')}
                unit="字/秒"
              />
            </div>

            {/* 标签页切换 */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="analysis" className="flex-1">
                  视频分析提示词
                </TabsTrigger>
                <TabsTrigger value="audio_sync" className="flex-1">
                  音画同步提示词
                  {data.audio_sync_prompt.is_default && (
                    <span className="ml-1 text-xs text-muted-foreground">(系统默认)</span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="mt-3">
                <PromptContent
                  contentRef={contentRef}
                  prompt={data.analysis_prompt.full_prompt}
                  highlightPlaceholders={highlightPlaceholders}
                  isSelected={isSelected}
                  toggleSelection={toggleSelection}
                />
              </TabsContent>

              <TabsContent value="audio_sync" className="mt-3">
                <PromptContent
                  contentRef={contentRef}
                  prompt={data.audio_sync_prompt.full_prompt}
                  highlightPlaceholders={highlightPlaceholders}
                  isSelected={isSelected}
                  toggleSelection={toggleSelection}
                />
              </TabsContent>
            </Tabs>

            {/* 统计信息 */}
            {currentStats && (
              <div className="flex items-center justify-between text-sm text-claude-dark-400">
                <span>
                  {currentStats.length.toLocaleString()} 字符 | {currentStats.lines} 行
                </span>
                <span className="text-xs text-claude-dark-400">
                  蓝色文本 = 运行时动态替换的变量
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// 配置参数卡片组件
function ConfigCard({
  label,
  value,
  unit,
}: {
  label: string
  value: string | number
  unit?: string
}) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg min-w-[100px]">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-medium">
        {value}
        {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
      </div>
    </div>
  )
}

// 提示词内容组件
function PromptContent({
  contentRef,
  prompt,
  highlightPlaceholders,
  isSelected,
  toggleSelection,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>
  prompt: string
  highlightPlaceholders: (text: string) => React.ReactNode
  isSelected: boolean
  toggleSelection: () => void
}) {
  return (
    <div className="space-y-2">
      {/* 操作栏 */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleSelection} className="text-xs">
          {isSelected ? '取消全选' : '全选'}
        </Button>
        <span className="text-xs text-claude-dark-400">点击全选后，按 Ctrl+C（或 Cmd+C）复制</span>
      </div>

      {/* 提示词内容 */}
      <div
        ref={contentRef}
        className="h-80 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-claude-dark-900 cursor-text select-text bg-white p-4 rounded border border-claude-cream-200"
      >
        {highlightPlaceholders(prompt)}
      </div>
    </div>
  )
}
