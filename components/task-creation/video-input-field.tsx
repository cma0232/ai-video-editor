'use client'

import { Link as LinkIcon, Upload } from 'lucide-react'
import { Input, Label } from '@/components/ui'
import { VIDEO_FORMATS } from '@/lib/constants/video'
import type { VideoInputMode, VideoUploadState } from '@/types'
import { VideoUploader } from './video-uploader'

// ============================================================================
// 视频输入字段组件
// 支持本地上传和 URL 输入两种方式（纯受控模式）
// ============================================================================

interface VideoInputFieldProps {
  /** 字段标签 */
  label: string
  /** 字段 ID */
  id: string
  /** 视频 URL 值 */
  value: string
  /** URL 变化回调 */
  onChange: (value: string) => void
  /** 上传平台 */
  platform: 'vertex' | 'ai-studio'
  /** Placeholder 文本 */
  placeholder?: string
  /** 是否必填 */
  required?: boolean
  /** 验证错误信息 */
  error?: string
  /** 嵌入模式：不显示外层卡片边框（用于多视频模式） */
  embedded?: boolean
  /** 已上传的文件名 */
  uploadedFilename?: string
  /** 文件名变化回调 */
  onFilenameChange?: (filename: string) => void
  /** 本地路径变化回调（仅 AI Studio 模式有值，FFmpeg 用） */
  onLocalPathChange?: (localPath: string | undefined) => void
  /** 当前输入模式 */
  inputMode?: VideoInputMode
  /** 输入模式变化回调 */
  onModeChange?: (mode: VideoInputMode) => void
  /** 清空已上传视频回调 */
  onClear?: () => void
  /** 上传状态 */
  uploadState?: VideoUploadState
  /** 上传状态变化回调 */
  onUploadStateChange?: (state: VideoUploadState) => void
  /** 取消上传回调 */
  onCancelUpload?: () => void
  /** 开始上传回调，返回 XHR 引用给父组件管理 */
  onStartUpload?: (xhr: XMLHttpRequest) => void
  /** 是否支持多文件选择（队列模式） */
  multiple?: boolean
  /** 多文件选择回调（队列模式使用） */
  onFilesSelected?: (files: File[]) => void
  /** 允许在上传中继续选择文件加入队列（队列模式使用） */
  allowQueueAdd?: boolean
}

export function VideoInputField({
  label,
  id,
  value,
  onChange,
  platform,
  placeholder = '',
  required = false,
  error,
  embedded = false,
  uploadedFilename = '',
  onFilenameChange,
  onLocalPathChange,
  inputMode = 'upload',
  onModeChange,
  onClear,
  uploadState,
  onUploadStateChange,
  onCancelUpload,
  onStartUpload,
  multiple = false,
  onFilesSelected,
  allowQueueAdd = false,
}: VideoInputFieldProps) {
  // 上传成功处理
  const handleUploadSuccess = (url: string, filename: string, localPath?: string) => {
    onChange(url)
    onFilenameChange?.(filename)
    onLocalPathChange?.(localPath)
  }

  // 上传失败处理
  const handleUploadError = (_errorMessage: string) => {
    onFilenameChange?.('')
  }

  return (
    <div className={embedded ? '' : 'space-y-2'}>
      {/* 字段标签 - 嵌入模式下不显示 */}
      {label && !embedded && (
        <Label htmlFor={id} className="text-sm font-medium text-claude-dark-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {/* 容器 - 根据 embedded 决定是否有边框 */}
      <div
        className={
          embedded ? '' : 'border border-claude-cream-200 rounded-xl overflow-hidden bg-white'
        }
      >
        {/* Tab 区域 */}
        <div
          className={`flex items-center gap-1 p-3 ${embedded ? 'pb-4' : 'bg-claude-cream-50 border-b border-claude-cream-200'}`}
        >
          <button
            type="button"
            onClick={() => onModeChange?.('upload')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
              ${
                inputMode === 'upload'
                  ? 'bg-white text-claude-dark-900 shadow-sm border border-claude-cream-200'
                  : 'text-claude-dark-400 hover:text-claude-dark-600 hover:bg-claude-cream-100/50'
              }
            `}
          >
            <Upload className="h-4 w-4" />
            本地上传
          </button>

          <button
            type="button"
            onClick={() => onModeChange?.('url')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
              ${
                inputMode === 'url'
                  ? 'bg-white text-claude-dark-900 shadow-sm border border-claude-cream-200'
                  : 'text-claude-dark-400 hover:text-claude-dark-600 hover:bg-claude-cream-100/50'
              }
            `}
          >
            <LinkIcon className="h-4 w-4" />
            URL 输入
          </button>
        </div>

        {/* 内容区域 - 固定高度防止切换时跳动 */}
        <div
          className={`h-[150px] flex flex-col tab-switch-animation ${embedded ? 'justify-start' : 'justify-center p-4'}`}
        >
          {inputMode === 'upload' ? (
            <VideoUploader
              platform={platform}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              uploadedFilename={uploadedFilename}
              onClear={onClear}
              uploadState={uploadState}
              onUploadStateChange={onUploadStateChange}
              onCancelUpload={onCancelUpload}
              onStartUpload={onStartUpload}
              multiple={multiple}
              onFilesSelected={onFilesSelected}
              allowQueueAdd={allowQueueAdd}
            />
          ) : (
            <div className="space-y-2">
              <Input
                id={id}
                type="url"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-claude-dark-400">{VIDEO_FORMATS.URL_HINT}</p>
            </div>
          )}
        </div>
      </div>

      {/* 验证错误 */}
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
    </div>
  )
}
