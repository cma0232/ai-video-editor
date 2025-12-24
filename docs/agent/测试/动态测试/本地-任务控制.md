# 本地测试 - 任务控制

> **测试环境**: http://localhost:8899
> **用例数量**: 3 个
> **测试重点**: 任务控制按钮功能、状态转换、数据库一致性、控制台无错误

---

## 一、测试凭据

> **重要**：测试凭据和资源请参考以下文件，本文档不包含敏感信息。

| 凭据类型 | 参考文件 |
|----------|----------|
| 环境地址、账号密码、数据库路径 | [凭据/本地.md](../凭据/本地.md) |
| 测试视频、API 配置模板 | [凭据/公共.md](../凭据/公共.md) |

---

## 二、测试任务参数

> ⚠️ 为加快测试速度，使用以下参数创建测试任务

| 参数 | 值 |
|------|-----|
| **视频 URL** | 参考 [凭据/公共.md](../凭据/公共.md) 中的测试视频 |
| **风格** | 通用解说风格（style-1000） |
| **分镜数量** | 3-5（推荐 4） |
| **原声分镜** | 0 |
| **Gemini 平台** | AI Studio |

---

## 三、任务状态机

### 3.1 状态定义

| 状态 | 中文名 | 说明 |
|------|--------|------|
| `pending` | 待处理 | 任务已创建，等待执行 |
| `processing` | 处理中 | 任务正在执行 |
| `completed` | 已完成 | 任务成功完成（终态） |
| `failed` | 失败 | 任务执行失败（终态） |

### 3.2 状态转换规则

```
pending → processing → completed
                    ↘ failed
```

### 3.3 各状态可用按钮

| 状态 | 导出数据 | 其他控制 |
|------|:--------:|:--------:|
| **pending** | ✗ | ✗ |
| **processing** | ✓ | ✗ |
| **completed** | ✓ | ✗ |
| **failed** | ✓（导出失败报告） | ✗ |

---

## 四、测试用例

---

### TC-CTL-L001 下载视频

#### 测试条件
| 项目 | 要求 |
|------|------|
| **前置状态** | `completed`（任务已完成） |
| **测试页面** | `/jobs/{job_id}` 任务详情页 |

#### 操作步骤
1. 等待任务状态变为「已完成」
2. 点击「下载视频」按钮（蓝色，带下载图标）
3. 浏览器开始下载 MP4 文件

#### UI 验证
- [ ] 按钮仅在 `completed` 状态可见
- [ ] 按钮样式：蓝色背景，白色文字
- [ ] 点击后开始下载

#### 下载验证
- [ ] 文件名格式：`{时间戳}-{jobId}-final.mp4`
- [ ] 文件格式为 MP4
- [ ] 文件可正常播放
- [ ] 视频时长与分镜总时长一致

#### API 验证
- [ ] 请求：GET `/api/jobs/{id}/download`
- [ ] 响应状态码：200
- [ ] Content-Type：video/mp4
- [ ] Content-Disposition 包含文件名

#### 控制台验证
- [ ] 无 JavaScript 错误
- [ ] 无网络请求错误

---

### TC-CTL-L002 任务状态显示

#### 测试目标
验证任务详情页在不同状态下的显示正确性。

#### 2.1 Pending 状态

**验证清单**：
- [ ] 状态徽章显示「待处理」（灰色）
- [ ] 无「下载视频」按钮

#### 2.2 Processing 状态

**验证清单**：
- [ ] 状态徽章显示「处理中」（蓝色）
- [ ] 无「下载视频」按钮
- [ ] 日志面板自动刷新

#### 2.3 Completed 状态

**验证清单**：
- [ ] 状态徽章显示「已完成」（绿色）
- [ ] 显示「下载视频」按钮（蓝色）
- [ ] 显示成本摘要卡片

#### 2.4 Failed 状态

**验证清单**：
- [ ] 状态徽章显示「失败」（红色）
- [ ] 显示错误信息区域
- [ ] 显示成本摘要卡片
- [ ] 无「下载视频」按钮

---

### TC-CTL-L003 成本摘要显示

#### 测试目标
验证成本摘要卡片在任务完成/失败后正确显示。

#### 测试条件
| 项目 | 要求 |
|------|------|
| **前置状态** | `completed` 或 `failed` |
| **测试页面** | `/jobs/{job_id}` 任务详情页 |

#### 验证清单
- [ ] 成本摘要卡片在 `completed` 状态显示
- [ ] 成本摘要卡片在 `failed` 状态显示
- [ ] 显示 Gemini API 调用次数
- [ ] 显示 Fish Audio 调用次数
- [ ] 显示估算总成本

---

## 五、推荐测试流程

```
步骤 1: 创建测试任务
├── 使用测试参数创建新任务
├── 等待状态变为 processing
└── 验证 TC-CTL-L002.2（processing 状态显示）

步骤 2: 等待任务完成
├── 验证 TC-CTL-L002.3（completed 状态显示）
├── 执行 TC-CTL-L001（下载视频）
└── 验证 TC-CTL-L003（成本摘要显示）

步骤 3: 测试失败状态（可选）
├── 制造任务失败（如无效视频 URL）
├── 验证 TC-CTL-L002.4（failed 状态显示）
└── 验证 TC-CTL-L003（成本摘要显示）
```

---

## 六、调试命令参考

### 日志监控
```bash
# 实时监控应用日志
tail -f ./logs/app.log

# 筛选特定任务日志
tail -f ./logs/app.log | grep "<job_id>"

# 筛选错误日志
tail -f ./logs/app.log | grep -E "(ERROR|error|Error)"
```

### 数据库查询
```bash
# 查看任务状态
sqlite3 ./data/db.sqlite "SELECT id, status, current_step, error_message FROM jobs WHERE id='<job_id>';"

# 查看步骤历史
sqlite3 ./data/db.sqlite "SELECT step_name, status, started_at, completed_at FROM job_step_history WHERE job_id='<job_id>' ORDER BY started_at DESC LIMIT 10;"

# 查看分镜数据
sqlite3 ./data/db.sqlite "SELECT scene_index, duration_seconds, use_original_audio FROM job_scenes WHERE job_id='<job_id>';"

# 查看最近日志
sqlite3 ./data/db.sqlite "SELECT log_type, log_level, message, created_at FROM job_logs WHERE job_id='<job_id>' ORDER BY created_at DESC LIMIT 10;"

# 查看最近任务
sqlite3 ./data/db.sqlite "SELECT id, status, current_step, updated_at FROM jobs ORDER BY updated_at DESC LIMIT 5;"
```

---

## 七、网络请求监控清单

| 操作 | 请求方法 | 端点 | 预期状态码 |
|------|----------|------|------------|
| 获取任务详情 | GET | `/api/jobs/{id}` | 200 |
| 下载视频 | GET | `/api/jobs/{id}/download` | 200 |
| 获取成本 | GET | `/api/jobs/{id}/cost` | 200 |
| 获取日志 | GET | `/api/jobs/{id}/logs` | 200 |

**异常监控**：
- [ ] 无 4xx 客户端错误
- [ ] 无 5xx 服务器错误
- [ ] 无请求超时
- [ ] 无 CORS 错误

---

## 八、测试结果

| 用例 | 结果 | 问题描述 |
|------|------|----------|
| TC-CTL-L001 下载视频 | ☐ 通过 / ☐ 失败 | |
| TC-CTL-L002 任务状态显示 | ☐ 通过 / ☐ 失败 | |
| TC-CTL-L003 成本摘要显示 | ☐ 通过 / ☐ 失败 | |

---

## 九、问题记录

```markdown
### 问题 N
- **用例编号**：TC-CTL-LXXX
- **严重程度**：P0 / P1 / P2
- **现象描述**：
- **控制台错误**：
- **终端日志错误**：
- **数据库异常**：
- **复现步骤**：
- **修复状态**：☐ 待修复 / ☐ 已修复
```

---

**测试结论**：☐ 全部通过 / ☐ 部分通过 / ☐ 需修复后重测
