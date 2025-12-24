'use client'

import { Cpu, FileText, LayoutGrid, Music, Palette, Video } from 'lucide-react'
import { useTaskCreationStore } from '@/store/task-creation-store'
import type { StyleSummary } from '@/types'

// ============================================================================
// WizardSummary - 配置摘要
// 实时显示已配置的内容
// ============================================================================

interface WizardSummaryProps {
  builtinStyles: StyleSummary[]
  customStyles: StyleSummary[]
}

interface SummaryItemProps {
  icon: React.ElementType
  label: string
}

function SummaryItem({ icon: Icon, label }: SummaryItemProps) {
  return (
    <li className="flex items-center gap-2 text-slate-600">
      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="truncate">{label}</span>
    </li>
  )
}

export function WizardSummary({ builtinStyles, customStyles }: WizardSummaryProps) {
  const {
    taskType,
    videoUrl,
    inputVideos,
    selectedStyle,
    geminiPlatform,
    storyboardCount,
    scriptOutline,
    bgmUrl,
  } = useTaskCreationStore()

  // 计算视频数量
  const videoCount =
    taskType === 'single'
      ? videoUrl.trim()
        ? 1
        : 0
      : inputVideos.filter((v) => v.url.trim()).length

  // 获取风格名称
  const getStyleName = () => {
    if (!selectedStyle) return null
    const allStyles = [...builtinStyles, ...customStyles]
    const style = allStyles.find((s) => s.id === selectedStyle)
    return style?.name || null
  }

  // 获取平台显示名
  const getPlatformName = () => {
    if (!geminiPlatform) return null
    return geminiPlatform === 'vertex' ? 'Vertex AI' : 'AI Studio'
  }

  const styleName = getStyleName()
  const platformName = getPlatformName()
  const hasOutline = scriptOutline.trim().length > 0
  const hasBgm = bgmUrl.trim().length > 0

  // 检查是否有任何配置
  const hasAnyConfig = videoCount > 0 || styleName || platformName

  if (!hasAnyConfig) {
    return <div className="text-sm text-slate-400 text-center py-2">暂无配置</div>
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">配置摘要</h3>
      <ul className="space-y-2 text-sm">
        {videoCount > 0 && <SummaryItem icon={Video} label={`${videoCount} 个视频`} />}
        {styleName && <SummaryItem icon={Palette} label={styleName} />}
        {platformName && <SummaryItem icon={Cpu} label={platformName} />}
        {storyboardCount > 0 && (
          <SummaryItem icon={LayoutGrid} label={`${storyboardCount} 个分镜`} />
        )}
        {hasOutline && (
          <SummaryItem icon={FileText} label={`文案大纲 (${scriptOutline.length}字)`} />
        )}
        {hasBgm && <SummaryItem icon={Music} label="已设置背景音乐" />}
      </ul>
    </div>
  )
}
