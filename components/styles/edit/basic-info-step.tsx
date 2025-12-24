import { Input, Label, Textarea } from '@/components/ui'
import type { StyleFormData } from './types'

interface BasicInfoStepProps {
  formData: StyleFormData
  setFormData: (data: StyleFormData) => void
}

export function BasicInfoStep({ formData, setFormData }: BasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-claude-dark-900">基本信息</h3>
        <p className="text-sm text-claude-dark-400 mb-6">
          填写风格的名称和描述，这将帮助您在创建任务时快速识别和选择合适的风格。
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            风格名称 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="例如:科技解说、搞笑剪辑、美食教程"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">风格描述</Label>
          <Textarea
            id="description"
            placeholder="简要描述这个风格的特点、适用场景和目标受众..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="rounded-xl"
          />
          <p className="text-xs text-claude-dark-300">
            例如:适合科技类视频的专业解说风格，强调逻辑性和信息密度
          </p>
        </div>
      </div>
    </div>
  )
}
