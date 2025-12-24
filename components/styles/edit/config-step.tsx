import { Input, Label } from '@/components/ui'
import type { StyleFormData } from './types'

interface ConfigStepProps {
  formData: StyleFormData
  setFormData: (data: StyleFormData) => void
}

export function ConfigStep({ formData, setFormData }: ConfigStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-claude-dark-900">高级配置</h3>
        <p className="text-sm text-claude-dark-400 mb-6">
          配置参数层的各项设置。这些参数将与创意层组合，形成完整的提示词发送给 AI。
        </p>
      </div>

      <div className="space-y-6">
        {/* 基础参数 */}
        <div className="space-y-4">
          <h4 className="font-medium text-claude-dark-900">基础参数</h4>

          <div className="space-y-2">
            <Label htmlFor="channel-name">
              频道名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="channel-name"
              placeholder="例如:科技大观"
              value={formData.config.channel_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, channel_name: e.target.value },
                })
              }
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-claude-dark-300">频道名称将用于 AI 分析视频时的上下文理解</p>
          </div>
        </div>

        {/* 时长参数 */}
        <div className="space-y-4">
          <h4 className="font-medium text-claude-dark-900">分镜时长范围(秒)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration-min">最小时长</Label>
              <Input
                id="duration-min"
                type="number"
                min="1"
                max="60"
                step="0.5"
                value={formData.config.duration_range.min}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      duration_range: {
                        ...formData.config.duration_range,
                        min: Number.parseFloat(e.target.value),
                      },
                    },
                  })
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration-max">最大时长</Label>
              <Input
                id="duration-max"
                type="number"
                min="1"
                max="60"
                step="0.5"
                value={formData.config.duration_range.max}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      duration_range: {
                        ...formData.config.duration_range,
                        max: Number.parseFloat(e.target.value),
                      },
                    },
                  })
                }
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <p className="text-xs text-claude-dark-300">
            每个分镜的理想时长范围，影响旁白生成和音画同步
          </p>
        </div>

        {/* 语速参数 */}
        <div className="space-y-4">
          <h4 className="font-medium text-claude-dark-900">语速方案(字/秒)</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="speech-rate-v1">方案 1(慢速)</Label>
              <Input
                id="speech-rate-v1"
                type="number"
                min="2"
                max="8"
                step="0.1"
                value={formData.config.speech_rates[0]}
                onChange={(e) => {
                  const newRates = [...formData.config.speech_rates]
                  newRates[0] = Number.parseFloat(e.target.value)
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      speech_rates: newRates as [number, number, number],
                    },
                  })
                }}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="speech-rate-v2">方案 2(中速)</Label>
              <Input
                id="speech-rate-v2"
                type="number"
                min="2"
                max="8"
                step="0.1"
                value={formData.config.speech_rates[1]}
                onChange={(e) => {
                  const newRates = [...formData.config.speech_rates]
                  newRates[1] = Number.parseFloat(e.target.value)
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      speech_rates: newRates as [number, number, number],
                    },
                  })
                }}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="speech-rate-v3">方案 3(快速)</Label>
              <Input
                id="speech-rate-v3"
                type="number"
                min="2"
                max="8"
                step="0.1"
                value={formData.config.speech_rates[2]}
                onChange={(e) => {
                  const newRates = [...formData.config.speech_rates]
                  newRates[2] = Number.parseFloat(e.target.value)
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      speech_rates: newRates as [number, number, number],
                    },
                  })
                }}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <p className="text-xs text-claude-dark-300">
            系统会生成 3 个不同语速的旁白版本，选择最适合视频时长的方案
          </p>
        </div>
      </div>
    </div>
  )
}
