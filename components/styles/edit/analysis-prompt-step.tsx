import { Eye } from 'lucide-react'
import { PromptPreviewDialog } from '@/components/styles/prompt-preview-dialog'
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from '@/components/ui'
import type { StyleFormData } from './types'

interface AnalysisPromptStepProps {
  formData: StyleFormData
  setFormData: (data: StyleFormData) => void
  styleId: string
  isNewStyle: boolean
}

export function AnalysisPromptStep({
  formData,
  setFormData,
  styleId,
  isNewStyle,
}: AnalysisPromptStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-claude-dark-900">剪辑提示词创意层</h3>
        <p className="text-sm text-claude-dark-400 mb-6">
          编写视频分析的创意层内容。这是您风格的核心，定义了 AI
          如何理解和分析视频。系统会自动添加参数层(输入信息、输出格式等)。
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="analysis-creative">
            创意层内容 <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="analysis-creative"
            placeholder="例如:&#10;# AI科技解说导演&#10;&#10;你是一位精通科技内容的顶尖解说导演，擅长将复杂的技术概念转化为通俗易懂的叙事...&#10;&#10;## 剪辑心法&#10;- 突出技术要点&#10;- 保持逻辑连贯&#10;- 控制信息密度..."
            value={formData.analysis_creative_layer}
            onChange={(e) => setFormData({ ...formData, analysis_creative_layer: e.target.value })}
            rows={20}
            className="font-mono text-sm rounded-xl"
          />
          <p className="text-xs text-claude-dark-300">
            提示:使用 Markdown 格式编写，清晰描述您的导演守则、剪辑心法、叙事方法等创意内容
          </p>
        </div>

        <Card className="claude-card bg-claude-orange-50/80 border-claude-orange-200/80">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-claude-orange-700">
              💡 双层架构说明
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-claude-orange-700 space-y-3">
            <p className="leading-relaxed">
              <strong>创意层</strong>(您正在编写):定义风格个性、导演守则、剪辑心法
            </p>
            <p className="leading-relaxed">
              <strong>参数层</strong>(系统自动添加):包含视频数量、分镜数量、输出格式等技术参数
            </p>
            <p className="leading-relaxed pt-1">最终发送给 AI 的提示词 = 您的创意层 + 系统参数层</p>
          </CardContent>
        </Card>
      </div>

      {/* 提示词预览 */}
      {formData.analysis_creative_layer.trim() && (
        <div className="mt-6">
          <PromptPreviewDialog
            trigger={
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                预览完整提示词（创意层 + 参数层）
              </Button>
            }
            title="剪辑提示词完整预览"
            styleId={isNewStyle ? 'new' : styleId}
            type="analysis"
            analysisCreativeLayer={formData.analysis_creative_layer}
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
      )}
    </div>
  )
}
