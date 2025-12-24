import { SectionCard, StepList } from '@/components/guide'
import { Badge } from '@/components/ui'

export function QuickStartTab() {
  return (
    <div className="space-y-6">
      {/* 系统简介 */}
      <SectionCard title="系统简介">
        <p className="text-base">
          <strong>创剪视频工作流</strong>是一个基于 Google Gemini AI 的全自动视频剪辑工具。
          只需提供视频 URL，系统将自动完成：视频智能分析、分镜脚本生成、AI 配音合成、音画同步处理，
          最终输出精美的解说视频。
        </p>
      </SectionCard>

      {/* 前置条件 */}
      <SectionCard title="前置条件">
        <p className="mb-4">在开始使用之前，请确保你已准备好以下内容：</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <Badge variant="warning" className="mt-0.5 shrink-0">
              必需
            </Badge>
            <span>Google Gemini API 密钥（AI Studio 或 Vertex AI）</span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="success" className="mt-0.5 shrink-0">
              免费
            </Badge>
            <span>Edge TTS（内置免费语音合成，无需配置）</span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5 shrink-0">
              可选
            </Badge>
            <span>Fish Audio API 密钥（高质量语音合成，推荐）</span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5 shrink-0">
              可选
            </Badge>
            <span>Google Cloud Storage（大文件存储，仅 Vertex AI 模式需要）</span>
          </li>
        </ul>
      </SectionCard>

      {/* 快速上手步骤 */}
      <SectionCard title="5 分钟快速上手">
        <StepList
          steps={[
            {
              title: '注册管理员账号',
              description: (
                <>
                  首次访问系统时，会自动跳转到注册页面。创建管理员账号后即可登录使用。
                  <span className="text-claude-dark-400 block mt-1">
                    提示：系统采用单用户模式，注册后即为管理员。
                  </span>
                </>
              ),
            },
            {
              title: '配置 API 密钥',
              description: (
                <>
                  进入「密钥设置」页面，配置必需的 API 密钥：
                  <ul className="list-disc list-inside mt-2 space-y-1 text-claude-dark-500">
                    <li>Google Gemini（选择 AI Studio 或 Vertex AI 模式）</li>
                    <li>Fish Audio（语音合成服务）</li>
                  </ul>
                </>
              ),
            },
            {
              title: '创建剪辑任务',
              description: (
                <>
                  返回首页，输入视频 URL，选择剪辑风格和 Gemini 平台，
                  点击「开始剪辑」即可创建任务。系统将自动完成所有处理流程。
                </>
              ),
            },
            {
              title: '查看处理结果',
              description: (
                <>在「任务管理」页面查看任务进度。任务完成后，可下载最终视频或查看分镜详情。</>
              ),
            },
          ]}
        />
      </SectionCard>

      {/* 工作流程概览 */}
      <SectionCard title="工作流程概览">
        <p className="mb-4">创剪采用五阶段流水线处理视频：</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { stage: '1', name: '视频分析', desc: '上传视频 → Gemini 分析 → 生成分镜脚本' },
            { stage: '2', name: '旁白生成', desc: 'Context Cache → 批量生成三版本旁白' },
            { stage: '3', name: '分镜提取', desc: 'FFmpeg 批量拆条 → 提取各个分镜片段' },
            { stage: '4', name: '音画同步', desc: '语音合成 → 视频调速 → 音画合成 → 字幕' },
            { stage: '5', name: '最终合成', desc: '拼接分镜 → 添加配乐 → 导出成片' },
          ].map((item) => (
            <div
              key={item.stage}
              className="p-4 rounded-xl border border-claude-cream-200 bg-claude-cream-50/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-claude-orange-500 text-white text-xs font-semibold">
                  {item.stage}
                </span>
                <span className="font-semibold text-claude-dark-700">{item.name}</span>
              </div>
              <p className="text-xs text-claude-dark-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
