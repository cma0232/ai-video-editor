'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Clock, Film, Loader2, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button, Label } from '@/components/ui'
import { VIDEO_FORMATS } from '@/lib/constants/video'
import type { UploadQueueItem, VideoInput, VideoInputMode, VideoUploadState } from '@/types'
import { VideoInputField } from '../video-input-field'

// ============================================================================
// 横向标签式视频列表组件
// 类似浏览器标签页，支持拖拽排序
// ============================================================================

interface VideoTabListProps {
  videos: VideoInput[]
  activeIndex: number
  onVideosChange: (videos: VideoInput[]) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onActiveChange: (index: number) => void
  platform: 'vertex' | 'ai-studio'
  error?: string
}

export function VideoTabList({
  videos,
  activeIndex,
  onVideosChange,
  onReorder,
  onActiveChange,
  platform,
  error,
}: VideoTabListProps) {
  // 生成稳定的唯一 ID
  const instanceId = useId()
  const tabIds = videos.map((_, index) => `${instanceId}-tab-${index}`)

  // 存储当前上传的 XHR 引用（顺序上传，同时只有一个）
  const currentXhrRef = useRef<XMLHttpRequest | null>(null)

  // 保存最新的 videos 引用，避免异步回调中闭包捕获旧状态
  const videosRef = useRef(videos)

  // 首次挂载时同步 ref（videos 依赖故意排除，仅首次挂载）
  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅首次挂载时同步
  useEffect(() => {
    videosRef.current = videos
  }, [])

  // 同步更新 ref + 调用 onVideosChange（消除 useEffect 延迟导致的竞态条件）
  const updateVideos = useCallback(
    (updater: (prev: VideoInput[]) => VideoInput[]) => {
      const newVideos = updater(videosRef.current)
      videosRef.current = newVideos // 立即同步
      onVideosChange(newVideos)
    },
    [onVideosChange],
  )

  // 上传队列状态
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)

  // 保存最新的队列引用，用于异步循环中动态获取追加的项
  const uploadQueueRef = useRef(uploadQueue)
  useEffect(() => {
    uploadQueueRef.current = uploadQueue
  }, [uploadQueue])

  // 封装函数：同步更新 state 和 ref，避免竞态条件
  const updateUploadQueue = useCallback(
    (updater: (prev: UploadQueueItem[]) => UploadQueueItem[]) => {
      setUploadQueue((prev) => {
        const newQueue = updater(prev)
        uploadQueueRef.current = newQueue
        return newQueue
      })
    },
    [],
  )

  // 防护：确保 activeIndex 始终有效（修复 localStorage 数据不一致问题）
  useEffect(() => {
    if (videos.length > 0 && activeIndex >= videos.length) {
      onActiveChange(videos.length - 1)
    }
  }, [activeIndex, videos.length, onActiveChange])

  // 安全索引：在 useEffect 修正之前使用，避免访问越界
  const safeIndex = Math.min(Math.max(0, activeIndex), videos.length - 1)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // 拖拽结束处理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tabIds.indexOf(active.id as string)
      const newIndex = tabIds.indexOf(over.id as string)
      onReorder(oldIndex, newIndex)
    }
  }

  // 添加视频
  const addVideo = () => {
    const currentVideos = videosRef.current
    if (currentVideos.length >= 10) {
      toast.warning('最多支持 10 个视频')
      return
    }
    updateVideos((prev) => [...prev, { url: '' }])
    onActiveChange(currentVideos.length)
  }

  // 删除视频
  const removeVideo = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const currentVideos = videosRef.current
    if (currentVideos.length <= 2) {
      toast.warning('至少需要 2 个视频')
      return
    }
    updateVideos((prev) => prev.filter((_, i) => i !== index))
    // 调整激活索引
    if (index <= activeIndex) {
      onActiveChange(Math.max(0, activeIndex - 1))
    }
  }

  // 更新当前视频 URL
  const updateCurrentVideoUrl = (url: string) => {
    updateVideos((prev) => {
      if (safeIndex < 0 || safeIndex >= prev.length) return prev
      const newVideos = [...prev]
      newVideos[safeIndex] = { ...newVideos[safeIndex], url }
      return newVideos
    })
  }

  // 更新当前视频文件名
  const updateCurrentVideoFilename = (filename: string) => {
    updateVideos((prev) => {
      if (safeIndex < 0 || safeIndex >= prev.length) return prev
      const newVideos = [...prev]
      newVideos[safeIndex] = { ...newVideos[safeIndex], filename }
      return newVideos
    })
  }

  // 更新当前视频输入模式（保留已有数据，不取消上传）
  const updateCurrentVideoMode = (inputMode: VideoInputMode) => {
    updateVideos((prev) => {
      if (safeIndex < 0 || safeIndex >= prev.length) return prev
      const newVideos = [...prev]
      newVideos[safeIndex] = {
        ...newVideos[safeIndex],
        inputMode,
        // 保留 uploadState、filename、url，让用户随时切换查看
      }
      return newVideos
    })
  }

  // 清空当前视频（删除已上传的文件）
  const clearCurrentVideo = () => {
    updateVideos((prev) => {
      if (safeIndex < 0 || safeIndex >= prev.length) return prev
      const newVideos = [...prev]
      newVideos[safeIndex] = {
        ...newVideos[safeIndex],
        url: '',
        filename: '',
        uploadState: undefined,
      }
      return newVideos
    })
  }

  // 更新当前视频的上传状态
  const updateCurrentUploadState = (uploadState: VideoUploadState) => {
    updateVideos((prev) => {
      if (safeIndex < 0 || safeIndex >= prev.length) return prev
      const newVideos = [...prev]
      newVideos[safeIndex] = { ...newVideos[safeIndex], uploadState }
      return newVideos
    })
  }

  // 取消当前视频的上传
  const cancelCurrentUpload = () => {
    if (currentXhrRef.current) {
      currentXhrRef.current.abort()
      currentXhrRef.current = null
    }
    // 清空上传状态
    updateCurrentUploadState({ uploading: false, progress: 0 })
  }

  // 记录当前上传的 XHR 引用
  const handleStartUpload = (xhr: XMLHttpRequest) => {
    currentXhrRef.current = xhr
  }

  // ============================================================================
  // 队列上传核心逻辑
  // ============================================================================

  // 上传单个文件
  const uploadSingleFile = useCallback(
    (
      file: File,
      targetIndex: number,
    ): Promise<{ url: string; filename: string; local_path?: string }> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('platform', platform)

        const xhr = new XMLHttpRequest()
        currentXhrRef.current = xhr

        // 更新队列中当前项的状态
        updateUploadQueue((prev) =>
          prev.map((item) =>
            item.targetIndex === targetIndex ? { ...item, status: 'uploading' as const } : item,
          ),
        )

        // 更新对应视频槽位的上传状态（使用 updateVideos 同步更新 ref）
        const updateVideoUploadState = (state: VideoUploadState) => {
          updateVideos((prev) =>
            prev.map((v, i) => (i === targetIndex ? { ...v, uploadState: state } : v)),
          )
        }

        updateVideoUploadState({ uploading: true, progress: 0 })

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100
            updateVideoUploadState({ uploading: true, progress: percent })
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)
              if (response.success) {
                updateVideoUploadState({ uploading: false, progress: 100 })
                resolve({
                  url: response.url, // File API URI（AI Studio）或 GCS URL（Vertex）
                  filename: response.filename || file.name,
                  local_path: response.localPath, // AI Studio 本地文件路径（FFmpeg 用）
                })
              } else {
                updateVideoUploadState({ uploading: false, progress: 0, error: response.error })
                reject(new Error(response.error || '上传失败'))
              }
            } catch {
              updateVideoUploadState({ uploading: false, progress: 0, error: '解析响应失败' })
              reject(new Error('解析响应失败'))
            }
          } else {
            updateVideoUploadState({ uploading: false, progress: 0, error: `HTTP ${xhr.status}` })
            reject(new Error(`上传失败: HTTP ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => {
          updateVideoUploadState({ uploading: false, progress: 0, error: '网络错误' })
          reject(new Error('网络错误，上传失败'))
        })

        xhr.addEventListener('abort', () => {
          updateVideoUploadState({ uploading: false, progress: 0 })
          reject(new Error('上传已取消'))
        })

        xhr.open('POST', '/api/upload/video')
        xhr.send(formData)
      })
    },
    [platform, updateVideos, updateUploadQueue],
  )

  // 处理上传队列（顺序执行，支持动态追加）
  const processQueue = useCallback(async () => {
    setIsProcessingQueue(true)

    // 循环处理队列，每次从 ref 获取下一个 pending 项（支持动态追加）
    while (true) {
      // 从最新队列状态中找第一个 pending 项
      const item = uploadQueueRef.current.find((q) => q.status === 'pending')
      if (!item) break // 没有待处理项，退出循环

      try {
        const result = await uploadSingleFile(item.file, item.targetIndex)

        // 更新视频 URL、文件名和本地路径（使用 updateVideos 同步更新 ref）
        updateVideos((prev) =>
          prev.map((v, idx) =>
            idx === item.targetIndex
              ? { ...v, url: result.url, filename: result.filename, local_path: result.local_path }
              : v,
          ),
        )

        // 更新队列状态为完成
        updateUploadQueue((prev) =>
          prev.map((qItem) =>
            qItem.targetIndex === item.targetIndex
              ? { ...qItem, status: 'completed' as const }
              : qItem,
          ),
        )

        // 自动切到下一个待上传项
        const nextPending = uploadQueueRef.current.find(
          (q) => q.targetIndex !== item.targetIndex && q.status === 'pending',
        )
        if (nextPending) {
          onActiveChange(nextPending.targetIndex)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '上传失败'

        // 如果是取消操作，停止队列处理
        if (errorMessage === '上传已取消') {
          updateUploadQueue(() => [])
          setIsProcessingQueue(false)
          return
        }

        // 更新队列状态为失败
        updateUploadQueue((prev) =>
          prev.map((qItem) =>
            qItem.targetIndex === item.targetIndex
              ? { ...qItem, status: 'failed' as const, error: errorMessage }
              : qItem,
          ),
        )

        // 显示错误提示但继续处理下一个
        toast.error(`视频 ${item.targetIndex + 1} 上传失败: ${errorMessage}`)
      }
    }

    // 队列处理完成，立即允许新队列启动
    setIsProcessingQueue(false)

    // 延迟清空已完成的队列项（保留 1 秒用于显示完成状态）
    // 但要保留活跃的上传项（防止竞态条件清空新追加的文件）
    setTimeout(() => {
      updateUploadQueue((prev) => {
        const activeItems = prev.filter((q) => q.status === 'pending' || q.status === 'uploading')
        return activeItems.length > 0 ? activeItems : []
      })
    }, 1000)
  }, [uploadSingleFile, updateVideos, onActiveChange, updateUploadQueue])

  // 处理多文件选择
  const handleFilesSelected = useCallback(
    (selectedFiles: File[]) => {
      if (selectedFiles.length === 0) return

      // 使用 ref 获取最新的 videos 状态，避免闭包捕获旧值导致数据丢失
      const currentVideos = videosRef.current

      // 计算可用的槽位数量（排除正在上传或队列中的槽位）
      const emptySlots = currentVideos
        .map((v, i) => {
          // 检查该槽位是否在上传队列中
          const isInQueue = uploadQueueRef.current.some(
            (q) => q.targetIndex === i && (q.status === 'pending' || q.status === 'uploading'),
          )
          return {
            index: i,
            // 空槽位：没有 URL、没有正在上传、不在队列中
            isEmpty: !v.url.trim() && !v.uploadState?.uploading && !isInQueue,
          }
        })
        .filter((s) => s.isEmpty)

      // 计算需要的新槽位
      const neededSlots = selectedFiles.length - emptySlots.length
      const maxNewSlots = 10 - currentVideos.length

      // 限制文件数量
      let filesToProcess = selectedFiles
      if (neededSlots > maxNewSlots) {
        toast.warning(`最多只能再添加 ${maxNewSlots} 个视频`)
        filesToProcess = selectedFiles.slice(0, emptySlots.length + maxNewSlots)
      }

      // 创建新的空槽位（如果需要，使用 updateVideos 同步更新 ref）
      const slotsToCreate = Math.min(Math.max(0, neededSlots), maxNewSlots)
      let newVideos = currentVideos
      if (slotsToCreate > 0) {
        updateVideos((prev) => {
          newVideos = [...prev, ...Array.from({ length: slotsToCreate }, () => ({ url: '' }))]
          return newVideos
        })
      }

      // 计算空槽位索引（基于更新后的视频列表，同样排除上传中的槽位）
      const allEmptySlots = newVideos
        .map((v, i) => {
          const isInQueue = uploadQueueRef.current.some(
            (q) => q.targetIndex === i && (q.status === 'pending' || q.status === 'uploading'),
          )
          return {
            index: i,
            isEmpty: !v.url.trim() && !v.uploadState?.uploading && !isInQueue,
          }
        })
        .filter((s) => s.isEmpty)
        .map((s) => s.index)

      // 创建上传队列项
      const newQueueItems: UploadQueueItem[] = filesToProcess.map((file, i) => ({
        file,
        targetIndex: allEmptySlots[i],
        status: 'pending' as const,
      }))

      // 检查是否有正在进行的上传（基于 ref 而非 isProcessingQueue，避免竞态条件）
      const hasActiveUpload = uploadQueueRef.current.some(
        (q) => q.status === 'pending' || q.status === 'uploading',
      )

      if (hasActiveUpload) {
        // 有活跃上传，追加到队列（while 循环会自动处理）
        updateUploadQueue((prev) => [...prev, ...newQueueItems])
      } else {
        // 没有活跃上传，启动新队列
        updateUploadQueue(() => newQueueItems)
        processQueue()
      }

      // 切换到第一个要上传的视频
      if (newQueueItems.length > 0) {
        onActiveChange(newQueueItems[0].targetIndex)
      }
    },
    [updateVideos, processQueue, onActiveChange, updateUploadQueue],
  )

  // 标签点击处理（不取消上传，让后台继续）
  const handleTabClick = (index: number) => {
    if (index === activeIndex) return
    onActiveChange(index)
  }

  // 取消队列上传
  const cancelQueueUpload = useCallback(() => {
    if (currentXhrRef.current) {
      currentXhrRef.current.abort()
      currentXhrRef.current = null
    }
    updateUploadQueue(() => [])
    setIsProcessingQueue(false)

    // 清空所有正在上传的状态（使用 updateVideos 同步更新 ref）
    updateVideos((prev) =>
      prev.map((v) => ({
        ...v,
        uploadState: v.uploadState?.uploading ? undefined : v.uploadState,
      })),
    )

    toast.info('已取消上传')
  }, [updateVideos, updateUploadQueue])

  // 获取视频槽位的上传队列状态
  const getSlotQueueStatus = (index: number): 'pending' | 'uploading' | null => {
    const item = uploadQueue.find((q) => q.targetIndex === index)
    if (!item) return null
    if (item.status === 'pending') return 'pending'
    if (item.status === 'uploading') return 'uploading'
    return null
  }

  const filledCount = videos.filter((v) => v.url.trim()).length

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Hero 区域 - 紧凑横向布局 */}
      <div className="flex items-center justify-center gap-3">
        <div className="rounded-full bg-claude-orange-100 p-5">
          <Film className="h-12 w-12 text-claude-orange-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-claude-dark-900">添加混剪视频</h3>
          <p className="text-xs text-claude-dark-400">添加 2-10 个视频进行混剪，拖拽标签调整顺序</p>
        </div>
      </div>

      {/* 视频列表标题 */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium text-claude-dark-800">
          视频列表 <span className="text-red-500">*</span>
        </Label>
        <span className="text-xs text-claude-dark-400 bg-claude-cream-100 px-2 py-0.5 rounded-full">
          {filledCount}/{videos.length}
        </span>
      </div>

      {/* 标签栏 + 内容区 - flex-1 撑满剩余空间 */}
      <div className="flex-1 border border-claude-cream-200 rounded-xl bg-white overflow-hidden flex flex-col">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
            <div className="flex items-center gap-4 px-4 py-3 bg-claude-cream-50 border-b border-claude-cream-200 overflow-x-auto scrollbar-thin">
              {videos.map((video, index) => (
                <SortableTab
                  key={tabIds[index]}
                  id={tabIds[index]}
                  index={index}
                  isActive={index === activeIndex}
                  isFilled={!!video.url.trim()}
                  canRemove={videos.length > 2}
                  onClick={() => handleTabClick(index)}
                  onRemove={(e) => removeVideo(index, e)}
                  queueStatus={getSlotQueueStatus(index)}
                />
              ))}

              {/* 添加按钮 */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addVideo}
                disabled={videos.length >= 10}
                className="h-8 w-8 p-0 shrink-0 hover:bg-claude-cream-100"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </SortableContext>
        </DndContext>

        {/* 内容区：当前选中的视频输入，key 触发切换动画 */}
        <div key={safeIndex} className="flex-1 px-4 pt-1 pb-4 tab-switch-animation">
          <VideoInputField
            embedded
            label=""
            id={`video-${safeIndex}`}
            value={videos[safeIndex]?.url ?? ''}
            onChange={updateCurrentVideoUrl}
            platform={platform}
            placeholder={`https://your-bucket.com/video-${safeIndex + 1}.mp4`}
            uploadedFilename={videos[safeIndex]?.filename ?? ''}
            onFilenameChange={updateCurrentVideoFilename}
            inputMode={videos[safeIndex]?.inputMode ?? 'upload'}
            onModeChange={updateCurrentVideoMode}
            onClear={clearCurrentVideo}
            uploadState={videos[safeIndex]?.uploadState}
            onUploadStateChange={updateCurrentUploadState}
            onCancelUpload={isProcessingQueue ? cancelQueueUpload : cancelCurrentUpload}
            onStartUpload={handleStartUpload}
            multiple
            onFilesSelected={handleFilesSelected}
            allowQueueAdd
          />
        </div>
      </div>

      {/* 底部区域：错误提示 + 帮助信息 */}
      <div className="mt-auto pt-4 space-y-2">
        {/* 错误提示 */}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {/* 提示信息 */}
        <p className="text-xs text-claude-dark-400 text-center">{VIDEO_FORMATS.FULL_HINT}</p>
      </div>
    </div>
  )
}

// ============================================================================
// 单个可拖拽标签
// ============================================================================

interface SortableTabProps {
  id: string
  index: number
  isActive: boolean
  isFilled: boolean
  canRemove: boolean
  onClick: () => void
  onRemove: (e: React.MouseEvent) => void
  /** 队列上传状态 */
  queueStatus?: 'pending' | 'uploading' | null
}

function SortableTab({
  id,
  index,
  isActive,
  isFilled,
  canRemove,
  onClick,
  onRemove,
  queueStatus,
}: SortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  // 从 attributes 中排除 role，避免重复
  const { role: _role, ...restAttributes } = attributes

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...restAttributes}
      {...listeners}
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
      className={`
        group relative flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer
        select-none transition-all shrink-0
        ${isDragging ? 'shadow-lg ring-2 ring-claude-orange-500/50 bg-white' : ''}
        ${isActive ? 'bg-white shadow-sm border border-claude-cream-200' : 'hover:bg-claude-cream-100'}
      `}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick()
        }
      }}
    >
      {/* 状态指示器 */}
      <div
        className={`
          w-5 h-5 rounded-full flex items-center justify-center shrink-0
          ${queueStatus === 'uploading' ? 'bg-blue-500 text-white' : ''}
          ${queueStatus === 'pending' ? 'bg-claude-cream-200 text-claude-dark-400' : ''}
          ${!queueStatus && isFilled ? 'bg-claude-orange-500 text-white' : ''}
          ${!queueStatus && !isFilled ? 'border-2 border-dashed border-claude-dark-200' : ''}
        `}
      >
        {queueStatus === 'uploading' ? (
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={3} />
        ) : queueStatus === 'pending' ? (
          <Clock className="h-3 w-3" strokeWidth={2} />
        ) : isFilled ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : (
          <span className="text-xs text-claude-dark-300">{index + 1}</span>
        )}
      </div>

      {/* 标签文字 */}
      <span
        className={`text-sm font-medium ${isActive ? 'text-claude-dark-900' : 'text-claude-dark-500'}`}
      >
        视频 {index + 1}
      </span>

      {/* 删除按钮 - 悬停时显示 */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={`
            absolute -top-1 -right-1 w-4 h-4 rounded-full
            bg-claude-dark-300 text-white
            opacity-0 group-hover:opacity-100 hover:bg-red-500
            flex items-center justify-center transition-all
          `}
        >
          <X className="h-2.5 w-2.5" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}
