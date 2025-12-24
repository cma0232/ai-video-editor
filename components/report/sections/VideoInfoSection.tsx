import { SectionCard } from '@/components/guide/section-card'
import type { JobVideo, VideoMetadata } from '@/types'

interface VideoInfoSectionProps {
  videos: JobVideo[]
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const safeJsonParse = <T,>(jsonStr: string): T | null => {
  try {
    return JSON.parse(jsonStr) as T
  } catch {
    return null
  }
}

export function VideoInfoSection({ videos }: VideoInfoSectionProps) {
  return (
    <section id="video-info">
      <SectionCard title={`🎬 输入视频信息 (${videos.length}个)`}>
        <div className="space-y-6">
          {videos.map((video, index) => {
            const metadata = video.metadata ? safeJsonParse<VideoMetadata>(video.metadata) : null

            return (
              <div
                key={video.id}
                className="border border-claude-cream-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-claude-dark-800">
                    Video {index + 1}: {video.label}
                  </span>
                  {video.title && (
                    <span className="text-sm text-claude-dark-500">- {video.title}</span>
                  )}
                </div>

                {video.description && (
                  <p className="text-sm text-claude-dark-500">{video.description}</p>
                )}

                <div className="grid gap-2 text-sm">
                  <InfoRow label="原始 URL">
                    <a
                      href={video.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-claude-orange-600 hover:underline break-all"
                    >
                      {video.original_url}
                    </a>
                  </InfoRow>

                  {video.gcs_https_url && (
                    <InfoRow label="GCS HTTPS URL">
                      <span className="break-all">{video.gcs_https_url}</span>
                    </InfoRow>
                  )}

                  {video.gemini_uri && (
                    <InfoRow label="Gemini URI">
                      <code className="text-xs break-all">{video.gemini_uri}</code>
                    </InfoRow>
                  )}
                </div>

                {/* 元数据 */}
                {metadata && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-claude-cream-200">
                    <MetadataItem
                      label="时长"
                      value={`${metadata.duration}秒 (${formatDuration(metadata.duration)})`}
                    />
                    <MetadataItem
                      label="分辨率"
                      value={metadata.resolution || `${metadata.width}x${metadata.height}`}
                    />
                    <MetadataItem label="帧率" value={`${metadata.fps} fps`} />
                    {metadata.file_size && (
                      <MetadataItem label="文件大小" value={formatFileSize(metadata.file_size)} />
                    )}
                  </div>
                )}

                {/* 分析提示词 */}
                {video.analysis_prompt && (
                  <div className="pt-3 border-t border-claude-cream-200">
                    <p className="text-xs font-medium text-claude-dark-500 mb-2">分析提示词</p>
                    <pre className="text-xs bg-claude-cream-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {video.analysis_prompt}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>
    </section>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-claude-dark-500 shrink-0 w-28">{label}:</span>
      <span className="text-claude-dark-700">{children}</span>
    </div>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-claude-dark-500">{label}</p>
      <p className="text-sm font-medium text-claude-dark-800">{value}</p>
    </div>
  )
}
