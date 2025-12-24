import { Callout, CodeBlock, SectionCard } from '@/components/guide'
import { Badge } from '@/components/ui'

export function ApiExamplesTab() {
  return (
    <div className="space-y-6">
      {/* 说明提示 */}
      <Callout type="info" title="说明">
        以下为任务创建和获取结果的核心 API 示例，仅供参考，尚未完整测试验证。如遇问题，可借助 Claude
        Code 根据源码调试解决。更多高级功能请使用 Web 界面操作。
      </Callout>

      {/* API 概览 */}
      <SectionCard title="API 概览">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
              <span className="text-sm text-claude-dark-500">Base URL</span>
              <p className="font-mono text-claude-dark-700">http://localhost:8899</p>
            </div>
            <div className="p-3 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
              <span className="text-sm text-claude-dark-500">响应格式</span>
              <p className="font-mono text-claude-dark-700">application/json</p>
            </div>
          </div>
          <Callout type="info" title="认证方式">
            如果系统启用了鉴权（AUTH_ENABLED=true），需要在请求头中携带 API Token。
            可在「密钥设置」页面的「API Token」标签页生成 Token。
          </Callout>
        </div>
      </SectionCard>

      {/* 创建任务 */}
      <SectionCard title="创建任务 (POST /api/jobs)">
        <p className="mb-4 text-claude-dark-600">
          创建一个新的视频剪辑任务，支持单视频和多视频模式。
        </p>

        <h4 className="font-semibold text-claude-dark-700 mb-2">完整请求示例</h4>
        <CodeBlock
          language="bash"
          filename="POST /api/jobs"
          code={`curl -X POST http://localhost:8899/api/jobs \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "input_videos": [
      {
        "url": "https://example.com/video.mp4",
        "label": "产品介绍视频",
        "title": "2025新品发布会",
        "description": "这是一段产品介绍视频，包含功能演示"
      }
    ],
    "style_id": "style-1000",
    "config": {
      "gemini_platform": "ai-studio",
      "storyboard_count": 6,
      "script_outline": "重点介绍产品的三大核心功能：便捷性、安全性、创新性",
      "original_audio_scene_count": 3,
      "bgm_url": "https://example.com/background-music.mp3",
      "max_concurrent_scenes": 3
    }
  }'`}
        />

        <h4 className="font-semibold text-claude-dark-700 mb-2 mt-6">多视频混剪示例</h4>
        <CodeBlock
          language="bash"
          filename="POST /api/jobs (多视频)"
          code={`curl -X POST http://localhost:8899/api/jobs \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{
    "input_videos": [
      { "url": "https://example.com/video1.mp4", "label": "开场素材" },
      { "url": "https://example.com/video2.mp4", "label": "产品展示" },
      { "url": "https://example.com/video3.mp4", "label": "用户评价" }
    ],
    "style_id": "style-1001",
    "config": {
      "gemini_platform": "vertex",
      "storyboard_count": 6,
      "script_outline": "将三段素材整合为一个完整的产品宣传片"
    }
  }'`}
        />

        {/* 完整参数说明 */}
        <div className="mt-6 space-y-4">
          <h4 className="font-semibold text-claude-dark-700 text-lg">完整参数说明</h4>

          {/* input_videos */}
          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-claude-cream-100 px-2 py-1 rounded font-semibold">
                input_videos
              </code>
              <Badge variant="warning">必填</Badge>
              <span className="text-sm text-claude-dark-500">数组，1-10 个视频</span>
            </div>
            <p className="text-sm text-claude-dark-600 mb-3">
              输入视频列表，每个视频包含以下字段：
            </p>
            <div className="ml-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <code className="bg-claude-cream-100 px-1 rounded shrink-0">url</code>
                <Badge variant="warning" className="shrink-0">
                  必填
                </Badge>
                <span className="text-claude-dark-500">
                  视频的完整 URL 地址，支持 http/https 协议
                </span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-claude-cream-100 px-1 rounded shrink-0">label</code>
                <Badge variant="outline" className="shrink-0">
                  可选
                </Badge>
                <span className="text-claude-dark-500">
                  视频标签（最多 50 字符），用于在界面中标识视频。留空时自动从 URL 文件名提取
                </span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-claude-cream-100 px-1 rounded shrink-0">title</code>
                <Badge variant="outline" className="shrink-0">
                  可选
                </Badge>
                <span className="text-claude-dark-500">
                  视频标题（最多 200 字符），用于 AI 分析时的参考
                </span>
              </div>
              <div className="flex items-start gap-2">
                <code className="bg-claude-cream-100 px-1 rounded shrink-0">description</code>
                <Badge variant="outline" className="shrink-0">
                  可选
                </Badge>
                <span className="text-claude-dark-500">
                  视频描述（最多 500 字符），帮助 AI 更好地理解视频内容
                </span>
              </div>
            </div>
          </div>

          {/* style_id */}
          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-claude-cream-100 px-2 py-1 rounded font-semibold">style_id</code>
              <Badge variant="warning">必填</Badge>
              <span className="text-sm text-claude-dark-500">字符串</span>
            </div>
            <p className="text-sm text-claude-dark-600 mb-2">
              剪辑风格 ID，决定视频的解说风格和配音方式。
            </p>
            <div className="text-sm text-claude-dark-500">
              <p className="mb-1">常用风格 ID：</p>
              <ul className="ml-4 space-y-1">
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">style-1000</code> - 短视频复刻
                </li>
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">style-1001</code> - 通用解说
                </li>
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">style-1002</code> - 商品评测
                </li>
              </ul>
              <p className="mt-2 text-xs">提示：可在 Web 界面「风格管理」页面查看所有可用风格</p>
            </div>
          </div>

          {/* config.gemini_platform */}
          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-claude-cream-100 px-2 py-1 rounded font-semibold">
                config.gemini_platform
              </code>
              <Badge variant="outline">可选</Badge>
              <span className="text-sm text-claude-dark-500">字符串</span>
            </div>
            <p className="text-sm text-claude-dark-600 mb-2">
              Gemini AI 平台选择，影响视频分析能力。
            </p>
            <div className="text-sm text-claude-dark-500">
              <ul className="ml-4 space-y-1">
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">ai-studio</code> -
                  个人用户推荐，配置简单，限制 500MB/1小时
                </li>
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">vertex</code> - 企业级，需配置
                  GCP 服务账号
                </li>
              </ul>
              <p className="mt-2 text-xs">提示：留空时使用系统默认配置</p>
            </div>
          </div>

          {/* config.storyboard_count */}
          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-claude-cream-100 px-2 py-1 rounded font-semibold">
                config.storyboard_count
              </code>
              <Badge variant="outline">可选</Badge>
              <span className="text-sm text-claude-dark-500">整数，3-100</span>
            </div>
            <p className="text-sm text-claude-dark-600 mb-2">
              AI 生成的分镜（片段）数量，决定最终视频的结构。
            </p>
            <div className="text-sm text-claude-dark-500">
              <ul className="ml-4 space-y-1">
                <li>默认 6 个分镜</li>
              </ul>
              <p className="mt-2 text-xs">
                建议：短视频（1-3分钟）建议 8-15 个，长视频（5分钟以上）建议 20-50 个
              </p>
            </div>
          </div>

          {/* config.script_outline */}
          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-claude-cream-100 px-2 py-1 rounded font-semibold">
                config.script_outline
              </code>
              <Badge variant="outline">可选</Badge>
              <span className="text-sm text-claude-dark-500">字符串，最多 5000 字</span>
            </div>
            <p className="text-sm text-claude-dark-600 mb-2">
              文案大纲，用于引导 AI 生成旁白的方向和重点。
            </p>
            <div className="text-sm text-claude-dark-500">
              <p className="mb-1">示例：</p>
              <ul className="ml-4 space-y-1 italic">
                <li>&quot;重点介绍产品的便捷性和安全性&quot;</li>
                <li>&quot;用轻松幽默的语气讲解操作步骤&quot;</li>
                <li>&quot;突出性价比优势，适合年轻用户群体&quot;</li>
              </ul>
              <p className="mt-2 text-xs">提示：提供明确的大纲可显著提升旁白质量</p>
            </div>
          </div>

          {/* config.original_audio_scene_count */}
          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-claude-cream-100 px-2 py-1 rounded font-semibold">
                config.original_audio_scene_count
              </code>
              <Badge variant="outline">可选</Badge>
              <span className="text-sm text-claude-dark-500">整数，0-500，默认 0</span>
            </div>
            <p className="text-sm text-claude-dark-600 mb-2">
              保留原声的分镜数量。这些分镜将使用原视频的音频，而非 AI 配音。
            </p>
            <div className="text-sm text-claude-dark-500">
              <ul className="ml-4 space-y-1">
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">0</code> - 全部使用 AI
                  配音（默认）
                </li>
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">3</code> - 前 3
                  个分镜保留原声，其余 AI 配音
                </li>
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">全部分镜数</code> -
                  全部保留原声
                </li>
              </ul>
              <p className="mt-2 text-xs">适用场景：保留人物对话、背景音乐等原始音频</p>
            </div>
          </div>

          {/* config.bgm_url */}
          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-claude-cream-100 px-2 py-1 rounded font-semibold">
                config.bgm_url
              </code>
              <Badge variant="outline">可选</Badge>
              <span className="text-sm text-claude-dark-500">字符串（URL）</span>
            </div>
            <p className="text-sm text-claude-dark-600 mb-2">
              背景音乐 URL，用于为最终视频添加背景音乐。
            </p>
            <div className="text-sm text-claude-dark-500">
              <ul className="ml-4 space-y-1">
                <li>留空或不提供：不添加背景音乐</li>
                <li>
                  填写音频文件 URL（如{' '}
                  <code className="bg-claude-cream-100 px-1 rounded">
                    https://example.com/music.mp3
                  </code>
                  ）：添加背景音乐
                </li>
              </ul>
              <p className="mt-2 text-xs">
                支持格式：MP3。背景音乐会循环播放并自动调整音量（默认 40%）
              </p>
            </div>
          </div>

          {/* config.max_concurrent_scenes */}
          <div className="p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
            <div className="flex items-center gap-2 mb-2">
              <code className="bg-claude-cream-100 px-2 py-1 rounded font-semibold">
                config.max_concurrent_scenes
              </code>
              <Badge variant="outline">可选</Badge>
              <span className="text-sm text-claude-dark-500">整数，1-8</span>
            </div>
            <p className="text-sm text-claude-dark-600 mb-2">
              分镜并发处理数，影响任务执行速度和系统资源占用。
            </p>
            <div className="text-sm text-claude-dark-500">
              <ul className="ml-4 space-y-1">
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">1</code> - 串行处理，资源占用低
                </li>
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">3</code> -
                  推荐值，平衡速度和稳定性
                </li>
                <li>
                  <code className="bg-claude-cream-100 px-1 rounded">8</code> - 最大并发，处理最快
                </li>
              </ul>
              <p className="mt-2 text-xs">提示：留空时使用系统默认配置（默认 3）</p>
            </div>
          </div>
        </div>

        <h4 className="font-semibold text-claude-dark-700 mb-2 mt-6">响应示例</h4>
        <CodeBlock
          language="json"
          filename="Response 200"
          code={`{
  "job_id": "job_abc123",
  "video_count": 1,
  "queue_status": {
    "running": 0,
    "max_concurrent": 1
  }
}`}
        />
      </SectionCard>

      {/* 获取风格列表 */}
      <SectionCard title="获取风格列表 (GET /api/styles)">
        <p className="mb-4 text-claude-dark-600">
          获取所有可用的剪辑风格，创建任务时需要使用 style_id 参数：
        </p>
        <CodeBlock
          language="bash"
          filename="GET /api/styles"
          code={`curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
  http://localhost:8899/api/styles`}
        />

        <h4 className="font-semibold text-claude-dark-700 mb-2 mt-6">响应示例</h4>
        <CodeBlock
          language="json"
          filename="Response 200"
          code={`{
  "builtin": [
    {
      "id": "style-1000",
      "name": "短视频复刻",
      "description": "多视频素材智能重塑，学习原视频风格措辞，混剪生成全新带货视频",
      "config": {
        "channel_name": "翔宇复刻频道",
        "original_audio_scene_count": 0
      },
      "is_builtin": true
    },
    {
      "id": "style-1001",
      "name": "通用解说",
      "description": "AI通用风格视频解说模板，适用于各类视频内容的专业解说",
      "config": {
        "channel_name": "翔宇通用解说",
        "original_audio_scene_count": 0
      },
      "is_builtin": true
    }
  ],
  "custom": []
}`}
        />

        <div className="mt-4 p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
          <h4 className="font-semibold text-claude-dark-700 mb-2">响应字段说明</h4>
          <ul className="text-sm text-claude-dark-500 space-y-1">
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">builtin</code> - 内置风格列表（ID
              范围 1000-1999）
            </li>
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">custom</code> - 自定义风格列表（ID
              范围 2000+）
            </li>
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">id</code> - 风格
              ID，用于创建任务时的 style_id 参数
            </li>
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">name</code> - 风格名称
            </li>
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">description</code> - 风格描述
            </li>
          </ul>
        </div>
      </SectionCard>

      {/* 获取任务列表 */}
      <SectionCard title="获取任务列表 (GET /api/jobs)">
        <p className="mb-4 text-claude-dark-600">获取所有任务的列表，支持分页和状态筛选：</p>
        <CodeBlock
          language="bash"
          filename="GET /api/jobs"
          code={`# 获取所有任务
curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
  http://localhost:8899/api/jobs

# 按状态筛选
curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
  "http://localhost:8899/api/jobs?status=completed"

# 分页查询
curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
  "http://localhost:8899/api/jobs?limit=10&offset=0"`}
        />

        <div className="mt-4 p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
          <h4 className="font-semibold text-claude-dark-700 mb-2">查询参数</h4>
          <ul className="text-sm text-claude-dark-500 space-y-1">
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">status</code> -
              状态筛选：pending、processing、completed、failed
            </li>
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">limit</code> -
              返回数量（1-100，默认 20）
            </li>
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">offset</code> - 偏移量（默认 0）
            </li>
          </ul>
        </div>

        <h4 className="font-semibold text-claude-dark-700 mb-2 mt-6">响应示例</h4>
        <CodeBlock
          language="json"
          filename="Response 200"
          code={`{
  "jobs": [
    {
      "id": "job_abc123",
      "status": "completed",
      "style_id": "style-1000",
      "style_name": "科技解说",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:45:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}`}
        />
      </SectionCard>

      {/* 获取任务详情 */}
      <SectionCard title="获取任务详情 (GET /api/jobs/:id)">
        <p className="mb-4 text-claude-dark-600">
          获取指定任务的详细信息，包括进度状态和最终结果：
        </p>
        <CodeBlock
          language="bash"
          filename="GET /api/jobs/:id"
          code={`curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
  http://localhost:8899/api/jobs/job_abc123`}
        />

        <h4 className="font-semibold text-claude-dark-700 mb-2 mt-6">响应示例（处理中）</h4>
        <CodeBlock
          language="json"
          filename="Response 200"
          code={`{
  "id": "job_abc123",
  "status": "processing",
  "current_step": "process_scenes",
  "style_id": "style-1000",
  "style_name": "科技解说",
  "input_videos": [
    { "url": "https://example.com/video.mp4", "label": "我的视频" }
  ],
  "state": {
    "phase": "process_scenes",
    "progress": 60,
    "scenes_completed": 9,
    "scenes_total": 15
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:35:00Z"
}`}
        />

        <h4 className="font-semibold text-claude-dark-700 mb-2 mt-6">响应示例（已完成）</h4>
        <CodeBlock
          language="json"
          filename="Response 200"
          code={`{
  "id": "job_abc123",
  "status": "completed",
  "current_step": "download_to_local",
  "style_id": "style-1000",
  "style_name": "科技解说",
  "state": {
    "phase": "compose",
    "progress": 100
  },
  "output_url": "https://storage.example.com/output/job_abc123.mp4",
  "local_path": "/output/job_abc123.mp4",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:45:00Z"
}`}
        />

        <div className="mt-4 p-4 rounded-lg bg-claude-cream-50 border border-claude-cream-200">
          <h4 className="font-semibold text-claude-dark-700 mb-2">任务状态说明</h4>
          <ul className="text-sm text-claude-dark-500 space-y-1">
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">pending</code> - 待处理（等待执行）
            </li>
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">processing</code> - 处理中
            </li>
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">completed</code> -
              已完成（可获取结果）
            </li>
            <li>
              <code className="bg-claude-cream-100 px-1 rounded">failed</code> - 失败
            </li>
          </ul>
        </div>
      </SectionCard>

      {/* 健康检查 */}
      <SectionCard title="健康检查 (GET /api/health)">
        <p className="mb-4 text-claude-dark-600">检查服务运行状态（无需认证）：</p>
        <CodeBlock language="bash" code={'curl http://localhost:8899/api/health'} />

        <h4 className="font-semibold text-claude-dark-700 mb-2 mt-4">响应示例</h4>
        <CodeBlock
          language="json"
          filename="Response 200"
          code={`{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z"
}`}
        />
      </SectionCard>

      <Callout type="warning" title="注意事项">
        <ul className="list-disc list-inside space-y-1">
          <li>生产环境请将 localhost:8899 替换为实际部署地址</li>
          <li>将 YOUR_API_TOKEN 替换为实际的 API Token</li>
          <li>更多功能（风格管理、任务控制、日志查询等）请使用 Web 界面操作</li>
        </ul>
      </Callout>
    </div>
  )
}
