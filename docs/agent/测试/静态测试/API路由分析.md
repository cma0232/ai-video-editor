# 静态代码分析 - API 路由

> **分析目标**：通过阅读代码发现 API 端点的安全性和正确性问题
> **涉及文件**：33 个路由文件
> **优先级**：P1（接口安全）
> **预计耗时**：100 分钟

---

## 测试目的

**核心目标**：通过静态代码分析，发现 API 端点中可能导致未授权访问、数据泄露、注入攻击的安全问题，确保所有接口的安全性和正确性。

**具体要求**：
1. **全面分析**：仔细阅读每个代码文件，不得遗漏任何可能的问题点
2. **问题分类**：按 P0（致命）、P1（严重）、P2（中等）、P3（轻微）优先级分类
3. **修复方案**：针对发现的问题，给出简洁高效的最优化修复方案
4. **代码简洁**：修复方案需保持代码简洁，避免过度设计

**修复原则**：
- ✅ **保证功能正常**：修复后必须确保现有功能正常运行
- ✅ **不引入新错误**：修复方案不得引入新的报错或问题
- ✅ **面向现有功能**：非必要不兼容历史数据，优先满足当前功能需求
- ❌ **避免过度设计**：不为假设的未来需求增加复杂性

**重点关注**：
- 输入验证完整性（Zod Schema 覆盖）
- 认证检查一致性（每个端点都必须调用 authenticate）
- 错误响应安全（不泄露敏感信息）
- 文件上传安全（大小限制、类型白名单、路径遍历）
- 敏感数据脱敏（API 密钥、配置）

---

## 一、模块概述

### 1.1 功能描述

API 路由模块负责：
- 处理所有 HTTP 请求
- 参数验证和类型转换
- 认证和授权检查
- 错误响应处理
- 文件上传处理

### 1.2 端点分类

```
app/api/
├── jobs/                  # 任务管理（6 个端点）
│   ├── route.ts          # GET/POST 任务列表/创建
│   ├── validate/         # POST 任务验证
│   └── [id]/
│       ├── route.ts      # GET/PUT/DELETE 任务详情
│       ├── cost/         # GET 成本统计
│       ├── download/     # GET 下载视频
│       └── logs/         # GET 任务日志
├── auth/                  # 认证系统（6 个端点）
│   ├── login/            # POST 登录
│   ├── logout/           # POST 登出
│   ├── register/         # POST 注册
│   ├── status/           # GET 认证状态
│   └── tokens/           # Token 管理
├── api-keys/              # API 密钥（3 个端点）
├── styles/                # 风格管理（5 个端点）
├── configs/               # 配置管理（2 个端点）
├── gemini/                # Gemini 测试（2 个端点）
├── google-storage/        # GCS 测试（1 个端点）
├── storage/               # 存储管理（2 个端点）
├── tts/                   # TTS 管理（3 个端点）
├── upload/                # 文件上传（1 个端点）
├── health/                # 健康检查（1 个端点）
├── init/                  # 初始化（1 个端点）
└── dev/                   # 开发工具（1 个端点）
```

### 1.3 端点统计

| 类别 | 端点数 | 说明 |
|------|--------|------|
| 任务管理 | 6 | 核心业务 |
| 认证系统 | 6 | 用户认证 |
| 风格管理 | 5 | 风格 CRUD |
| API 密钥 | 3 | 密钥管理 |
| 配置管理 | 2 | 系统配置 |
| TTS 管理 | 3 | 语音合成 |
| 存储管理 | 2 | 存储统计/清理 |
| 测试端点 | 3 | Gemini/GCS |
| 其他 | 3 | 健康检查等 |

---

## 二、分析检查清单

### 2.1 输入验证

| 检查项 | 检查内容 | 状态 |
|--------|----------|------|
| SA-API-001 | Zod Schema 是否覆盖所有输入参数 | ⬜ |
| SA-API-002 | 路径参数（:id）是否验证格式 | ⬜ |
| SA-API-003 | 查询参数是否有默认值和边界检查 | ⬜ |
| SA-API-004 | JSON 请求体解析异常处理 | ⬜ |
| SA-API-005 | Content-Type 验证 | ⬜ |

### 2.2 认证授权

| 检查项 | 检查内容 | 状态 |
|--------|----------|------|
| SA-API-006 | 每个端点是否正确调用 authenticate() | ⬜ |
| SA-API-007 | 公开 API vs 私有 API 区分清晰 | ⬜ |
| SA-API-008 | 资源所有权验证（是否能访问他人数据） | ⬜ |
| SA-API-009 | 管理员权限检查（敏感操作） | ⬜ |

### 2.3 错误处理

| 检查项 | 检查内容 | 状态 |
|--------|----------|------|
| SA-API-010 | 错误响应是否泄露敏感信息（堆栈、SQL） | ⬜ |
| SA-API-011 | 统一错误响应格式 | ⬜ |
| SA-API-012 | HTTP 状态码使用正确性 | ⬜ |
| SA-API-013 | 异常捕获是否完整（try-catch 覆盖） | ⬜ |

### 2.4 安全防护

| 检查项 | 检查内容 | 状态 |
|--------|----------|------|
| SA-API-014 | 关键 API 是否有速率限制 | ⬜ |
| SA-API-015 | CORS 配置正确性 | ⬜ |
| SA-API-016 | 响应头安全设置 | ⬜ |
| SA-API-017 | 敏感数据脱敏（日志、响应） | ⬜ |

### 2.5 文件处理

| 检查项 | 检查内容 | 状态 |
|--------|----------|------|
| SA-API-018 | 文件上传大小限制 | ⬜ |
| SA-API-019 | 文件类型白名单验证 | ⬜ |
| SA-API-020 | 文件名安全处理（路径遍历） | ⬜ |
| SA-API-021 | 临时文件清理机制 | ⬜ |

### 2.6 业务逻辑

| 检查项 | 检查内容 | 状态 |
|--------|----------|------|
| SA-API-022 | HTTP 方法语义正确性（GET/POST/PUT/DELETE） | ⬜ |
| SA-API-023 | 幂等性保证（重复请求处理） | ⬜ |
| SA-API-024 | 响应格式一致性 | ⬜ |
| SA-API-025 | 分页参数合理性 | ⬜ |

---

## 三、按端点分类检查

### 3.1 任务管理端点（6 个）

| 端点 | 方法 | 检查重点 | 状态 |
|------|------|----------|------|
| `/api/jobs` | GET | 分页、过滤参数验证 | ⬜ |
| `/api/jobs` | POST | 创建参数验证、资源限制 | ⬜ |
| `/api/jobs/validate` | POST | 验证逻辑正确性 | ⬜ |
| `/api/jobs/[id]` | GET | ID 格式验证 | ⬜ |
| `/api/jobs/[id]` | PUT | 更新权限、参数验证 | ⬜ |
| `/api/jobs/[id]` | DELETE | 删除权限、关联数据 | ⬜ |
| `/api/jobs/[id]/cost` | GET | 数据聚合 | ⬜ |
| `/api/jobs/[id]/download` | GET | 文件下载安全 | ⬜ |
| `/api/jobs/[id]/logs` | GET | 日志过滤、分页 | ⬜ |

**检查要点**：
- 任务状态转换是否合法（状态机验证）
- 并发操作处理（乐观锁/悲观锁）
- 文件下载安全性

---

### 3.2 认证系统端点（6 个）

| 端点 | 方法 | 检查重点 | 状态 |
|------|------|----------|------|
| `/api/auth/login` | POST | 登录限流、错误信息泄露 | ⬜ |
| `/api/auth/logout` | POST | Session 销毁 | ⬜ |
| `/api/auth/register` | POST | 用户名唯一性、密码强度 | ⬜ |
| `/api/auth/status` | GET | 认证状态缓存 | ⬜ |
| `/api/auth/tokens` | GET/POST | Token 列表/创建 | ⬜ |
| `/api/auth/tokens/[id]` | DELETE | Token 撤销 | ⬜ |

**检查要点**：
- 登录失败是否有限流保护
- 错误消息是否泄露用户存在信息
- Session/Token 生命周期管理

---

### 3.3 风格管理端点（4 个）

| 端点 | 方法 | 检查重点 | 状态 |
|------|------|----------|------|
| `/api/styles` | GET | 列表过滤 | ⬜ |
| `/api/styles` | POST | 风格参数验证 | ⬜ |
| `/api/styles/[id]` | GET/PUT/DELETE | ID 验证、预设保护 | ⬜ |
| `/api/styles/preview` | POST | 预览安全性 | ⬜ |
| `/api/styles/templates/[name]` | GET | 模板文件安全 | ⬜ |

**检查要点**：
- 预设风格不可删除
- 自定义风格 ID 唯一性
- YAML 解析安全性

---

### 3.4 API 密钥端点（3 个）

| 端点 | 方法 | 检查重点 | 状态 |
|------|------|----------|------|
| `/api/api-keys` | GET | 密钥脱敏 | ⬜ |
| `/api/api-keys/[service]` | GET/PUT | 服务名验证 | ⬜ |
| `/api/api-keys/verify` | POST | 验证逻辑 | ⬜ |

**检查要点**：
- API 密钥响应必须脱敏
- 密钥存储必须加密
- 服务名白名单验证

---

### 3.5 配置管理端点（2 个）

| 端点 | 方法 | 检查重点 | 状态 |
|------|------|----------|------|
| `/api/configs` | GET | 敏感配置隐藏 | ⬜ |
| `/api/configs/[key]` | GET/PUT | 配置键白名单 | ⬜ |

**检查要点**：
- 敏感配置不应暴露
- 配置值类型验证

---

### 3.6 测试端点（3 个）

| 端点 | 方法 | 检查重点 | 状态 |
|------|------|----------|------|
| `/api/gemini/test` | POST | 生产环境保护 | ⬜ |
| `/api/gemini/models` | GET | 缓存策略 | ⬜ |
| `/api/google-storage/test` | POST | 生产环境保护 | ⬜ |

**检查要点**：
- 测试端点是否应在生产环境禁用
- 是否泄露敏感信息

---

### 3.7 文件上传端点

| 端点 | 方法 | 检查重点 | 状态 |
|------|------|----------|------|
| `/api/upload/video` | POST | 大小限制、类型验证 | ⬜ |

**检查要点**：
- 文件大小限制（500MB）
- 文件类型白名单（视频格式）
- 文件名安全处理（防止路径遍历）
- 临时文件清理

---

## 四、发现的问题

> 在实际分析代码后填写此部分

### 问题模板

**严重程度**：P0/P1/P2/P3
**文件位置**：`app/api/xxx/route.ts:123`
**检查项**：SA-API-XXX

**问题描述**：
（详细描述发现的问题）

**风险分析**：
（可能导致的后果）

**修复建议**：
（建议的修复方案）

---

## 五、分析结果汇总

| 指标 | 数值 |
|------|------|
| 检查项总数 | 25 |
| 已检查 | 0 |
| 发现问题 | 0 |
| P0 问题 | 0 |
| P1 问题 | 0 |
| P2 问题 | 0 |
| P3 问题 | 0 |

### 按类别统计

| 类别 | 检查项数 | 问题数 |
|------|---------|--------|
| 输入验证 | 5 | 0 |
| 认证授权 | 4 | 0 |
| 错误处理 | 4 | 0 |
| 安全防护 | 4 | 0 |
| 文件处理 | 4 | 0 |
| 业务逻辑 | 4 | 0 |

### 按端点类别统计

| 类别 | 端点数 | 检查状态 |
|------|--------|----------|
| 任务管理 | 6 | ⬜ |
| 认证系统 | 6 | ⬜ |
| 风格管理 | 5 | ⬜ |
| API 密钥 | 3 | ⬜ |
| 配置管理 | 2 | ⬜ |
| TTS 管理 | 3 | ⬜ |
| 存储管理 | 2 | ⬜ |
| 测试端点 | 3 | ⬜ |
| 其他 | 3 | ⬜ |

---

## 六、修复方案

> 在发现问题后，针对每个问题给出具体的修复代码示例

### 常见修复模式

**Zod Schema 验证**：
```typescript
import { z } from 'zod';

const CreateJobSchema = z.object({
  name: z.string().min(1).max(100),
  videoUrl: z.string().url(),
  styleId: z.string().uuid(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const result = CreateJobSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: 'Invalid input', details: result.error.issues },
      { status: 400 }
    );
  }

  // 使用验证后的数据
  const { name, videoUrl, styleId } = result.data;
}
```

**统一错误响应**：
```typescript
function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json(
    {
      error: message,
      timestamp: new Date().toISOString(),
      // 不在生产环境暴露详细信息
      ...(process.env.NODE_ENV === 'development' && { details }),
    },
    { status }
  );
}
```

**认证检查**：
```typescript
import { authenticate } from '@/lib/auth/unified-auth';

export async function GET(request: Request) {
  const authResult = await authenticate(request);

  if (!authResult.success) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 继续处理
}
```

---

## 附录：相关代码路径

```
app/api/
├── jobs/
│   ├── route.ts              # GET/POST 任务列表/创建
│   ├── validate/route.ts     # POST 任务验证
│   └── [id]/
│       ├── route.ts          # GET/PUT/DELETE 任务详情
│       ├── cost/route.ts     # GET 成本统计
│       ├── download/route.ts # GET 下载视频
│       └── logs/route.ts     # GET 任务日志
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── register/route.ts
│   ├── status/route.ts
│   └── tokens/
│       ├── route.ts
│       └── [id]/route.ts
├── api-keys/
│   ├── route.ts
│   ├── [service]/route.ts
│   └── verify/route.ts
├── styles/
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── preview/route.ts
│   └── templates/[name]/route.ts
├── configs/
│   ├── route.ts
│   └── [key]/route.ts
├── tts/
│   ├── status/route.ts
│   ├── verify-voice/route.ts
│   └── voices/route.ts
├── storage/
│   ├── cleanup/route.ts
│   └── stats/route.ts
├── gemini/
│   ├── test/route.ts
│   └── models/route.ts
├── google-storage/
│   └── test/route.ts
├── upload/
│   └── video/route.ts
├── health/route.ts
├── init/route.ts
└── dev/
    └── clear-cache/route.ts
```
