'use client'

import { type CSSProperties, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@/components/ui'
import { CONFIG_DEFAULTS } from '@/lib/config'
import type { GeminiVertexCredentials } from '@/types'
import type { ServiceMessage } from './types'

/** Webkit 专有属性，用于输入内容掩码显示 */
const maskedTextSecurityStyle: CSSProperties & { WebkitTextSecurity?: string } = {
  WebkitTextSecurity: 'disc',
}

/** Gemini Vertex AI 配置表单 */
interface GeminiVertexConfigProps {
  credentials: GeminiVertexCredentials
  setCredentials: (creds: GeminiVertexCredentials) => void
  onSave: () => Promise<void>
  message: ServiceMessage | null
  isSaving: boolean
}

export function GeminiVertexConfig({
  credentials,
  setCredentials,
  onSave,
  message,
  isSaving,
}: GeminiVertexConfigProps) {
  const [showJson, setShowJson] = useState(false)
  const [validationOutput, setValidationOutput] = useState<string | null>(null)
  const [validationStep, setValidationStep] = useState<string | null>(null)

  const _stripModelPrefix = (value: string) => value.replace(/^models\//, '')

  const handleSaveWithValidation = async () => {
    const projectId = credentials.project_id.trim()
    const serviceAccountJson = credentials.service_account_json.trim()
    const location = (credentials.location || '').trim()

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

    setValidationOutput(null)
    setValidationStep(null)

    if (!projectId || !serviceAccountJson) {
      setValidationStep('基础校验失败：请填写完整的配置信息')
      return
    }

    try {
      JSON.parse(serviceAccountJson)
    } catch {
      setValidationStep('基础校验失败：Service Account JSON 格式不正确')
      return
    }

    setValidationStep('正在测试 API 连接...')

    try {
      const testPrompt = '你好'
      const response = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          location,
          model_id: modelId,
          service_account_json: serviceAccountJson,
          prompt: testPrompt,
          platform: 'vertex',
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.text || result.text.trim().length === 0) {
        setValidationStep('API 测试失败')
        setValidationOutput(result.message || result.error || '无法连接到 Gemini API，请检查配置')
        return
      }

      setValidationOutput(
        `测试响应：${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`,
      )
      setValidationStep('API 测试通过，正在保存配置...')
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
          Gemini Vertex AI
        </CardTitle>
        <CardDescription className="text-sm text-claude-dark-300">
          使用 GCP 服务账号调用 Vertex AI Gemini 模型，负责视频分镜分析与多版本旁白脚本生成。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="vertex-project-id">Project ID</Label>
            <Input
              id="vertex-project-id"
              placeholder="your-gcp-project-id"
              value={credentials.project_id}
              onChange={(e) => setCredentials({ ...credentials, project_id: e.target.value })}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vertex-location">Location</Label>
            <Input
              id="vertex-location"
              placeholder="global"
              value={credentials.location || ''}
              onChange={(e) => setCredentials({ ...credentials, location: e.target.value })}
              className="h-11"
            />
            <p className="text-xs text-claude-dark-300">
              Gemini 3 模型需使用 global 端点。如使用 Gemini 2.x，可填写其他区域如 us-central1。
              模型 ID 已移至「系统设置」标签页统一配置。
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vertex-service-account">Service Account JSON</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowJson(!showJson)}
              >
                {showJson ? '隐藏' : '显示'}
              </Button>
            </div>
            <Textarea
              id="vertex-service-account"
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              value={credentials.service_account_json}
              onChange={(e) =>
                setCredentials({ ...credentials, service_account_json: e.target.value })
              }
              className="min-h-[140px] font-mono text-xs rounded-xl"
              style={showJson ? undefined : maskedTextSecurityStyle}
            />
            <p className="text-xs text-claude-dark-300">
              建议使用具备 Vertex AI User 与 Storage Object Viewer 权限的服务账号。
            </p>
          </div>
        </div>

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

        <Button
          onClick={handleSaveWithValidation}
          disabled={isSaving}
          className="w-full sm:w-auto sm:min-w-[140px] bg-claude-orange-500 hover:bg-claude-orange-600 text-white"
        >
          {isSaving ? '验证并保存中...' : '验证并保存'}
        </Button>

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
