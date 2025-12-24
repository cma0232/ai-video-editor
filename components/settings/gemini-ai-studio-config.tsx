'use client'

import { useState } from 'react'
// 优化后的配置组件：验证并保存流程
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ui'
import { CONFIG_DEFAULTS } from '@/lib/config'
import type { GeminiAIStudioCredentials } from '@/types'
import type { ServiceMessage } from './types'

interface GeminiAIStudioConfigProps {
  credentials: GeminiAIStudioCredentials
  setCredentials: (creds: GeminiAIStudioCredentials) => void
  onSave: () => Promise<void>
  message: ServiceMessage | null
  isSaving: boolean
}

export function GeminiAIStudioConfig({
  credentials,
  setCredentials,
  onSave,
  message,
  isSaving,
}: GeminiAIStudioConfigProps) {
  const [showKey, setShowKey] = useState(false)
  const [validationOutput, setValidationOutput] = useState<string | null>(null)
  const [validationStep, setValidationStep] = useState<string | null>(null)

  const _stripModelPrefix = (value: string) => value.replace(/^models\//, '')

  const handleSaveWithValidation = async () => {
    const apiKey = credentials.api_key.trim()

    // 从全局配置获取模型 ID（使用统一的 default_gemini_model 配置键）
    let modelId = CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL
    try {
      const configRes = await fetch('/api/configs')
      if (configRes.ok) {
        const configData = await configRes.json()
        modelId = configData.configs?.default_gemini_model || CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL
      }
    } catch (_err: unknown) {
      console.warn('Failed to load default model ID, using fallback')
    }

    // 先清空之前的状态
    setValidationOutput(null)
    setValidationStep(null)

    // 基础校验
    if (!apiKey) {
      setValidationStep('基础校验失败：请填写完整的配置信息')
      return
    }

    // 第一步：API 连接测试
    setValidationStep('正在测试 API 连接...')

    try {
      const testPrompt = '你好'
      const response = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          model_id: modelId,
          prompt: testPrompt,
          platform: 'ai-studio',
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error || !result.text || result.text.trim().length === 0) {
        setValidationStep('API 测试失败')
        setValidationOutput(
          result.error || result.message || '无法连接到 Gemini AI Studio，请检查 API Key',
        )
        return
      }

      // 测试成功，显示结果
      setValidationOutput(
        `测试响应：${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`,
      )
      setValidationStep('API 测试通过，正在保存配置...')

      // 第二步：保存配置
      await onSave()
    } catch (error: unknown) {
      setValidationStep('验证过程出错')
      setValidationOutput(error instanceof Error ? error.message : '未知错误')
    }
  }

  return (
    <Card className="claude-card lg:col-span-2">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold text-claude-dark-900">
          Gemini AI Studio
        </CardTitle>
        <CardDescription className="text-sm text-claude-dark-300">
          使用 API Key 调用 Google AI Studio Gemini 模型
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-studio-api-key">API Key</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
                {showKey ? '隐藏' : '显示'}
              </Button>
            </div>
            <Input
              id="ai-studio-api-key"
              type={showKey ? 'text' : 'password'}
              placeholder="AIza..."
              value={credentials.api_key}
              onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
              className="h-11"
            />
            <p className="text-xs text-claude-dark-300">
              从 Google AI Studio 获取 API Key。模型 ID 已移至「系统设置」标签页统一配置。
            </p>
          </div>
        </div>

        {/* 验证过程反馈 */}
        {validationStep && (
          <div className="rounded-lg border border-claude-cream-200 bg-claude-cream-50 p-3 max-w-2xl">
            <p className="text-sm font-medium text-claude-dark-900">{validationStep}</p>
            {validationOutput && (
              <p className="mt-2 text-xs text-claude-dark-600 whitespace-pre-wrap wrap-break-word">
                {validationOutput}
              </p>
            )}
          </div>
        )}

        {/* 保存按钮 */}
        <Button
          onClick={handleSaveWithValidation}
          disabled={isSaving}
          className="w-full sm:w-auto sm:min-w-[140px] bg-claude-orange-500 hover:bg-claude-orange-600 text-white"
        >
          {isSaving ? '验证并保存中...' : '验证并保存'}
        </Button>

        {/* 最终保存结果 */}
        {message && (
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
