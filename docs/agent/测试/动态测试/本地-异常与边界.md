# 本地测试 - 异常与边界测试

> **测试环境**: 本地开发环境 (localhost:8899)
> **测试目标**: 全面排查程序在异常情况和边界条件下的稳定性，发现潜在 Bug 并提供修复方案
> **对应云端文档**: `05-云端-异常与边界.md`

---

## 测试目的

**核心目标**：通过异常输入和边界条件测试，全面排查程序在极端情况下的稳定性，发现隐藏 Bug 并提供修复方案。

**具体要求**：
1. **全面验证**：按用例逐项测试，覆盖各种异常场景
2. **问题记录**：发现问题时记录输入条件、系统行为、错误信息、日志
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
- 系统在极端条件下不崩溃

---

## 一、测试方法论

```
异常注入 → 观察系统行为 → 监控日志/控制台 → 分析错误根因 →
评估影响范围 → 提出修复方案 → 验证修复效果 → 记录到报告
```

### 日志监控（必须全程开启）

```bash
# 终端 1：启动服务
./scripts/dev.sh

# 终端 2：监控所有日志
tail -f ./logs/app.log

# 终端 3：只监控错误和警告
tail -f ./logs/app.log | grep -E "(ERROR|WARN|Error|error|Exception|exception)"

# 终端 4：监控数据库操作
tail -f ./logs/app.log | grep -E "(SELECT|INSERT|UPDATE|DELETE|sqlite)"
```

---

## 二、测试凭据

> **重要**：测试凭据和资源请参考以下文件，本文档不包含敏感信息。

| 凭据类型 | 参考文件 |
|----------|----------|
| 环境地址、账号密码、数据库路径 | [凭据/本地.md](../凭据/本地.md) |
| 测试视频、API 配置模板 | [凭据/公共.md](../凭据/公共.md) |

> ⚠️ **注意**：API Token 需通过 Web 界面生成，参考凭据文件中的登录信息。

### 错误凭据（用于异常测试）

| 服务 | 错误凭据 | 用途 |
|------|----------|------|
| **Gemini** | `invalid_api_key_12345` | 测试 API Key 验证 |
| **Fish Audio** | `invalid_fish_key` | 测试音频合成失败 |

---

## 五、测试用例

### 5.1 输入验证异常（TC-ERR-L001 ~ TC-ERR-L004）

#### TC-ERR-L001: 无效视频 URL

**目的**: 验证系统对无效 URL 的处理，确保错误被正确捕获

**测试命令**:
```bash
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [{"url": "https://invalid-domain-12345.com/video.mp4", "label": "测试"}],
    "style_id": "style-1000"
  }' | jq .
```

**日志监控关键词**: `video_url`, `fetch`, `ENOTFOUND`, `timeout`

**预期行为**:
- 返回 400 Bad Request
- 错误信息明确说明 URL 无法访问
- 不创建任务记录

**错误分析模板**:
| 项目 | 内容 |
|------|------|
| **实际响应** | |
| **控制台错误** | |
| **日志关键信息** | |
| **是否符合预期** | |
| **问题描述（如有）** | |
| **修复建议（如有）** | |

---

#### TC-ERR-L002: 空视频 URL

**目的**: 验证必填字段校验

**测试命令**:
```bash
# 空数组
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [],
    "style_id": "style-1000"
  }' | jq .

# 缺少字段
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "style_id": "style-1000"
  }' | jq .
```

**预期行为**:
- 返回 400 Bad Request
- 明确提示"input_videos is required"或"至少需要一个视频"

---

#### TC-ERR-L003: 无效风格 ID

**测试命令**:
```bash
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [{"url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4", "label": "测试"}],
    "style_id": "non-existent-style-12345"
  }' | jq .
```

**预期行为**:
- 返回 400 或 404 错误
- 提示风格不存在

---

#### TC-ERR-L004: 无效 JSON 请求

**测试命令**:
```bash
# 无效 JSON
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d 'invalid json {' | jq .

# 空请求体
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d '' | jq .
```

**预期行为**:
- 返回 400 Bad Request
- 提示 JSON 解析失败

---

### 5.2 认证异常（TC-ERR-L005 ~ TC-ERR-L008）

#### TC-ERR-L005: 无效 Token

**测试命令**:
```bash
# 无效 Token
curl -s http://localhost:8899/api/jobs \
  -H "Authorization: Bearer invalid_token_12345" | jq .

# 空 Token
curl -s http://localhost:8899/api/jobs \
  -H "Authorization: Bearer " | jq .

# 无 Authorization 头
curl -s http://localhost:8899/api/jobs | jq .
```

**预期行为**:
- 返回 401 Unauthorized
- 不泄露内部信息

---

#### TC-ERR-L006: Token 格式错误

**测试命令**:
```bash
# 缺少 Bearer 前缀
curl -s http://localhost:8899/api/jobs \
  -H "Authorization: cca_local_test_token_12345" | jq .

# 错误的前缀
curl -s http://localhost:8899/api/jobs \
  -H "Authorization: Basic cca_local_test_token_12345" | jq .
```

---

#### TC-ERR-L007: 过期 Token 测试

**前置条件**: 创建一个已过期的 Token

**测试步骤**:
```bash
# 1. 创建短期 Token
curl -s -X POST http://localhost:8899/api/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"name": "expire-test", "expiresInDays": 0}' | jq .

# 2. 使用该 Token（应该已过期）
# TOKEN=<上面返回的token>
# curl -s http://localhost:8899/api/jobs -H "Authorization: Bearer $TOKEN"
```

---

#### TC-ERR-L008: 已撤销 Token 测试

**测试步骤**:
```bash
# 1. 创建 Token
RESPONSE=$(curl -s -X POST http://localhost:8899/api/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"name": "revoke-test", "expiresInDays": 7}')

TOKEN=$(echo $RESPONSE | jq -r '.token')
TOKEN_ID=$(echo $RESPONSE | jq -r '.id')

# 2. 验证 Token 可用
curl -s http://localhost:8899/api/jobs -H "Authorization: Bearer $TOKEN" | jq .

# 3. 撤销 Token
curl -s -X DELETE "http://localhost:8899/api/auth/tokens/$TOKEN_ID" | jq .

# 4. 验证 Token 已失效
curl -s http://localhost:8899/api/jobs -H "Authorization: Bearer $TOKEN" | jq .
```

---

### 5.3 外部服务异常（TC-ERR-L009 ~ TC-ERR-L012）

#### TC-ERR-L009: Gemini API Key 无效

**目的**: 验证外部服务认证失败时的错误处理

**测试步骤**:
1. 在设置中配置无效的 Gemini API Key
2. 创建任务
3. 观察任务失败行为

**日志监控**:
```bash
tail -f ./logs/app.log | grep -E "(gemini|Gemini|API|api|401|403)"
```

**预期行为**:
- 任务在 `prepare_gemini` 或 `gemini_analysis` 步骤失败
- 错误信息明确指出 API Key 问题
- 任务状态变为 `failed`

**错误分析**:
| 检查项 | 结果 |
|--------|------|
| 任务状态是否正确更新为 failed | |
| 错误信息是否清晰 | |
| 是否有敏感信息泄露 | |
| 是否可以修复后重试 | |

---

#### TC-ERR-L010: FFmpeg 处理异常

**测试方法**: 提供损坏的视频文件或无效的时间戳参数

**日志监控**:
```bash
tail -f ./logs/app.log | grep -E "(ffmpeg|FFmpeg|Error|failed)"
```

**预期行为**:
- 任务在 `ffmpeg_batch_split` 步骤失败
- 记录 FFmpeg 错误信息
- 状态变为 `failed`

---

#### TC-ERR-L011: Fish Audio 服务异常

**测试方法**: 配置错误的 Fish Audio API Key

**日志监控**:
```bash
tail -f ./logs/app.log | grep -E "(fish|Fish|audio|tts|401)"
```

---

#### TC-ERR-L012: 网络超时模拟

**测试方法**: 使用长视频或模拟慢网络

**日志监控**:
```bash
tail -f ./logs/app.log | grep -E "(timeout|ETIMEDOUT|socket)"
```

---

### 5.4 并发与竞态（TC-ERR-L013 ~ TC-ERR-L015）

#### TC-ERR-L013: 并发创建任务

**目的**: 验证数据库并发写入的正确性

**测试脚本**:
```bash
#!/bin/bash
# 并发创建 10 个任务
for i in {1..10}; do
  curl -s -X POST http://localhost:8899/api/jobs \
    -H "Content-Type: application/json" \
    -d "{
      \"input_videos\": [{\"url\": \"https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4\", \"label\": \"测试$i\"}],
      \"style_id\": \"style-1000\"
    }" &
done
wait
echo "All requests completed"
```

**日志监控**:
```bash
tail -f ./logs/app.log | grep -E "(INSERT|SQLITE_BUSY|database|locked)"
```

**预期行为**:
- 所有任务都成功创建
- 无数据库锁死错误
- 每个任务有唯一 ID

**验证**:
```bash
sqlite3 ./data/db.sqlite "SELECT COUNT(*) FROM jobs WHERE created_at > datetime('now', '-1 minute');"
```

---

#### TC-ERR-L014: 同一任务并发操作

**测试脚本**:
```bash
JOB_ID="<已存在的任务ID>"

# 并发发送删除请求
curl -s -X DELETE "http://localhost:8899/api/jobs/$JOB_ID" &
curl -s -X DELETE "http://localhost:8899/api/jobs/$JOB_ID" &
wait
```

**预期行为**:
- 只有一个删除请求成功
- 第二个请求返回 404（任务不存在）
- 不发生数据库死锁

---

#### TC-ERR-L015: 重复操作幂等性（已下线）

> 停止功能已下线，本用例跳过。

**预期行为**:
- 返回成功或"已处于该状态"
- 操作是幂等的

---

### 5.5 数据边界（TC-ERR-L016 ~ TC-ERR-L020）

#### TC-ERR-L016: 超长字符串

**测试命令**:
```bash
# 超长任务名称（1000字符）
LONG_NAME=$(python3 -c "print('A' * 1000)")

curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d "{
    \"input_videos\": [{\"url\": \"https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4\", \"label\": \"$LONG_NAME\"}],
    \"style_id\": \"style-1000\"
  }" | jq .
```

**预期行为**:
- 截断或拒绝
- 不导致数据库错误

---

#### TC-ERR-L017: 特殊字符注入

**测试命令**:
```bash
# XSS 尝试
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [{"url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4", "label": "<script>alert(1)</script>"}],
    "style_id": "style-1000"
  }' | jq .

# SQL 注入尝试
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d "{
    \"input_videos\": [{\"url\": \"https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4\", \"label\": \"test' OR 1=1 --\"}],
    \"style_id\": \"style-1000\"
  }" | jq .
```

**预期行为**:
- 特殊字符被转义
- 不执行注入代码
- 数据安全存储

---

#### TC-ERR-L018: Unicode 和 Emoji

**测试命令**:
```bash
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input_videos": [{"url": "https://pub-b65afb21c951453a872a026d19411abe.r2.dev/dy-test-video-2.mp4", "label": "测试任务 🎬 日本語 한국어"}],
    "style_id": "style-1000"
  }' | jq .
```

---

#### TC-ERR-L019: 极端数值

**测试命令**:
```bash
# 超大页码
curl -s "http://localhost:8899/api/jobs?page=999999999&limit=100" | jq .

# 负数页码
curl -s "http://localhost:8899/api/jobs?page=-1&limit=-10" | jq .

# 非数字参数
curl -s "http://localhost:8899/api/jobs?page=abc&limit=xyz" | jq .
```

---

#### TC-ERR-L020: 空数组/空对象

**测试命令**:
```bash
# 空数组
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"input_videos": [], "style_id": "style-1000"}' | jq .

# 空对象
curl -s -X POST http://localhost:8899/api/jobs \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

---

### 5.6 资源与文件系统（TC-ERR-L021 ~ TC-ERR-L025）

#### TC-ERR-L021: 磁盘空间不足模拟

**检查命令**:
```bash
df -h ./data
df -h ./temp
df -h ./output
```

**预期行为**: 系统应在磁盘空间不足时给出明确错误

---

#### TC-ERR-L022: 文件权限问题

**测试命令**:
```bash
# 测试前备份
cp ./data/db.sqlite ./data/db.sqlite.bak

# 模拟权限问题
chmod 000 ./data/db.sqlite

# 尝试操作
curl -s http://localhost:8899/api/jobs | jq .

# 恢复权限
chmod 644 ./data/db.sqlite
```

---

#### TC-ERR-L023: 临时文件清理

**测试步骤**:
1. 创建并取消多个任务
2. 检查临时文件是否被清理

**验证命令**:
```bash
ls -la ./temp/
du -sh ./temp/
```

---

#### TC-ERR-L024: 数据库完整性

**测试命令**:
```bash
sqlite3 ./data/db.sqlite "PRAGMA integrity_check;"
sqlite3 ./data/db.sqlite "PRAGMA foreign_key_check;"
```

---

#### TC-ERR-L025: 大量数据性能

**测试脚本**:
```bash
# 创建大量测试数据后查询性能
time curl -s http://localhost:8899/api/jobs | jq length

# 监控查询时间
sqlite3 ./data/db.sqlite "EXPLAIN QUERY PLAN SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100;"
```

---

### 5.7 系统稳定性（TC-ERR-L026 ~ TC-ERR-L030）

#### TC-ERR-L026: 服务重启恢复

**测试步骤**:
1. 创建一个正在执行的任务
2. 强制重启服务（Ctrl+C 后重新启动）
3. 检查任务状态恢复

**验证**:
```bash
sqlite3 ./data/db.sqlite "SELECT id, status, current_step FROM jobs WHERE status='processing';"
```

---

#### TC-ERR-L027: 内存泄漏检测

**监控命令**:
```bash
# 监控 Node.js 进程内存
while true; do
  ps -o pid,rss,vsz,comm -p $(pgrep -f "next-server") 2>/dev/null
  sleep 30
done
```

---

#### TC-ERR-L028: 连续任务执行

**测试**: 连续创建并执行 10 个任务，观察系统稳定性

---

#### TC-ERR-L029: 错误恢复能力

**测试**: 制造各种错误后验证系统能否继续正常工作

---

#### TC-ERR-L030: 日志轮转验证

**检查**:
```bash
ls -la ./logs/
# 验证日志文件不会无限增长
```

---

## 六、错误分析与修复流程

### 6.1 错误分级标准

| 级别 | 定义 | 示例 | 修复时限 |
|------|------|------|----------|
| **P0（致命）** | 系统崩溃、数据丢失、安全漏洞 | 数据库损坏、SQL注入成功 | 立即 |
| **P1（严重）** | 核心功能不可用、数据不一致 | 任务无法创建、状态错乱 | 24小时内 |
| **P2（一般）** | 次要功能异常、体验问题 | 错误提示不友好、界面问题 | 计划修复 |

### 6.2 问题分析模板

```markdown
## 问题编号: BUG-LEXX

### 基本信息
- **发现时间**:
- **测试用例**: TC-ERR-LXXX
- **严重程度**: P0/P1/P2

### 问题描述
（清晰描述问题现象）

### 复现步骤
1.
2.
3.

### 实际结果
（包括错误信息、日志片段）

### 预期结果
（应该是什么行为）

### 日志关键信息
```
（粘贴相关日志）
```

### 代码定位
- 文件：
- 行号：
- 函数：

### 根因分析
（分析导致问题的根本原因）

### 修复方案
（提出高效简洁的修复建议）

### 影响范围
（评估此问题影响的功能范围）

### 验证方法
（如何验证修复是否有效）
```

---

## 七、问题记录表

| 编号 | 发现时间 | 测试用例 | 问题描述 | 严重程度 | 状态 | 修复方案 |
|------|----------|----------|----------|----------|------|----------|
| BUG-LE001 | | | | | Open | |
| BUG-LE002 | | | | | Open | |

---

## 八、测试结果汇总

| 类别 | 用例数 | 通过 | 失败 | 阻塞 | 发现 Bug | 通过率 |
|------|--------|------|------|------|----------|--------|
| 输入验证异常 | 4 | | | | | |
| 认证异常 | 4 | | | | | |
| 外部服务异常 | 4 | | | | | |
| 并发与竞态 | 3 | | | | | |
| 数据边界 | 5 | | | | | |
| 资源与文件系统 | 5 | | | | | |
| 系统稳定性 | 5 | | | | | |
| **总计** | **30** | | | | | |

---

## 九、完整测试报告模板

### 9.1 执行概要

| 项目 | 值 |
|------|-----|
| **测试日期** | |
| **测试环境** | 本地开发环境 (localhost:8899) |
| **测试人员** | |
| **执行时长** | |
| **总用例数** | 30 |
| **通过数** | |
| **失败数** | |
| **阻塞数** | |
| **发现 Bug 数** | |
| **通过率** | |

### 9.2 发现的问题汇总

#### P0 级问题（致命）
| 编号 | 描述 | 影响范围 | 根因 | 修复方案 | 状态 |
|------|------|----------|------|----------|------|
| | | | | | |

#### P1 级问题（严重）
| 编号 | 描述 | 影响范围 | 根因 | 修复方案 | 状态 |
|------|------|----------|------|----------|------|
| | | | | | |

#### P2 级问题（一般）
| 编号 | 描述 | 影响范围 | 根因 | 修复方案 | 状态 |
|------|------|----------|------|----------|------|
| | | | | | |

### 9.3 系统稳定性评估

| 评估项 | 结果 | 备注 |
|--------|------|------|
| 错误处理完整性 | ✅/❌ | |
| 输入验证严格性 | ✅/❌ | |
| 认证安全性 | ✅/❌ | |
| 数据一致性 | ✅/❌ | |
| 并发处理能力 | ✅/❌ | |
| 资源管理 | ✅/❌ | |
| 异常恢复能力 | ✅/❌ | |

### 9.4 改进建议

（基于测试结果，提出架构、代码、流程方面的改进建议）

1. **安全性改进**：
   -

2. **稳定性改进**：
   -

3. **性能改进**：
   -

4. **代码质量改进**：
   -

### 9.5 后续计划

| 任务 | 负责人 | 计划完成时间 |
|------|--------|--------------|
| 修复 P0 问题 | | |
| 修复 P1 问题 | | |
| 回归测试 | | |

---

## 十、注意事项

1. **全程监控日志**：测试过程中必须持续监控控制台和日志文件
2. **详细记录**：发现问题时立即记录，包括日志片段和错误堆栈
3. **数据备份**：在破坏性测试前备份数据库
4. **环境还原**：测试完成后还原测试配置为正确值
5. **安全测试谨慎**：注入测试仅用于验证防护，不要在生产环境执行
6. **修复优先级**：P0 立即修复，P1 24小时内修复，P2 纳入计划
