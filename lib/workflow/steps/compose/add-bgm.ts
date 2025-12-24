/**
 * 添加背景音乐步骤
 *
 * 在 concatenate 之后、download 之前执行
 * 将背景音乐混入已拼接的最终视频
 */

import { configsRepo } from '@/lib/db/core/configs'
import * as stateManager from '@/lib/db/managers/state-manager'
import { trackFFmpegCall } from '@/lib/media'
import { TTS_CONFIG_KEYS, TTS_DEFAULTS } from '@/types/ai/tts'
import type { FinalVideoOutput, WorkflowContext } from '../../types'
import { BaseStep } from '../base'

/**
 * 添加背景音乐
 * 可选步骤，根据任务配置的 bgm_url 决定是否执行
 */
export class AddBgmStep extends BaseStep<FinalVideoOutput> {
  readonly id = 'add_bgm'
  readonly name = '添加背景音乐'

  /**
   * 返回输入数据摘要
   */
  getInputSummary(ctx: WorkflowContext): Record<string, unknown> {
    const bgmUrl = ctx.input.config.bgm_url
    const state = stateManager.getState(ctx.jobId)
    const bgmVolumeStr = configsRepo.get(TTS_CONFIG_KEYS.BGM_VOLUME)
    const bgmVolume = bgmVolumeStr ? parseFloat(bgmVolumeStr) : TTS_DEFAULTS.BGM_VOLUME

    return {
      final_video_url: state?.final_video_url || '',
      bgm_url: bgmUrl || '(无配乐)',
      bgm_volume: `${(bgmVolume * 100).toFixed(0)}%`,
      will_skip: !bgmUrl?.trim(),
    }
  }

  async execute(ctx: WorkflowContext): Promise<FinalVideoOutput> {
    const bgmUrl = ctx.input.config.bgm_url

    // 如果未配置 BGM，跳过此步骤
    if (!bgmUrl?.trim()) {
      this.log(ctx, '未配置背景音乐，跳过此步骤')

      // 返回原始最终视频
      const state = stateManager.getState(ctx.jobId)
      return {
        url: state?.final_video_url || '',
        localPath: state?.final_video_url || '',
        publicUrl: state?.final_video_public_url,
        gsUri: state?.final_video_gs_uri,
      }
    }

    // 获取配乐音量
    const bgmVolumeStr = configsRepo.get(TTS_CONFIG_KEYS.BGM_VOLUME)
    const bgmVolume = bgmVolumeStr ? parseFloat(bgmVolumeStr) : TTS_DEFAULTS.BGM_VOLUME

    this.log(ctx, `开始混合背景音乐，音量: ${(bgmVolume * 100).toFixed(0)}%`)

    // 获取当前最终视频
    const state = stateManager.getState(ctx.jobId)
    const inputVideoUrl = state?.final_video_url

    if (!inputVideoUrl) {
      throw new Error('未找到已拼接的视频，无法添加配乐')
    }

    // 调用 FFmpeg 混合 BGM
    const outputPath = await trackFFmpegCall(
      {
        jobId: ctx.jobId,
        operation: 'mix_bgm',
        requestParams: {
          input_video: inputVideoUrl,
          bgm_url: bgmUrl,
          bgm_volume: bgmVolume,
        },
      },
      () =>
        ctx.services.ffmpeg.mixBgm(inputVideoUrl, bgmUrl, {
          bgmVolume,
          loopBgm: true, // BGM 自动循环
        }),
    )

    if (!outputPath) {
      throw new Error('混合配乐失败：无输出文件')
    }

    this.log(ctx, `配乐混合完成: ${outputPath}`)

    // 更新 state 中的 final_video_url
    stateManager.updateState(ctx.jobId, {
      final_video_url: outputPath,
    })

    return {
      url: outputPath,
      localPath: outputPath,
      publicUrl: undefined,
      gsUri: undefined,
    }
  }
}
