'use client'

import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Palette,
  Settings2,
  Sparkles,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/base/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/composite/dialog'
import { useTaskCreationStore } from '@/store/task-creation-store'

// ============================================================================
// ConfirmModal - 提交确认弹窗
// 展示配置摘要，用户确认后提交
// ============================================================================

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
}

interface PreviewCardProps {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}

function PreviewCard({ title, icon: Icon, children }: PreviewCardProps) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-claude-cream-200 flex items-center justify-center">
        <Icon className="w-4 h-4 text-claude-dark-400" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <h4 className="text-sm font-medium text-claude-dark-700">{title}</h4>
        <div className="text-sm text-claude-dark-400 mt-0.5 truncate">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onSubmit, isSubmitting }: ConfirmModalProps) {
  const {
    taskType,
    videoUrl,
    inputVideos,
    selectedStyle,
    geminiPlatform,
    storyboardCount,
    scriptOutline,
    originalAudioSceneCount,
    bgmUrl,
    getValidationErrors,
  } = useTaskCreationStore()

  // 获取验证错误
  const errors = getValidationErrors()
  const hasErrors = Object.keys(errors).length > 0

  // 计算视频数量
  const videoCount =
    taskType === 'single'
      ? videoUrl.trim()
        ? 1
        : 0
      : inputVideos.filter((v) => v.url.trim()).length

  // 平台显示名
  const platformName = geminiPlatform === 'vertex' ? 'Vertex AI' : 'AI Studio'

  // 获取视频显示名（只显示文件名，不显示完整路径）
  const getVideoDisplayName = () => {
    if (!videoUrl.trim()) return '未设置'
    const filename = videoUrl.split('/').pop() || videoUrl
    return filename
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          {/* 图标 */}
          <div className="mx-auto w-12 h-12 rounded-full bg-claude-orange-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-claude-orange-600" />
          </div>
          <DialogTitle className="text-center text-xl">确认创建任务</DialogTitle>
          <DialogDescription className="text-center">
            请检查以下配置，确认无误后提交
          </DialogDescription>
        </DialogHeader>

        {/* ==================== 错误提示 ==================== */}
        {hasErrors && (
          <div className="p-3 rounded-lg bg-claude-orange-50 border border-claude-orange-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-claude-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-claude-orange-700">请修复以下问题：</p>
                <ul className="text-sm text-claude-dark-600 mt-1 list-disc list-inside">
                  {Object.entries(errors).map(([key, error]) => (
                    <li key={key}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 配置预览卡片组 ==================== */}
        <div className="space-y-3 py-4">
          {/* 视频信息 */}
          <PreviewCard title="视频" icon={Video}>
            {taskType === 'single' ? (
              <span className="truncate block">{getVideoDisplayName()}</span>
            ) : (
              <span>{videoCount} 个视频</span>
            )}
          </PreviewCard>

          {/* 剪辑配置 */}
          <PreviewCard title="剪辑配置" icon={Palette}>
            <div className="space-y-0.5">
              <p>风格：{selectedStyle || '未选择'}</p>
              <p>平台：{platformName || '未选择'}</p>
            </div>
          </PreviewCard>

          {/* 高级设置 */}
          <PreviewCard title="高级设置" icon={Settings2}>
            <div className="space-y-0.5">
              <p>分镜数量：{storyboardCount}</p>
              {originalAudioSceneCount > 0 && <p>原声分镜：{originalAudioSceneCount}</p>}
              {scriptOutline.trim() && <p>文案大纲：已填写 ({scriptOutline.length}字)</p>}
              {bgmUrl.trim() && <p>背景音乐：已设置</p>}
            </div>
          </PreviewCard>
        </div>

        {/* ==================== 操作按钮 ==================== */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            返回修改
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || hasErrors} variant="primary">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                处理中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                确认创建
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
