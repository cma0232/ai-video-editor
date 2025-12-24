import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VideoInput, VideoInputMode, VideoUploadState } from '@/types'

// ============================================================================
// 任务创建表单状态 Store
// 支持多步骤向导 + localStorage 持久化
// ============================================================================

// URL 验证工具函数
function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

// 步骤定义（v12.4 重排：先选平台再上传视频，确定路径方向）
export const STEPS = [
  { id: 'config', title: '选择配置', description: '风格和平台设置' },
  { id: 'advanced', title: '高级设置', description: '分镜、大纲、音频' },
  { id: 'video', title: '添加视频', description: '上传或输入视频链接' },
  { id: 'confirm', title: '确认提交', description: '检查配置并创建任务' },
] as const

// Wizard 可见步骤数（前 3 步，第 4 步用 ConfirmModal 处理）
export const WIZARD_STEP_COUNT = 3
export const WIZARD_STEPS = STEPS.slice(0, WIZARD_STEP_COUNT)

export type StepId = (typeof STEPS)[number]['id']

type TaskType = 'single' | 'multi' | null
type GeminiPlatform = 'vertex' | 'ai-studio' | ''

interface TaskCreationState {
  // 步骤控制
  currentStep: number

  // 任务类型
  taskType: TaskType

  // 单视频
  videoUrl: string
  singleVideoFilename: string
  singleVideoUploadState?: VideoUploadState
  singleVideoInputMode: VideoInputMode
  singleVideoLocalPath?: string // AI Studio 本地文件路径（FFmpeg 用）

  // 多视频列表
  inputVideos: VideoInput[]
  activeVideoIndex: number

  // 核心配置
  selectedStyle: string
  geminiPlatform: GeminiPlatform

  // 高级配置
  storyboardCount: number
  scriptOutline: string
  originalAudioSceneCount: number
  bgmUrl: string
}

interface TaskCreationActions {
  // 步骤控制
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  canProceedToNext: () => boolean

  // 设置任务类型
  setTaskType: (type: TaskType) => void

  // 单视频
  setVideoUrl: (url: string) => void
  setSingleVideoFilename: (filename: string) => void
  setSingleVideoUploadState: (state: VideoUploadState | undefined) => void
  setSingleVideoInputMode: (mode: VideoInputMode) => void
  setSingleVideoLocalPath: (localPath: string | undefined) => void
  clearSingleVideo: () => void

  // 多视频
  setInputVideos: (videos: VideoInput[]) => void
  addVideo: () => void
  removeVideo: (index: number) => void
  updateVideoUrl: (index: number, url: string) => void
  reorderVideos: (fromIndex: number, toIndex: number) => void
  setActiveVideoIndex: (index: number) => void

  // 核心配置
  setSelectedStyle: (styleId: string) => void
  setGeminiPlatform: (platform: GeminiPlatform) => void

  // 高级配置
  setStoryboardCount: (count: number) => void
  setScriptOutline: (outline: string) => void
  setOriginalAudioSceneCount: (count: number) => void
  setBgmUrl: (url: string) => void

  // 表单操作
  resetForm: () => void

  // 验证
  getValidationErrors: () => Record<string, string>
  isFormValid: () => boolean
  getStepErrors: (step: number) => Record<string, string>
}

type TaskCreationStore = TaskCreationState & TaskCreationActions

// 初始状态
const initialState: TaskCreationState = {
  currentStep: 0,
  taskType: null,
  videoUrl: '',
  singleVideoFilename: '',
  singleVideoUploadState: undefined,
  singleVideoInputMode: 'upload',
  singleVideoLocalPath: undefined,
  inputVideos: [{ url: '' }, { url: '' }],
  activeVideoIndex: 0,
  selectedStyle: 'style-1000',
  geminiPlatform: '',
  storyboardCount: 6,
  scriptOutline: '',
  originalAudioSceneCount: 0,
  bgmUrl: '',
}

export const useTaskCreationStore = create<TaskCreationStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== 步骤控制 ==========
      setCurrentStep: (step) => {
        if (step >= 0 && step < STEPS.length) {
          set({ currentStep: step })
        }
      },

      nextStep: () => {
        const { currentStep, canProceedToNext } = get()
        if (canProceedToNext() && currentStep < STEPS.length - 1) {
          set({ currentStep: currentStep + 1 })
        }
      },

      prevStep: () => {
        const { currentStep } = get()
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 })
        }
      },

      goToStep: (step) => {
        if (step >= 0 && step < STEPS.length) {
          set({ currentStep: step })
        }
      },

      canProceedToNext: () => {
        const { currentStep, taskType, videoUrl, inputVideos, selectedStyle, geminiPlatform } =
          get()

        switch (currentStep) {
          case 0: // Step 1: 配置（风格 + 平台）
            return !!selectedStyle && !!geminiPlatform

          case 1: // Step 2: 高级设置（可选字段，总是可以继续）
            return true

          case 2: // Step 3: 视频
            if (taskType === 'single') {
              return !!videoUrl.trim()
            }
            if (taskType === 'multi') {
              return inputVideos.filter((v) => v.url.trim()).length >= 2
            }
            return false

          case 3: // Step 4: 确认
            return true

          default:
            return false
        }
      },

      // ========== 任务类型 ==========
      setTaskType: (type) => {
        set({
          taskType: type,
          currentStep: 0,
          // 切换类型时重置分镜数量默认值（统一为 6）
          storyboardCount: 6,
        })
      },

      // ========== 单视频 ==========
      setVideoUrl: (url) => {
        set({ videoUrl: url })
      },

      setSingleVideoFilename: (filename) => {
        set({ singleVideoFilename: filename })
      },

      setSingleVideoUploadState: (state) => {
        set({ singleVideoUploadState: state })
      },

      setSingleVideoInputMode: (mode) => {
        set({ singleVideoInputMode: mode })
      },

      setSingleVideoLocalPath: (localPath) => {
        set({ singleVideoLocalPath: localPath })
      },

      clearSingleVideo: () => {
        set({
          videoUrl: '',
          singleVideoFilename: '',
          singleVideoUploadState: undefined,
          singleVideoInputMode: 'upload', // 重置为默认上传模式
          singleVideoLocalPath: undefined,
        })
      },

      // ========== 多视频 ==========
      setInputVideos: (videos) => {
        set({ inputVideos: videos })
      },

      addVideo: () => {
        const { inputVideos } = get()
        if (inputVideos.length >= 10) return
        // 添加新视频并自动切换到新标签
        set({
          inputVideos: [...inputVideos, { url: '' }],
          activeVideoIndex: inputVideos.length,
        })
      },

      removeVideo: (index) => {
        const { inputVideos, activeVideoIndex } = get()
        if (inputVideos.length <= 2) return
        const newVideos = inputVideos.filter((_, i) => i !== index)
        // 删除后调整激活索引：如果删除的是当前或之前的项，需要调整
        let newActiveIndex = activeVideoIndex
        if (index <= activeVideoIndex) {
          newActiveIndex = Math.max(0, activeVideoIndex - 1)
        }
        // 确保不越界
        newActiveIndex = Math.min(newActiveIndex, newVideos.length - 1)
        set({ inputVideos: newVideos, activeVideoIndex: newActiveIndex })
      },

      updateVideoUrl: (index, url) => {
        const { inputVideos } = get()
        const newVideos = [...inputVideos]
        newVideos[index] = { ...newVideos[index], url }
        set({ inputVideos: newVideos })
      },

      reorderVideos: (fromIndex, toIndex) => {
        const { inputVideos, activeVideoIndex } = get()
        const newVideos = [...inputVideos]
        const [removed] = newVideos.splice(fromIndex, 1)
        newVideos.splice(toIndex, 0, removed)
        // 拖拽后调整激活索引
        let newActiveIndex = activeVideoIndex
        if (fromIndex === activeVideoIndex) {
          newActiveIndex = toIndex
        } else if (fromIndex < activeVideoIndex && toIndex >= activeVideoIndex) {
          newActiveIndex = activeVideoIndex - 1
        } else if (fromIndex > activeVideoIndex && toIndex <= activeVideoIndex) {
          newActiveIndex = activeVideoIndex + 1
        }
        set({ inputVideos: newVideos, activeVideoIndex: newActiveIndex })
      },

      setActiveVideoIndex: (index) => {
        const { inputVideos } = get()
        if (index >= 0 && index < inputVideos.length) {
          set({ activeVideoIndex: index })
        }
      },

      // ========== 核心配置 ==========
      setSelectedStyle: (styleId) => {
        set({ selectedStyle: styleId })
      },

      setGeminiPlatform: (platform) => {
        set({ geminiPlatform: platform })
      },

      // ========== 高级配置 ==========
      setStoryboardCount: (count) => {
        // 限制范围 3-100
        const validCount = Math.max(3, Math.min(100, Math.round(count)))
        set({ storyboardCount: validCount })
      },

      setScriptOutline: (outline) => {
        // 限制最大 5000 字
        const trimmed = outline.slice(0, 5000)
        set({ scriptOutline: trimmed })
      },

      setOriginalAudioSceneCount: (count) => {
        // 限制范围 0-500
        const validCount = Math.max(0, Math.min(500, Math.round(count)))
        set({ originalAudioSceneCount: validCount })
      },

      setBgmUrl: (url) => {
        set({ bgmUrl: url })
      },

      // ========== 表单操作 ==========
      resetForm: () => {
        set({ ...initialState })
      },

      // ========== 验证 ==========
      getValidationErrors: () => {
        const state = get()
        const errors: Record<string, string> = {}

        // 视频验证
        if (state.taskType === 'single') {
          if (!state.videoUrl.trim()) {
            errors.videoUrl = '请添加视频'
          }
        } else if (state.taskType === 'multi') {
          const validVideos = state.inputVideos.filter((v) => v.url.trim())
          if (validVideos.length < 2) {
            errors.videos = '至少需要 2 个视频'
          }
          if (validVideos.length > 10) {
            errors.videos = '最多支持 10 个视频'
          }
        }

        // 风格验证
        if (!state.selectedStyle) {
          errors.selectedStyle = '请选择剪辑风格'
        }

        // 平台验证
        if (!state.geminiPlatform) {
          errors.geminiPlatform = '请选择 Gemini 平台'
        }

        // 分镜数量验证
        if (state.storyboardCount < 3 || state.storyboardCount > 100) {
          errors.storyboardCount = '分镜数量必须在 3-100 之间'
        }

        return errors
      },

      isFormValid: () => {
        const errors = get().getValidationErrors()
        return Object.keys(errors).length === 0
      },

      getStepErrors: (step) => {
        const state = get()
        const errors: Record<string, string> = {}

        switch (step) {
          case 0: // Step 1: 配置
            if (!state.selectedStyle) {
              errors.selectedStyle = '请选择剪辑风格'
            }
            if (!state.geminiPlatform) {
              errors.geminiPlatform = '请选择 Gemini 平台'
            }
            break

          case 1: // Step 2: 高级设置
            if (state.storyboardCount < 3 || state.storyboardCount > 100) {
              errors.storyboardCount = '分镜数量必须在 3-100 之间'
            }
            if (state.scriptOutline.length > 5000) {
              errors.scriptOutline = '文案大纲最多 5000 字'
            }
            if (state.originalAudioSceneCount < 0 || state.originalAudioSceneCount > 500) {
              errors.originalAudioSceneCount = '原声分镜数量必须在 0-500 之间'
            }
            if (state.bgmUrl.trim() && !isValidUrl(state.bgmUrl.trim())) {
              errors.bgmUrl = '请输入有效的 URL'
            }
            break

          case 2: // Step 3: 视频
            if (state.taskType === 'single') {
              if (!state.videoUrl.trim()) {
                errors.videoUrl = '请添加视频'
              }
            } else if (state.taskType === 'multi') {
              const validVideos = state.inputVideos.filter((v) => v.url.trim())
              if (validVideos.length < 2) {
                errors.videos = '至少需要 2 个视频'
              }
            }
            break

          // Step 4 无额外验证
        }

        return errors
      },
    }),
    {
      name: 'task-creation-draft',
      version: 4, // v4: 步骤顺序调整 [config, advanced, video]
      migrate: (persistedState, version) => {
        const state = persistedState as Record<string, unknown>

        // v1 → v2: 清理 inputVideos 中的无效上传状态
        if (version < 2 && state.inputVideos) {
          const videos = state.inputVideos as Array<{
            url?: string
            filename?: string
            inputMode?: string
            uploadState?: unknown
          }>
          state.inputVideos = videos
            .map((v) => ({
              url: v.url?.trim() || '',
              filename: v.url?.trim() ? v.filename : '',
              inputMode: v.inputMode || 'upload',
            }))
            .filter((v) => v.url)
          // 确保至少 2 个槽位
          while ((state.inputVideos as unknown[]).length < 2) {
            ;(state.inputVideos as unknown[]).push({ url: '', filename: '', inputMode: 'upload' })
          }
        }

        // v2 → v3: 修复 activeVideoIndex 越界
        if (state.inputVideos && typeof state.activeVideoIndex === 'number') {
          const videosCount = (state.inputVideos as unknown[]).length
          if (state.activeVideoIndex >= videosCount) {
            state.activeVideoIndex = Math.max(0, videosCount - 1)
          }
        }

        // v3 → v4: 步骤顺序从 [video, config, advanced] 改为 [config, advanced, video]
        // 重置到第一步，避免旧用户看到错误的步骤内容
        if (version < 4 && typeof state.currentStep === 'number') {
          state.currentStep = 0
        }

        return state
      },
      // 持久化表单数据和当前步骤
      partialize: (state) => {
        // 只持久化有有效 URL 的视频，清空未完成上传的残留
        // 至少保留 2 个槽位（多视频模式最小要求）
        const inputVideos = (() => {
          const validVideos = state.inputVideos
            .map((v) => ({
              url: v.url?.trim() || '',
              filename: v.url?.trim() ? v.filename : '',
              inputMode: v.inputMode,
            }))
            .filter((v) => v.url)
          // 确保至少 2 个槽位
          while (validVideos.length < 2) {
            validVideos.push({ url: '', filename: '', inputMode: 'upload' })
          }
          return validVideos
        })()

        // 确保 activeVideoIndex 不越界
        const activeVideoIndex = Math.min(state.activeVideoIndex, inputVideos.length - 1)

        return {
          currentStep: state.currentStep,
          taskType: state.taskType,
          // 单视频状态（清空上传状态，只保留有效 URL 和文件名）
          videoUrl: state.videoUrl,
          singleVideoFilename: state.videoUrl?.trim() ? state.singleVideoFilename : '',
          singleVideoInputMode: state.singleVideoInputMode,
          // 多视频状态
          inputVideos,
          activeVideoIndex,
          selectedStyle: state.selectedStyle,
          geminiPlatform: state.geminiPlatform,
          storyboardCount: state.storyboardCount,
          scriptOutline: state.scriptOutline,
          originalAudioSceneCount: state.originalAudioSceneCount,
          bgmUrl: state.bgmUrl,
        }
      },
    },
  ),
)
