'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ApiTokenManager } from '@/components/settings/api-token-manager'
import { FishAudioConfig } from '@/components/settings/fish-audio-config'
import { GCSConfig } from '@/components/settings/gcs-config'
import { GeminiAIStudioConfig } from '@/components/settings/gemini-ai-studio-config'
import { GeminiVertexConfig } from '@/components/settings/gemini-vertex-config'
import { StatusBadge, StatusChip } from '@/components/settings/status-badge'
import { StorageCleanup } from '@/components/settings/storage-cleanup'
import { SystemConfig } from '@/components/settings/system-config'
import { TTSConfig } from '@/components/settings/tts-config'
import type { ApiKeyStatus, ServiceMessage } from '@/components/settings/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { CONFIG_DEFAULTS } from '@/lib/config'
import type {
  ApiKeyService,
  GeminiAIStudioCredentials,
  GeminiVertexCredentials,
  GoogleStorageCredentials,
} from '@/types'

export default function SettingsPage() {
  const [statuses, setStatuses] = useState<ApiKeyStatus[]>([])
  const [savingService, setSavingService] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<ApiKeyService, ServiceMessage | null>>({
    google_vertex: null,
    google_ai_studio: null,
    fish_audio_vertex: null,
    fish_audio_ai_studio: null,
    google_storage: null,
  })

  // 系统设置状态
  const [systemConfigStatus, setSystemConfigStatus] = useState({
    gemini_model_configured: false,
    api_tokens_configured: false,
    concurrency_configured: false,
  })

  // Gemini Vertex AI
  const [geminiVertex, setGeminiVertex] = useState<GeminiVertexCredentials>({
    project_id: '',
    model_id: CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL,
    location: CONFIG_DEFAULTS.DEFAULT_GEMINI_LOCATION,
    service_account_json: '',
  })

  // Gemini AI Studio
  const [geminiAIStudio, setGeminiAIStudio] = useState<GeminiAIStudioCredentials>({
    api_key: '',
    model_id: CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL,
  })

  // Fish Audio Vertex AI
  const [fishAudioVertexKey, setFishAudioVertexKey] = useState('')

  // Fish Audio AI Studio
  const [fishAudioAIStudioKey, setFishAudioAIStudioKey] = useState('')

  // Google Storage
  const [googleStorage, setGoogleStorage] = useState<GoogleStorageCredentials>({
    service_account_json: '',
    bucket_name: '',
  })

  const updateMessage = (
    service: ApiKeyService | 'system_config',
    value: ServiceMessage | null,
  ) => {
    setMessages((prev) => ({ ...prev, [service]: value }))
  }

  const _normalizeVertexCredentials = (
    data: Partial<GeminiVertexCredentials>,
  ): GeminiVertexCredentials => ({
    project_id: data.project_id || '',
    model_id: (data.model_id || CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL).replace(/^models\//, ''),
    location: data.location || CONFIG_DEFAULTS.DEFAULT_GEMINI_LOCATION,
    service_account_json: data.service_account_json || '',
  })

  const _normalizeAIStudioCredentials = (
    data: Partial<GeminiAIStudioCredentials>,
  ): GeminiAIStudioCredentials => ({
    api_key: data.api_key || '',
    model_id: (data.model_id || CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL).replace(/^models\//, ''),
  })

  const fetchStatuses = async () => {
    try {
      const response = await fetch('/api/api-keys')
      // 401/其他错误静默处理（未登录或测试环境）
      if (!response.ok) {
        setStatuses([])
        return
      }
      const data = await response.json()
      setStatuses(data.keys || [])
    } catch {
      // 静默处理
      setStatuses([])
    }
  }

  const loadSavedCredentials = async () => {
    // 安全修复：不再从 API 获取凭证填充表单
    // 凭证现在只返回脱敏预览，用于显示配置状态
    // 用户如需修改凭证，需要重新输入完整值
    // 这符合安全最佳实践：敏感凭证不应在前端展示或传输
  }

  const loadSystemConfigStatus = async () => {
    try {
      // 检查 Gemini 模型配置
      const configsRes = await fetch('/api/configs')
      const configsData = await configsRes.json()
      const configs = configsData.configs || {}

      const geminiModel = configs.default_gemini_model || ''
      const concurrency = configs.max_concurrent_scenes || ''

      // 检查 API Token（容错处理：表可能不存在）
      let hasTokens = false
      try {
        const tokensRes = await fetch('/api/auth/tokens')
        if (tokensRes.ok) {
          const tokensData = await tokensRes.json()
          hasTokens = (tokensData.tokens || []).length > 0
        }
      } catch {
        // API Token 检查失败，默认为未配置
      }

      setSystemConfigStatus({
        gemini_model_configured: geminiModel.trim() !== '',
        api_tokens_configured: hasTokens,
        concurrency_configured: concurrency.trim() !== '',
      })
    } catch {
      // 静默处理
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: 初始化加载，只需执行一次
  useEffect(() => {
    fetchStatuses()
    loadSavedCredentials()
    loadSystemConfigStatus()
  }, [])

  const stripModelPrefix = (value: string) => value.replace(/^models\//, '')

  const handleSaveGeminiVertex = async () => {
    const trimmedProjectId = geminiVertex.project_id.trim()
    const trimmedModelId = stripModelPrefix(
      geminiVertex.model_id.trim() || CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL,
    )
    const normalizedLocation =
      (geminiVertex.location || '').trim() || CONFIG_DEFAULTS.DEFAULT_GEMINI_LOCATION
    const serviceAccount = geminiVertex.service_account_json.trim()

    if (!trimmedProjectId || !trimmedModelId || !serviceAccount) {
      updateMessage('google_vertex', {
        type: 'error',
        text: '请填写 Project ID、Model ID 与 Service Account JSON。',
      })
      return
    }

    try {
      JSON.parse(serviceAccount)
    } catch {
      updateMessage('google_vertex', { type: 'error', text: 'Service Account JSON 格式不正确。' })
      return
    }

    const payload: GeminiVertexCredentials = {
      project_id: trimmedProjectId,
      model_id: trimmedModelId,
      location: normalizedLocation,
      service_account_json: serviceAccount,
    }

    setGeminiVertex(payload)
    updateMessage('google_vertex', null)
    setSavingService('google_vertex')

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'google_vertex', credentials: payload }),
      })

      const result = await response.json()

      if (response.ok) {
        updateMessage('google_vertex', {
          type: 'success',
          text: 'Google Vertex AI 凭据保存成功并已验证。',
        })
        await fetchStatuses()
      } else {
        updateMessage('google_vertex', {
          type: 'error',
          text: result.message || result.error || '保存失败，请稍后再试。',
        })
      }
    } catch (error: unknown) {
      updateMessage('google_vertex', {
        type: 'error',
        text: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
      })
    } finally {
      setSavingService(null)
    }
  }

  const handleSaveGeminiAIStudio = async () => {
    const trimmedApiKey = geminiAIStudio.api_key.trim()
    const trimmedModelId = stripModelPrefix(
      geminiAIStudio.model_id.trim() || CONFIG_DEFAULTS.DEFAULT_GEMINI_MODEL,
    )

    if (!trimmedApiKey || !trimmedModelId) {
      updateMessage('google_ai_studio', { type: 'error', text: '请填写 API Key 和 Model ID。' })
      return
    }

    const payload: GeminiAIStudioCredentials = {
      api_key: trimmedApiKey,
      model_id: trimmedModelId,
    }

    setGeminiAIStudio(payload)
    updateMessage('google_ai_studio', null)
    setSavingService('google_ai_studio')

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'google_ai_studio', credentials: payload }),
      })

      const result = await response.json()

      if (response.ok) {
        updateMessage('google_ai_studio', {
          type: 'success',
          text: 'Google AI Studio 凭据保存成功并已验证。',
        })
        await fetchStatuses()
      } else {
        updateMessage('google_ai_studio', {
          type: 'error',
          text: result.message || result.error || '保存失败，请稍后再试。',
        })
      }
    } catch (error: unknown) {
      updateMessage('google_ai_studio', {
        type: 'error',
        text: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
      })
    } finally {
      setSavingService(null)
    }
  }

  // Fish Audio 保存处理（只需 API Key）
  const createFishAudioSaveHandler =
    (serviceName: 'fish_audio_vertex' | 'fish_audio_ai_studio', apiKey: string) => async () => {
      const trimmedKey = apiKey.trim()
      if (!trimmedKey) {
        updateMessage(serviceName, { type: 'error', text: '请输入 API Key' })
        return
      }

      updateMessage(serviceName, null)
      setSavingService(serviceName)

      try {
        const response = await fetch('/api/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: serviceName,
            credentials: { api_key: trimmedKey },
          }),
        })

        const result = await response.json()

        if (response.ok) {
          const verificationMessage = result.verification?.message as string | undefined
          updateMessage(serviceName, {
            type: 'success',
            text: verificationMessage || 'Fish Audio API Key 保存成功并已验证',
          })
          await fetchStatuses()
        } else {
          updateMessage(serviceName, {
            type: 'error',
            text: result.message || result.verification?.message || result.error || '验证失败',
          })
        }
      } catch (error: unknown) {
        updateMessage(serviceName, {
          type: 'error',
          text: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
        })
      } finally {
        setSavingService(null)
      }
    }

  // Google Storage 保存处理
  const createGCSSaveHandler =
    (credentials: GoogleStorageCredentials, requiredFields: string[], successMessage: string) =>
    async () => {
      const missingFields = requiredFields.filter(
        (field) => !credentials[field as keyof typeof credentials],
      )
      if (missingFields.length > 0) {
        updateMessage('google_storage', { type: 'error', text: '请填写完整的配置信息。' })
        return
      }

      try {
        JSON.parse(credentials.service_account_json)
      } catch {
        updateMessage('google_storage', {
          type: 'error',
          text: 'Service Account JSON 格式不正确。',
        })
        return
      }

      updateMessage('google_storage', null)
      setSavingService('google_storage')

      try {
        const response = await fetch('/api/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service: 'google_storage', credentials }),
        })

        const result = await response.json()

        if (response.ok) {
          const verificationMessage = result.verification?.message as string | undefined
          updateMessage('google_storage', {
            type: 'success',
            text: verificationMessage
              ? `${successMessage}${verificationMessage}`
              : `${successMessage}保存成功并已验证`,
          })
          await fetchStatuses()
        } else {
          updateMessage('google_storage', {
            type: 'error',
            text:
              result.message ||
              result.verification?.message ||
              result.error ||
              '保存失败，请稍后再试。',
          })
        }
      } catch (error: unknown) {
        updateMessage('google_storage', {
          type: 'error',
          text: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
        })
      } finally {
        setSavingService(null)
      }
    }

  const handleSystemConfigSave = async () => {
    // 重新加载系统配置状态
    await loadSystemConfigStatus()
  }

  return (
    <div className="flex flex-col bg-linear-to-br from-claude-cream-50/30 via-white to-claude-cream-100/50 min-h-screen">
      <PageHeader
        title="密钥与服务设置"
        description="配置 Gemini、Fish Audio 等服务。AI Studio 和 Vertex AI 两种模式的配置完全独立。"
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
            <TabsTrigger
              value="system"
              className="text-base data-[state=active]:bg-claude-orange-500 data-[state=active]:text-white"
            >
              系统设置
            </TabsTrigger>
            <TabsTrigger
              value="ai-studio"
              className="text-base data-[state=active]:bg-claude-orange-500 data-[state=active]:text-white"
            >
              Google AI Studio 配置
            </TabsTrigger>
            <TabsTrigger
              value="vertex"
              className="text-base data-[state=active]:bg-claude-orange-500 data-[state=active]:text-white"
            >
              Google Vertex 配置
            </TabsTrigger>
          </TabsList>

          {/* ========== 系统设置标签页 ========== */}
          <TabsContent value="system" className="space-y-6">
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-claude-dark-400">系统配置状态</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center justify-between rounded-lg border border-claude-dark-300/20 bg-white px-4 py-3">
                  <span className="text-sm font-medium text-claude-dark-700">Gemini 模型配置</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      systemConfigStatus.gemini_model_configured
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {systemConfigStatus.gemini_model_configured ? '已配置' : '未配置'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-claude-dark-300/20 bg-white px-4 py-3">
                  <span className="text-sm font-medium text-claude-dark-700">API Token 管理</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      systemConfigStatus.api_tokens_configured
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {systemConfigStatus.api_tokens_configured ? '已配置' : '未配置'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-claude-dark-300/20 bg-white px-4 py-3">
                  <span className="text-sm font-medium text-claude-dark-700">并发设置</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      systemConfigStatus.concurrency_configured
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {systemConfigStatus.concurrency_configured ? '已配置' : '未配置'}
                  </span>
                </div>
              </div>
            </div>

            <SystemConfig onConfigChange={handleSystemConfigSave} />
            <TTSConfig onConfigChange={handleSystemConfigSave} />
            <StorageCleanup />
            <ApiTokenManager onTokenChange={loadSystemConfigStatus} />
          </TabsContent>

          {/* ========== Vertex AI 配置标签页 ========== */}
          <TabsContent value="vertex" className="space-y-6">
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-claude-dark-400">服务配置状态</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatusChip
                  label="google_vertex"
                  badge={<StatusBadge service="google_vertex" statuses={statuses} />}
                />
                <StatusChip
                  label="google_storage"
                  badge={<StatusBadge service="google_storage" statuses={statuses} />}
                />
                <StatusChip
                  label="fish_audio_vertex"
                  badge={<StatusBadge service="fish_audio_vertex" statuses={statuses} />}
                />
              </div>
            </div>

            <GeminiVertexConfig
              credentials={geminiVertex}
              setCredentials={setGeminiVertex}
              onSave={handleSaveGeminiVertex}
              message={messages.google_vertex}
              isSaving={savingService === 'google_vertex'}
            />

            <GCSConfig
              credentials={googleStorage}
              setCredentials={setGoogleStorage}
              onSave={createGCSSaveHandler(
                googleStorage,
                ['service_account_json', 'bucket_name'],
                'Google Storage 配置',
              )}
              message={messages.google_storage}
              isSaving={savingService === 'google_storage'}
            />

            <FishAudioConfig
              apiKey={fishAudioVertexKey}
              setApiKey={setFishAudioVertexKey}
              onSave={createFishAudioSaveHandler('fish_audio_vertex', fishAudioVertexKey)}
              message={messages.fish_audio_vertex}
              isSaving={savingService === 'fish_audio_vertex'}
              platform="vertex"
            />
          </TabsContent>

          {/* ========== AI Studio 配置标签页 ========== */}
          <TabsContent value="ai-studio" className="space-y-6">
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-claude-dark-400">服务配置状态</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatusChip
                  label="google_ai_studio"
                  badge={<StatusBadge service="google_ai_studio" statuses={statuses} />}
                />
                <StatusChip
                  label="fish_audio_ai_studio"
                  badge={<StatusBadge service="fish_audio_ai_studio" statuses={statuses} />}
                />
              </div>
            </div>

            <GeminiAIStudioConfig
              credentials={geminiAIStudio}
              setCredentials={setGeminiAIStudio}
              onSave={handleSaveGeminiAIStudio}
              message={messages.google_ai_studio}
              isSaving={savingService === 'google_ai_studio'}
            />

            <FishAudioConfig
              apiKey={fishAudioAIStudioKey}
              setApiKey={setFishAudioAIStudioKey}
              onSave={createFishAudioSaveHandler('fish_audio_ai_studio', fishAudioAIStudioKey)}
              message={messages.fish_audio_ai_studio}
              isSaving={savingService === 'fish_audio_ai_studio'}
              platform="ai-studio"
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
