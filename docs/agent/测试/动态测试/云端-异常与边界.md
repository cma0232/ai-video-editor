# 云端测试 - 异常与边界测试

> **测试环境**: 云端 Zeabur 部署环境
> **测试目标**: 验证系统在异常情况和边界条件下的稳定性和错误处理能力
> **对应本地文档**: `10-本地-异常与边界.md`

---

## 测试目的

**核心目标**：通过异常输入和边界条件测试，验证系统的健壮性和错误处理能力，确保不会因异常情况导致崩溃或数据损坏。

**具体要求**：
1. **全面验证**：按用例逐项测试，覆盖各种异常场景
2. **问题记录**：发现问题时记录输入条件、系统行为、错误信息
3. **修复方案**：针对发现的问题，给出简洁高效的最优化修复方案

**修复原则**：
- ✅ **保证功能正常**：修复后必须确保现有功能正常运行
- ✅ **不引入新错误**：修复方案不得引入新的报错或问题
- ✅ **面向现有功能**：非必要不兼容历史数据，优先满足当前功能需求
- ❌ **避免过度设计**：不为假设的未来需求增加复杂性

**重点关注**：
- 无效输入的错误处理
- 边界值的正确处理
- 并发操作的稳定性
- 网络异常的恢复能力

---

## 一、测试凭据

> **重要**：测试凭据和资源请参考以下文件，本文档不包含敏感信息。

| 凭据类型 | 参考文件 |
|----------|----------|
| 环境地址、账号密码、Zeabur CLI | [凭据/云端.md](../凭据/云端.md) |
| 测试视频、API 配置模板 | [凭据/公共.md](../凭据/公共.md) |

> ⚠️ **注意**：API Token 需通过 Web 界面生成，参考凭据文件中的登录信息。

---

## 四、测试用例

### 4.1 输入验证异常（TC-ERR-001 ~ TC-ERR-004）

#### TC-ERR-001: 无效视频 URL

**目的**: 验证系统对无效 URL 的处理

**前置条件**: 已登录系统

**测试步骤**:
1. 进入任务创建页面
2. 输入无效 URL：`https://invalid-domain-12345.com/video.mp4`
3. 点击创建任务
4. 观察系统响应

**预期结果**:
- 系统显示友好的错误提示
- 不创建无效任务
- 错误信息明确指出 URL 无法访问

**API 测试**:
```bash
curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [{"url": "https://invalid-domain-12345.com/video.mp4", "label": "测试"}],
    "style_id": "style-1000"
  }'
```

---

#### TC-ERR-002: 非视频文件 URL

**目的**: 验证系统对非视频文件的处理

**前置条件**: 已登录系统

**测试步骤**:
1. 进入任务创建页面
2. 输入图片 URL：`https://example.com/image.png`
3. 点击创建任务
4. 观察系统响应

**预期结果**:
- 系统检测到非视频格式
- 显示格式不支持的错误提示
- 任务不会被创建或在分析阶段失败

**API 测试**:
```bash
curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [{"url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/test-image.png", "label": "测试"}],
    "style_id": "style-1000"
  }'
```

---

#### TC-ERR-003: 空视频 URL

**目的**: 验证系统对空输入的处理

**前置条件**: 已登录系统

**测试步骤**:
1. 进入任务创建页面
2. 不输入视频 URL
3. 尝试创建任务
4. 观察系统响应

**预期结果**:
- 前端表单验证阻止提交
- 显示"视频 URL 不能为空"提示
- 创建按钮禁用或点击无效

**API 测试**:
```bash
curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [],
    "style_id": "style-1000"
  }'
```

---

#### TC-ERR-004: 无效风格 ID

**目的**: 验证系统对不存在风格的处理

**前置条件**: 已登录系统

**测试步骤**:
1. 通过 API 创建任务，使用不存在的风格 ID
2. 观察系统响应

**API 测试**:
```bash
curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [{"url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4", "label": "测试"}],
    "style_id": "non-existent-style-12345"
  }'
```

**预期结果**:
- 返回 400 或 404 错误
- 错误信息明确指出风格不存在
- 提供可用风格列表或建议

---

### 4.2 认证与权限异常（TC-ERR-005 ~ TC-ERR-008）

#### TC-ERR-005: 无效 Token 访问

**目的**: 验证系统对无效认证的处理

**测试步骤**:
```bash
# 使用无效 Token
curl -X GET "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer invalid_token_12345"

# 使用空 Token
curl -X GET "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer "

# 无 Authorization 头
curl -X GET "https://chuangcut.zeabur.app/api/jobs"
```

**预期结果**:
- 返回 401 Unauthorized
- 响应体包含明确的错误信息
- 不泄露系统内部信息

---

#### TC-ERR-006: 过期 Token 访问

**目的**: 验证系统对过期 Token 的处理

**前置条件**: 创建一个已过期的 Token（或等待 Token 过期）

**测试步骤**:
1. 使用已过期的 Token 发起请求
2. 观察系统响应

**预期结果**:
- 返回 401 Unauthorized
- 错误信息提示 Token 已过期
- 建议用户重新登录或刷新 Token

---

#### TC-ERR-007: 已撤销 Token 访问

**目的**: 验证撤销的 Token 无法继续使用

**测试步骤**:
1. 创建一个新 Token
2. 使用该 Token 验证正常工作
3. 撤销该 Token
4. 再次使用已撤销的 Token

**API 测试**:
```bash
# 1. 创建 Token
TOKEN_RESPONSE=$(curl -s -X POST "https://chuangcut.zeabur.app/api/auth/tokens" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-revoke-token", "expiresInDays": 7}')

NEW_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')

# 2. 验证新 Token 可用
curl -X GET "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer $NEW_TOKEN"

# 3. 获取 Token ID 并撤销
TOKEN_ID=$(echo $TOKEN_RESPONSE | jq -r '.id')
curl -X DELETE "https://chuangcut.zeabur.app/api/auth/tokens/$TOKEN_ID" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6"

# 4. 验证已撤销的 Token 不可用
curl -X GET "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer $NEW_TOKEN"
```

**预期结果**:
- 步骤 2：返回 200，正常获取任务列表
- 步骤 4：返回 401，Token 已失效

---

#### TC-ERR-008: 跨用户资源访问

**目的**: 验证用户无法访问他人资源（如适用）

**前置条件**: 系统支持多用户

**测试步骤**:
1. 用户 A 创建任务
2. 尝试用用户 B 的 Token 访问用户 A 的任务

**预期结果**:
- 返回 403 Forbidden 或 404 Not Found
- 不泄露其他用户的数据

---

### 4.3 外部服务异常（TC-ERR-009 ~ TC-ERR-012）

#### TC-ERR-009: Gemini API Key 无效

**目的**: 验证系统在 Gemini 密钥无效时的处理

**测试步骤**:
1. 在设置中配置无效的 Gemini API Key
2. 创建新任务
3. 观察任务在分析阶段的行为

**预期结果**:
- 任务在 `prepare_gemini` 或 `gemini_analysis` 步骤失败
- 错误日志明确指出 API Key 问题
- 任务状态变为 `failed`
- 用户收到清晰的错误提示

---

#### TC-ERR-010: FFmpeg 处理异常

**目的**: 验证系统在 FFmpeg 处理失败时的处理

**测试步骤**:
1. 提供一个损坏或格式不支持的视频文件
2. 创建任务并让其执行到分镜提取阶段
3. 观察系统行为

**预期结果**:
- 任务在 `ffmpeg_batch_split` 步骤失败
- 系统记录 FFmpeg 错误信息
- 任务状态变为 `failed`
- 错误日志包含具体的 FFmpeg 输出

---

#### TC-ERR-011: Fish Audio 服务异常

**目的**: 验证系统在语音合成服务异常时的处理

**测试步骤**:
1. 配置错误的 Fish Audio API Key
2. 创建任务并让其执行到音频合成阶段
3. 观察系统行为

**预期结果**:
- 任务在 `synthesize_audio` 步骤失败
- 错误日志记录 API 认证失败
- 任务状态允许修复后重试

---

#### TC-ERR-012: GCS 存储异常（Vertex AI 模式）

**目的**: 验证 GCS 存储异常时的处理

**前置条件**: 使用 Vertex AI 模式

**测试步骤**:
1. 配置无效的 GCS Bucket 或权限不足的 Service Account
2. 创建任务
3. 观察视频上传和迁移阶段的行为

**预期结果**:
- 任务在 GCS 相关步骤失败
- 错误信息指出权限或 Bucket 问题
- 提供修复建议

---

### 4.4 并发与竞态（TC-ERR-013 ~ TC-ERR-015）

#### TC-ERR-013: 并发创建多个任务

**目的**: 验证系统处理并发任务创建的能力

**测试步骤**:
```bash
# 并发创建 5 个任务
for i in {1..5}; do
  curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
    -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
    -H "Content-Type: application/json" \
    -d "{
      \"input_videos\": [{\"url\": \"https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4\", \"label\": \"测试$i\"}],
      \"style_id\": \"style-1000\"
    }" &
done
wait
```

**预期结果**:
- 所有任务都成功创建
- 每个任务有唯一的 ID
- 任务列表正确显示所有任务
- 无数据库锁死或超时错误

---

#### TC-ERR-014: 同一任务并发控制操作

**目的**: 验证系统防止对同一任务的并发冲突操作

**前置条件**: 有一个已存在的任务

**测试步骤**:
```bash
JOB_ID="<已存在的任务ID>"

# 并发发送删除请求
curl -X DELETE "https://chuangcut.zeabur.app/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" &

curl -X DELETE "https://chuangcut.zeabur.app/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" &

wait
```

**预期结果**:
- 只有一个删除请求成功
- 第二个请求返回 404（任务不存在）
- 不发生数据库死锁

---

#### TC-ERR-015: 重复操作防护（已下线）

> 停止功能已下线，本用例跳过。

---

### 4.5 数据边界（TC-ERR-016 ~ TC-ERR-020）

#### TC-ERR-016: 超长任务名称

**目的**: 验证系统对超长输入的处理

**测试步骤**:
```bash
# 创建带有超长名称的任务（1000 字符）
LONG_NAME=$(python3 -c "print('A' * 1000)")

curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d "{
    \"input_videos\": [{\"url\": \"https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4\", \"label\": \"$LONG_NAME\"}],
    \"style_id\": \"style-1000\"
  }"
```

**预期结果**:
- 系统截断或拒绝超长名称
- 返回适当的错误信息
- 不会导致数据库错误

---

#### TC-ERR-017: 特殊字符输入

**目的**: 验证系统对特殊字符的处理（防 XSS/注入）

**测试步骤**:
```bash
# 尝试 XSS 攻击
curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [{"url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4", "label": "<script>alert(1)</script>"}],
    "style_id": "style-1000"
  }'

# 尝试 SQL 注入
curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d "{
    \"input_videos\": [{\"url\": \"https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4\", \"label\": \"test' OR 1=1 --\"}],
    \"style_id\": \"style-1000\"
  }"
```

**预期结果**:
- 特殊字符被正确转义或过滤
- 不会执行任何注入代码
- 数据安全存储和显示

---

#### TC-ERR-018: Unicode 和 Emoji 处理

**目的**: 验证系统对国际化字符的支持

**测试步骤**:
```bash
curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [{"url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4", "label": "测试任务 🎬 日本語 한국어 العربية"}],
    "style_id": "style-1000"
  }'
```

**预期结果**:
- 任务成功创建
- Unicode 字符正确存储和显示
- Emoji 正确渲染

---

#### TC-ERR-019: 超大请求体

**目的**: 验证系统对超大请求的处理

**测试步骤**:
```bash
# 生成 10MB 的随机数据作为请求体
LARGE_DATA=$(python3 -c "import json; print(json.dumps({'data': 'A' * 10000000}))")

curl -X POST "https://chuangcut.zeabur.app/api/jobs" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" \
  -H "Content-Type: application/json" \
  -d "$LARGE_DATA"
```

**预期结果**:
- 返回 413 Payload Too Large 或类似错误
- 服务器不会崩溃或内存溢出
- 响应时间合理

---

#### TC-ERR-020: 空分镜脚本处理

**目的**: 验证系统对 Gemini 返回空分析结果的处理

**场景**: Gemini 可能对某些视频返回空或无效的分镜脚本

**预期结果**:
- 系统检测到无效的分析结果
- 任务在 `validate_storyboards` 步骤失败
- 错误信息明确指出分析结果无效
- 支持手动编辑或重新分析

---

### 4.6 网络与超时（TC-ERR-021 ~ TC-ERR-024）

#### TC-ERR-021: 请求超时处理

**目的**: 验证系统对长时间无响应的处理

**测试步骤**:
1. 配置一个响应很慢的外部服务（模拟）
2. 观察系统超时行为

**预期结果**:
- 请求在配置的超时时间后终止
- 返回超时错误信息
- 任务状态正确更新为失败

---

#### TC-ERR-022: 网络中断恢复

**目的**: 验证系统在网络恢复后的行为

**测试场景**: 任务执行过程中网络短暂中断

**预期结果**:
- 系统记录网络错误
- 任务状态保持为可恢复状态
- 网络恢复后可以继续执行

---

#### TC-ERR-023: 大文件上传中断

**目的**: 验证大文件上传中断后的处理

**测试步骤**:
1. 使用超大视频文件创建任务
2. 在上传过程中模拟网络中断
3. 观察系统行为

**预期结果**:
- 系统检测到上传失败
- 清理不完整的上传
- 支持重新开始上传

---

#### TC-ERR-024: 重试机制验证

**目的**: 验证系统的自动重试机制

**测试步骤**:
1. 制造一个可恢复的临时错误（如 503 Service Unavailable）
2. 观察系统是否自动重试

**预期结果**:
- 系统按配置进行重试
- 重试间隔符合退避策略
- 最终成功或达到最大重试次数后失败

---

### 4.7 资源清理（TC-ERR-025 ~ TC-ERR-027）

#### TC-ERR-025: 取消任务资源清理

**目的**: 验证取消任务后临时资源被正确清理

**测试步骤**:
1. 创建任务并让其开始执行
2. 在执行过程中取消任务
3. 检查临时文件和外部资源

**预期结果**:
- 临时文件被清理
- FFmpeg 进程已终止
- GCS 临时文件被清理（如适用）

---

#### TC-ERR-026: 失败任务资源清理

**目的**: 验证失败任务的资源清理

**测试步骤**:
1. 制造一个会失败的任务（如无效 API Key）
2. 等待任务失败
3. 检查资源状态

**预期结果**:
- 部分完成的临时文件被清理
- 数据库状态一致
- 不留下孤立资源

---

#### TC-ERR-027: 删除任务资源清理

**目的**: 验证删除任务后所有关联数据被清理

**测试步骤**:
```bash
# 1. 创建并完成一个任务
# 2. 删除该任务
JOB_ID="<已完成的任务ID>"
curl -X DELETE "https://chuangcut.zeabur.app/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6"

# 3. 验证任务已删除
curl -X GET "https://chuangcut.zeabur.app/api/jobs/$JOB_ID" \
  -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6"
```

**预期结果**:
- 任务记录被删除
- 关联的日志、分镜、视频记录被级联删除
- GET 请求返回 404

---

### 4.8 系统稳定性（TC-ERR-028 ~ TC-ERR-030）

#### TC-ERR-028: 长时间运行稳定性

**目的**: 验证系统长时间运行的稳定性

**测试步骤**:
1. 连续创建和执行多个任务（10+）
2. 监控系统资源使用
3. 检查是否有内存泄漏或性能下降

**预期结果**:
- 系统持续稳定运行
- 内存使用保持在合理范围
- 响应时间无明显下降

---

#### TC-ERR-029: 数据库连接池耗尽

**目的**: 验证高并发下数据库连接的处理

**测试步骤**:
```bash
# 并发发送大量请求
for i in {1..50}; do
  curl -X GET "https://chuangcut.zeabur.app/api/jobs" \
    -H "Authorization: Bearer cca_b4e3f8a2d1c6e9f0a3b7c5d8e2f4a1b6" &
done
wait
```

**预期结果**:
- 所有请求最终得到响应
- 无数据库连接错误
- 系统不会崩溃

---

#### TC-ERR-030: 服务重启恢复

**目的**: 验证服务重启后的状态恢复

**测试步骤**:
1. 创建一个正在执行的任务
2. 通过 Zeabur CLI 重启服务
   ```bash
   zeabur service restart --id 69417cec5b09e8f620b1a1c8 --env-id 69417cec4947dd57c4fd0167 -y -i=false
   ```
3. 等待服务恢复
4. 检查任务状态

**预期结果**:
- 服务成功重启
- 任务状态正确恢复（processing 变为 pending 或可恢复状态）
- 可以继续执行或重新开始任务

---

## 五、问题记录模板

| 编号 | 发现时间 | 测试用例 | 问题描述 | 严重程度 | 状态 |
|------|----------|----------|----------|----------|------|
| BUG-E001 | | TC-ERR-XXX | | P0/P1/P2 | Open |

**严重程度说明**:
- **P0（致命）**: 系统崩溃、数据丢失、安全漏洞
- **P1（严重）**: 核心功能不可用、数据不一致
- **P2（一般）**: 次要功能异常、体验问题

---

## 六、测试结果汇总

| 类别 | 用例数 | 通过 | 失败 | 阻塞 | 通过率 |
|------|--------|------|------|------|--------|
| 输入验证异常 | 4 | | | | |
| 认证与权限异常 | 4 | | | | |
| 外部服务异常 | 4 | | | | |
| 并发与竞态 | 3 | | | | |
| 数据边界 | 5 | | | | |
| 网络与超时 | 4 | | | | |
| 资源清理 | 3 | | | | |
| 系统稳定性 | 3 | | | | |
| **总计** | **30** | | | | |

---

## 七、注意事项

1. **安全测试**：注入测试仅用于验证防护措施，不要在生产环境执行恶意操作
2. **资源管理**：高并发测试后检查系统资源，必要时重启服务
3. **数据清理**：测试完成后清理创建的测试数据
4. **监控日志**：测试期间持续监控 Zeabur 控制台的日志输出
5. **备份恢复**：在进行破坏性测试前确保有数据备份
