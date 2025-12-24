/**
 * 单视频工作流定义
 *
 * v16.0 简化流程（移除显式缓存）：
 * 元数据 → 准备 Gemini → 分析 → 旁白 → 确保本地 → 拆条 → 分镜处理 → 拼接
 */

import type { WorkflowDefinition } from '../types'

/**
 * 单视频场景工作流
 * 适用于 1 个输入视频的任务
 */
export const singleVideoWorkflow: WorkflowDefinition = {
  id: 'single-video',
  name: '单视频工作流',

  stages: [
    // 阶段 1: 分析（Analysis）
    {
      id: 'analysis',
      name: '视频分析',
      steps: [
        {
          id: 'fetch_metadata',
          type: 'fetch_metadata',
        },
        {
          id: 'prepare_gemini',
          type: 'prepare_gemini',
        },
        {
          id: 'gemini_analysis',
          type: 'gemini_analysis',
        },
        {
          id: 'validate_storyboards',
          type: 'validate_storyboards',
        },
      ],
    },

    // 阶段 2: 旁白生成（Generate Narrations）
    {
      id: 'generate_narrations',
      name: '生成旁白',
      steps: [
        {
          id: 'batch_generate_narrations',
          type: 'batch_generate_narrations',
        },
      ],
    },

    // 阶段 3: 提取分镜（Extract Scenes）
    {
      id: 'extract_scenes',
      name: '提取分镜',
      steps: [
        {
          id: 'ensure_local_video',
          type: 'ensure_local_video',
        },
        {
          id: 'ffmpeg_batch_split',
          type: 'ffmpeg_batch_split',
        },
      ],
    },

    // 阶段 4: 处理分镜（Process Scenes）
    {
      id: 'process_scenes',
      name: '处理分镜',
      steps: [
        {
          id: 'process_scene_loop',
          type: 'process_scene_loop_concurrent', // 默认使用并发版本
          condition: 'input.config.max_concurrent_scenes >= 2',
        },
        {
          id: 'process_scene_loop',
          type: 'process_scene_loop', // 串行版本（向后兼容）
          condition: 'input.config.max_concurrent_scenes < 2',
        },
      ],
    },

    // 阶段 5: 合成（Compose）
    {
      id: 'compose',
      name: '合成视频',
      steps: [
        {
          id: 'concatenate',
          type: 'concatenate',
        },
        {
          id: 'add_bgm',
          type: 'add_bgm',
          // 混合背景音乐（步骤内部判断是否跳过）
          retry: {
            maxAttempts: 2,
            delayMs: 2000,
            backoffMultiplier: 2,
          },
        },
        {
          id: 'download',
          type: 'download',
          // 将最终视频复制到 output 目录
        },
      ],
    },
  ],
}
