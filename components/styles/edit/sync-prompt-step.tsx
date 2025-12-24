import { Eye } from 'lucide-react'
import { PromptPreviewDialog } from '@/components/styles/prompt-preview-dialog'
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from '@/components/ui'
import type { StyleFormData } from './types'

interface SyncPromptStepProps {
  formData: StyleFormData
  setFormData: (data: StyleFormData) => void
  styleId: string
  isNewStyle: boolean
}

export function SyncPromptStep({
  formData,
  setFormData,
  styleId,
  isNewStyle,
}: SyncPromptStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-claude-dark-900">音画同步提示词创意层</h3>
        <p className="text-sm text-claude-dark-400 mb-6">
          编写音画同步的创意层内容(可选)。如果留空，系统会使用默认创意层。系统会自动添加参数层(分镜信息、时长要求、语速方案等)。
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="audio-sync-creative">创意层内容(可选)</Label>
          <Textarea
            id="audio-sync-creative"
            placeholder="例如:&#10;# 科技风格旁白优化大师&#10;&#10;你是一位专业的科技内容旁白优化师...&#10;&#10;## 优化原则&#10;- 保持专业术语准确性&#10;- 适当添加通俗化解释&#10;- 控制语速和节奏..."
            value={formData.audio_sync_creative_layer}
            onChange={(e) =>
              setFormData({ ...formData, audio_sync_creative_layer: e.target.value })
            }
            rows={20}
            className="font-mono text-sm rounded-xl"
          />
          <p className="text-xs text-claude-dark-300">
            留空则使用系统默认创意层。自定义创意层可以让旁白更符合您的风格定位。
          </p>
        </div>

        <Card className="claude-card bg-amber-50/80 border-amber-200/80">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-amber-900">ℹ️ 可选字段说明</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-800 space-y-3">
            <p className="leading-relaxed">
              如果您的风格对旁白有特殊要求(如特定的表达方式、术语处理、节奏控制等)，建议填写此字段。
            </p>
            <p className="leading-relaxed">
              如果没有特殊要求，留空即可使用系统默认的音画同步创意层，同样能产生高质量的旁白。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 提示词预览 */}
      <div className="mt-6">
        <PromptPreviewDialog
          trigger={
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              预览完整提示词（创意层 + 参数层）
            </Button>
          }
          title="音画同步提示词完整预览"
          styleId={isNewStyle ? 'new' : styleId}
          type="audio_sync"
          audioSyncCreativeLayer={formData.audio_sync_creative_layer}
          config={{
            channel_name: formData.config.channel_name,
            min_duration: formData.config.duration_range.min,
            max_duration: formData.config.duration_range.max,
            speech_rate_v1: formData.config.speech_rates[0],
            speech_rate_v2: formData.config.speech_rates[1],
            speech_rate_v3: formData.config.speech_rates[2],
            original_audio_scene_count: formData.config.original_audio_scene_count || 0,
          }}
        />
        <p className="text-xs text-claude-dark-300 mt-2 text-center">
          点击按钮查看实际发送给 AI 的完整提示词（包含最新的参数层）
        </p>
      </div>
    </div>
  )
}
