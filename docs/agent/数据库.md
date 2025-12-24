# 数据库 Schema

## 核心业务表

### jobs（任务表）

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,             -- 'pending' | 'processing' | 'completed' | 'failed'
  current_step TEXT,                -- 'analysis' | 'generate_narrations' | 'extract_scenes' | 'process_scenes' | 'compose'

  input_url TEXT,                   -- 单视频 URL
  style_id TEXT,
  style_name TEXT,                  -- 风格名称快照
  config TEXT NOT NULL,             -- JSON 配置

  job_type TEXT DEFAULT 'single_video',  -- 'single_video' | 'multi_video'（向后兼容）
  input_videos TEXT,                -- JSON 数组（多视频）
  remix_mode TEXT,                  -- 已废弃，保留用于向后兼容
  remix_config TEXT,                -- 已废弃，保留用于向后兼容

  error_message TEXT,
  error_metadata TEXT,              -- JSON 错误元数据

  source TEXT DEFAULT 'web',        -- 任务来源 ('web' | 'api')
  api_token_id TEXT,                -- 创建任务的 API Token ID
  webhook_url TEXT,                 -- Webhook 回调地址
  webhook_secret TEXT,              -- Webhook 签名密钥

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);
```

### api_keys（API 密钥表）

```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT UNIQUE NOT NULL,     -- 服务标识
  key_data TEXT NOT NULL,           -- JSON 格式的加密密钥数据
  is_verified INTEGER DEFAULT 0,    -- 是否已验证
  verified_at INTEGER,              -- 验证时间
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

> **说明**：密钥数据以 JSON 格式存储在 `key_data` 字段中，包含加密后的值和相关元数据。

### configs（系统配置表）

```sql
CREATE TABLE configs (
  key TEXT PRIMARY KEY,             -- 配置键名
  value TEXT NOT NULL,              -- 配置值
  updated_at INTEGER NOT NULL
);
```

## 鉴权系统表

### users（用户表）

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,      -- bcryptjs（12 轮）
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- 单用户约束：idx_single_user 唯一索引
```

### api_access_tokens（API 访问令牌表）

```sql
CREATE TABLE api_access_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,  -- SHA-256
  token_prefix TEXT NOT NULL,       -- 'cca_...'（前 8 字符）
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### api_tokens（简化版 Token 表）

```sql
CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  expires_at INTEGER
);
```

## 任务状态表

### job_current_state（任务当前状态）

```sql
CREATE TABLE job_current_state (
  job_id TEXT PRIMARY KEY,
  current_major_step TEXT,
  current_sub_step TEXT,
  step_context TEXT,                -- JSON
  total_scenes INTEGER DEFAULT 0,
  processed_scenes INTEGER DEFAULT 0,
  final_video_url TEXT,
  final_video_public_url TEXT,
  final_video_gs_uri TEXT,
  final_video_local_path TEXT,      -- 本地下载路径
  final_video_metadata TEXT,        -- JSON
  video_cache_name TEXT,            -- 已废弃（v16.0 改用隐式缓存）
  video_cache_expires_at INTEGER,   -- 已废弃（v16.0 改用隐式缓存）
  video_cache_token_count INTEGER,  -- 已废弃（v16.0 改用隐式缓存）
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

### job_step_history（步骤执行历史）

```sql
CREATE TABLE job_step_history (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  scene_id TEXT,
  major_step TEXT NOT NULL,         -- 'analysis' | 'generate_narrations' | 'extract_scenes' | 'process_scenes' | 'compose'
  sub_step TEXT NOT NULL,
  step_type TEXT,
  status TEXT NOT NULL,             -- 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  attempt INTEGER DEFAULT 1,
  retry_delay_ms INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  input_data TEXT,                  -- JSON 步骤输入
  step_metadata TEXT,               -- JSON 步骤元数据
  output_data TEXT,                 -- JSON 步骤输出
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

### job_logs（运行日志）

```sql
CREATE TABLE job_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  log_type TEXT NOT NULL,           -- 'step_input' | 'step_output' | 'api_call' | 'api_response' | 'error' | 'warning' | 'info'
  log_level TEXT NOT NULL,          -- 'debug' | 'info' | 'warn' | 'error'
  major_step TEXT,
  sub_step TEXT,
  scene_id TEXT,
  step_number INTEGER,
  stage_number INTEGER,
  message TEXT NOT NULL,
  details TEXT,                     -- JSON
  service_name TEXT,                -- 'Gemini' | 'FishAudio' | 'FFmpeg' | 'GCS'（v12.1.0 起 NCA 已废弃）
  operation TEXT,
  api_duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

## 视频分镜表

### job_videos（视频分析结果）

```sql
CREATE TABLE job_videos (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  video_index INTEGER NOT NULL,
  label TEXT NOT NULL,
  title TEXT,
  description TEXT,
  original_url TEXT NOT NULL,
  gcs_https_url TEXT,               -- GCS HTTPS URL
  gcs_gs_uri TEXT,                  -- GCS gs:// URI
  gemini_uri TEXT,                  -- Gemini File API URI
  metadata TEXT,                    -- JSON
  analysis_prompt TEXT,             -- Gemini 分析提示词（用于缓存复用）
  analysis_response TEXT,           -- Gemini 分析响应（用于多轮对话）
  storyboards TEXT,                 -- JSON 分镜脚本数组
  total_duration REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

### job_scenes（分镜详情）

```sql
CREATE TABLE job_scenes (
  id TEXT PRIMARY KEY,              -- 格式：{jobId}-scene-{N}
  job_id TEXT NOT NULL,
  scene_index INTEGER NOT NULL,
  source_video_index INTEGER NOT NULL,
  source_video_label TEXT NOT NULL,
  source_start_time TEXT NOT NULL,
  source_end_time TEXT NOT NULL,
  duration_seconds REAL NOT NULL,
  narration_script TEXT NOT NULL,   -- 原始旁白
  use_original_audio INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',    -- 'pending' | 'processing' | 'completed' | 'failed'

  -- 视频处理 URL
  split_video_url TEXT,
  gcs_video_url TEXT,
  adjusted_video_url TEXT,
  final_video_url TEXT,

  -- 音频相关
  selected_audio_url TEXT,
  audio_duration REAL,
  speed_factor REAL,

  -- 元数据
  metadata TEXT,                    -- JSON
  split_duration REAL,
  final_metadata TEXT,              -- JSON

  -- 预生成旁白（v11.2）
  narration_v1 TEXT,
  narration_v2 TEXT,
  narration_v3 TEXT,
  failure_reason TEXT,

  -- 跳切修剪（v12.2）
  trimmed_video_url TEXT,             -- 修剪后视频 URL
  trimmed_start REAL,                 -- 修剪起点（秒）
  trimmed_end REAL,                   -- 修剪终点（秒）
  trimmed_duration REAL,              -- 修剪后时长（秒）

  -- 控制字段
  is_skipped INTEGER DEFAULT 0,
  control_updated_at INTEGER,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,

  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE(job_id, scene_index)
);
```

## 外部服务表

> 注：`nca_jobs` 表已在 v12.1.0 废弃并删除，本地 FFmpeg 处理无需追踪外部任务

### scene_audio_candidates（音频候选）

```sql
CREATE TABLE scene_audio_candidates (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  candidate_index INTEGER NOT NULL,
  narration_text TEXT NOT NULL,
  narration_length INTEGER NOT NULL,
  audio_url TEXT NOT NULL,
  audio_duration REAL,
  speed_factor REAL,
  diff_from_1_0 REAL,
  is_selected INTEGER DEFAULT 0,
  metadata TEXT,                    -- JSON
  created_at INTEGER NOT NULL,
  FOREIGN KEY (scene_id) REFERENCES job_scenes(id) ON DELETE CASCADE,
  UNIQUE(scene_id, candidate_index)
);
```

### api_calls（API 调用记录）

```sql
CREATE TABLE api_calls (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  scene_id TEXT,
  service TEXT NOT NULL,            -- 'gemini' | 'ffmpeg' | 'fish_audio' | 'edge_tts' | 'gcs'
  operation TEXT NOT NULL,
  platform TEXT,                    -- 'vertex' | 'ai-studio'
  request_params TEXT,              -- JSON
  request_timestamp INTEGER NOT NULL,
  response_data TEXT,               -- JSON
  response_timestamp INTEGER,
  duration_ms INTEGER,
  status TEXT,                      -- 'pending' | 'success' | 'failed' | 'retry'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  token_usage TEXT,                 -- JSON Token 使用量
  file_size INTEGER,
  raw_response TEXT,                -- AI 服务原始响应（用于排查解析失败）
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

## 系统管理表

### schema_version（数据库版本）

```sql
CREATE TABLE schema_version (
  version TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
```

### distributed_locks（分布式锁）

```sql
CREATE TABLE distributed_locks (
  lock_key TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  metadata TEXT
);
```

## 状态机

### 任务状态（jobs.status）

```
pending → processing → completed / failed
```

| 状态 | 说明 | 是否终态 |
|-----|------|---------|
| `pending` | 待执行 | 否 |
| `processing` | 执行中 | 否 |
| `completed` | 已完成 | **是** |
| `failed` | 已失败 | **是** |

### 步骤状态（job_step_history.status）

| 状态 | 说明 |
|-----|------|
| `pending` | 待执行 |
| `running` | 执行中 |
| `completed` | 已完成 |
| `failed` | 已失败 |
| `skipped` | 已跳过 |

## 成本追踪

成本数据通过 `api_calls` 表的 `token_usage` 字段记录，由 `/api/jobs/:id/cost` 接口聚合计算。

**成本计算模块**：`lib/cost/`
- `pricing.ts` - 计费模型定义
- `calculator.ts` - 成本计算逻辑
- `index.ts` - 模块入口
