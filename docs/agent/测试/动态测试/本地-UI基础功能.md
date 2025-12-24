# 本地测试 - UI 基础功能测试

> **测试环境**: 本地开发环境 (localhost:8899)
> **测试目标**: 验证本地部署的 UI 界面基础功能
> **对应云端文档**: `01-云端-UI基础功能.md`

---

## 测试目的

**核心目标**：通过实际操作验证本地开发环境的 UI 界面功能正确性，确保用户交互流畅、页面渲染正常、表单提交有效。

**具体要求**：
1. **全面验证**：按用例逐项测试，不得遗漏任何功能点
2. **问题记录**：发现问题时记录现象、控制台错误、日志信息
3. **修复方案**：针对发现的问题，给出简洁高效的最优化修复方案

**修复原则**：
- ✅ **保证功能正常**：修复后必须确保现有功能正常运行
- ✅ **不引入新错误**：修复方案不得引入新的报错或问题
- ✅ **面向现有功能**：非必要不兼容历史数据，优先满足当前功能需求
- ❌ **避免过度设计**：不为假设的未来需求增加复杂性

**重点关注**：
- 页面加载和渲染正常
- 登录/登出流程正确
- 密钥配置保存生效
- 表单验证和提交

---

## 一、测试凭据

> **重要**：测试凭据和资源请参考以下文件，本文档不包含敏感信息。

| 凭据类型 | 参考文件 |
|----------|----------|
| 环境地址、账号密码、日志目录 | [凭据/本地.md](../凭据/本地.md) |
| 测试视频、API 配置模板 | [凭据/公共.md](../凭据/公共.md) |

---

## 四、环境准备

### 4.1 启动本地开发环境

```bash
# 进入项目目录
cd /Users/xiangyu-server/Downloads/code-xy/chuangcut-video-workflow

# 启动开发服务器
./scripts/dev.sh
```

### 4.2 验证服务启动

```bash
# 检查健康状态（需要携带认证信息）
curl http://localhost:8899/api/health

# 预期响应（未认证时可能返回 401）
# {"status":"ok","timestamp":"..."}
```

> ⚠️ **注意**：`/api/health` 端点在生产模式下需要认证。本地开发环境可能返回 401 Unauthorized，这是正常行为。可通过浏览器访问已登录的页面来验证服务状态。

### 4.3 MCP Chrome DevTools 准备

确保 Chrome 浏览器已打开并连接 MCP Chrome DevTools 服务器。

---

## 五、测试用例

### 5.1 认证功能测试（TC-AUTH-L001 ~ TC-AUTH-L002）

#### TC-AUTH-L001: 本地登录功能

**目的**: 验证本地环境的登录功能

**前置条件**: 本地服务已启动，首次使用已完成注册

**测试步骤**:
1. 打开浏览器访问 http://localhost:8899
2. 如果未登录，应自动跳转到登录页
3. 输入用户名和密码
4. 点击登录按钮
5. 验证登录成功后跳转到首页

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="http://localhost:8899"
2. mcp__chrome-devtools__take_snapshot: 查看页面结构
3. mcp__chrome-devtools__fill: 填写用户名
4. mcp__chrome-devtools__fill: 填写密码
5. mcp__chrome-devtools__click: 点击登录按钮
6. mcp__chrome-devtools__wait_for: 等待跳转完成
```

**预期结果**:
- 登录成功，跳转到首页（`/`）
- 页面显示用户信息和主导航
- Session 正确建立

---

#### TC-AUTH-L002: 本地登出功能

**目的**: 验证本地环境的登出功能

**前置条件**: 已登录

**测试步骤**:
1. 点击页面右上角用户菜单
2. 点击"退出登录"
3. 验证跳转到登录页

**预期结果**:
- 成功登出
- 跳转到登录页
- Session 被清除

---

### 5.2 系统配置测试（TC-CFG-L001 ~ TC-CFG-L003）

#### TC-CFG-L001: 本地 AI Studio 模式配置（含实际验证）

**目的**: 验证本地环境的 AI Studio 模式 API 密钥配置，**必须实际调用 API 验证连通性**

**前置条件**: 已登录

> ⚠️ **重要**：本测试要求点击"验证并保存"按钮，系统会实际调用外部 API 验证密钥有效性，而不是仅保存配置。

**测试步骤**:
1. 导航到设置页面 http://localhost:8899/settings
2. 切换到「Google AI Studio 配置」标签页
3. **配置 Gemini AI Studio**：
   - 输入 API Key（参考凭证文档）
   - 点击「验证并保存」按钮
   - 等待验证结果，确认显示「已验证」状态
4. **配置 Fish Audio**：
   - 输入音色 ID 和 API Key（参考凭证文档）
   - 点击「验证并保存」按钮
   - 等待验证结果，确认显示「已验证」状态
6. 刷新页面验证配置持久化

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="http://localhost:8899/settings"
2. mcp__chrome-devtools__click: 切换到「Google AI Studio 配置」标签页
3. mcp__chrome-devtools__fill: 填写 Gemini API Key
4. mcp__chrome-devtools__click: 点击「验证并保存」
5. mcp__chrome-devtools__wait_for: 等待验证结果（成功/失败 Toast）
6. mcp__chrome-devtools__fill: 填写 Fish Audio 音色 ID 和 API Key
7. mcp__chrome-devtools__click: 点击 Fish Audio「验证并保存」
8. mcp__chrome-devtools__wait_for: 等待验证结果
9. mcp__chrome-devtools__navigate_page: type="reload"
10. mcp__chrome-devtools__take_snapshot: 验证服务显示「已验证」
```

**预期结果**:
- ✅ Gemini AI Studio：验证通过，状态显示「已验证」
- ✅ Fish Audio：验证通过，状态显示「已验证」
- ✅ 刷新页面后服务状态仍为「已验证」
- ✅ 密钥以脱敏方式显示（`•••••••`）

**验证失败处理**:
- 如果任一服务验证失败，检查：
  1. API Key 是否正确复制（无多余空格）
  2. 网络是否可访问外部服务
  3. 查看浏览器控制台和服务器日志获取详细错误

---

#### TC-CFG-L002: 本地 Vertex AI 模式配置（含实际验证）

**目的**: 验证本地环境的 Vertex AI 平台配置，**必须实际调用 API 验证连通性**

**前置条件**: 已登录

> ⚠️ **重要**：本测试要求点击"验证并保存"按钮，系统会实际调用外部 API 验证凭据有效性。

**测试步骤**:
1. 导航到设置页面 http://localhost:8899/settings
2. 切换到「Google Vertex 配置」标签页
3. **配置 Gemini Vertex AI**：
   - 输入 Project ID: `xiangyugongzuoliu`
   - 输入 Location: `global`（Gemini 3 必须使用 global）
   - 粘贴 Service Account JSON（见上方凭据）
   - 点击「验证并保存」按钮
   - 等待验证结果，确认显示「已验证」状态
4. **配置 Fish Audio**（Vertex 模式独立配置）：
   - 输入音色 ID 和 API Key（参考凭证文档）
   - 点击「验证并保存」按钮
   - 等待验证结果，确认显示「已验证」状态
5. **配置 GCS 存储**（Vertex AI 必需）：
   - 输入 Bucket: `chuangcut-videos`
   - 点击「验证并保存」按钮
   - 等待验证结果
7. 刷新页面验证配置持久化

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="http://localhost:8899/settings"
2. mcp__chrome-devtools__click: 切换到「Google Vertex 配置」标签页
3. mcp__chrome-devtools__fill: 填写 Project ID、Location
4. mcp__chrome-devtools__fill: 粘贴 Service Account JSON
5. mcp__chrome-devtools__click: 点击 Vertex AI「验证并保存」
6. mcp__chrome-devtools__wait_for: 等待验证结果
7. mcp__chrome-devtools__fill: 填写 Fish Audio 配置
8. mcp__chrome-devtools__click: 点击 Fish Audio「验证并保存」
9. mcp__chrome-devtools__fill: 填写 GCS Bucket
10. mcp__chrome-devtools__click: 点击 GCS「验证并保存」
11. mcp__chrome-devtools__navigate_page: type="reload"
12. mcp__chrome-devtools__take_snapshot: 验证所有服务都显示「已验证」
```

**预期结果**:
- ✅ Gemini Vertex AI：验证通过，状态显示「已验证」
- ✅ Fish Audio：验证通过，状态显示「已验证」
- ✅ GCS 存储：验证通过，状态显示「已验证」
- ✅ 刷新页面后所有服务状态仍为「已验证」

**验证失败处理**:
- Vertex AI 验证失败：检查 Service Account JSON 格式、权限配置
- GCS 验证失败：检查 Bucket 名称、Service Account 的存储权限

---

#### TC-CFG-L003: 系统参数配置

**目的**: 验证系统级参数配置功能

**前置条件**: 已登录

**测试步骤**:
1. 导航到设置页面 http://localhost:8899/settings
2. 查看「系统配置」部分
3. 验证以下系统参数可配置：
   - 系统并发数
   - Gemini API 区域
   - 默认 Gemini 模型
   - 视频分析分辨率
   - 视频采样帧率 (FPS)
   - 旁白批量生成数量
   - 字幕功能

**预期结果**:
- ✅ 系统参数配置界面正常显示
- ✅ 参数修改后能正确保存
- ✅ 页面刷新后配置持久化

---

### 5.3 系统状态测试（TC-SYS-L001）

#### TC-SYS-L001: 本地系统健康检查

**目的**: 验证本地系统健康状态

**测试步骤**:
```bash
# 方法 1：API 测试（可能需要认证）
curl http://localhost:8899/api/health

# 方法 2：通过浏览器验证（推荐）
# 登录后访问任意页面，页面正常加载即表示服务健康
```

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="http://localhost:8899"
2. mcp__chrome-devtools__take_snapshot: 检查页面是否正常加载
```

**预期结果**:
- API 返回 `{"status":"ok"}`（需认证时返回 401 是正常行为）
- 页面正常加载，无错误提示
- 数据库连接正常

> ⚠️ **注意**：Health API 在启用认证的环境下需要登录状态或 API Token 才能访问。

---

### 5.4 风格管理测试（TC-STYLE-L001 ~ TC-STYLE-L002）

#### TC-STYLE-L001: 本地风格列表查看

**目的**: 验证本地环境的风格列表展示

**前置条件**: 已登录

**测试步骤**:
1. 导航到风格管理页面 http://localhost:8899/styles
2. 查看预置风格列表
3. 验证风格信息完整

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="http://localhost:8899/styles"
2. mcp__chrome-devtools__take_snapshot: 查看风格列表
```

**预期结果**:
- ✅ 显示「预设风格 (16)」和「自定义风格」两个标签页
- ✅ 预设风格列表显示 16 个风格
- ✅ 每个风格显示名称、描述、频道名称
- ✅ 每个风格有「预览」按钮

---

#### TC-STYLE-L002: 本地风格预览

**目的**: 验证本地环境的风格预览功能

**前置条件**: 已登录，在风格管理页面

**测试步骤**:
1. 选择一个风格
2. 点击预览按钮
3. 查看风格的详细配置

**MCP 操作**:
```
1. mcp__chrome-devtools__click: 点击风格卡片或预览按钮
2. mcp__chrome-devtools__take_snapshot: 查看预览详情
```

**预期结果**:
- ✅ 弹窗标题显示「风格预览：{风格名称}」
- ✅ 显示风格基本信息：频道名称、分镜时长、原声分镜、语速方案
- ✅ 提供「视频分析提示词」和「音画同步提示词」两个标签页
- ✅ 提示词区域显示字符数和行数统计
- ✅ 提供「全选」按钮方便复制
- ✅ 动态变量以蓝色高亮显示（如 `{{video_descriptions}}`）
- ✅ 弹窗可正常关闭

---

### 5.5 UI 导航与布局测试（TC-UI-L001 ~ TC-UI-L003）

#### TC-UI-L001: 本地主导航功能

**目的**: 验证本地环境的主导航功能

**前置条件**: 已登录

**测试步骤**:
1. 点击导航栏"任务"
2. 验证跳转到任务列表
3. 点击导航栏"风格"
4. 验证跳转到风格管理
5. 点击导航栏"设置"
6. 验证跳转到设置页面

**MCP 操作**:
```
1. mcp__chrome-devtools__take_snapshot: 获取导航元素
2. mcp__chrome-devtools__click: 点击"任务"导航
3. mcp__chrome-devtools__wait_for: 等待页面加载
4. mcp__chrome-devtools__click: 点击"风格"导航
5. mcp__chrome-devtools__click: 点击"设置"导航
```

**预期结果**:
- 所有导航链接可点击
- 页面正确跳转
- 当前页面导航项高亮显示

---

#### TC-UI-L002: 本地响应式布局

**目的**: 验证本地环境的响应式设计

**前置条件**: 已登录

**测试步骤**:
1. 在桌面宽度（1920px）查看页面
2. 调整到平板宽度（768px）
3. 调整到手机宽度（375px）
4. 验证各宽度下的布局适配

**MCP 操作**:
```
1. mcp__chrome-devtools__resize_page: width=1920, height=1080
2. mcp__chrome-devtools__take_screenshot: 桌面截图
3. mcp__chrome-devtools__resize_page: width=768, height=1024
4. mcp__chrome-devtools__take_screenshot: 平板截图
5. mcp__chrome-devtools__resize_page: width=375, height=812
6. mcp__chrome-devtools__take_screenshot: 手机截图
```

**预期结果**:
- 桌面：完整侧边栏 + 主内容区
- 平板：折叠侧边栏 + 主内容区
- 手机：汉堡菜单 + 全宽内容

> ⚠️ **注意**：使用 MCP Chrome DevTools 的 `resize_page` 功能时，浏览器窗口必须处于正常状态（非最大化）。如果窗口已最大化，会收到错误提示 "Restore window to normal state before setting content size"。这是浏览器的限制，不是代码问题。

---

#### TC-UI-L003: 本地 Toast 通知系统

**目的**: 验证本地环境的通知提示功能

**前置条件**: 已登录

**测试步骤**:
1. 执行一个会触发成功提示的操作（如保存配置）
2. 观察 Toast 提示出现
3. 验证提示自动消失
4. 执行一个会触发错误提示的操作
5. 验证错误提示样式

**预期结果**:
- 成功提示：绿色背景，几秒后自动消失
- 错误提示：红色背景，显示错误详情
- 提示位置正确（右上角或底部）

---

### 5.6 本地特有功能测试（TC-LOCAL-001 ~ TC-LOCAL-002）

#### TC-LOCAL-001: 本地文件输出目录

**目的**: 验证本地环境的文件输出功能

**前置条件**: 已完成一个任务

**测试步骤**:
1. 完成一个视频处理任务
2. 检查 `./output/` 目录
3. 验证输出文件存在

**Shell 验证**:
```bash
# 检查输出目录
ls -la ./output/

# 检查最新输出文件
ls -lt ./output/ | head -5
```

**预期结果**:
- 输出目录存在
- 包含处理完成的视频文件
- 文件名符合命名规范

---

#### TC-LOCAL-002: 本地日志文件检查

**目的**: 验证本地日志记录功能

**前置条件**: 服务已运行一段时间

**测试步骤**:
1. 检查 `./logs/` 目录
2. 查看最新日志文件
3. 验证日志格式和内容

**Shell 验证**:
```bash
# 检查日志目录
ls -la ./logs/

# 查看最新日志（日志文件按日期命名）
# 文件名格式：app-YYYY-MM-DD.log
tail -50 ./logs/app-$(date +%Y-%m-%d).log

# 或查看目录中最新的日志文件
ls -lt ./logs/ | head -5
```

**预期结果**:
- 日志目录存在
- 日志文件按日期命名（如 `app-2025-11-28.log`）
- 日志格式包含时间戳、级别、消息

---

## 六、问题记录模板

| 编号 | 发现时间 | 测试用例 | 问题描述 | 严重程度 | 状态 |
|------|----------|----------|----------|----------|------|
| BUG-L001 | | TC-XXX-LXXX | | P0/P1/P2 | Open |

---

## 七、测试结果汇总

| 类别 | 用例数 | 通过 | 失败 | 阻塞 | 通过率 |
|------|--------|------|------|------|--------|
| 认证功能 | 2 | | | | |
| 系统配置 | 3 | | | | |
| 系统状态 | 1 | | | | |
| 风格管理 | 2 | | | | |
| UI 导航与布局 | 3 | | | | |
| 本地特有功能 | 2 | | | | |
| **总计** | **13** | | | | |

---

## 八、本地与云端差异说明

| 方面 | 本地环境 | 云端环境 |
|------|----------|----------|
| **服务地址** | http://localhost:8899 | https://chuangcut.zeabur.app |
| **数据库** | SQLite 文件 (`./data/db.sqlite`) | SQLite 文件（持久卷） |
| **文件存储** | 本地文件系统 | Zeabur 持久卷 |
| **日志查看** | `./logs/app-YYYY-MM-DD.log` | Zeabur 控制台 |
| **服务管理** | `./scripts/dev.sh` | Zeabur CLI |
| **配置修改** | 直接编辑 .env | Zeabur 环境变量 |
| **用例编号** | TC-XXX-L00X（L 表示 Local） | TC-XXX-C00X（C 表示 Cloud） |

---

## 九、注意事项

1. **端口占用**：确保 8899 端口未被其他服务占用
2. **数据库初始化**：首次启动会自动初始化数据库
3. **热重载**：开发模式支持代码热重载
4. **日志级别**：本地默认 DEBUG 级别，日志较详细
5. **HTTPS**：本地使用 HTTP，无需配置证书
6. **Service Account**：文档中的 Service Account JSON 为示例/占位符，实际测试请使用真实凭据
7. **浏览器窗口状态**：使用 MCP Chrome DevTools 进行响应式测试时，确保浏览器窗口未最大化
