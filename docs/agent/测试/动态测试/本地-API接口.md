# 本地测试 - API 接口测试

> **测试环境**: 本地开发环境 (localhost:8899)
> **测试目标**: 全面验证本地 API 接口的正确性，排查程序错误，确保功能正常无报错
> **对应云端文档**: `04-云端-API接口.md`
> **用例数量**：30 个

---

## 一、测试凭据

> **重要**：测试凭据和资源请参考以下文件，本文档不包含敏感信息。

| 凭据类型 | 参考文件 |
|----------|----------|
| 环境地址、账号密码、数据库路径 | [凭据/本地.md](../凭据/本地.md) |
| 测试视频、API 配置模板 | [凭据/公共.md](../凭据/公共.md) |

---

## 二、测试目的

**核心目标**：通过 API 调用验证本地环境所有接口的正确性、安全性和稳定性，排查程序错误，确保功能正常无报错。

**具体要求**：
1. **全面验证**：按用例逐项测试，不得遗漏任何接口
2. **问题记录**：发现问题时记录请求参数、响应内容、HTTP 状态码、日志错误
3. **修复方案**：针对发现的问题，给出简洁高效的最优化修复方案

**修复原则**：
- ✅ **保证功能正常**：修复后必须确保现有功能正常运行
- ✅ **不引入新错误**：修复方案不得引入新的报错或问题
- ✅ **面向现有功能**：非必要不兼容历史数据，优先满足当前功能需求
- ❌ **避免过度设计**：不为假设的未来需求增加复杂性

**重点关注**：
- Token 认证有效性
- 输入参数验证
- 错误响应格式一致性
- 敏感数据脱敏
- 日志和控制台无报错

---

## 三、错误分析流程

```
发现问题 → 查看控制台错误 → 分析日志文件 → 定位代码位置 →
分析根因 → 提出修复方案 → 验证修复效果
```

### 日志监控命令

> 详细命令请参考 [凭据/本地.md](../凭据/本地.md) 的「调试命令」章节。

---

## 四、Guide 核心 API 验证

> **说明**：本节用例与 `/guide` 页面的 API 示例一一对应，确保用户按 Guide 操作可正常使用。
> **对应页面**：`http://localhost:8899/guide` → 「API 示例」标签页

### 5.0 Guide 核心 API 完整流程

按照 Guide 页面的使用流程，依次测试以下 API：

#### GUIDE-001: 健康检查（对应 Guide「健康检查」）

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/health` |
| **认证** | 不需要 |
| **Guide 对应** | 「健康检查 (GET /api/health)」章节 |

**请求示例**（与 Guide 完全一致）：

```bash
curl http://localhost:8899/api/health
```

**预期响应**（与 Guide 一致）：

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] status 为 "ok"
- [ ] 返回当前时间戳

---

#### GUIDE-002: 获取风格列表（对应 Guide「获取风格列表」）

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/styles` |
| **认证** | 需要（Bearer Token） |
| **Guide 对应** | 「获取风格列表 (GET /api/styles)」章节 |

**请求示例**（与 Guide 完全一致）：

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/styles
```

**预期响应**（与 Guide 一致）：

```json
{
  "builtin": [
    {
      "id": "style-1000",
      "name": "科技解说",
      "description": "专业科技产品解说风格",
      "config": {
        "channel_name": "科技频道",
        "original_audio_scene_count": 0
      },
      "is_builtin": true
    }
  ],
  "custom": []
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] builtin 数组包含内置风格（ID 范围 1000-1999）
- [ ] custom 数组包含自定义风格（ID 范围 2000+）
- [ ] 每个风格包含 id、name、description、config、is_builtin 字段
- [ ] **记录可用的 style_id：`________________`**（用于创建任务）

---

#### GUIDE-003: 创建单视频任务（对应 Guide「创建任务」）

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/jobs` |
| **认证** | 需要（Bearer Token） |
| **Guide 对应** | 「创建任务 (POST /api/jobs)」章节 |

**请求示例**（与 Guide 完全一致）：

```bash
curl -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "input_videos": [
      {
        "url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-1.mp4",
        "label": "产品介绍视频",
        "title": "2025新品发布会",
        "description": "这是一段产品介绍视频，包含功能演示"
      }
    ],
    "style_id": "style-1000",
    "config": {
      "language": "zh",
      "gemini_platform": "ai-studio",
      "storyboard_count": 15,
      "script_outline": "重点介绍产品的三大核心功能：便捷性、安全性、创新性",
      "original_audio_scene_count": 3,
      "voice_id": "",
      "max_concurrent_scenes": 3
    }
  }'
```

**预期响应**（与 Guide 一致）：

```json
{
  "job_id": "job_abc123",
  "video_count": 1,
  "queue_position": 0,
  "queue_status": {
    "pending": 0,
    "queued": 1,
    "total": 1
  }
}
```

**Guide 参数说明验证**：

| 参数 | 类型 | 必填 | 说明 | 验证 |
|------|------|------|------|------|
| `input_videos` | 数组 | ✅ | 1-10 个视频 | [ ] |
| `input_videos[].url` | 字符串 | ✅ | 视频 URL | [ ] |
| `input_videos[].label` | 字符串 | 可选 | 最多 50 字符 | [ ] |
| `input_videos[].title` | 字符串 | 可选 | 最多 200 字符 | [ ] |
| `input_videos[].description` | 字符串 | 可选 | 最多 500 字符 | [ ] |
| `style_id` | 字符串 | ✅ | 从风格列表获取 | [ ] |
| `config.language` | 字符串 | 可选 | zh/zh-TW/en/ja/ko | [ ] |
| `config.gemini_platform` | 字符串 | 可选 | ai-studio/vertex | [ ] |
| `config.storyboard_count` | 整数 | 可选 | 3-100 | [ ] |
| `config.script_outline` | 字符串 | 可选 | 最多 5000 字 | [ ] |
| `config.original_audio_scene_count` | 整数 | 可选 | 0-500 | [ ] |
| `config.voice_id` | 字符串 | 可选 | Fish Audio 音色 ID | [ ] |
| `config.max_concurrent_scenes` | 整数 | 可选 | 1-8（默认 3） | [ ] |

**验证清单**：
- [ ] 响应状态码为 201
- [ ] 返回有效的 job_id
- [ ] video_count = 1
- [ ] **记录 job_id：`________________`**（用于后续测试）

---

#### GUIDE-004: 创建多视频混剪任务（对应 Guide「多视频混剪示例」）

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/jobs` |
| **认证** | 需要（Bearer Token） |
| **Guide 对应** | 「创建任务」→「多视频混剪示例」 |

**请求示例**（与 Guide 完全一致）：

```bash
curl -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "input_videos": [
      { "url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-1.mp4", "label": "开场素材" },
      { "url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-2.mp4", "label": "产品展示" }
    ],
    "style_id": "style-1001",
    "config": {
      "language": "zh",
      "gemini_platform": "vertex",
      "storyboard_count": 6
    }
  }'
```

**预期响应**：

```json
{
  "job_id": "job_xxx",
  "video_count": 2,
  "queue_position": 0,
  "queue_status": {
    "pending": 0,
    "queued": 1,
    "total": 1
  }
}
```

**验证清单**：
- [ ] 响应状态码为 201
- [ ] video_count = 2
- [ ] 多视频时 storyboard_count 默认为 6

---

#### GUIDE-005: 获取任务列表（对应 Guide「获取任务列表」）

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs` |
| **认证** | 需要（Bearer Token） |
| **Guide 对应** | 「获取任务列表 (GET /api/jobs)」章节 |

**请求示例**（与 Guide 完全一致）：

```bash
# 获取所有任务
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/jobs

# 按状态筛选
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  "http://localhost:8899/api/jobs?status=completed"

# 分页查询
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  "http://localhost:8899/api/jobs?limit=10&offset=0"
```

**预期响应**（与 Guide 一致）：

```json
{
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
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] jobs 数组包含之前创建的任务
- [ ] 返回 total、limit、offset 分页信息
- [ ] status 筛选有效（pending/processing/completed/failed）

---

#### GUIDE-006: 获取任务详情 - 处理中（对应 Guide「获取任务详情」）

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs/:id` |
| **认证** | 需要（Bearer Token） |
| **Guide 对应** | 「获取任务详情 (GET /api/jobs/:id)」章节 |

**请求示例**（与 Guide 完全一致）：

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/jobs/job_abc123
```

**预期响应 - 处理中**（与 Guide 一致）：

```json
{
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
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 包含 state 进度信息
- [ ] state.progress 显示当前进度百分比
- [ ] state.scenes_completed / state.scenes_total 显示分镜进度

---

#### GUIDE-007: 获取任务详情 - 已完成（对应 Guide「响应示例（已完成）」）

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs/:id` |
| **认证** | 需要（Bearer Token） |
| **Guide 对应** | 「获取任务详情」→「响应示例（已完成）」 |

**预期响应 - 已完成**（与 Guide 一致）：

```json
{
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
}
```

**验证清单**：
- [ ] status 为 "completed"
- [ ] progress 为 100
- [ ] 包含 output_url 或 local_path（最终视频路径）

---

### Guide 核心 API 验证汇总

| 用例编号 | 用例名称 | Guide 对应章节 | 结果 |
|----------|----------|----------------|------|
| GUIDE-001 | 健康检查 | 健康检查 (GET /api/health) | ☐ 通过 / ☐ 失败 |
| GUIDE-002 | 获取风格列表 | 获取风格列表 (GET /api/styles) | ☐ 通过 / ☐ 失败 |
| GUIDE-003 | 创建单视频任务 | 创建任务 - 完整请求示例 | ☐ 通过 / ☐ 失败 |
| GUIDE-004 | 创建多视频任务 | 创建任务 - 多视频混剪示例 | ☐ 通过 / ☐ 失败 |
| GUIDE-005 | 获取任务列表 | 获取任务列表 (GET /api/jobs) | ☐ 通过 / ☐ 失败 |
| GUIDE-006 | 获取任务详情(处理中) | 获取任务详情 - 响应示例（处理中） | ☐ 通过 / ☐ 失败 |
| GUIDE-007 | 获取任务详情(已完成) | 获取任务详情 - 响应示例（已完成） | ☐ 通过 / ☐ 失败 |

**Guide 验证结论**：☐ 全部通过（用户可按 Guide 正常使用） / ☐ 存在问题

---

## 六、完整测试用例

### 6.1 Token 管理（前置条件）

#### TC-API-L001: 生成 API Token（Web 界面操作）

| 项目 | 值 |
|------|-----|
| **前置条件** | 已登录 Web 界面（或 AUTH_ENABLED=false） |
| **页面** | `http://localhost:8899/settings` → 「API Token」标签页 |

**操作步骤**：

1. 导航到 http://localhost:8899/settings
2. 点击「API Token」标签页
3. 点击「生成新 Token」按钮
4. 输入 Token 名称：`本地测试Token`
5. 选择有效期：`30 天`
6. 点击「生成」按钮
7. **复制并记录生成的 Token 值**（仅显示一次！）

**验证清单**：
- [ ] Token 生成成功，弹窗显示完整 Token
- [ ] Token 以 `cca_` 开头
- [ ] **已记录 Token 值：`________________`**（填写实际值）
- [ ] Token 列表中显示新创建的 Token

**日志监控关键词**: `auth`, `tokens`, `INSERT`

---

#### TC-API-L002: 获取 Token 列表（Web 界面验证）

| 项目 | 值 |
|------|-----|
| **页面** | `http://localhost:8899/settings` → 「API Token」标签页 |

**验证清单**：
- [ ] 列表显示刚创建的「本地测试Token」
- [ ] Token 值已脱敏显示（`cca_***xxxxxxxx`）
- [ ] 显示创建时间和过期时间

---

#### TC-API-L003: 删除 API Token（测试结束后执行）

| 项目 | 值 |
|------|-----|
| **页面** | `http://localhost:8899/settings` → 「API Token」标签页 |
| **执行时机** | 所有 API 测试完成后 |

**操作步骤**：

1. 在 Token 列表中找到「本地测试Token」
2. 点击对应的「删除」按钮
3. 确认删除

**验证清单**：
- [ ] Token 删除成功
- [ ] 列表中不再显示该 Token

---

### 5.2 健康检查 API

#### TC-API-L004: 健康检查

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/health` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s http://localhost:8899/api/health | jq .
```

**预期响应**（200）：

```json
{
  "status": "ok",
  "timestamp": "2025-11-27T10:00:00.000Z"
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] status 为 "ok"
- [ ] timestamp 为当前时间

**错误排查要点**：
- 如果返回 `status: "error"`，检查数据库文件是否存在
- 查看日志中的 `DATABASE` 相关错误
- 验证 `./data/db.sqlite` 文件权限

**常见错误及修复**：
| 错误现象 | 可能原因 | 修复方案 |
|----------|----------|----------|
| 连接超时 | 服务未启动 | 执行 `./scripts/dev.sh` |
| database locked | 数据库被锁定 | 重启服务或删除 `.sqlite-journal` 文件 |
| SQLITE_CANTOPEN | 路径错误或权限不足 | 检查 `./data/` 目录权限 |

---

### 5.3 鉴权系统 API

#### TC-API-L005: 用户登录

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/auth/login` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "xiangyugongzuoliu@gmail.com",
    "password": "XXXX"
  }' | jq .
```

**预期响应**（200）：

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "xiangyugongzuoliu@gmail.com"
  }
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] success 为 true
- [ ] 返回用户信息

---

#### TC-API-L006: 获取登录状态

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/auth/status` |
| **认证** | Cookie/Session |

**请求示例**：

```bash
curl -s http://localhost:8899/api/auth/status \
  -H "Cookie: session=YOUR_SESSION_COOKIE" | jq .
```

**预期响应**（200）：

```json
{
  "authenticated": true,
  "user": {
    "id": "...",
    "email": "xiangyugongzuoliu@gmail.com"
  }
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] authenticated 为 true（已登录）或 false（未登录）

---

#### TC-API-L007: 用户登出

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/auth/logout` |
| **认证** | Cookie/Session |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/auth/logout \
  -H "Cookie: session=YOUR_SESSION_COOKIE" | jq .
```

**预期响应**（200）：

```json
{
  "success": true
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] Session 被清除

---

### 5.4 任务管理 API

> **注意**：以下测试需要使用 TC-API-L001 生成的 Token 进行认证。
> 将 `YOUR_API_TOKEN` 替换为实际获取的 Token 值。

#### TC-API-L008: 创建单视频任务

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/jobs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "input_videos": [
      {
        "url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-1.mp4",
        "label": "API测试视频"
      }
    ],
    "style_id": "style-1000",
    "config": {
      "gemini_platform": "ai-studio",
      "storyboard_count": 3,
      "script_outline": "API测试任务",
      "original_audio_scene_count": 0,
      "language": "zh"
    }
  }' | jq .
```

**预期响应**（201）：

```json
{
  "job_id": "job_xxxxxxxx",
  "video_count": 1,
  "queue_position": 0,
  "queue_status": {
    "pending": 0,
    "queued": 1,
    "total": 1
  }
}
```

**验证清单**：
- [ ] 响应状态码为 201
- [ ] 返回有效的 job_id
- [ ] video_count = 1
- [ ] **记录 job_id：`________________`**（用于后续测试）

**日志监控**：
```bash
tail -f ./logs/app.log | grep -E "(POST /api/jobs|INSERT|job created)"
```

**常见错误及修复**：
| 错误现象 | 可能原因 | 修复方案 |
|----------|----------|----------|
| 400 style not found | 风格 ID 不存在 | 检查 styles 表或使用预置风格 |
| 500 database error | 数据库写入失败 | 检查磁盘空间和权限 |
| timeout | 视频 URL 验证超时 | 检查网络或跳过 URL 验证 |

---

#### TC-API-L009: 创建多视频混剪任务

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/jobs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "input_videos": [
      {
        "url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-1.mp4",
        "label": "素材1"
      },
      {
        "url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-2.mp4",
        "label": "素材2"
      }
    ],
    "style_id": "style-1000",
    "config": {
      "gemini_platform": "ai-studio",
      "storyboard_count": 4,
      "script_outline": "API多视频测试",
      "original_audio_scene_count": 1,
      "language": "zh"
    }
  }' | jq .
```

**预期响应**（201）：

```json
{
  "job_id": "job_xxxxxxxx",
  "video_count": 2
}
```

**验证清单**：
- [ ] 响应状态码为 201
- [ ] video_count = 2
- [ ] 返回有效的 job_id

---

#### TC-API-L010: 获取任务列表

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
# 获取所有任务
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/jobs | jq .

# 分页查询
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "http://localhost:8899/api/jobs?limit=10&offset=0" | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] jobs 数组包含之前创建的任务
- [ ] 返回 total、limit、offset 分页信息

**日志监控**：
```bash
tail -f ./logs/app.log | grep "GET /api/jobs"
```

---

#### TC-API-L011: 按状态筛选任务列表

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs?status=xxx` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
# 筛选处理中的任务
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "http://localhost:8899/api/jobs?status=processing" | jq .

# 筛选已完成的任务
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "http://localhost:8899/api/jobs?status=completed" | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回的任务状态与筛选条件一致
- [ ] 支持状态值：pending、processing、completed、failed

---

#### TC-API-L012: 获取任务详情

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
JOB_ID="<任务ID>"
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/jobs/$JOB_ID | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回完整的任务配置信息
- [ ] 包含 state 进度信息

**数据库验证**：
```bash
sqlite3 ./data/db.sqlite "SELECT * FROM jobs WHERE id='$JOB_ID';"
```

---

#### TC-API-L013: 获取任务日志

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs/:id/logs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
JOB_ID="<任务ID>"

# 获取所有日志
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/jobs/$JOB_ID/logs | jq .

# 按日志类型筛选
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "http://localhost:8899/api/jobs/$JOB_ID/logs?logType=error" | jq .

# 按大步骤筛选
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "http://localhost:8899/api/jobs/$JOB_ID/logs?majorStep=analysis" | jq .

# 按大步骤分组查看
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "http://localhost:8899/api/jobs/$JOB_ID/logs?groupByStage=true" | jq .
```

**预期响应**（200）：

```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-11-27T10:00:00.000Z",
      "level": "INFO",
      "message": "开始分析视频",
      "logType": "info",
      "majorStep": "analysis",
      "majorStepName": "视频分析",
      "subStep": "fetch_metadata",
      "subStepName": "获取元数据"
    }
  ]
}
```

**查询参数**：
| 参数 | 说明 |
|------|------|
| `logType` | 日志类型筛选（支持逗号分隔多选） |
| `majorStep` | 大步骤筛选（analysis/extract_scenes/process_scenes/compose） |
| `subStep` | 小步骤筛选 |
| `logLevel` | 日志级别筛选 |
| `groupByStage` | 按大步骤分组（true/false） |
| `groupByStep` | 按小步骤分组（true/false） |
| `limit` / `offset` | 分页参数 |

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 日志包含 logType、level、majorStep、subStep、message 字段
- [ ] 支持按 logType 筛选（info、warning、error、debug、api_call、scene_progress、ai_response）

---

#### TC-API-L014: 获取任务成本

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs/:id/cost` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
JOB_ID="<任务ID>"
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/jobs/$JOB_ID/cost | jq .
```

**预期响应**（200）：

```json
{
  "job_id": "job_xxxxxxxx",
  "costs": {
    "gemini": {
      "calls": 5,
      "total_cost": 0.15
    },
    "fish_audio": {
      "calls": 3,
      "total_cost": 0.05
    },
    "ffmpeg": {
      "calls": 10,
      "total_cost": 0
    }
  },
  "total_cost": 0.20
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回各服务的调用次数和成本

---

#### TC-API-L015: 删除任务

| 项目 | 值 |
|------|-----|
| **端点** | `DELETE /api/jobs/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
JOB_ID="<任务ID>"
curl -s -X DELETE -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/jobs/$JOB_ID | jq .
```

**预期响应**（200）：

```json
{
  "success": true,
  "message": "任务已删除"
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 再次获取任务详情返回 404

**验证级联删除**：
```bash
sqlite3 ./data/db.sqlite "SELECT COUNT(*) FROM job_step_history WHERE job_id='$JOB_ID';"
sqlite3 ./data/db.sqlite "SELECT COUNT(*) FROM job_scenes WHERE job_id='$JOB_ID';"
sqlite3 ./data/db.sqlite "SELECT COUNT(*) FROM job_logs WHERE job_id='$JOB_ID';"
```

---

### 5.5 风格管理 API

#### TC-API-L016: 获取风格列表

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/styles` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/styles | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] builtin 包含预设风格
- [ ] custom 包含自定义风格

---

#### TC-API-L017: 获取风格详情

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/styles/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/styles/style-1000 | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回完整的风格配置

---

#### TC-API-L018: 创建自定义风格

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/styles` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/styles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "name": "本地测试风格",
    "description": "通过API创建的测试风格",
    "analysis_creative_layer": "请用专业的语言分析视频内容...",
    "audio_sync_creative_layer": "旁白要简洁有力...",
    "config": {
      "channel_name": "本地测试频道",
      "language": "zh-CN",
      "duration_range": { "min": 5, "max": 10 },
      "speech_rates": [3.5, 4.5, 5.5]
    }
  }' | jq .
```

**预期响应**（201）：

```json
{
  "id": "style-2001",
  "name": "本地测试风格",
  "description": "通过API创建的测试风格",
  "is_builtin": false
}
```

**验证清单**：
- [ ] 响应状态码为 201
- [ ] 返回的 ID >= 2000
- [ ] **记录 style_id：`________________`**

---

#### TC-API-L019: 更新风格

| 项目 | 值 |
|------|-----|
| **端点** | `PUT /api/styles/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
STYLE_ID="<风格ID>"
curl -s -X PUT http://localhost:8899/api/styles/$STYLE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "name": "本地测试风格（已更新）",
    "description": "更新后的描述"
  }' | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 风格名称已更新

---

#### TC-API-L020: 删除自定义风格

| 项目 | 值 |
|------|-----|
| **端点** | `DELETE /api/styles/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
STYLE_ID="<风格ID>"
curl -s -X DELETE -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/styles/$STYLE_ID | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 只能删除自定义风格（ID >= 2000）
- [ ] 预设风格删除应返回 403

---

### 5.6 系统配置 API

#### TC-API-L021: 获取系统配置

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/configs` |
| **认证** | 需要 |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/configs | jq .
```

**预期响应**（200）：

```json
{
  "configs": {
    "default_gemini_model": "gemini-2.5-pro",
    "max_concurrent_scenes": "3",
    "default_voice_id": ""
  },
  "count": 3
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 包含 default_gemini_model 配置

---

#### TC-API-L022: 更新系统配置

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/configs` |
| **认证** | 需要 |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/configs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "configs": {
      "default_gemini_model": "gemini-2.5-flash"
    }
  }' | jq .
```

**预期响应**（200）：

```json
{
  "success": true,
  "updated": 1
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 配置已更新

---

### 5.7 API 密钥管理

#### TC-API-L023: 获取 API 密钥状态

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/api-keys` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s http://localhost:8899/api/api-keys | jq .
```

**预期响应**（200）：

```json
{
  "keys": {
    "google_ai_studio": {
      "configured": true,
      "verified": true,
      "last_verified_at": "2025-11-27T10:00:00.000Z"
    },
    "google_vertex": {
      "configured": false,
      "verified": false
    },
    "fish_audio_ai_studio": {
      "configured": true,
      "verified": true
    }
  }
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回各服务的配置状态
- [ ] 不返回实际的密钥值

---

#### TC-API-L024: 验证 API 密钥

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/api-keys/verify` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/api-keys/verify \
  -H "Content-Type: application/json" \
  -d '{
    "service": "google_ai_studio",
    "credentials": {
      "api_key": "<YOUR_GEMINI_API_KEY>"
    }
  }' | jq .
```

**预期响应**（200）：

```json
{
  "valid": true,
  "message": "API 密钥验证成功"
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] valid 表示验证是否成功

---

#### TC-API-L025: 保存 API 密钥

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/api-keys/:service` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/api-keys/google_ai_studio \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "api_key": "<YOUR_GEMINI_API_KEY>"
    }
  }' | jq .
```

**预期响应**（200）：

```json
{
  "success": true,
  "message": "保存成功并已验证",
  "verification": {
    "valid": true,
    "message": "API 密钥验证成功"
  }
}
```

**支持的服务类型**：
- `google_vertex` - Google Vertex AI
- `google_ai_studio` - Google AI Studio
- `fish_audio_vertex` - Fish Audio（Vertex 模式）
- `fish_audio_ai_studio` - Fish Audio（AI Studio 模式）
- `google_storage` - Google Cloud Storage

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 密钥验证并保存成功

---

### 5.8 Gemini 测试 API

#### TC-API-L026: Gemini 连接测试

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/gemini/test` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/gemini/test \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ai-studio"
  }' | jq .
```

**预期响应**（200）：

```json
{
  "success": true,
  "platform": "ai-studio",
  "model": "gemini-2.5-pro",
  "response_time_ms": 1500
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] success 为 true
- [ ] 返回使用的模型和响应时间

---

#### TC-API-L027: 获取可用模型列表

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/gemini/models` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s http://localhost:8899/api/gemini/models | jq .
```

**预期响应**（200）：

```json
{
  "models": [
    {
      "id": "gemini-2.5-pro",
      "name": "Gemini 2.5 Pro",
      "description": "最强大的多模态模型"
    },
    {
      "id": "gemini-2.5-flash",
      "name": "Gemini 2.5 Flash",
      "description": "快速响应模型"
    }
  ]
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回可用的模型列表

---

### 5.9 错误处理测试

#### TC-API-L028: 无效 Token 测试

| 项目 | 值 |
|------|-----|
| **测试场景** | 使用无效或过期的 Token |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer invalid_token_xxx" \
  http://localhost:8899/api/jobs | jq .
```

**预期响应**（401）：

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**验证清单**：
- [ ] 响应状态码为 401
- [ ] 返回明确的错误信息

---

#### TC-API-L029: 缺少必填参数测试

| 项目 | 值 |
|------|-----|
| **测试场景** | 创建任务时缺少 input_videos |

**请求示例**：

```bash
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "style_id": "style-1000"
  }' | jq .
```

**预期响应**（400）：

```json
{
  "error": "Invalid request body",
  "details": [
    {
      "code": "invalid_type",
      "path": ["input_videos"],
      "message": "Required"
    }
  ]
}
```

**验证清单**：
- [ ] 响应状态码为 400
- [ ] 返回详细的验证错误信息

---

#### TC-API-L030: 任务不存在测试

| 项目 | 值 |
|------|-----|
| **测试场景** | 获取不存在的任务详情 |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:8899/api/jobs/job_notexist123 | jq .
```

**预期响应**（404）：

```json
{
  "error": "Not Found",
  "message": "任务不存在"
}
```

**验证清单**：
- [ ] 响应状态码为 404
- [ ] 返回任务不存在的错误信息

---

## 六、错误分析与修复指南

### 6.1 常见错误代码

| HTTP 状态码 | 含义 | 常见原因 | 排查方向 |
|------------|------|----------|----------|
| 400 | Bad Request | 请求参数错误 | 检查请求体格式和必填字段 |
| 401 | Unauthorized | 认证失败 | 检查 Token 是否有效 |
| 404 | Not Found | 资源不存在 | 检查 ID 是否正确 |
| 409 | Conflict | 状态冲突 | 检查当前状态是否允许操作 |
| 500 | Internal Error | 服务端错误 | **重点查看日志** |

### 6.2 500 错误深度排查

当遇到 500 错误时，按以下步骤排查：

```bash
# 1. 查看最近的错误日志
tail -100 ./logs/app.log | grep -E "(ERROR|error|Error)" | tail -20

# 2. 查看完整错误堆栈
grep -A 20 "Error:" ./logs/app.log | tail -30

# 3. 检查数据库状态
sqlite3 ./data/db.sqlite ".tables"
sqlite3 ./data/db.sqlite "PRAGMA integrity_check;"

# 4. 检查磁盘空间
df -h .
```

### 6.3 性能问题排查

```bash
# 监控 API 响应时间
time curl -s http://localhost:8899/api/jobs > /dev/null

# 检查数据库查询性能
sqlite3 ./data/db.sqlite "EXPLAIN QUERY PLAN SELECT * FROM jobs;"

# 查看进程资源使用
ps aux | grep node
```

---

## 七、问题记录模板

| 编号 | 发现时间 | 测试用例 | 问题描述 | 日志关键信息 | 代码位置 | 根因分析 | 修复方案 | 严重程度 | 状态 |
|------|----------|----------|----------|--------------|----------|----------|----------|----------|------|
| BUG-LA001 | | TC-API-LXXX | | | | | | P0/P1/P2 | Open |

---

## 八、测试结果汇总

| 用例编号 | 用例名称 | 结果 | 备注 |
|----------|----------|------|------|
| TC-API-L001 | 生成 API Token | ☐ 通过 / ☐ 失败 | |
| TC-API-L002 | 获取 Token 列表 | ☐ 通过 / ☐ 失败 | |
| TC-API-L003 | 删除 API Token | ☐ 通过 / ☐ 失败 | |
| TC-API-L004 | 健康检查 | ☐ 通过 / ☐ 失败 | |
| TC-API-L005 | 用户登录 | ☐ 通过 / ☐ 失败 | |
| TC-API-L006 | 获取登录状态 | ☐ 通过 / ☐ 失败 | |
| TC-API-L007 | 用户登出 | ☐ 通过 / ☐ 失败 | |
| TC-API-L008 | 创建单视频任务 | ☐ 通过 / ☐ 失败 | |
| TC-API-L009 | 创建多视频任务 | ☐ 通过 / ☐ 失败 | |
| TC-API-L010 | 获取任务列表 | ☐ 通过 / ☐ 失败 | |
| TC-API-L011 | 按状态筛选任务 | ☐ 通过 / ☐ 失败 | |
| TC-API-L012 | 获取任务详情 | ☐ 通过 / ☐ 失败 | |
| TC-API-L013 | 获取任务日志 | ☐ 通过 / ☐ 失败 | |
| TC-API-L014 | 获取任务成本 | ☐ 通过 / ☐ 失败 | |
| TC-API-L015 | 删除任务 | ☐ 通过 / ☐ 失败 | |
| TC-API-L016 | 获取风格列表 | ☐ 通过 / ☐ 失败 | |
| TC-API-L017 | 获取风格详情 | ☐ 通过 / ☐ 失败 | |
| TC-API-L018 | 创建自定义风格 | ☐ 通过 / ☐ 失败 | |
| TC-API-L019 | 更新风格 | ☐ 通过 / ☐ 失败 | |
| TC-API-L020 | 删除自定义风格 | ☐ 通过 / ☐ 失败 | |
| TC-API-L021 | 获取系统配置 | ☐ 通过 / ☐ 失败 | |
| TC-API-L022 | 更新系统配置 | ☐ 通过 / ☐ 失败 | |
| TC-API-L023 | 获取密钥状态 | ☐ 通过 / ☐ 失败 | |
| TC-API-L024 | 验证 API 密钥 | ☐ 通过 / ☐ 失败 | |
| TC-API-L025 | 保存 API 密钥 | ☐ 通过 / ☐ 失败 | |
| TC-API-L026 | Gemini 连接测试 | ☐ 通过 / ☐ 失败 | |
| TC-API-L027 | 获取可用模型列表 | ☐ 通过 / ☐ 失败 | |
| TC-API-L028 | 无效 Token 测试 | ☐ 通过 / ☐ 失败 | |
| TC-API-L029 | 缺少必填参数 | ☐ 通过 / ☐ 失败 | |
| TC-API-L030 | 任务不存在测试 | ☐ 通过 / ☐ 失败 | |
| **总计** | **30 个** | **通过：__ / 失败：__** | |

---

## 九、测试报告模板

### 9.1 执行概要

| 项目 | 值 |
|------|-----|
| 测试日期 | |
| 测试环境 | 本地开发环境 (localhost:8899) |
| 测试人员 | |
| 总用例数 | 30 |
| 通过数 | |
| 失败数 | |
| 阻塞数 | |
| 发现 Bug 数 | |
| 通过率 | |

### 9.2 发现的问题

（按严重程度排列）

#### P0 级问题（致命）
| 编号 | 描述 | 影响范围 | 修复建议 |
|------|------|----------|----------|
| | | | |

#### P1 级问题（严重）
| 编号 | 描述 | 影响范围 | 修复建议 |
|------|------|----------|----------|
| | | | |

#### P2 级问题（一般）
| 编号 | 描述 | 影响范围 | 修复建议 |
|------|------|----------|----------|
| | | | |

### 9.3 修复验证

| Bug 编号 | 修复版本 | 验证结果 | 验证人 |
|----------|----------|----------|--------|
| | | | |

### 9.4 总体评估

- [ ] API 功能完整性
- [ ] 错误处理规范性
- [ ] 数据一致性
- [ ] 性能达标
- [ ] 安全性

### 9.5 建议与改进

（基于测试发现的问题，提出架构或代码改进建议）

---

## 十、注意事项

1. **日志是关键**：每次测试前确保日志监控已开启
2. **数据库备份**：测试前备份 `./data/db.sqlite`
3. **清理测试数据**：测试完成后清理创建的测试任务和 Token
4. **记录详细**：发现问题时详细记录复现步骤和日志信息
5. **及时修复**：P0/P1 问题发现后立即分析并提出修复方案
