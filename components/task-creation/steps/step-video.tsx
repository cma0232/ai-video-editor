'use client'

import { Video } from 'lucide-react'
import { VIDEO_FORMATS } from '@/lib/constants/video'
import { useTaskCreationStore } from '@/store/task-creation-store'
import { VideoTabList } from '../shared/video-tab-list'
import { VideoInputField } from '../video-input-field'

/** 步骤 1：视频输入（单视频/多视频模式） */
interface StepVideoProps {
  availablePlatforms: ('vertex' | 'ai-studio')[]
}

export function StepVideo({ availablePlatforms }: StepVideoProps) {
  const {
    taskType,
    videoUrl,
    setVideoUrl,
    singleVideoFilename,
    setSingleVideoFilename,
    singleVideoUploadState,
    setSingleVideoUploadState,
    singleVideoInputMode,
    setSingleVideoInputMode,
    setSingleVideoLocalPath,
    clearSingleVideo,
    inputVideos,
    setInputVideos,
    reorderVideos,
    activeVideoIndex,
    setActiveVideoIndex,
    geminiPlatform,
    getStepErrors,
  } = useTaskCreationStore()

  const errors = getStepErrors(0)
  const platform = geminiPlatform || (availablePlatforms[0] ?? 'vertex')

  if (taskType === 'single') {
    return (
      <div className="flex flex-col h-full space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-claude-orange-100 p-5">
              <Video className="h-12 w-12 text-claude-orange-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-claude-dark-900">添加视频</h3>
            <p className="text-sm text-claude-dark-400 max-w-md mx-auto">
              上传本地视频或输入云端视频 URL
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto w-full">
          <VideoInputField
            label=""
            id="video-url"
            value={videoUrl}
            onChange={setVideoUrl}
            platform={platform}
            placeholder="https://your-bucket.com/video.mp4"
            uploadedFilename={singleVideoFilename}
            onFilenameChange={setSingleVideoFilename}
            onLocalPathChange={setSingleVideoLocalPath}
            uploadState={singleVideoUploadState}
            onUploadStateChange={setSingleVideoUploadState}
            inputMode={singleVideoInputMode}
            onModeChange={setSingleVideoInputMode}
            onClear={clearSingleVideo}
          />
        </div>

        <div className="mt-auto pt-6 space-y-2">
          {errors.videoUrl && <p className="text-sm text-red-500 text-center">{errors.videoUrl}</p>}
          <p className="text-xs text-claude-dark-400 text-center">{VIDEO_FORMATS.FULL_HINT}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto h-full">
      <VideoTabList
        videos={inputVideos}
        activeIndex={activeVideoIndex}
        onVideosChange={setInputVideos}
        onReorder={reorderVideos}
        onActiveChange={setActiveVideoIndex}
        platform={platform}
        error={errors.videos}
      />
    </div>
  )
}
