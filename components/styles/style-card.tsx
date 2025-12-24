import { Edit2, Eye, Loader2, Trash2 } from 'lucide-react'
import { StyleFullPreviewDialog } from '@/components/styles/style-full-preview-dialog'
import { Button } from '@/components/ui'

interface StyleCardProps {
  id: string
  name: string
  description: string | null
  channelName: string
  originalAudioSceneCount: number
  isBuiltin: boolean
  isDeleting?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function StyleCard({
  id,
  name,
  description,
  channelName,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: 保留以向后兼容，新预览组件从 API 获取
  originalAudioSceneCount,
  isBuiltin,
  isDeleting = false,
  onEdit,
  onDelete,
}: StyleCardProps) {
  return (
    <div className="border border-claude-cream-200/80 rounded-xl p-4 bg-white/50 hover:bg-white/80 hover:border-claude-cream-200 hover:shadow-xs transition-all h-full flex flex-col min-h-[180px]">
      {/* 内容区 - 自动填充 */}
      <div className="flex-1">
        <h3 className="font-medium text-claude-dark-900 mb-2">{name}</h3>
        <p className="text-sm text-claude-dark-300 mb-3 line-clamp-2">
          {description || '暂无描述'}
        </p>
        <div className="flex flex-col gap-1 text-xs text-claude-dark-400">
          <span className="truncate">频道：{channelName}</span>
        </div>
      </div>

      {/* 操作按钮 - 固定底部 */}
      <div className="flex items-center gap-2 mt-auto pt-3">
        {/* 预览按钮（所有风格都可用） */}
        <StyleFullPreviewDialog
          styleId={id}
          trigger={
            <Button variant="outline" size="sm" className="flex-1 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              预览
            </Button>
          }
        />

        {/* 自定义风格的编辑和删除按钮 */}
        {!isBuiltin && onEdit && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 flex items-center gap-1 border-claude-orange-200 text-claude-orange-600 hover:bg-claude-orange-50 hover:border-claude-orange-300"
            onClick={() => onEdit(id)}
          >
            <Edit2 className="h-3 w-3" />
            编辑
          </Button>
        )}
        {!isBuiltin && onDelete && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300"
            onClick={() => onDelete(id)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            删除
          </Button>
        )}
      </div>
    </div>
  )
}
