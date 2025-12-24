export interface StyleFormData {
  name: string
  description: string
  analysis_creative_layer: string
  audio_sync_creative_layer: string
  config: {
    channel_name: string
    duration_range: {
      min: number
      max: number
    }
    speech_rates: [number, number, number] // [v1, v2, v3]
    original_audio_scene_count?: number
  }
}
