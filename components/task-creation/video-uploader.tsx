'use client'

import { AlertCircle, CheckCircle2, Upload, X } from 'lucide-react'
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadProgress } from '@/components/ui'
import {
  ACCEPTED_VIDEO_TYPES,
  FILE_SIZE_LIMITS,
  MAX_VIDEO_SIZE_DISPLAY,
  VIDEO_FORMATS,
} from '@/lib/constants/video'
import type { VideoUploadState } from '@/types'

interface VideoUploaderProps {
  /** 上传平台 */
  platform: 'vertex' | 'ai-studio'
  /** 上传成功回调（localPath 仅 AI Studio 模式有值） */
  onUploadSuccess: (url: string, filename: string, localPath?: string) => void
  /** 上传失败回调 */
  onUploadError?: (error: string) => void
  /** 已上传的文件名（用于显示） */
  uploadedFilename?: string
  /** 清空已上传文件回调 */
  onClear?: () => void
  /** 上传状态（受控模式，支持多视频并行上传） */
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

/**
 * 视频上传组件
 * 支持拖拽上传和点击上传
 * 支持受控模式，状态由父组件管理（支持多视频并行上传）
 */
export function VideoUploader({
  platform,
  onUploadSuccess,
  onUploadError,
  uploadedFilename,
  onClear,
  uploadState,
  onUploadStateChange,
  onCancelUpload,
  onStartUpload,
  multiple = false,
  onFilesSelected,
  allowQueueAdd = false,
}: VideoUploaderProps) {
  // 从 uploadState 获取状态，默认值
  const uploading = uploadState?.uploading ?? false
  const progress = uploadState?.progress ?? 0
  const error = uploadState?.error ?? ''
  const filename = uploadedFilename ?? ''

  // 文件上传函数
  const uploadFile = useCallback(
    async (file: File) => {
      // 通知父组件开始上传
      onUploadStateChange?.({ uploading: true, progress: 0 })

      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()

      // 通知父组件 XHR 引用（用于取消上传）
      onStartUpload?.(xhr)

      // 监听上传进度
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100
          onUploadStateChange?.({ uploading: true, progress: percent })
        }
      })

      // 监听上传完成
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.success) {
              onUploadStateChange?.({ uploading: false, progress: 100 })
              // localPath 仅 AI Studio 模式有值（FFmpeg 本地处理用）
              onUploadSuccess(response.url, response.filename || file.name, response.localPath)
            } else {
              const errorMsg = response.error || '上传失败'
              onUploadStateChange?.({ uploading: false, progress: 0, error: errorMsg })
              onUploadError?.(errorMsg)
            }
          } catch (_e: unknown) {
            const errorMsg = '解析响应失败'
            onUploadStateChange?.({ uploading: false, progress: 0, error: errorMsg })
            onUploadError?.(errorMsg)
          }
        } else {
          const errorMsg = `上传失败: HTTP ${xhr.status}`
          onUploadStateChange?.({ uploading: false, progress: 0, error: errorMsg })
          onUploadError?.(errorMsg)
        }
      })

      // 监听上传错误
      xhr.addEventListener('error', () => {
        const errorMsg = '网络错误，上传失败'
        onUploadStateChange?.({ uploading: false, progress: 0, error: errorMsg })
        onUploadError?.(errorMsg)
      })

      // 监听上传取消
      xhr.addEventListener('abort', () => {
        onUploadStateChange?.({ uploading: false, progress: 0 })
      })

      // 发送请求
      xhr.open('POST', '/api/upload/video')
      xhr.send(formData)
    },
    [onUploadSuccess, onUploadError, onUploadStateChange, onStartUpload],
  )

  // 文件验证
  const validateFile = useCallback(
    (file: File): string | null => {
      // 检查文件类型
      const validTypes = Object.keys(ACCEPTED_VIDEO_TYPES)
      if (!validTypes.includes(file.type)) {
        return '不支持的文件格式，请上传 MP4 格式的视频'
      }

      // 检查文件大小
      const maxSize = FILE_SIZE_LIMITS[platform]
      if (file.size > maxSize) {
        return `文件大小超过限制（${MAX_VIDEO_SIZE_DISPLAY}），请压缩视频后重试`
      }

      return null
    },
    [platform],
  )

  // Dropzone 配置
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      // 验证所有文件
      const validFiles: File[] = []
      for (const file of acceptedFiles) {
        const validationError = validateFile(file)
        if (validationError) {
          onUploadStateChange?.({ uploading: false, progress: 0, error: validationError })
          onUploadError?.(validationError)
          return // 任何一个文件无效则停止
        }
        validFiles.push(file)
      }

      // 队列模式：多文件选择时通知父组件
      if (multiple && onFilesSelected && validFiles.length > 0) {
        onFilesSelected(validFiles)
        return
      }

      // 单文件模式：直接上传
      if (validFiles.length > 0) {
        uploadFile(validFiles[0])
      }
    },
    [validateFile, uploadFile, onUploadError, onUploadStateChange, multiple, onFilesSelected],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_VIDEO_TYPES,
    multiple, // 支持多文件选择
    disabled: uploading && !allowQueueAdd, // 队列模式下允许继续选择文件
  })

  // 如果正在上传，显示进度
  if (uploading) {
    return (
      <UploadProgress
        filename={filename || '视频文件'}
        progress={progress}
        onCancel={onCancelUpload}
      />
    )
  }

  // 如果已上传成功，显示成功状态
  if (uploadedFilename) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-emerald-900 truncate">{uploadedFilename}</p>
          <p className="text-xs text-emerald-600">上传成功</p>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded-md hover:bg-emerald-100 text-emerald-600 hover:text-emerald-800 transition-colors"
            title="删除视频"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Dropzone 区域 */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-claude-orange-500 bg-claude-orange-50' : 'border-claude-orange-300 bg-claude-orange-50/30'}
          hover:border-claude-orange-500 hover:bg-claude-orange-50
        `}
      >
        <input {...getInputProps()} />

        <Upload
          className={`mx-auto h-6 w-6 mb-1 ${isDragActive ? 'text-claude-orange-600' : 'text-claude-orange-500'}`}
        />

        {isDragActive ? (
          <p className="text-sm font-medium text-claude-dark-900">松开鼠标上传视频</p>
        ) : (
          <>
            <p className="text-sm font-medium text-claude-dark-900 mb-1">
              {multiple ? '拖拽视频到这里或点击选择多个文件' : '拖拽视频到这里或点击上传'}
            </p>
            <p className="text-xs text-claude-dark-400">
              {VIDEO_FORMATS.DISPLAY}，最大 {VIDEO_FORMATS.MAX_SIZE}
              {multiple && '，支持批量选择'}
            </p>
          </>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
