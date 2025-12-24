'use client'

import { useState } from 'react'
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
import type { Platform, ServiceMessage } from './types'

interface FishAudioConfigProps {
  apiKey: string
  setApiKey: (key: string) => void
  onSave: () => Promise<void>
  message: ServiceMessage | null
  isSaving: boolean
  platform: Platform
}

export function FishAudioConfig({
  apiKey,
  setApiKey,
  onSave,
  message,
  isSaving,
  platform,
}: FishAudioConfigProps) {
  const [showKey, setShowKey] = useState(false)

  const platformLabel = platform === 'vertex' ? 'Vertex AI' : 'AI Studio'

  return (
    <Card className="claude-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold text-claude-dark-900">
          Fish Audio（{platformLabel}）
        </CardTitle>
        <CardDescription className="text-sm text-claude-dark-300">
          高质量 AI 配音服务，输入 API Key 即可验证连接
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`fish-${platform}-key`}>API Key</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
              {showKey ? '隐藏' : '显示'}
            </Button>
          </div>
          <Input
            id={`fish-${platform}-key`}
            type={showKey ? 'text' : 'password'}
            placeholder="sk_live_xxxxxxxxxxxxx"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="h-11"
          />
          <p className="text-xs text-claude-dark-300">
            从 Fish Audio 控制台获取 API Key，验证时使用默认测试音色
          </p>
        </div>

        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full sm:w-auto sm:min-w-[140px] sm:ml-auto bg-claude-orange-500 hover:bg-claude-orange-600 text-white"
        >
          {isSaving ? '验证中...' : '验证并保存'}
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
