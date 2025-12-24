# 版本管理指南

本文档说明项目的版本号管理策略和版本升级规范。

## 当前版本

**项目版本**：`16.0.0`

**发布日期**：2025-12-13

## 版本号体系

从 v11.0.0 开始，项目采用**单一版本号体系**，遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/) 规范：

```
主版本号.次版本号.修订号 (MAJOR.MINOR.PATCH)
```

### 版本号含义

#### 主版本号（MAJOR）

当做出**不向后兼容的 API 或架构变更**时递增。

**示例**：
- v11.0.0 → v12.0.0：依赖版本全面升级
- v10.0.0 → v11.0.0：禁用 Server Actions，统一采用 API Routes 架构

#### 次版本号（MINOR）

当以**向后兼容的方式添加新功能**时递增。

**示例**：
- v12.0.0 → v12.1.0：新功能示例
- v11.0.0 → v11.1.0：异步启动工作流（任务队列）

#### 修订号（PATCH）

当做出**向后兼容的 Bug 修复**时递增。

**示例**：
- v12.0.0 → v12.0.1：修复日志时间戳格式错误
- v12.0.1 → v12.0.2：修复 FFmpeg 临时文件清理问题

## 版本历史

### 历史版本演进

```
v0.1.0   (2024-09-15)  初始版本（从 n8n 迁移）
  ↓
v0.x.x   (2024-09-15 - 2024-11-20)  开发阶段
  ↓
v1.0.0   (2024-11-20)  工作流引擎极简架构重构
  ↓
v2.0.0   (2024-11-25)  工作流引擎模块化拆分
  ↓
v3.0.0   (2024-12-05)  日志系统重构
  ↓
v4.0.0   (2024-12-10)  日志从文件迁移到数据库
  ↓
v5.0.0   (2024-12-15)  安全加固（移除 new Function()）
  ↓
v6.0.0   (2024-12-20)  步骤历史表字段语义重构
  ↓
v7.0.0 - v8.0.0  （功能增强阶段）
  ↓
v9.0.0   (2025-01-10)  错误处理增强
  ↓
v10.0.0  (2025-01-18)  简化数据库状态机
  ↓
v11.0.0  (2025-01-20)  禁用 Server Actions + 鉴权系统
  ↓
v12.0.0  (2025-12-02)  依赖版本全面升级
  ↓
v12.1.0  (2025-12-02)  本地 FFmpeg 替代 NCA Toolkit
  ↓
v12.2.0  (2025-12-13)  跳切修剪功能、步骤重命名
  ↓
v16.0.0  (2025-12-13)  代码优化、废弃步骤清理、版本号统一
```

### 版本号 11.0.0 的含义

**为什么从 0.1.0 直接跳到 11.0.0？**

项目在 2024 年 9 月至 2025 年 1 月经历了 **11 次重大架构变更**：

1. **v0.1.0**：从 n8n 工作流迁移到 Next.js 应用
2. **v1.0.0**：工作流引擎极简架构重构（代码量减少 89%）
3. **v2.0.0**：工作流引擎模块化拆分
4. **v3.0.0**：日志系统重构
5. **v4.0.0**：日志系统从文件迁移到数据库
6. **v5.0.0**：安全加固（移除动态代码执行）
7. **v6.0.0**：步骤历史表字段语义重构
8. **v7.0.0-v8.0.0**：功能增强
9. **v9.0.0**：错误处理增强
10. **v10.0.0**：简化数据库状态机
11. **v11.0.0**：禁用 Server Actions + 鉴权系统
12. **v12.0.0**：依赖版本全面升级
13. **v12.1.0**：本地 FFmpeg 替代 NCA Toolkit
14. **v12.2.0**：跳切修剪功能
15. **v13.0.0-v15.0.0**：持续优化迭代
16. **v16.0.0**：代码优化、废弃步骤清理

**v16.0.0 表示项目已经历 16 次重大架构变更**，而非简单的版本号递增。

## 版本升级流程

### 1. 确定版本号

根据变更类型确定新版本号：

- **Breaking Changes**（破坏性变更）→ 递增 MAJOR（如 12.0.0 → 13.0.0）
- **New Features**（新功能）→ 递增 MINOR（如 12.0.0 → 12.1.0）
- **Bug Fixes**（Bug 修复）→ 递增 PATCH（如 12.0.0 → 12.0.1）

### 2. 更新版本号

修改以下文件：

```bash
# 1. package.json
{
  "version": "12.1.0"  # 更新版本号
}

# 2. CHANGELOG.md（添加新版本记录）
## [12.1.0] - 2025-02-01
### Added
- 新功能描述

# 3. 如有数据库变更，更新 schema.sql 顶部注释
-- 数据库 Schema（项目版本 12.1.0）
```

### 3. 创建 Git 标签

```bash
# 创建版本标签
git tag -a v12.1.0 -m "Release v12.1.0"

# 推送标签到远程
git push origin v12.1.0
```

### 4. 发布 Docker 镜像

```bash
# 构建并推送多平台 Docker 镜像
./scripts/build-multiplatform.sh

# 或手动执行
docker buildx build --platform "linux/amd64,linux/arm64" --tag "xiangyugongzuoliu/chuangcut-video-workflow:12.1.0" --push .
docker buildx build --platform "linux/amd64,linux/arm64" --tag "xiangyugongzuoliu/chuangcut-video-workflow:latest" --push .
```

## 数据库迁移管理

### 迁移脚本命名规范

```
scripts/migrations/{序号}_{描述}.{sql|js}
```

**示例**：
- `001_structured_data.sql`
- `010_simplify_job_status.sql`
- `012_add_distributed_locks.js`

### 迁移脚本版本关联

在迁移脚本顶部添加版本注释：

```sql
-- 迁移脚本：010_simplify_job_status.sql
-- 关联版本：v10.0.0
-- 描述：简化任务状态机（从 9 个状态减少到 7 个）

CREATE TABLE IF NOT EXISTS ...
```

### 数据库版本追踪

`schema_version` 表用于自动记录数据库版本：

```sql
CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,      -- 当前版本号（如 "10.0.0"）
    applied_at INTEGER NOT NULL    -- 应用时间戳
);
```

## 授权系统版本号

**特殊说明**：授权系统使用**独立的版本号体系**（V1/V2/V3）：

- **V1**：明文 JSON + 签名（已废弃）
- **V2**：Base64 编码 + HMAC 签名（兼容）
- **V3**：XOR 加密 + Base62 编码 + CRC16 校验（推荐）

**原因**：授权系统版本号影响**运行时授权码验证逻辑**，必须独立管理。

**实现位置**：
- `lib/license/validator-v1.ts`
- `lib/license/validator-v2.ts`
- `lib/license/validator-v3.ts`
- `lib/license/license-validator.ts`（统一入口）

**版本检测逻辑**：
```typescript
// 根据授权码格式自动检测版本
export function detectLicenseVersion(licenseCode: string): "V1" | "V2" | "V3" {
  if (/^CCUT\.\d{6}\./.test(licenseCode)) return "V2"
  if (/^CCUT-[A-Za-z0-9]{12,13}-[A-Za-z0-9]{4}$/.test(licenseCode)) return "V3"
  return "V1"
}
```

## 版本兼容性

### 向后兼容承诺

- **Minor 版本升级**（12.0.0 → 12.1.0）：**保证向后兼容**
- **Patch 版本升级**（12.0.0 → 12.0.1）：**保证向后兼容**
- **Major 版本升级**（12.0.0 → 13.0.0）：**可能破坏兼容性**

### 破坏性变更处理

当发布 Major 版本时，必须：

1. **在 CHANGELOG.md 中明确标注**：`### 架构重大变更（Breaking Changes）`
2. **提供迁移指南**：说明如何从旧版本升级
3. **文档化 API 变更**：列出所有破坏性变更的 API

**示例（v12.0.0）**：

```markdown
## [12.0.0] - 2025-12-02

### 架构重大变更（Breaking Changes）

#### 依赖升级
- ⚠️ 所有依赖升级到最新兼容版本
- ✅ 运行 `pnpm update` 完成升级

#### 迁移指南
1. 运行 `pnpm install` 安装新依赖
2. 运行 `pnpm lint && pnpm build` 验证
```

## 版本发布清单

### Pre-Release 检查

- [ ] 更新 `package.json` 版本号
- [ ] 更新 `CHANGELOG.md`（添加新版本记录）
- [ ] 更新 `schema.sql` 顶部注释（如有数据库变更）
- [ ] 运行所有测试：`pnpm test`
- [ ] 本地构建验证：`pnpm build`
- [ ] Docker 构建验证：`./scripts/build-multiplatform.sh`

### Release 流程

1. **创建 Git 标签**：`git tag -a v12.1.0 -m "Release v12.1.0"`
2. **推送代码和标签**：`git push && git push origin v12.1.0`
3. **构建并推送 Docker 镜像**：`./scripts/build-multiplatform.sh`
4. **更新 GitHub Release**：添加 Release Notes

### Post-Release 检查

- [ ] Docker Hub 镜像可正常拉取
- [ ] Zeabur 部署测试成功
- [ ] 健康检查接口返回正确版本号：`GET /api/health`

## 查看当前版本

### 代码中查看

```typescript
// 方式 1：通过 package.json
import packageJson from '@/package.json'
console.log(packageJson.version)  // "12.0.0"

// 方式 2：通过环境变量
console.log(process.env.npm_package_version)  // "12.0.0"
```

### 运行时查看

```bash
# 健康检查接口
curl https://your-domain.com/api/health

# 返回示例（开发环境）
{
  "status": "ok",
  "timestamp": "2025-12-13T12:00:00.000Z",
  "license": { "valid": true, ... },
  "service": {
    "name": "创剪视频工作流",
    "version": "12.2.0",
    "nodeEnv": "development"
  }
}

# 返回示例（生产环境 - 隐藏敏感信息）
{
  "status": "ok",
  "timestamp": "2025-12-13T12:00:00.000Z",
  "license": { "valid": true, "expiresAt": "...", "daysRemaining": 365 },
  "service": { "name": "创剪视频工作流" }
}
```

> **注意**：生产环境（NODE_ENV=production）出于安全考虑，不返回 version 和 nodeEnv 字段。

### Docker 镜像查看

```bash
# 查看镜像标签
docker images | grep chuangcut-video-workflow

# 输出示例
xiangyugongzuoliu/chuangcut-video-workflow   12.0.0   abc123   2 days ago   500MB
xiangyugongzuoliu/chuangcut-video-workflow   latest   abc123   2 days ago   500MB
```

## 常见问题

### Q1：为什么不继续使用多套版本号？

**A**：多套版本号会导致以下问题：

1. **混淆**：`package.json` 是 0.1.0，数据库是 v10.0.0，前端是 v11.0.0
2. **维护成本高**：需要同步更新多个位置
3. **缺乏实际作用**：除授权系统外，其他版本号仅在注释中

**单一版本号的优势**：

- 简单明了，易于理解
- 版本号即项目状态
- 降低维护成本

### Q2：授权系统版本号为什么不统一？

**A**：授权系统版本号具有**运行时作用**：

- 运行时需要根据授权码格式检测版本（V1/V2/V3）
- 不同版本使用不同的验证算法
- 必须保持独立性以支持多版本授权码兼容

### Q3：如何追踪数据库 Schema 变更？

**A**：数据库变更追踪方式：

1. **迁移脚本**：`scripts/migrations/` 目录下的编号脚本
2. **CHANGELOG.md**：记录每个版本的数据库变更
3. **schema.sql 注释**：顶部标注当前版本号

**未来计划**：引入 `schema_version` 表，自动记录数据库版本。

### Q4：如何回退到旧版本？

**A**：版本回退步骤：

```bash
# 1. 回退代码
git checkout v12.0.0

# 2. 重新构建
pnpm build

# 3. 回退数据库（如需要）
# 根据 CHANGELOG.md 中的迁移记录，手动执行反向迁移

# 4. 重新部署
./scripts/build-multiplatform.sh
```

**注意**：Major 版本回退可能需要手动处理数据库不兼容问题。

## 参考资料

- [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)
- [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)
- [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)

---

**文档版本**：1.2.0
**最后更新**：2025-12-13
**维护者**：翔宇工作流
