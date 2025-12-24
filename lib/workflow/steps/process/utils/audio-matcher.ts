/**
 * 音频匹配器
 * 选择最佳音频方案（最接近 1.0 速度）
 */

// 速度因子范围常量（与 speed.ts 保持一致）
const SPEED_MIN = 0.5
const SPEED_MAX = 5.0

export interface AudioCandidate {
  audioUrl: string
  duration?: number
}

export interface BestMatch {
  audio: AudioCandidate
  audioIndex: number
  speedFactor: number
  diff: number
  // 边界处理标记
  /** 视频需要循环的次数（speedFactor < 0.5 时） */
  loopCount?: number
  /** 视频需要裁剪（speedFactor > 5.0 时） */
  needTrim?: boolean
  /** 处理后的实际速度因子（始终在 [0.5, 5.0] 范围内） */
  adjustedSpeedFactor: number
}

/**
 * 选择最佳音频方案
 * @param videoDuration 视频时长（秒）
 * @param audios 音频候选列表
 * @returns 最佳匹配结果（最接近 1.0x 的版本，包含边界处理信息）
 * @throws 如果没有可用的音频候选或所有候选的 duration 无效
 */
export function selectBestAudioMatch(videoDuration: number, audios: AudioCandidate[]): BestMatch {
  if (audios.length === 0) {
    throw new Error('没有可用的音频候选')
  }

  // 过滤有效的音频候选（duration > 0）
  const validAudios = audios
    .map((audio, i) => ({ audio, originalIndex: i }))
    .filter(({ audio }) => audio.duration && audio.duration > 0)

  if (validAudios.length === 0) {
    throw new Error('所有音频候选的 duration 无效（为 0 或未定义）')
  }

  // 直接选择最接近 1.0x 的版本
  const baseResult = validAudios
    .map(({ audio, originalIndex }) => {
      const duration = audio.duration as number
      const speedFactor = videoDuration / duration
      return {
        audio,
        audioIndex: originalIndex,
        speedFactor,
        diff: Math.abs(speedFactor - 1.0),
      }
    })
    .sort((a, b) => a.diff - b.diff)[0]

  // 边界处理：确保 adjustedSpeedFactor 在 [0.5, 5.0] 范围内
  const result: BestMatch = {
    ...baseResult,
    adjustedSpeedFactor: baseResult.speedFactor,
  }

  if (baseResult.speedFactor < SPEED_MIN) {
    // 视频太短，需要循环播放
    // 例: speedFactor=0.1 → loopCount=5, adjustedSpeedFactor=0.5
    result.loopCount = Math.ceil(SPEED_MIN / baseResult.speedFactor)
    result.adjustedSpeedFactor = baseResult.speedFactor * result.loopCount
  } else if (baseResult.speedFactor > SPEED_MAX) {
    // 视频太长，需要裁剪
    result.needTrim = true
    result.adjustedSpeedFactor = SPEED_MAX
  }

  return result
}

/**
 * 分析所有音频候选方案
 */
export function analyzeAllCandidates(videoDuration: number, audios: AudioCandidate[]) {
  return audios.map((audio, idx) => {
    const factor = videoDuration / (audio.duration || 1)
    return {
      index: idx,
      speedFactor: factor,
      diff: Math.abs(factor - 1),
    }
  })
}
