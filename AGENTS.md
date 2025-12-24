# CLAUDE.md

## 项目简介

ChuangCut 是基于 Google Gemini AI 的全自动视频剪辑工具。

**核心能力**：视频智能分析 → 分镜脚本生成 → AI 配音合成 → 本地音画同步

**版本**：16.0.0

## 技术栈

- Next.js 16.0.6 + React 19.2 + TypeScript
- Tailwind CSS v4.1 + SQLite (better-sqlite3)
- Google Gemini (Vertex AI / AI Studio)
- FFmpeg 8.0.1 + Fish Audio

## 开发命令

```bash
./scripts/dev.sh          # 启动开发环境
pnpm build                 # 开发构建
pnpm build:production      # 生产构建（带混淆）
pnpm lint && pnpm format   # 代码验证
```

## 关键约束

- 禁止 Server Actions，统一使用 API Routes
- 工作流核心：`lib/workflow/engine.ts`
- 代码验证：提交前运行 `pnpm lint`

## 按需参考文档

**开始任务前，请先阅读对应的 `docs/agent/` 文档**：

| 任务类型     | 参考文档                                           |
| ------------ | -------------------------------------------------- |
| 理解项目架构 | [docs/agent/架构.md](docs/agent/架构.md)           |
| 修改数据库   | [docs/agent/数据库.md](docs/agent/数据库.md)       |
| 工作流相关   | [docs/agent/工作流.md](docs/agent/工作流.md)       |
| 添加 API     | [docs/agent/接口路由.md](docs/agent/接口路由.md)   |
| AI 调用      | [docs/agent/AI集成.md](docs/agent/AI集成.md)       |
| 工具函数     | [docs/agent/工具函数.md](docs/agent/工具函数.md)   |
| 部署发布     | [docs/agent/部署.md](docs/agent/部署.md)           |
| 测试账号     | [docs/agent/凭证.md](docs/agent/凭证.md)           |
| 前端开发     | [docs/agent/前端.md](docs/agent/前端.md)           |
| 风格系统     | [docs/agent/风格系统.md](docs/agent/风格系统.md)   |
| 环境变量     | [docs/agent/环境变量.md](docs/agent/环境变量.md)   |
| 问题排查     | [docs/agent/故障排查.md](docs/agent/故障排查.md)   |
| 测试相关     | [docs/agent/测试/索引.md](docs/agent/测试/索引.md) |
| 版本历史     | [docs/agent/更新日志.md](docs/agent/更新日志.md)   |

## 外部服务

- **Gemini**：Vertex AI（企业级）/ AI Studio（个人用户）
- **FFmpeg 8.0.1**：本地视频处理（拆条、拼接、调速、合成，零 API 费用）
- **Fish Audio**：AI 语音合成
- **GCS**：最终成片存储（Vertex AI 模式）

## 注意事项

1. 永远使用简体中文进行沟通和文档编写
2. 所有 Run & Debug 操作通过 `scripts/` 目录下的 `.sh` 脚本执行
3. 数据结构使用强类型，避免 `any`
4. 禁止使用 CommonJS，只用 ES Modules
