// API密钥服务类型
export type ApiKeyService =
  // Google 配置
  | 'google_vertex' // Vertex AI 模式（企业级）
  | 'google_ai_studio' // AI Studio 模式（个人用户）
  // Fish Audio 配置（两个平台独立）
  | 'fish_audio_vertex' // Vertex AI 模式的 Fish Audio
  | 'fish_audio_ai_studio' // AI Studio 模式的 Fish Audio
  // Google Cloud Storage（仅 Vertex AI）
  | 'google_storage'

// API密钥凭据
export interface ApiKeyCredentials {
  [key: string]: string
}

// Gemini Vertex AI 凭据（企业级）
export interface GeminiVertexCredentials {
  project_id: string
  model_id: string
  location?: string
  service_account_json: string // JSON字符串
}

// Gemini AI Studio 凭据（个人用户）
export interface GeminiAIStudioCredentials {
  api_key: string // 从 aistudio.google.com 获取
  model_id: string // 如 gemini-2.5-pro
}

// Fish Audio凭据
export interface FishAudioCredentials {
  api_key: string
  voice_id?: string // 验证时使用默认音色，实际使用时由任务配置指定
  model_id?: string
}

// Google Storage凭据
export interface GoogleStorageCredentials {
  service_account_json: string // JSON字符串
  bucket_name: string
}

// API密钥记录
export interface ApiKey {
  id: number
  service: ApiKeyService
  key_data: string // 加密后的JSON字符串
  is_verified: boolean
  verified_at: number | null
  created_at: number
  updated_at: number
}

// API密钥状态
export interface ApiKeyStatus {
  service: ApiKeyService
  is_configured: boolean
  is_verified: boolean
  verified_at: number | null
}
