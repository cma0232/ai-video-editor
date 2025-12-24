export interface ApiKeyStatus {
  service: string
  is_configured: boolean
  is_verified: boolean
  verified_at: number | null
}

export interface ServiceMessage {
  type: 'success' | 'error'
  text: string
}

export type Platform = 'vertex' | 'ai-studio'
