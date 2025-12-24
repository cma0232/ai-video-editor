# 前端开发指南

## 架构原则

**重要**：本项目**完全禁止使用 Server Actions**，统一采用 **API Routes** 架构。

| 规则 | 说明 |
|------|------|
| ✅ 推荐 | 通过 API Routes (`/api/*`) 处理所有后端操作 |
| ✅ 推荐 | 使用原生 `fetch` + `router.refresh()` 进行数据获取 |
| ❌ 禁止 | 创建或使用 `'use server'` 指令的 Server Actions |
| ❌ 禁止 | 在 `app/actions/` 目录创建新文件 |

## 数据获取

### 推荐方式：原生 fetch + router.refresh()

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

function JobDetailPage({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [job, setJob] = useState(null)

  useEffect(() => {
    const fetchJob = async () => {
      const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' })
      const data = await res.json()
      setJob(data.job)
    }

    // 轮询：每 3 秒刷新一次
    const interval = setInterval(() => {
      router.refresh()
      fetchJob()
    }, 3000)

    fetchJob()
    return () => clearInterval(interval)
  }, [jobId])

  // 使用结构化字段
  const stepHistory = job?.stepHistory || []
  const state = job?.state
}
```

### 字段优先级

1. **优先使用**：`job.state` 和 `job.stepHistory`
2. **回退兼容**：`job.checkpoint_data`（旧任务）

## 任务状态

> **注意**：v12.1.0 起，任务控制功能（停止/重启）已移除。任务失败后需创建新任务重试。
>
> 任务状态为终态设计：`pending` → `processing` → `completed` / `failed`

## 向后兼容

所有组件同时支持新旧数据格式：

```typescript
// 智能回退逻辑
const sceneIds = (() => {
  const totalScenes = state?.total_scenes || 0

  if (totalScenes > 0) {
    // 优先使用新格式
    return Array.from({ length: totalScenes }, (_, i) => `scene-${i + 1}`)
  }

  // 回退到旧格式
  const storyboards = checkpoint?.video_analysis?.storyboards || []
  return storyboards.map(s => s.scene_id)
})()
```

## 组件库

UI 组件位于 `components/ui/`，采用三分类架构：

| 目录 | 说明 | 示例 |
|------|------|------|
| `base/` | 基础原子组件 | button, input, badge |
| `composite/` | 复合组件 | card, dialog, tabs |
| `feedback/` | 反馈组件 | accordion, pagination |

导入方式：

```typescript
import { Button, Card, Dialog } from '@/components/ui'
```

## 组件族概览

项目包含数十个组件，按功能分为以下组件族：

| 组件族 | 目录 | 说明 |
|--------|------|------|
| UI 基础 | `components/ui/` | 基础/复合/反馈组件（见上文） |
| 布局 | `components/layout/` | Header、Footer、SiteLogo |
| 任务管理 | `components/jobs/` | 任务列表、状态显示 |
| 工作台 | `components/workbench/` | 工作台主体、日志、成本统计 |
| 任务创建 | `components/task-creation/` | 视频上传、参数配置 |
| 报告 | `components/report/` | 任务报告（2 个组件） |
| 风格 | `components/styles/` | 风格编辑、预览 |
| 设置 | `components/settings/` | API 配置、系统设置、存储清理 |
| 引导 | `components/guide/` | 引导组件（4 个） |
| 对话框 | `components/dialogs/` | 错误详情、确认对话框 |

## 关键组件

| 组件 | 路径 | 用途 |
|------|------|------|
| JobListClient | `components/jobs/job-list-client.tsx` | 任务列表客户端 |
| WorkbenchClient | `components/workbench/workbench-client.tsx` | 工作台主组件 |
| VideoUploader | `components/task-creation/video-uploader.tsx` | 视频上传器 |
| ReportLayout | `components/report/ReportLayout.tsx` | 报告布局容器 |
| StyleEditor | `components/styles/style-editor.tsx` | 风格 YAML 编辑器 |
| StorageCleanup | `components/settings/storage-cleanup.tsx` | 存储清理（light/deep/by_age 模式） |

> **注意**：v12.1.0 起已移除 `JobControlButtons` 组件，任务控制功能不再支持。
