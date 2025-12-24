import { Callout, SectionCard, StepList } from '@/components/guide'
import { Badge } from '@/components/ui'

export function CreateJobTab() {
  return (
    <div className="space-y-6">
      {/* 任务创建入口 */}
      <SectionCard title="任务创建入口">
        <p className="mb-4">在首页，你会看到两种任务创建方式：</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border-2 border-dashed border-claude-cream-300 bg-claude-cream-50/50">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">推荐</Badge>
              <span className="font-semibold text-claude-dark-700">单视频剪辑</span>
            </div>
            <p className="text-sm text-claude-dark-500">
              输入一个视频 URL，自动生成完整的解说视频。适合大多数场景。
            </p>
          </div>
          <div className="p-4 rounded-xl border-2 border-dashed border-claude-cream-300 bg-claude-cream-50/50">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">高级</Badge>
              <span className="font-semibold text-claude-dark-700">多视频混剪</span>
            </div>
            <p className="text-sm text-claude-dark-500">
              输入多个视频 URL（2-10 个），智能混剪生成视频。适合素材整合场景。
            </p>
          </div>
        </div>
      </SectionCard>

      {/* 视频 URL 要求 */}
      <SectionCard title="视频 URL 要求">
        <ul className="space-y-2 text-claude-dark-600">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">✓</span>
            <span>URL 必须是公开可访问的直链（.mp4 格式）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">✓</span>
            <span>支持 HTTP 和 HTTPS 协议</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">✓</span>
            <span>使用 MP4 格式（H.264 编码）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">✗</span>
            <span>不支持需要登录才能访问的视频（如私有云盘链接）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">✗</span>
            <span>不支持流媒体链接（如 YouTube、Bilibili 页面链接）</span>
          </li>
        </ul>
        <Callout type="tip" title="获取视频直链">
          如果你的视频在云存储中，请生成公开访问的直链。 大多数云存储服务（如
          R2、S3、OSS）都支持生成临时访问 URL。
        </Callout>
      </SectionCard>

      {/* 创建任务步骤 */}
      <SectionCard title="创建任务步骤">
        <StepList
          steps={[
            {
              title: '输入视频 URL',
              description: '在输入框中粘贴视频的公开直链地址。',
            },
            {
              title: '选择剪辑风格',
              description: (
                <>
                  从下拉菜单中选择预设的剪辑风格。不同风格会影响旁白文案的语气和内容结构。
                  <span className="block mt-1 text-claude-dark-400">
                    你也可以在「剪辑风格」页面创建自定义风格。
                  </span>
                </>
              ),
            },
            {
              title: '选择 Gemini 平台',
              description:
                '选择使用 AI Studio 或 Vertex AI 模式。确保已在「密钥设置」中配置对应平台的密钥。',
            },
            {
              title: '配置高级参数（可选）',
              description: (
                <>
                  点击「高级设置」可配置以下参数：
                  <ul className="list-disc list-inside mt-2 space-y-1 text-claude-dark-500">
                    <li>
                      <strong>分镜数量</strong>：视频将被分割的片段数量（默认 6）
                    </li>
                    <li>
                      <strong>文案大纲</strong>：提供内容方向引导，影响旁白生成
                    </li>
                    <li>
                      <strong>原声保留数量</strong>：保留原视频音频的分镜数量（默认 0）
                    </li>
                    <li>
                      <strong>背景音乐</strong>：添加配乐的音频直链（MP3 格式）
                    </li>
                  </ul>
                </>
              ),
            },
            {
              title: '提交任务',
              description: '点击「开始剪辑」按钮提交任务。系统会自动跳转到任务详情页面。',
            },
          ]}
        />
      </SectionCard>

      {/* 参数说明 */}
      <SectionCard title="高级参数详解">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <h4 className="font-semibold text-claude-dark-700 mb-2">分镜数量 (storyboard_count)</h4>
            <p className="text-sm text-claude-dark-500 mb-2">
              控制视频被分割成多少个片段。数量越多，分镜越细致，但处理时间也会增加。
            </p>
            <p className="text-sm text-claude-dark-500">
              建议根据视频时长和内容复杂度适当调整，可以先使用默认值，再根据实际效果调整。
            </p>
          </div>

          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <h4 className="font-semibold text-claude-dark-700 mb-2">文案大纲 (script_outline)</h4>
            <p className="text-sm text-claude-dark-500 mb-2">
              为 AI 提供内容方向引导，影响旁白文案的生成。
            </p>
            <p className="text-sm text-claude-dark-500">
              示例：「重点介绍产品的创新功能和用户体验，语气轻松活泼」
            </p>
          </div>

          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <h4 className="font-semibold text-claude-dark-700 mb-2">
              原声保留数量 (original_audio_scene_count)
            </h4>
            <p className="text-sm text-claude-dark-500 mb-2">
              指定保留原视频音频的分镜数量。这些分镜不会被替换为 AI 语音。
            </p>
            <ul className="text-sm text-claude-dark-500 list-disc list-inside space-y-1">
              <li>默认值：0（全部使用 AI 语音）</li>
              <li>适用场景：保留重要对白、音乐片段等</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <h4 className="font-semibold text-claude-dark-700 mb-2">背景音乐 (bgm_url)</h4>
            <p className="text-sm text-claude-dark-500 mb-2">
              为成片添加背景音乐，让视频更具氛围感。
            </p>
            <ul className="text-sm text-claude-dark-500 list-disc list-inside space-y-1">
              <li>支持格式：MP3</li>
              <li>输入方式：公开可访问的音频直链 URL</li>
              <li>默认行为：留空则不添加配乐</li>
              <li>音量控制：系统自动调节配乐音量（40%），确保不影响人声</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      <Callout type="warning" title="注意事项">
        <ul className="list-disc list-inside space-y-1">
          <li>任务创建后会立即开始处理，请确保 API 配置正确</li>
          <li>处理过程中会消耗 API 配额，请注意配额使用情况</li>
          <li>较大的视频文件建议使用 Vertex AI 模式</li>
        </ul>
      </Callout>
    </div>
  )
}
