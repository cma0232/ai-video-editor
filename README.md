# Video Auto Clipping Tool

**版本**：16.0.0

基于 Google Gemini AI 的全自动视频剪辑工具，支持智能分镜、音画同步和多种解说风格。

## 技术栈

- **前端**: Next.js 16.0.6 + React 19.2 + TypeScript 5.9
- **UI**: Tailwind CSS v4.1 + shadcn/ui（三分类架构：base/composite/feedback）
- **数据库**: SQLite (better-sqlite3)
- **视频处理**: FFmpeg 8.0.1（本地处理）
- **AI**: Google Gemini + Fish Audio / Edge TTS
- **部署**: Docker

## 快速开始

### 开发环境

```bash
# 一键启动（推荐，自动处理依赖和数据库初始化）
./scripts/dev.sh

# 或手动分步执行
pnpm install       # 安装依赖
pnpm db:init       # 初始化数据库
pnpm dev           # 启动开发服务器
```

访问 http://localhost:8899

### 配置环境变量

创建 `.env.local` 文件：

```env
# 授权码（必需，联系翔宇工作流获取）
LICENSE_KEY=CCUT-XXXXXXXX-XXXX

# 数据库和目录
DATABASE_URL=file:./data/chuangcut.db
TEMP_DIR=./temp
OUTPUT_DIR=./output

# 加密密钥（首次启动自动生成，或手动设置 64 位十六进制字符串）
ENCRYPTION_KEY=your-64-character-hex-encryption-key

# 鉴权系统（生产环境必须启用）
AUTH_ENABLED=true
SESSION_SECRET=your-64-character-random-session-secret

# Vertex AI 模式额外配置（使用 Vertex AI 时必需）
# GCS_BUCKET=your-bucket-name
```

**生成加密密钥**：
```bash
# 生成 ENCRYPTION_KEY（64 字符）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 SESSION_SECRET（64 字符）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Docker部署

```bash
# 构建和推送多平台镜像（支持 linux/amd64 和 linux/arm64）
docker buildx build --platform linux/amd64,linux/arm64 \
  -t xiangyugongzuoliu/chuangcut-video-workflow:latest --push .

# 或使用 Docker Compose 本地开发
docker-compose up -d
```

访问 http://localhost:8899

## 项目结构

```
chuangcut-video-workflow/
├── app/                    # Next.js 16.0.6 页面和 API Routes
│   ├── api/               # RESTful API 端点
│   │   ├── jobs/         # 任务管理 API
│   │   ├── styles/       # 风格预设 API
│   │   └── api-keys/     # API 密钥管理
│   ├── jobs/              # 任务管理页面
│   ├── settings/          # 系统设置页面
│   └── styles/            # 风格编辑器
├── components/            # React 19 组件
│   ├── ui/               # UI 组件库（base/composite/feedback）
│   ├── jobs/             # 任务相关组件
│   ├── settings/         # 设置相关组件
│   ├── workbench/        # 任务工作台组件
│   └── styles/           # 风格管理组件
├── lib/                   # 核心业务逻辑
│   ├── db/               # 数据库三层架构
│   │   ├── core/        # 核心表操作（jobs, api-keys）
│   │   ├── tables/      # 业务表操作（8个文件）
│   │   └── managers/    # 高层管理器（状态、数据加载）
│   ├── workflow/         # 工作流引擎
│   │   ├── state/       # 状态管理（4 个核心模块 + 入口）
│   │   ├── steps/       # 步骤实现（5阶段流水线）
│   │   └── workflows/   # 工作流定义（单视频/多视频）
│   ├── ai/               # AI 客户端
│   │   ├── gemini/      # Gemini 客户端
│   │   └── tts/         # TTS 多提供商（Fish Audio / Edge TTS）
│   ├── subtitle/         # 字幕系统（ASS 格式，自适应字体）
│   ├── media/            # 本地媒体处理（FFmpeg 8.0.1）
│   ├── storage/          # GCS 客户端
│   ├── cost/             # 成本计算（pricing, calculator）
│   └── utils/            # 工具函数（logger, retry, download）
├── types/                 # TypeScript 类型定义
│   ├── core/             # 核心类型（job, style, scene）
│   ├── ai/               # AI 服务类型
│   ├── workflow/         # 工作流类型
│   ├── db/               # 数据库类型
│   └── api/              # API 类型
├── styles/                # 风格预设 YAML 文件（20 个）
├── scripts/               # 运维脚本（dev.sh, test.sh, build-multiplatform.sh 等）
└── data/                  # 数据目录（SQLite 数据库）
```

## 核心功能

- ✅ **智能视频分析**: 使用 Google Gemini AI 自动分析视频内容并生成分镜脚本
- ✅ **双平台支持**: 支持 Gemini Vertex AI（企业级）和 AI Studio（个人用户）两种模式
- ✅ **隐式缓存**: Gemini 自动缓存视频分析结果，批量旁白生成降低 ~74% Token 成本
- ✅ **自动配音合成**: 支持 Fish Audio（高质量付费）和 Edge TTS（免费）双提供商
- ✅ **自动字幕生成**: ASS 格式字幕，自适应字体大小，智能文本换行
- ✅ **本地音画同步**: 拆条、调速、合成、拼接、背景音乐混合使用本地 FFmpeg 8.0.1
- ✅ **跳切检测修剪**: 自动检测并裁剪分镜开头/结尾的跳切帧，提升成片质量
- ✅ **本地处理优势**: 零 API 费用，处理速度提升 3x，无网络延迟
- ✅ **音画同步优化**: 智能调速确保旁白与画面完美同步
- ✅ **步骤级追踪**: 每个步骤完成后记录状态，便于问题诊断
- ✅ **用户鉴权系统**: 支持单用户模式登录，保护生产环境安全
- ✅ **API密钥管理**: 统一管理所有外部服务密钥，AES-256-GCM 加密存储
- ✅ **实时进度监控**: Web 界面实时显示任务处理状态和进度

## 使用流程

### 1. 首次部署：注册管理员账号

⚠️ **重要**：生产环境部署时，必须设置 `AUTH_ENABLED=true`

首次访问系统时，会自动重定向到注册页面：

1. 输入用户名（3-32 字符）
2. 输入密码（最小 8 位）
3. 确认密码
4. 点击"注册"按钮

**单用户模式**：系统仅允许注册一个管理员账号，注册后将自动登录。

**开发模式**：如需跳过登录，设置 `AUTH_ENABLED=false`

### 2. 配置 API 密钥

首次使用需要在"设置"页面配置以下 API 密钥：

- **Google Gemini API**: 视频分析和分镜生成（支持双平台）

  **Vertex AI 模式（企业级）**：
  - Project ID, Location, Model ID, Service Account JSON
  - 适用场景：企业用户、需要 GCS 集成

  **AI Studio 模式（个人用户）**：
  - API Key（从 [aistudio.google.com](https://aistudio.google.com) 获取）, Model ID
  - 适用场景：个人用户、快速上手
  - 限制：单文件 500MB、视频 1 小时、存储 48 小时

- **TTS 语音合成**（配音功能必需，二选一）:
  - **Fish Audio**（高质量付费）: API Key, Voice ID
  - **Edge TTS**（免费）: 无需配置，在风格设置中选择 Edge TTS 即可

- **Google Cloud Storage** (可选): 最终成片存储（Vertex AI 模式）
  - Service Account JSON, Bucket Name

### 3. 创建剪辑任务

在首页：
1. 输入视频 URL（公开可访问的视频链接）
2. 选择剪辑风格（如"通用解说风格"）
3. 选择 Gemini 平台（如果配置了多个平台）
4. 点击"开始处理"创建任务

**平台选择建议**：
- 企业用户、需要 GCS 集成 → 选择 Vertex AI
- 个人用户、快速上手 → 选择 AI Studio（限制 500MB）

### 4. 监控任务进度

在"任务管理"页面查看所有任务的实时状态：
- **待处理** (pending): 任务已创建，等待开始
- **处理中** (processing): 任务正在执行
- **已完成** (completed): 任务成功完成（终态）
- **失败** (failed): 任务执行失败（终态）

## 工作流程

任务处理分为五个主要阶段：

1. **视频分析** (analysis): Gemini AI 分析视频内容，生成分镜脚本
2. **旁白生成** (generate_narrations): 多轮对话模式批量生成多版本旁白（v1/v2/v3），隐式缓存降低 ~74% Token 成本
3. **分镜提取** (extract_scenes): 使用 FFmpeg 拆分视频片段
4. **音画同步处理** (process_scenes): 读取预生成旁白，通过 Fish Audio 合成音频，FFmpeg 调速合成
5. **最终合成** (compose): 使用 FFmpeg 拼接所有处理后的分镜

每个步骤完成后会记录到 `job_step_history` 表，便于问题诊断和进度追踪。

## 开发文档

- **CLAUDE.md**: 项目快速上手指南和核心概念
- **docs/agent/**: 详细技术文档（架构、数据库、工作流、API 等）
- **styles/_templates/template-variables.md**: 风格模板占位符参考手册

