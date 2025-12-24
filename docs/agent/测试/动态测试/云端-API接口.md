# 测试用例 - API 接口（云端）

> **测试环境**：云端（Zeabur）
> **测试工具**：curl 命令 + MCP Chrome DevTools（生成 Token）
> **预计耗时**：30 分钟
> **用例数量**：30 个
> **前置条件**：需先在 Web 界面生成 API Token

---

## 测试目的

**核心目标**：通过 API 调用验证所有接口的正确性、安全性和稳定性，确保认证、权限、数据处理符合预期。

**具体要求**：
1. **全面验证**：按用例逐项测试，不得遗漏任何接口
2. **问题记录**：发现问题时记录请求参数、响应内容、HTTP 状态码
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

---

## 测试凭据

> **重要**：测试凭据和资源请参考以下文件，本文档不包含敏感信息。

| 凭据类型 | 参考文件 |
|----------|----------|
| 环境地址、账号密码 | [凭据/云端.md](../凭据/云端.md) |
| 测试视频、API 配置模板 | [凭据/公共.md](../凭据/公共.md) |

---

## 测试用例

### 1. Token 管理（前置条件）

#### TC-API-001 生成 API Token（Web 界面操作）

| 项目 | 值 |
|------|-----|
| **前置条件** | 已登录 Web 界面 |
| **页面** | `/settings` → 「API Token」标签页 |

**操作步骤**（使用 MCP Chrome DevTools）：

1. 导航到 https://chuangcut.zeabur.app/settings
2. 点击「API Token」标签页
3. 点击「生成新 Token」按钮
4. 输入 Token 名称：`API测试Token`
5. 选择有效期：`30 天`
6. 点击「生成」按钮
7. **复制并记录生成的 Token 值**（仅显示一次！）

**验证清单**：
- [ ] Token 生成成功，弹窗显示完整 Token
- [ ] Token 以 `cca_` 开头
- [ ] **已记录 Token 值：`________________`**（填写实际值）
- [ ] Token 列表中显示新创建的 Token

---

#### TC-API-002 获取 Token 列表（Web 界面验证）

| 项目 | 值 |
|------|-----|
| **页面** | `/settings` → 「API Token」标签页 |

**验证清单**：
- [ ] 列表显示刚创建的「API测试Token」
- [ ] Token 值已脱敏显示（`cca_***xxxxxxxx`）
- [ ] 显示创建时间和过期时间

---

#### TC-API-003 删除 API Token（测试结束后执行）

| 项目 | 值 |
|------|-----|
| **页面** | `/settings` → 「API Token」标签页 |
| **执行时机** | 所有 API 测试完成后 |

**操作步骤**：

1. 在 Token 列表中找到「API测试Token」
2. 点击对应的「删除」按钮
3. 确认删除

**验证清单**：
- [ ] Token 删除成功
- [ ] 列表中不再显示该 Token

---

### 2. 健康检查 API

#### TC-API-004 健康检查

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/health` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s https://chuangcut.zeabur.app/api/health | jq .
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

---

### 3. 鉴权系统 API

#### TC-API-005 用户登录

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/auth/login` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/auth/login \
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

#### TC-API-006 获取登录状态

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/auth/status` |
| **认证** | Cookie/Session |

**请求示例**：

```bash
curl -s https://chuangcut.zeabur.app/api/auth/status \
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

#### TC-API-007 用户登出

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/auth/logout` |
| **认证** | Cookie/Session |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/auth/logout \
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

### 4. 任务管理 API

> **注意**：以下测试需要使用 TC-API-001 生成的 Token 进行认证。
> 将 `YOUR_API_TOKEN` 替换为实际获取的 Token 值。

#### TC-API-008 创建单视频任务

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/jobs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/jobs \
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

---

#### TC-API-009 创建多视频混剪任务

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/jobs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/jobs \
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

#### TC-API-010 获取任务列表

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "https://chuangcut.zeabur.app/api/jobs?limit=10&offset=0" | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] jobs 数组包含之前创建的任务
- [ ] 返回 total、limit、offset 分页信息

---

#### TC-API-011 按状态筛选任务列表

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs?status=xxx` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
# 筛选处理中的任务
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "https://chuangcut.zeabur.app/api/jobs?status=processing" | jq .

# 筛选已完成的任务
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "https://chuangcut.zeabur.app/api/jobs?status=completed" | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回的任务状态与筛选条件一致
- [ ] 支持状态值：pending、processing、completed、failed

---

#### TC-API-012 获取任务详情

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/jobs/{job_id} | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回完整的任务配置信息
- [ ] 包含 state 进度信息

---

#### TC-API-013 获取任务日志

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs/:id/logs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
# 获取所有日志
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/jobs/{job_id}/logs | jq .

# 按日志类型筛选
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "https://chuangcut.zeabur.app/api/jobs/{job_id}/logs?logType=error" | jq .

# 按大步骤筛选
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "https://chuangcut.zeabur.app/api/jobs/{job_id}/logs?majorStep=analysis" | jq .

# 按大步骤分组查看
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  "https://chuangcut.zeabur.app/api/jobs/{job_id}/logs?groupByStage=true" | jq .
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

#### TC-API-014 获取任务成本

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/jobs/:id/cost` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/jobs/{job_id}/cost | jq .
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

#### TC-API-015 删除任务

| 项目 | 值 |
|------|-----|
| **端点** | `DELETE /api/jobs/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -X DELETE -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/jobs/{job_id} | jq .
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

---

### 5. 风格管理 API

#### TC-API-016 获取风格列表

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/styles` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/styles | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] builtin 包含预设风格
- [ ] custom 包含自定义风格

---

#### TC-API-017 获取风格详情

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/styles/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/styles/style-1000 | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回完整的风格配置

---

#### TC-API-018 创建自定义风格

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/styles` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/styles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "name": "API测试风格",
    "description": "通过API创建的测试风格",
    "analysis_creative_layer": "请用专业的语言分析视频内容...",
    "audio_sync_creative_layer": "旁白要简洁有力...",
    "config": {
      "channel_name": "API测试频道",
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
  "name": "API测试风格",
  "description": "通过API创建的测试风格",
  "is_builtin": false
}
```

**验证清单**：
- [ ] 响应状态码为 201
- [ ] 返回的 ID >= 2000
- [ ] **记录 style_id：`________________`**

---

#### TC-API-019 更新风格

| 项目 | 值 |
|------|-----|
| **端点** | `PUT /api/styles/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -X PUT https://chuangcut.zeabur.app/api/styles/{style_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "name": "API测试风格（已更新）",
    "description": "更新后的描述"
  }' | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 风格名称已更新

---

#### TC-API-020 删除自定义风格

| 项目 | 值 |
|------|-----|
| **端点** | `DELETE /api/styles/:id` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -s -X DELETE -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/styles/{style_id} | jq .
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 只能删除自定义风格（ID >= 2000）
- [ ] 预设风格删除应返回 403

---

### 6. 系统配置 API

#### TC-API-021 获取系统配置

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/configs` |
| **认证** | 需要 |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/configs | jq .
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

#### TC-API-022 更新系统配置

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/configs` |
| **认证** | 需要 |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/configs \
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

### 7. API 密钥管理

#### TC-API-023 获取 API 密钥状态

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/api-keys` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s https://chuangcut.zeabur.app/api/api-keys | jq .
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

#### TC-API-024 验证 API 密钥

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/api-keys/verify` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/api-keys/verify \
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

#### TC-API-025 保存 API 密钥

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/api-keys/:service` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/api-keys/google_ai_studio \
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

### 8. Gemini 测试 API

#### TC-API-026 Gemini 连接测试

| 项目 | 值 |
|------|-----|
| **端点** | `POST /api/gemini/test` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/gemini/test \
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

#### TC-API-027 获取可用模型列表

| 项目 | 值 |
|------|-----|
| **端点** | `GET /api/gemini/models` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl -s https://chuangcut.zeabur.app/api/gemini/models | jq .
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

### 9. 错误处理测试

#### TC-API-028 无效 Token 测试

| 项目 | 值 |
|------|-----|
| **测试场景** | 使用无效或过期的 Token |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer invalid_token_xxx" \
  https://chuangcut.zeabur.app/api/jobs | jq .
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

#### TC-API-029 缺少必填参数测试

| 项目 | 值 |
|------|-----|
| **测试场景** | 创建任务时缺少 input_videos |

**请求示例**：

```bash
curl -s -X POST https://chuangcut.zeabur.app/api/jobs \
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

#### TC-API-030 任务不存在测试

| 项目 | 值 |
|------|-----|
| **测试场景** | 获取不存在的任务详情 |

**请求示例**：

```bash
curl -s -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/jobs/job_notexist123 | jq .
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

## 问题记录

### 问题模板

```markdown
### 问题 N
- **位置**：[API 端点]
- **现象**：[描述]
- **请求**：[curl 命令]
- **响应**：[实际响应]
- **修复建议**：[建议]
- **修复状态**：☐ 待修复 / ☐ 已修复
```

---

## 测试结果汇总

| 用例编号 | 用例名称 | 结果 | 备注 |
|----------|----------|------|------|
| TC-API-001 | 生成 API Token | ☐ 通过 / ☐ 失败 | |
| TC-API-002 | 获取 Token 列表 | ☐ 通过 / ☐ 失败 | |
| TC-API-003 | 删除 API Token | ☐ 通过 / ☐ 失败 | |
| TC-API-004 | 健康检查 | ☐ 通过 / ☐ 失败 | |
| TC-API-005 | 用户登录 | ☐ 通过 / ☐ 失败 | |
| TC-API-006 | 获取登录状态 | ☐ 通过 / ☐ 失败 | |
| TC-API-007 | 用户登出 | ☐ 通过 / ☐ 失败 | |
| TC-API-008 | 创建单视频任务 | ☐ 通过 / ☐ 失败 | |
| TC-API-009 | 创建多视频任务 | ☐ 通过 / ☐ 失败 | |
| TC-API-010 | 获取任务列表 | ☐ 通过 / ☐ 失败 | |
| TC-API-011 | 按状态筛选任务 | ☐ 通过 / ☐ 失败 | |
| TC-API-012 | 获取任务详情 | ☐ 通过 / ☐ 失败 | |
| TC-API-013 | 获取任务日志 | ☐ 通过 / ☐ 失败 | |
| TC-API-014 | 获取任务成本 | ☐ 通过 / ☐ 失败 | |
| TC-API-015 | 删除任务 | ☐ 通过 / ☐ 失败 | |
| TC-API-016 | 获取风格列表 | ☐ 通过 / ☐ 失败 | |
| TC-API-017 | 获取风格详情 | ☐ 通过 / ☐ 失败 | |
| TC-API-018 | 创建自定义风格 | ☐ 通过 / ☐ 失败 | |
| TC-API-019 | 更新风格 | ☐ 通过 / ☐ 失败 | |
| TC-API-020 | 删除自定义风格 | ☐ 通过 / ☐ 失败 | |
| TC-API-021 | 获取系统配置 | ☐ 通过 / ☐ 失败 | |
| TC-API-022 | 更新系统配置 | ☐ 通过 / ☐ 失败 | |
| TC-API-023 | 获取密钥状态 | ☐ 通过 / ☐ 失败 | |
| TC-API-024 | 验证 API 密钥 | ☐ 通过 / ☐ 失败 | |
| TC-API-025 | 保存 API 密钥 | ☐ 通过 / ☐ 失败 | |
| TC-API-026 | Gemini 连接测试 | ☐ 通过 / ☐ 失败 | |
| TC-API-027 | 获取可用模型列表 | ☐ 通过 / ☐ 失败 | |
| TC-API-028 | 无效 Token 测试 | ☐ 通过 / ☐ 失败 | |
| TC-API-029 | 缺少必填参数 | ☐ 通过 / ☐ 失败 | |
| TC-API-030 | 任务不存在测试 | ☐ 通过 / ☐ 失败 | |
| **总计** | **30 个** | **通过：__ / 失败：__** | |

---

**测试人员**：________________

**测试日期**：________________

**测试结论**：☐ 全部通过 / ☐ 部分通过 / ☐ 需修复后重测

---

## 五、Guide 核心 API 验证

> **测试目的**：验证 `/guide` 页面展示的 API 示例可以正常工作，确保用户按照 Guide 操作能成功调用系统。
> **用例数量**：7 个（GUIDE-001 ~ GUIDE-007）

### GUIDE-001 健康检查

| 项目 | 值 |
|------|-----|
| **对应 Guide 章节** | API 概述 - 基础信息 |
| **端点** | `GET /api/health` |
| **认证** | 不需要 |

**请求示例**：

```bash
curl https://chuangcut.zeabur.app/api/health
```

**预期响应**（200）：

```json
{
  "status": "ok",
  "timestamp": "..."
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] status 为 "ok"
- [ ] 与 Guide 页面示例一致

---

### GUIDE-002 获取风格列表

| 项目 | 值 |
|------|-----|
| **对应 Guide 章节** | 获取风格列表 |
| **端点** | `GET /api/styles` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/styles
```

**预期响应**（200）：

```json
{
  "builtin": [
    {
      "id": "style-1000",
      "name": "专业解说",
      "description": "..."
    }
  ],
  "custom": []
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] builtin 数组包含预设风格
- [ ] 每个风格有 id、name、description 字段
- [ ] 可用于创建任务的 style_id 参数

---

### GUIDE-003 创建单视频任务

| 项目 | 值 |
|------|-----|
| **对应 Guide 章节** | 创建任务 - 基础示例 |
| **端点** | `POST /api/jobs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -X POST https://chuangcut.zeabur.app/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "input_videos": [
      {
        "url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-1.mp4",
        "label": "Guide测试视频"
      }
    ],
    "style_id": "style-1000",
    "config": {
      "language": "zh",
      "gemini_platform": "ai-studio",
      "storyboard_count": 3
    }
  }'
```

**预期响应**（200）：

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

**创建任务参数说明**：

| 参数 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `input_videos` | ✅ | 数组 | 视频列表（1-10个） |
| `input_videos[].url` | ✅ | 字符串 | 视频 URL |
| `input_videos[].label` | 可选 | 字符串 | 视频标签，自动从 URL 提取 |
| `style_id` | ✅ | 字符串 | 风格 ID，如 "style-1000" |
| `config.language` | 可选 | 字符串 | 语言（zh/zh-TW/en/ja/ko） |
| `config.gemini_platform` | 可选 | 字符串 | AI 平台（ai-studio/vertex） |
| `config.storyboard_count` | 可选 | 数字 | 分镜数量（3-100） |
| `config.script_outline` | 可选 | 字符串 | 文案大纲（最多5000字） |
| `config.original_audio_scene_count` | 可选 | 数字 | 原声分镜数量（0=全配音） |
| `config.voice_id` | 可选 | 字符串 | Fish Audio 声音 ID |
| `config.max_concurrent_scenes` | 可选 | 数字 | 并发处理数（1-8，默认 3） |

**验证清单**：
- [ ] 响应状态码为 200
- [ ] 返回有效的 job_id
- [ ] video_count = 1
- [ ] **记录 job_id：`________________`**（用于后续测试）

---

### GUIDE-004 创建多视频混剪任务

| 项目 | 值 |
|------|-----|
| **对应 Guide 章节** | 创建任务 - 多视频混剪 |
| **端点** | `POST /api/jobs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -X POST https://chuangcut.zeabur.app/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "input_videos": [
      { "url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-1.mp4", "label": "素材1" },
      { "url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/hunjian-2.mp4", "label": "素材2" }
    ],
    "style_id": "style-1000",
    "config": {
      "language": "zh",
      "gemini_platform": "ai-studio",
      "storyboard_count": 4,
      "original_audio_scene_count": 1
    }
  }'
```

**预期响应**（200）：

```json
{
  "job_id": "job_xxxxxxxx",
  "video_count": 2,
  "queue_position": 0,
  "queue_status": { ... }
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] video_count = 2
- [ ] 返回有效的 job_id

---

### GUIDE-005 获取任务列表

| 项目 | 值 |
|------|-----|
| **对应 Guide 章节** | 获取任务列表 |
| **端点** | `GET /api/jobs` |
| **认证** | 需要（Bearer Token） |

**请求示例**：

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  "https://chuangcut.zeabur.app/api/jobs?limit=10&offset=0"
```

**预期响应**（200）：

```json
{
  "jobs": [
    {
      "id": "job_xxxxxxxx",
      "status": "processing",
      "created_at": 1234567890,
      "style_name": "专业解说"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

**查询参数**：
| 参数 | 说明 |
|------|------|
| `limit` | 每页数量（1-100，默认 20） |
| `offset` | 偏移量（默认 0） |
| `status` | 状态筛选（pending/processing/completed/failed） |

**验证清单**：
- [ ] 响应状态码为 200
- [ ] jobs 数组包含之前创建的任务
- [ ] 返回 total、limit、offset 分页信息

---

### GUIDE-006 获取任务详情（处理中）

| 项目 | 值 |
|------|-----|
| **对应 Guide 章节** | 获取任务详情 |
| **端点** | `GET /api/jobs/:id` |
| **认证** | 需要（Bearer Token） |
| **前置条件** | 使用 GUIDE-003 创建的 job_id |

**请求示例**：

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/jobs/{job_id}
```

**预期响应（处理中）**（200）：

```json
{
  "id": "job_xxxxxxxx",
  "status": "processing",
  "input_videos": [...],
  "style_id": "style-1000",
  "style_name": "专业解说",
  "config": { ... },
  "state": {
    "current_major_step": "analysis",
    "current_sub_step": "gemini_analysis",
    "total_scenes": 0,
    "processed_scenes": 0
  },
  "stepHistory": [...]
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] status 为 "processing"
- [ ] state 包含进度信息
- [ ] stepHistory 包含步骤执行记录

---

### GUIDE-007 获取任务详情（已完成）

| 项目 | 值 |
|------|-----|
| **对应 Guide 章节** | 获取任务详情 - 完成响应 |
| **端点** | `GET /api/jobs/:id` |
| **认证** | 需要（Bearer Token） |
| **前置条件** | 等待任务完成后测试 |

**请求示例**：

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://chuangcut.zeabur.app/api/jobs/{job_id}
```

**预期响应（已完成）**（200）：

```json
{
  "id": "job_xxxxxxxx",
  "status": "completed",
  "state": {
    "total_scenes": 3,
    "processed_scenes": 3,
    "final_video_url": "https://...",
    "final_video_public_url": "https://..."
  }
}
```

**验证清单**：
- [ ] 响应状态码为 200
- [ ] status 为 "completed"
- [ ] state.final_video_url 有效
- [ ] final_video_public_url 可直接访问下载

---

## Guide 核心 API 验证结果

| 用例编号 | 用例名称 | 结果 | 备注 |
|----------|----------|------|------|
| GUIDE-001 | 健康检查 | ☐ 通过 / ☐ 失败 | |
| GUIDE-002 | 获取风格列表 | ☐ 通过 / ☐ 失败 | |
| GUIDE-003 | 创建单视频任务 | ☐ 通过 / ☐ 失败 | |
| GUIDE-004 | 创建多视频混剪任务 | ☐ 通过 / ☐ 失败 | |
| GUIDE-005 | 获取任务列表 | ☐ 通过 / ☐ 失败 | |
| GUIDE-006 | 获取任务详情(处理中) | ☐ 通过 / ☐ 失败 | |
| GUIDE-007 | 获取任务详情(已完成) | ☐ 通过 / ☐ 失败 | |
| **总计** | **7 个** | **通过：__ / 失败：__** | |

**验证结论**：☐ Guide 示例全部可用 / ☐ 需修复后重测
