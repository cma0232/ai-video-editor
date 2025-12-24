import { Callout, SectionCard, StepList } from '@/components/guide'
import { Badge } from '@/components/ui'

export function ApiConfigTab() {
  return (
    <div className="space-y-6">
      {/* 配置说明 */}
      <SectionCard title="配置说明">
        <p className="mb-4">
          创剪支持两种 Gemini 接入方式：<strong>AI Studio</strong> 和 <strong>Vertex AI</strong>
          。请选择其中一种完整配置即可使用。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border-2 border-dashed border-claude-cream-300 bg-claude-cream-50/50">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">推荐新手</Badge>
              <span className="font-semibold text-claude-dark-700">AI Studio 模式</span>
            </div>
            <p className="text-sm text-claude-dark-500">
              配置简单，只需一个 API Key 即可快速上手。适合个人用户和测试场景。
            </p>
          </div>
          <div className="p-4 rounded-xl border-2 border-dashed border-claude-cream-300 bg-claude-cream-50/50">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">企业级</Badge>
              <span className="font-semibold text-claude-dark-700">Vertex AI 模式</span>
            </div>
            <p className="text-sm text-claude-dark-500">
              功能完整，适合生产环境。需要配置 GCP 项目和 Service Account。
            </p>
          </div>
        </div>
        <Callout type="info" title="语音合成选项" className="mt-4">
          系统内置免费的 <strong>Edge TTS</strong>，无需配置即可使用。 如需更高质量的语音，可选配置{' '}
          <strong>Fish Audio</strong>。
        </Callout>
      </SectionCard>

      {/* ==================== 方案一：AI Studio 模式 ==================== */}
      <SectionCard title="方案一：AI Studio 模式（完整配置）">
        <p className="mb-4 text-claude-dark-600">
          选择此方案，需要配置以下 2 项服务。配置完成后即可创建任务。
        </p>

        {/* 1. Google AI Studio */}
        <div className="mb-6 p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
          <h4 className="font-semibold text-claude-dark-700 mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-claude-orange-500 text-white text-xs font-semibold">
              1
            </span>
            Google AI Studio 配置
          </h4>
          <StepList
            steps={[
              {
                title: '获取 API Key',
                description: (
                  <>
                    访问{' '}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-claude-orange-600 hover:underline"
                    >
                      Google AI Studio
                    </a>
                    ，登录 Google 账号后点击「Get API Key」创建密钥。
                  </>
                ),
              },
              {
                title: '配置密钥',
                description: '在「密钥设置」→「Google AI Studio 配置」中填入 API Key。',
              },
              {
                title: '选择模型（可选）',
                description:
                  '默认使用 gemini-3-pro-preview，可根据需要修改为其他模型（如 gemini-2.5-flash）。',
              },
            ]}
          />
        </div>

        {/* 2. Fish Audio（可选） */}
        <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
          <h4 className="font-semibold text-claude-dark-700 mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-claude-cream-400 text-white text-xs font-semibold">
              2
            </span>
            Fish Audio 配置（可选）
          </h4>
          <Callout type="tip" className="mb-3">
            系统已内置免费的 Edge TTS，无需配置即可使用。Fish Audio 为可选的高质量语音服务。
          </Callout>
          <p className="text-sm text-claude-dark-500 mb-3">
            Fish Audio 提供更自然的 AI 语音合成服务，适合追求高质量配音的场景。
          </p>
          <StepList
            steps={[
              {
                title: '注册并获取 API Key',
                description: (
                  <>
                    访问{' '}
                    <a
                      href="https://fish.audio/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-claude-orange-600 hover:underline"
                    >
                      Fish Audio
                    </a>{' '}
                    注册账号，在账户设置中生成 API Key。
                  </>
                ),
              },
              {
                title: '选择 Voice ID',
                description: '在 Fish Audio 平台选择或创建语音角色，获取 Voice ID。',
              },
              {
                title: '配置密钥',
                description: '在「密钥设置」→「Fish Audio 配置」中填入 API Key 和默认 Voice ID。',
              },
            ]}
          />
        </div>
      </SectionCard>

      {/* ==================== 方案二：Vertex AI 模式 ==================== */}
      <SectionCard title="方案二：Vertex AI 模式（完整配置）">
        <p className="mb-4 text-claude-dark-600">
          选择此方案，需要配置以下 3 项服务。Vertex AI 模式功能更完整，适合生产环境。
        </p>

        {/* 1. Google Vertex AI */}
        <div className="mb-6 p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
          <h4 className="font-semibold text-claude-dark-700 mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-claude-orange-500 text-white text-xs font-semibold">
              1
            </span>
            Google Vertex AI 配置
          </h4>
          <StepList
            steps={[
              {
                title: '创建 GCP 项目',
                description: (
                  <>
                    访问{' '}
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-claude-orange-600 hover:underline"
                    >
                      Google Cloud Console
                    </a>
                    ，创建新项目或选择已有项目。
                  </>
                ),
              },
              {
                title: '启用 Vertex AI API',
                description: '在项目中搜索并启用「Vertex AI API」。',
              },
              {
                title: '创建 Service Account',
                description:
                  '进入「IAM 和管理」→「服务账号」，创建服务账号并授予「Vertex AI User」角色，然后下载 JSON 密钥文件。',
              },
              {
                title: '配置密钥',
                description:
                  '在「密钥设置」→「Google Vertex 配置」中填入 Project ID、Location、Service Account JSON。',
              },
            ]}
          />
          <Callout type="info" className="mt-3">
            建议 Location 使用{' '}
            <code className="px-1 py-0.5 bg-claude-cream-100 rounded">global</code>，以支持最新的
            Gemini 模型。
          </Callout>
        </div>

        {/* 2. Google Cloud Storage */}
        <div className="mb-6 p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
          <h4 className="font-semibold text-claude-dark-700 mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-claude-orange-500 text-white text-xs font-semibold">
              2
            </span>
            Google Cloud Storage 配置
          </h4>
          <p className="text-sm text-claude-dark-500 mb-3">
            Vertex AI 模式需要 GCS 存储，用于存储视频文件。
          </p>
          <StepList
            steps={[
              {
                title: '创建 Storage Bucket',
                description: '在 Google Cloud Console 中创建 Cloud Storage Bucket。',
              },
              {
                title: '配置权限',
                description: '确保 Service Account 对 Bucket 有读写权限。',
              },
              {
                title: '填写配置',
                description: '在「密钥设置」→「Google Vertex 配置」中填入 Bucket 名称。',
              },
            ]}
          />
        </div>

        {/* 3. Fish Audio（可选） */}
        <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
          <h4 className="font-semibold text-claude-dark-700 mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-claude-cream-400 text-white text-xs font-semibold">
              3
            </span>
            Fish Audio 配置（可选）
          </h4>
          <Callout type="tip" className="mb-3">
            系统已内置免费的 Edge TTS，无需配置即可使用。Fish Audio 为可选的高质量语音服务。
          </Callout>
          <p className="text-sm text-claude-dark-500 mb-3">
            Fish Audio 提供更自然的 AI 语音合成服务，适合追求高质量配音的场景。
          </p>
          <StepList
            steps={[
              {
                title: '注册并获取 API Key',
                description: (
                  <>
                    访问{' '}
                    <a
                      href="https://fish.audio/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-claude-orange-600 hover:underline"
                    >
                      Fish Audio
                    </a>{' '}
                    注册账号，在账户设置中生成 API Key。
                  </>
                ),
              },
              {
                title: '选择 Voice ID',
                description: '在 Fish Audio 平台选择或创建语音角色，获取 Voice ID。',
              },
              {
                title: '配置密钥',
                description: '在「密钥设置」→「Fish Audio 配置」中填入 API Key 和默认 Voice ID。',
              },
            ]}
          />
        </div>
      </SectionCard>

      {/* 配置验证 */}
      <Callout type="tip" title="配置完成后">
        配置完成后，可以在「密钥设置」页面点击各服务的「测试连接」按钮验证配置是否正确。
        所有服务验证通过后，即可返回首页创建剪辑任务。
      </Callout>
    </div>
  )
}
