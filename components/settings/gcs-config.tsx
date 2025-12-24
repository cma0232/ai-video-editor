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
import type { GoogleStorageCredentials } from '@/types'
import type { ServiceMessage } from './types'

const maskedTextSecurityStyle: CSSProperties & { WebkitTextSecurity?: string } = {
  WebkitTextSecurity: 'disc',
}

interface GCSConfigProps {
  credentials: GoogleStorageCredentials
  setCredentials: (creds: GoogleStorageCredentials) => void
  onSave: () => Promise<void>
  message: ServiceMessage | null
  isSaving: boolean
}

export function GCSConfig({
  credentials,
  setCredentials,
  onSave,
  message,
  isSaving,
}: GCSConfigProps) {
  const [showJson, setShowJson] = useState(false)
  const [validationOutput, setValidationOutput] = useState<string | null>(null)
  const [validationStep, setValidationStep] = useState<string | null>(null)

  const handleSaveWithValidation = async () => {
    const serviceAccountJson = credentials.service_account_json.trim()
    const bucketName = credentials.bucket_name.trim()

    // 先清空之前的状态
    setValidationOutput(null)
    setValidationStep(null)

    // 基础校验
    if (!serviceAccountJson || !bucketName) {
      setValidationStep('基础校验失败：请填写完整的配置信息')
      return
    }

    try {
      JSON.parse(serviceAccountJson)
    } catch {
      setValidationStep('基础校验失败：Service Account JSON 格式不正确')
      return
    }

    // 第一步：测试上传功能
    setValidationStep('正在测试上传功能...')

    try {
      const response = await fetch('/api/google-storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket_name: bucketName,
          service_account_json: serviceAccountJson,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.publicUrl) {
        setValidationStep('上传测试失败')
        setValidationOutput(result.message || result.error || '无法上传测试文件到 GCS，请检查配置')
        return
      }

      // 测试成功，显示结果
      setValidationOutput(`测试上传成功：${result.publicUrl}`)
      setValidationStep('上传测试通过，正在保存配置...')

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
          Google Cloud Storage
        </CardTitle>
        <CardDescription className="text-sm text-claude-dark-300">
          Vertex AI 模式必需，用于上传视频供 Gemini 分析。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="storage-service-account">Service Account JSON</Label>
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
              id="storage-service-account"
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              value={credentials.service_account_json}
              onChange={(e) =>
                setCredentials({
                  ...credentials,
                  service_account_json: e.target.value,
                })
              }
              className="min-h-[120px] font-mono text-xs rounded-xl"
              style={showJson ? undefined : maskedTextSecurityStyle}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage-bucket">Bucket Name</Label>
            <Input
              id="storage-bucket"
              placeholder="your-storage-bucket"
              value={credentials.bucket_name}
              onChange={(e) => setCredentials({ ...credentials, bucket_name: e.target.value })}
              className="h-11"
            />
            <p className="text-xs text-claude-dark-300">
              建议使用区域型存储桶，配合生命周期管理定期清理中间结果文件。
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
