# 云端测试 - UI 基础功能测试

> **测试环境**：云端（Zeabur）
> **测试目标**：验证云端部署的 UI 界面基础功能
> **对应本地文档**：`06-本地-UI基础功能.md`
> **测试工具**：MCP Chrome DevTools
> **预计耗时**：30 分钟

---

## 测试目的

**核心目标**：通过实际操作验证云端部署的 UI 界面功能正确性，确保用户交互流畅、页面渲染正常、表单提交有效。

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
| 环境地址、账号密码、Zeabur CLI | [凭据/云端.md](../凭据/云端.md) |
| 测试视频、API 配置模板 | [凭据/公共.md](../凭据/公共.md) |

---

## 四、环境准备

### 4.1 验证云端服务状态

```bash
# 检查服务状态
zeabur service list --env-id 69417cec4947dd57c4fd0167 -i=false

# 预期输出应包含 RUNNING 状态
```

### 4.2 MCP Chrome DevTools 准备

确保 Chrome 浏览器已打开并连接 MCP Chrome DevTools 服务器。

---

## 五、测试用例

### 5.1 认证功能测试（TC-AUTH-C001 ~ TC-AUTH-C002）

#### TC-AUTH-C001: 云端登出功能

**目的**: 验证云端环境的登出功能

**前置条件**: 已登录状态

**测试步骤**:
1. 访问 https://chuangcut.zeabur.app/
2. 确认页面右上角显示用户邮箱
3. 点击用户邮箱按钮
4. 在下拉菜单中点击「退出登录」
5. 等待页面跳转

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="https://chuangcut.zeabur.app/"
2. mcp__chrome-devtools__take_snapshot: 确认显示用户邮箱
3. mcp__chrome-devtools__click: 点击用户邮箱按钮
4. mcp__chrome-devtools__click: 点击「退出登录」
5. mcp__chrome-devtools__wait_for: 等待跳转到登录页
```

**预期结果**:
- 点击退出后页面跳转到登录页 `/login`
- Session Cookie 已清除
- 再次访问 `/jobs` 会重定向到登录页
- 控制台无 error 级别错误

---

#### TC-AUTH-C002: 云端登录功能

**目的**: 验证云端环境的登录功能

**前置条件**: 未登录状态

**测试步骤**:
1. 导航到 https://chuangcut.zeabur.app/login
2. 在「用户名」输入框输入：`xiangyugongzuoliu@gmail.com`
3. 在「密码」输入框输入：`XXXX`
4. 点击「登录」按钮
5. 等待页面跳转

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="https://chuangcut.zeabur.app/login"
2. mcp__chrome-devtools__take_snapshot: 查看登录页面结构
3. mcp__chrome-devtools__fill: 填写用户名
4. mcp__chrome-devtools__fill: 填写密码
5. mcp__chrome-devtools__click: 点击登录按钮
6. mcp__chrome-devtools__wait_for: 等待跳转完成
```

**预期结果**:
- 登录成功，跳转到首页 `/`
- 右上角显示用户邮箱
- 网络请求 POST /api/auth/login 返回 200
- 登录后可正常访问 /settings、/styles、/jobs 页面
- 控制台无 error 级别错误

---

### 5.2 系统配置测试（TC-CFG-C001 ~ TC-CFG-C003）

#### TC-CFG-C001: 云端 AI Studio 模式配置（含实际验证）

**目的**: 验证云端环境的 AI Studio 模式 API 密钥配置，**必须实际调用 API 验证连通性**

**前置条件**: 已登录

> ⚠️ **重要**：本测试要求点击"验证并保存"按钮，系统会实际调用外部 API 验证密钥有效性，而不是仅保存配置。

**测试步骤**:
1. 导航到设置页面 https://chuangcut.zeabur.app/settings
2. 点击「Google AI Studio 配置」标签页
3. **配置 Gemini AI Studio**：
   - 输入 API Key（参考凭证文档）
   - 点击「验证并保存」按钮
   - 等待验证结果，确认显示「已验证」状态
4. **配置 Fish Audio**：
   - 输入音色 ID（参考凭证文档）
   - 输入 API Key（参考凭证文档）
   - 点击「验证并保存」按钮
   - 等待验证结果，确认显示「已验证」状态
6. 刷新页面验证配置持久化

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="https://chuangcut.zeabur.app/settings"
2. mcp__chrome-devtools__click: 点击「Google AI Studio 配置」标签页
3. mcp__chrome-devtools__fill: 填写 Gemini API Key
4. mcp__chrome-devtools__click: 点击「验证并保存」
5. mcp__chrome-devtools__wait_for: 等待验证结果
6. mcp__chrome-devtools__fill: 填写 Fish Audio 音色 ID 和 API Key
7. mcp__chrome-devtools__click: 点击 Fish Audio「验证并保存」
8. mcp__chrome-devtools__wait_for: 等待验证结果
9. mcp__chrome-devtools__navigate_page: type="reload"
10. mcp__chrome-devtools__take_snapshot: 验证服务都显示「已验证」
```

**预期结果**:
- ✅ Gemini AI Studio：验证通过，状态显示「已验证」
- ✅ Fish Audio：验证通过，状态显示「已验证」
- ✅ 刷新页面后服务状态仍为「已验证」
- ✅ 密钥输入框显示为空（已保存的密钥不回填，安全设计）

**验证失败处理**:
- 如果任一服务验证失败，检查：
  1. API Key 是否正确复制（无多余空格）
  2. 网络是否可访问外部服务
  3. 查看浏览器控制台和 Zeabur 日志获取详细错误

---

#### TC-CFG-C002: 云端 Vertex AI 模式配置（含实际验证）

**目的**: 验证云端环境的 Vertex AI 平台配置，**必须实际调用 API 验证连通性**

**前置条件**: 已登录

> ⚠️ **重要**：本测试要求点击"验证并保存"按钮，系统会实际调用外部 API 验证凭据有效性。

**测试步骤**:
1. 导航到设置页面 https://chuangcut.zeabur.app/settings
2. 点击「Google Vertex 配置」标签页
3. **配置 Gemini Vertex AI**：
   - 输入 Project ID: `xiangyugongzuoliu`
   - 输入 Location: `global`（Gemini 3 必须使用 global）
   - 粘贴 Service Account JSON（见上方凭据）
   - 点击「验证并保存」按钮
   - 等待验证结果，确认显示「已验证」状态
4. **配置 GCS 存储**（Vertex AI 必需）：
   - 输入 Bucket（参考凭证文档）
   - 点击「验证并保存」按钮
   - 等待验证结果
5. **配置 Fish Audio**（Vertex 模式独立配置）：
   - 输入音色 ID 和 API Key（参考凭证文档）
   - 点击「验证并保存」按钮
   - 等待验证结果，确认显示「已验证」状态
7. 刷新页面验证配置持久化

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="https://chuangcut.zeabur.app/settings"
2. mcp__chrome-devtools__click: 点击「Google Vertex 配置」标签页
3. mcp__chrome-devtools__fill: 填写 Project ID、Location
4. mcp__chrome-devtools__fill: 粘贴 Service Account JSON
5. mcp__chrome-devtools__click: 点击 Vertex AI「验证并保存」
6. mcp__chrome-devtools__wait_for: 等待验证结果
7. mcp__chrome-devtools__fill: 填写 GCS Bucket
8. mcp__chrome-devtools__click: 点击 GCS「验证并保存」
9. mcp__chrome-devtools__fill: 填写 Fish Audio 配置
10. mcp__chrome-devtools__click: 点击 Fish Audio「验证并保存」
11. mcp__chrome-devtools__navigate_page: type="reload"
12. mcp__chrome-devtools__take_snapshot: 验证所有服务都显示「已验证」
```

**预期结果**:
- ✅ Gemini Vertex AI：验证通过，状态显示「已验证」
- ✅ GCS 存储：验证通过，状态显示「已验证」
- ✅ Fish Audio：验证通过，状态显示「已验证」
- ✅ 刷新页面后所有服务状态仍为「已验证」

**验证失败处理**:
- Vertex AI 验证失败：检查 Service Account JSON 格式、权限配置
- GCS 验证失败：检查 Bucket 名称、Service Account 的存储权限

---

#### TC-CFG-C003: 云端系统参数配置

**目的**: 验证云端环境的系统参数配置功能

**前置条件**: 已登录

**测试步骤**:
1. 导航到设置页面 https://chuangcut.zeabur.app/settings
2. 点击「系统设置」标签页
3. 查看当前配置：
   - 系统并发数
   - Gemini API 区域
   - 默认 Gemini 模型
   - 视频分析分辨率
   - 视频采样帧率 (FPS)
   - 旁白批量生成数量
   - 字幕功能
4. 修改「系统并发数」（如从 3 改为 4）
5. 点击「保存系统配置」按钮
6. 刷新页面验证配置保留

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="https://chuangcut.zeabur.app/settings"
2. mcp__chrome-devtools__click: 点击「系统设置」标签页
3. mcp__chrome-devtools__take_snapshot: 查看当前配置
4. mcp__chrome-devtools__click/fill: 修改系统并发数
5. mcp__chrome-devtools__click: 点击「保存系统配置」
6. mcp__chrome-devtools__navigate_page: type="reload"
7. mcp__chrome-devtools__take_snapshot: 验证配置已保存
```

**预期结果**:
- ✅ 配置修改后保存成功，显示成功提示
- ✅ 页面刷新后配置仍然保留
- ✅ 控制台无错误

---

### 5.3 风格管理测试（TC-STYLE-C001 ~ TC-STYLE-C002）

#### TC-STYLE-C001: 云端风格列表查看

**目的**: 验证云端环境的风格列表展示

**前置条件**: 已登录

**测试步骤**:
1. 导航到风格管理页面 https://chuangcut.zeabur.app/styles
2. 查看预置风格列表
3. 验证风格信息完整

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="https://chuangcut.zeabur.app/styles"
2. mcp__chrome-devtools__take_snapshot: 查看风格列表
```

**预期结果**:
- ✅ 显示「预设风格 (16)」和「自定义风格」两个标签页
- ✅ 预设风格列表显示 16 个风格
- ✅ 每个风格显示名称、描述、频道名称
- ✅ 每个风格有「预览」按钮

---

#### TC-STYLE-C002: 云端风格预览

**目的**: 验证云端环境的风格预览功能

**前置条件**: 已登录，在风格管理页面

**测试步骤**:
1. 在风格列表中选择一个风格
2. 点击「预览」按钮
3. 查看风格的详细配置

**MCP 操作**:
```
1. mcp__chrome-devtools__click: 点击风格的「预览」按钮
2. mcp__chrome-devtools__take_snapshot: 查看预览弹窗
3. mcp__chrome-devtools__click: 关闭弹窗
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

### 5.4 UI 导航与布局测试（TC-UI-C001 ~ TC-UI-C003）

#### TC-UI-C001: 云端主导航功能

**目的**: 验证云端环境的主导航功能

**前置条件**: 已登录

**测试步骤**:
1. 从首页开始
2. 点击导航栏「任务管理」，验证跳转到 `/jobs`
3. 点击导航栏「剪辑风格」，验证跳转到 `/styles`
4. 点击导航栏「密钥设置」，验证跳转到 `/settings`
5. 点击导航栏「使用教程」，验证跳转到 `/guide`
6. 点击导航栏「首页」或 Logo，验证跳转回首页

**MCP 操作**:
```
1. mcp__chrome-devtools__navigate_page: url="https://chuangcut.zeabur.app/"
2. mcp__chrome-devtools__click: 点击「任务管理」导航
3. mcp__chrome-devtools__wait_for: 等待页面加载
4. mcp__chrome-devtools__click: 点击「剪辑风格」导航
5. mcp__chrome-devtools__click: 点击「密钥设置」导航
6. mcp__chrome-devtools__click: 点击「使用教程」导航
7. mcp__chrome-devtools__click: 点击「首页」导航
```

**预期结果**:
- ✅ 所有导航链接可点击
- ✅ 页面正确跳转，URL 与页面内容一致
- ✅ 页面切换无白屏或卡顿
- ✅ 浏览器后退/前进按钮正常工作
- ✅ 控制台无 404 或路由错误

---

#### TC-UI-C002: 云端响应式布局

**目的**: 验证云端环境的响应式设计

**前置条件**: 已登录

**测试步骤**:
1. 导航到首页
2. 使用 `mcp__chrome-devtools__resize_page` 调整窗口大小
3. 测试以下尺寸：
   - 桌面：1920x1080
   - 笔记本：1366x768
   - 平板：768x1024
   - 手机：375x667

**MCP 操作**:
```
1. mcp__chrome-devtools__resize_page: width=1920, height=1080
2. mcp__chrome-devtools__take_snapshot: 桌面布局
3. mcp__chrome-devtools__resize_page: width=1366, height=768
4. mcp__chrome-devtools__take_snapshot: 笔记本布局
5. mcp__chrome-devtools__resize_page: width=768, height=1024
6. mcp__chrome-devtools__take_snapshot: 平板布局
7. mcp__chrome-devtools__resize_page: width=375, height=667
8. mcp__chrome-devtools__take_snapshot: 手机布局
```

**预期结果**:
- ✅ 桌面：完整导航栏 + 主内容区
- ✅ 笔记本：布局正常
- ✅ 平板：布局自适应
- ✅ 手机：布局自适应（如支持）
- ✅ 内容不溢出或被截断

> **注意**：如果浏览器窗口处于最大化状态，resize_page 可能会失败。需要先恢复窗口为正常状态。

---

#### TC-UI-C003: 云端 Toast 通知系统

**目的**: 验证云端环境的通知提示功能

**前置条件**: 已登录

**测试步骤**:
1. 导航到 `/settings`
2. 修改任意配置并保存
3. 观察 Toast 提示
4. 尝试触发错误（如输入无效数据）
5. 观察错误 Toast 提示

**预期结果**:
- ✅ 保存成功时显示成功提示（绿色）
- ✅ 验证进行中显示进度提示
- ✅ 错误时显示错误提示（红色）
- ✅ Toast 内容清晰描述操作结果
- ✅ Toast 在几秒后自动消失

---

## 六、问题记录模板

| 编号 | 发现时间 | 测试用例 | 问题描述 | 严重程度 | 状态 |
|------|----------|----------|----------|----------|------|
| BUG-C001 | | TC-XXX-CXXX | | P0/P1/P2 | Open |

---

## 七、测试结果汇总

| 类别 | 用例数 | 通过 | 失败 | 阻塞 | 通过率 |
|------|--------|------|------|------|--------|
| 认证功能 | 2 | | | | |
| 系统配置 | 3 | | | | |
| 风格管理 | 2 | | | | |
| UI 导航与布局 | 3 | | | | |
| **总计** | **10** | | | | |

---

## 八、云端与本地差异说明

| 方面 | 云端环境 | 本地环境 |
|------|----------|----------|
| **服务地址** | https://chuangcut.zeabur.app | http://localhost:8899 |
| **数据库** | SQLite 文件（Zeabur 持久卷） | SQLite 文件 (`./data/db.sqlite`) |
| **文件存储** | Zeabur 持久卷 | 本地文件系统 |
| **日志查看** | Zeabur 控制台 | `./logs/` 目录 |
| **服务管理** | Zeabur CLI / 控制台 | `./scripts/dev.sh` |
| **配置修改** | Zeabur 环境变量 | 直接编辑 .env |
| **HTTPS** | 自动启用 | 不启用（HTTP） |

---

## 九、注意事项

1. **网络延迟**：云端环境可能有网络延迟，验证操作需要适当等待
2. **API 验证超时**：外部 API 验证可能需要 10-30 秒
3. **Session 过期**：长时间不操作可能需要重新登录
4. **服务重启**：如遇异常，可通过 Zeabur CLI 重启服务
5. **日志查看**：问题排查时使用 `zeabur deployment log` 查看服务日志

---

**测试人员**：________________

**测试日期**：________________

**测试结论**：☐ 全部通过 / ☐ 部分通过 / ☐ 需修复后重测
