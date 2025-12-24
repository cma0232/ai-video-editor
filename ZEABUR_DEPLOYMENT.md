# Zeabur 部署指南

本项目支持通过 Zeabur 一键部署，提供三种部署方式。

---

## 方式 1：使用 Zeabur 模板部署（推荐）

### 测试模板

在发布到 Zeabur Marketplace 之前，先本地测试：

```bash
# 安装 Zeabur CLI（如果尚未安装）
npm install -g zeabur

# 测试部署模板
npx zeabur@latest template deploy -f zeabur.yaml
```

CLI 会提示你：
1. 选择项目（或创建新项目）
2. 选择区域（建议选择 Tokyo 或 Hong Kong）
3. 填写环境变量（使用默认值或自定义）

### 发布模板到 Zeabur Marketplace

```bash
# 发布模板
npx zeabur@latest template create -f zeabur.yaml
```

成功后会返回模板 URL，例如：
```
https://zeabur.com/templates/71HORL
```

### 更新已发布的模板

```bash
# 更新模板
npx zeabur@latest template update -c [TEMPLATE_CODE] -f zeabur.yaml
```

### 删除模板

```bash
# 删除模板
npx zeabur@latest template delete
```

---

## 方式 2：从 Docker Hub 部署（最快）

### 步骤

1. **登录 Zeabur**：访问 [zeabur.com](https://zeabur.com)

2. **创建新项目**：
   - 点击 "New Project"
   - 选择区域（建议 Tokyo 或 Hong Kong）

3. **添加服务**：
   - 点击 "Add Service"
   - 选择 "Deploy from Docker Image"
   - 输入镜像地址：`xiangyugongzuoliu/chuangcut-video-workflow:latest`

4. **配置环境变量**：

   **必需**：
   ```env
   LICENSE_KEY=XXXX-XXXXXXXX-XXXX  # 联系翔宇工作流获取
   DATABASE_URL=file:/data/db.sqlite
   ```

   **可选**：
   ```env
   AUTH_ENABLED=true
   TEMP_DIR=/data/temp
   OUTPUT_DIR=/data/output
   ```

   **说明**：
   - `ENCRYPTION_KEY` 和 `SESSION_SECRET` 会在程序**首次启动时自动生成并保存到数据库**
   - 容器重启后会从数据库加载，**无需重新生成**（密钥持久化）
   - 除非有特殊需求，否则**无需手动配置这两个密钥**

5. **配置持久化存储**：
   - 在服务设置中添加 Volume
   - 挂载路径：`/data`

6. **绑定域名**：
   - 在 Networking 中绑定域名或使用 Zeabur 提供的域名

7. **部署**：点击 "Deploy"

---

## 方式 3：从 GitHub 部署（自动构建）

### 步骤

1. **Fork 或 Clone 本仓库**到你的 GitHub 账号

2. **登录 Zeabur**并授权 GitHub

3. **创建新项目**

4. **添加服务**：
   - 选择 "Deploy from GitHub"
   - 选择你的仓库：`xiangyugongzuoliu/chuangcut-video-workflow`
   - 选择分支：`main`

5. **Zeabur 自动检测**：
   - 自动检测到 `Dockerfile`
   - 自动检测到 `zeabur.yaml`
   - 开始构建（约 5-10 分钟）

6. **配置环境变量**（同方式 2）

7. **配置持久化存储**（同方式 2）

8. **绑定域名**（同方式 2）

---

## 部署后配置

### 1. 首次访问

访问你的 Zeabur 域名，系统会自动跳转到登录页面。

### 2. 创建管理员账号

- 首次访问时需要注册管理员账号
- 自行设置用户名（3-32 字符）
- 设置密码（最小 8 位，建议包含大小写字母、数字和符号）
- 系统采用单用户模式，仅允许注册一个管理员账号

### 3. 配置 API 密钥

访问 `/settings` 页面，配置以下必需的 API 密钥：

#### 必需的 API 密钥

1. **Gemini API Key**（视频分析）：
   - 访问：https://aistudio.google.com
   - 点击 "Get API key"
   - 创建新 API key
   - 复制并粘贴到设置页面

2. **NCA API Key**（视频处理）：
   - 联系 NCA Toolkit 服务提供商获取
   - 包含视频拆条、拼接、调速、合成等功能

3. **Fish Audio API Key**（语音合成）：
   - 访问：https://fish.audio
   - 注册并获取 API key
   - 选择合适的 Voice ID

#### 可选的 API 密钥

1. **Gemini Vertex AI**（企业级视频分析）：
   - 需要 GCP Project ID、Location、Model ID
   - 需要上传 Service Account JSON

2. **Google Cloud Storage**（最终成片存储）：
   - 需要 Service Account JSON
   - 需要 Bucket Name
   - 用于存储最终生成的视频

### 4. 创建第一个任务

1. 访问首页 `/` 或任务列表页 `/jobs`
2. 点击 "创建新任务" 按钮
3. 输入视频 URL（支持公开可访问的视频链接）
4. 选择解说风格（支持 15+ 种风格）
5. 点击 "创建"
6. 等待自动处理（支持断点续传）

---

## 环境变量说明

### 必需的环境变量

| 变量名 | 说明 | 默认值 | 备注 |
|--------|------|--------|------|
| `LICENSE_KEY` | 软件授权码 | 无（必填） | 联系翔宇工作流获取，格式：`XXXX-XXXXXXXX-XXXX` |
| `DATABASE_URL` | 数据库路径 | `file:/data/db.sqlite` | 必须指向 `/data` 目录 |

**系统密钥自动管理**（v2025-01-20 升级）：
- `ENCRYPTION_KEY` 和 `SESSION_SECRET` 已优化为**程序首次启动时自动生成并保存到数据库**
- 使用 `crypto.randomBytes(32)` 生成 64 位十六进制随机密钥
- **持久化存储**：密钥保存在数据库 `configs` 表，容器重启后自动加载
- **优先级策略**：环境变量 > 数据库 > 自动生成
- 无需在 Zeabur 配置，极大简化部署流程

### 可选的环境变量

| 变量名 | 说明 | 默认值 | 备注 |
|--------|------|--------|------|
| `AUTH_ENABLED` | 是否启用鉴权 | `true` | 生产环境建议 `true` |
| `TEMP_DIR` | 临时文件目录 | `/data/temp` | - |
| `OUTPUT_DIR` | 输出文件目录 | `/data/output` | - |

---

## 数据持久化

### 重要提示

⚠️ **所有数据必须存储在 `/data` 卷中**，否则容器重启后数据会丢失！

### 持久化目录

Zeabur 会自动为 `/data` 卷提供持久化存储，包含：

- `/data/db.sqlite` - SQLite 数据库
- `/data/temp/` - 临时文件（视频下载、中间文件）
- `/data/output/` - 最终成片
- `/data/logs/` - 应用日志

### 备份建议

定期备份 `/data/db.sqlite` 数据库文件，避免数据丢失。

---

## 故障排查

### 1. 应用无法启动

**检查日志**：
```bash
# 使用 Zeabur CLI
zeabur logs --tail 100

# 或在 Zeabur Dashboard 中查看
```

**常见原因**：
- `LICENSE_KEY` 未配置或格式错误
- 数据库路径错误（未指向 `/data` 目录）
- 持久化卷未挂载

### 2. 视频处理失败

**检查 API 密钥**：
- 访问 `/settings` 检查所有 API 密钥是否已配置
- 检查 API 密钥是否有效（未过期、有足够配额）

**检查网络**：
- NCA Toolkit 服务是否可访问
- Fish Audio 服务是否可访问
- Google Gemini API 是否可访问

### 3. 数据丢失

**原因**：未配置持久化卷或数据未存储在 `/data` 目录

**解决**：
- 在 Zeabur Dashboard 检查 Volume 是否已挂载
- 确认 `DATABASE_URL` 指向 `/data/db.sqlite`

### 4. 构建失败（从 GitHub 部署）

**原因**：better-sqlite3 编译问题

**解决**：
- 确保 `.npmrc` 文件包含 `only-built-dependencies[]=better-sqlite3`
- 确保 Dockerfile 中有手动编译步骤
- 查看详细错误信息：`CLAUDE.md` 文件中的 "Docker 构建问题排查与解决方案"

---

## 性能优化

### 1. 区域选择

建议选择以下区域以获得最佳性能：
- **亚太地区**：Tokyo（东京）、Hong Kong（香港）
- **美洲**：San Francisco（旧金山）
- **欧洲**：Frankfurt（法兰克福）

### 2. 资源配置

根据视频处理量调整 Zeabur 服务资源：
- **小型项目**：Hobby Plan（免费）
- **中型项目**：Developer Plan（$5/月）
- **大型项目**：Team Plan（$20/月）

### 3. 缓存策略

- 启用 Zeabur 的 CDN 加速
- 使用 Google Cloud Storage 存储最终成片

---

## 安全建议

### 1. 系统密钥管理（v2025-01-20 升级）

✅ **程序自动生成并持久化密钥**：

- **首次启动**：程序自动生成 `ENCRYPTION_KEY` 和 `SESSION_SECRET`，并保存到数据库 `configs` 表
- **容器重启**：自动从数据库加载，无需重新生成
- **持久化存储**：密钥存储在 `/data/db.sqlite`，与其他数据一同持久化
- **手动配置**（可选）：如需手动指定密钥，可在 `.env.local` 或 Zeabur 环境变量中配置

**手动生成密钥**（仅在需要手动配置时使用）：

```bash
# 生成安全的 ENCRYPTION_KEY（64 个十六进制字符）
openssl rand -hex 32

# 生成安全的 SESSION_SECRET（64 个十六进制字符）
openssl rand -hex 32
```

**说明**：
- 自动生成的密钥使用 `crypto.randomBytes(32)` 生成，安全性等同于手动生成
- 密钥一旦生成并保存到数据库，除非手动重置，否则不会改变
- 如果修改了 `ENCRYPTION_KEY`，所有已加密的 API 密钥将无法解密

### 2. 启用 HTTPS

Zeabur 自动为所有域名启用 HTTPS，无需额外配置。

### 3. 定期更新

定期拉取最新的 Docker 镜像：

```bash
# 在 Zeabur Dashboard 中
# 进入服务设置 → Redeploy
```

---

## 成本估算

### Zeabur 服务费用

| 套餐 | 月费 | 适用场景 |
|------|------|----------|
| Hobby | 免费 | 小型个人项目、测试 |
| Developer | $5 | 中小型项目 |
| Team | $20 | 大型项目、团队使用 |

### 外部服务费用

| 服务 | 计费方式 | 估算成本 |
|------|----------|----------|
| Google Gemini AI Studio | 按 API 调用量 | ~$0.01-0.05/视频 |
| Fish Audio | 按字符数 | ~¥0.01-0.05/分钟 |
| NCA Toolkit | 按视频时长 | 联系服务商 |

**总体估算**：处理一个 10 分钟视频约 $0.1-0.5（不含 Zeabur 服务费）

---

## 更多信息

- **GitHub 仓库**：https://github.com/xiangyugongzuoliu/chuangcut-video-workflow
- **完整文档**：https://github.com/xiangyugongzuoliu/chuangcut-video-workflow/blob/main/CLAUDE.md
- **问题反馈**：https://github.com/xiangyugongzuoliu/chuangcut-video-workflow/issues

---

## 许可证

本项目为私有项目，未经授权不得复制、分发或修改。使用本项目需要获取有效的 LICENSE_KEY。
