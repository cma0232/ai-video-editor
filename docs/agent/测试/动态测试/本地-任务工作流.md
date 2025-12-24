# 测试用例 - 任务工作流（本地）

> **测试环境**：本地（localhost:8899）
> **测试工具**：MCP Chrome DevTools
> **预计耗时**：90 分钟
> **用例数量**：20 个
> **前置条件**：已完成「06-本地-UI基础功能」的密钥配置

---

## 测试目的

**核心目标**：通过端到端测试验证完整的视频处理工作流，确保从任务创建到最终成片的全流程正确执行。

**修复原则**：
- ✅ **保证功能正常**：修复后必须确保现有功能正常运行
- ✅ **不引入新错误**：修复方案不得引入新的报错或问题
- ✅ **面向现有功能**：非必要不兼容历史数据，优先满足当前功能需求
- ❌ **避免过度设计**：不为假设的未来需求增加复杂性

---

## 测试凭据

> **重要**：测试凭据和资源请参考以下文件，本文档不包含敏感信息。

| 凭据类型 | 参考文件 |
|----------|----------|
| 环境地址、账号密码、数据库路径 | [凭据/本地.md](../凭据/本地.md) |
| 测试视频、API 配置模板 | [凭据/公共.md](../凭据/公共.md) |

> ⚠️ **注意**：测试视频为**美食类**视频，请在测试时注意验证 AI 生成的旁白内容与美食主题相关。

---

## 通用验证规范

### 每个测试用例必须验证

1. **控制台监控**：无 JavaScript 错误、无未捕获异常
2. **日志监控**：无 ERROR 级别日志（除预期错误外）
3. **数据库一致性**：相关表数据正确写入、状态更新及时
4. **UI 响应**：操作后界面正确更新

### 数据库验证涉及的核心表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `jobs` | 任务主表 | status, current_step, style_id, config |
| `job_videos` | 视频分析 | analysis_prompt, storyboards, metadata |
| `job_scenes` | 分镜数据 | narration_script, duration_seconds, use_original_audio, final_video_url |
| `scene_audio_candidates` | 音频候选 | narration_text, speed_factor, is_selected |
| `job_step_history` | 步骤历史 | major_step, sub_step, status, duration_ms |
| `job_current_state` | 当前状态 | current_major_step, processed_scenes, final_video_url |
| `job_logs` | 执行日志 | log_type, log_level, message |
| `api_calls` | API 调用 | service, operation, status, duration_ms |

---

## 第一部分：风格准备测试

### TC-STYLE-L001 通用风格检查

**操作**：导航到风格管理页面，查看「通用解说风格」（style-1000）

**UI 验证**：
- [ ] 预设风格列表包含 14 个风格
- [ ] style-1000 存在且可查看详情
- [ ] 详情页显示 analysis_creative_layer 和 audio_sync_creative_layer

**数据库验证**：
- 查询 `styles/style-1000.yaml` 文件，确认配置参数：
  - channel_name = `翔宇通用`
  - duration_range = `6-12`
  - speech_rates = `[4, 4.5, 5.5]`

---

### TC-STYLE-L002 创建测试专用自定义风格

**操作**：创建自定义风格，用于后续参数验证测试

**风格配置**：

| 参数 | 值 |
|------|-----|
| 风格名称 | `测试全参数风格` |
| channel_name | `美食测试频道` |
| duration_range | `4-8` |
| speech_rates | `[3.5, 4.5, 5.5]` |

**剪辑提示词要求**：包含指令让 AI 在旁白中添加「[剪辑参数生效]」标记

**音画提示词要求**：包含指令让 AI 在优化旁白中添加「[音画参数生效]」标记

**UI 验证**：
- [ ] 风格保存成功，显示在自定义风格列表
- [ ] 记录风格 ID（用于后续测试）

**数据库验证**：
- 确认风格文件已创建（`styles/style-2xxx.yaml`）
- 确认所有配置参数正确保存

---

## 第二部分：通用风格任务测试

### TC-JOB-L001 通用风格单视频任务（AI Studio）

**任务参数**：

| 参数 | 值 |
|------|-----|
| 视频 URL | 测试视频1 |
| 风格 | 通用解说风格（style-1000） |
| Gemini 平台 | AI Studio |
| 分镜数量 | 4 |
| 原声分镜 | 0 |
| 文案大纲 | `这是一道经典美食的制作过程，请围绕食材准备、烹饪技巧、成品展示进行解说` |

**UI 验证**：
- [ ] 任务创建成功，跳转到详情页
- [ ] 任务状态最终变为「已完成」
- [ ] 分镜数量 = 4

**数据库验证**：

| 表 | 验证要求 |
|----|----------|
| `jobs` | status=completed, style_id=style-1000, config 包含正确参数 |
| `job_videos` | analysis_prompt 包含 channel_name=翔宇通用 |
| `job_scenes` | 共 4 条记录，所有 use_original_audio=0，duration_seconds 在 6-12 秒范围 |
| `scene_audio_candidates` | 每个分镜 3 个候选，speed_factor 有记录 |
| `job_step_history` | 五个阶段都有记录，status=completed |
| `job_current_state` | final_video_url 不为空 |

**异常监控**：
- [ ] 控制台无错误
- [ ] job_logs 表无 ERROR 级别记录

---

### TC-JOB-L002 通用风格单视频任务（Vertex AI）

**任务参数**：

| 参数 | 值 |
|------|-----|
| 视频 URL | 测试视频1 |
| 风格 | 通用解说风格（style-1000） |
| Gemini 平台 | Vertex AI |
| 分镜数量 | 3 |
| 原声分镜 | 1 |
| 文案大纲 | 同上 |

**UI 验证**：
- [ ] 任务创建成功
- [ ] 任务状态最终变为「已完成」

**数据库验证**：

| 表 | 验证要求 |
|----|----------|
| `jobs` | config 中 gemini_platform=vertex |
| `job_videos` | gcs_gs_uri 不为空（视频已上传到 GCS） |
| `job_scenes` | 最后 1 个分镜 use_original_audio=1 |
| `job_step_history` | 包含 migrate_to_gcs 步骤记录 |
| `api_calls` | 有 Vertex AI 相关调用记录 |

**异常监控**：
- [ ] 控制台无错误
- [ ] 日志中显示 `gs://` URI

---

## 第三部分：自定义风格任务测试

### TC-JOB-L003 自定义风格单视频任务（AI Studio）

**任务参数**：

| 参数 | 值 |
|------|-----|
| 视频 URL | 测试视频1 |
| 风格 | 测试全参数风格（TC-STYLE-L002 创建的） |
| Gemini 平台 | AI Studio |
| 分镜数量 | 3 |
| 原声分镜 | 0 |
| 文案大纲 | `这是一道经典美食的制作过程，厨师的名字叫王大厨，请在解说中提及王大厨的名字` |

**UI 验证**：
- [ ] 任务创建成功
- [ ] 任务完成

**数据库验证 - 参数生效**：

| 验证项 | 表 | 验证要求 |
|--------|-----|----------|
| **channel_name** | `job_videos` | analysis_prompt 包含 `美食测试频道` |
| **duration_range** | `job_scenes` | 所有 duration_seconds 在 **4-8 秒**范围 |
| **speech_rates** | `scene_audio_candidates` | 候选的语速配置为 3.5, 4.5, 5.5 |
| **[剪辑参数生效]** | `job_scenes` | narration_script 包含此标记 |
| **[音画参数生效]** | `scene_audio_candidates` | narration_text 包含此标记 |
| **文案大纲** | `job_scenes` | narration_script 包含「王大厨」 |

**对比验证（与 TC-JOB-L001）**：
- 分镜时长：自定义风格（4-8秒）< 通用风格（6-12秒）
- speech_rates[0]：自定义（3.5）≠ 通用（4）

---

### TC-JOB-L004 自定义风格多视频混剪任务

**任务参数**：

| 参数 | 值 |
|------|-----|
| 视频 1 | 测试视频1 |
| 视频 2 | 测试视频2 |
| 风格 | 测试全参数风格 |
| Gemini 平台 | AI Studio |
| 分镜数量 | 4 |
| 原声分镜 | 1 |
| 文案大纲 | `这是美食合集，两道菜都由李师傅亲手烹制，请在解说中提及李师傅` |

**UI 验证**：
- [ ] 任务类型显示为多视频
- [ ] 任务完成

**数据库验证**：

| 表 | 验证要求 |
|----|----------|
| `jobs` | job_type=multi_video, input_videos 包含 2 个视频 |
| `job_videos` | 共 2 条记录 |
| `job_scenes` | 共 4 条记录，source_video_index 分布在 0 和 1 |
| `job_scenes` | 最后 1 个 use_original_audio=1 |
| `job_scenes` | narration_script 包含「李师傅」 |

---

## 第四部分：工作流五阶段监控测试

> **说明**：在任务执行过程中，监控五个阶段的执行状态

### TC-WF-L001 阶段1-视频分析（analysis）

**监控步骤**：fetch_metadata → prepare_gemini → gemini_analysis → validate_storyboards

**数据库验证**：

| 表 | 验证要求 |
|----|----------|
| `job_step_history` | 四个子步骤都有记录，status=completed |
| `job_videos` | metadata 不为空（元数据已获取） |
| `job_videos` | gemini_uri 不为空（已上传到 Gemini） |
| `job_videos` | storyboards 不为空（分镜脚本已生成） |
| `job_current_state` | current_major_step 从 analysis 更新 |

---

### TC-WF-L002 阶段2-旁白生成（generate_narrations）

**监控步骤**：generate_narrations

**数据库验证**：

| 表 | 验证要求 |
|----|----------|
| `job_step_history` | generate_narrations 步骤 status=completed |
| `job_scenes` | 所有分镜 narration_script 不为空 |

---

### TC-WF-L003 阶段3-分镜提取（extract_scenes）

**监控步骤**：ffmpeg_batch_split, migrate_to_gcs（仅 Vertex AI）

**数据库验证**：

| 表 | 验证要求 |
|----|----------|
| `job_step_history` | ffmpeg_batch_split 步骤 status=completed |
| `job_scenes` | 所有分镜 split_video_url 不为空 |
| `api_calls` | 有 FFmpeg 操作记录 |

---

### TC-WF-L004 阶段4-音画同步（process_scenes）

**监控步骤**：generate_narration → synthesize_audio → select_best_match → adjust_video_speed → merge_audio_video

**数据库验证**：

| 表 | 验证要求 |
|----|----------|
| `scene_audio_candidates` | 每个分镜有 3 个候选记录 |
| `scene_audio_candidates` | 每个分镜有 1 个 is_selected=1 |
| `scene_audio_candidates` | 被选中的候选 speed_factor 最接近 1.0 |
| `job_scenes` | selected_audio_url 不为空 |
| `job_scenes` | final_video_url 不为空 |
| `job_scenes` | status=completed |
| `job_current_state` | processed_scenes 逐步递增到总数 |

---

### TC-WF-L005 阶段5-最终合成（compose）

**监控步骤**：concatenate_scenes, upload_final_video（仅 Vertex AI）, download_to_local

**数据库验证**：

| 表 | 验证要求 |
|----|----------|
| `job_step_history` | concatenate_scenes 步骤 status=completed |
| `job_current_state` | final_video_url 不为空 |
| `job_current_state` | final_video_local_path 不为空（本地环境） |
| `jobs` | status=completed, completed_at 不为空 |

**文件系统验证**：
- `./output/` 目录下存在最终成片文件

---

## 第五部分：参数微调验证测试

> **说明**：通过对比通用风格（TC-JOB-L001）和自定义风格（TC-JOB-L003）的数据库数据，验证参数生效

### TC-PARAM-L001 参数验证-分镜数量

**数据库验证**：
- 查询 `job_scenes` 表，统计两个任务的分镜数量
- TC-JOB-L003 应有 3 条，TC-JOB-L004 应有 4 条

---

### TC-PARAM-L002 参数验证-原声分镜

**数据库验证**：
- 查询 `job_scenes` 表的 use_original_audio 字段
- TC-JOB-L003：所有分镜 = 0
- TC-JOB-L004：最后 1 个分镜 = 1

---

### TC-PARAM-L003 参数验证-文案大纲

**数据库验证**：
- 查询 `job_scenes` 表的 narration_script 字段
- TC-JOB-L003：包含「王大厨」
- TC-JOB-L004：包含「李师傅」

---

### TC-PARAM-L004 参数验证-特殊标记（剪辑提示词）

**数据库验证**：
- 查询 `job_scenes` 表的 narration_script 字段
- TC-JOB-L001（通用风格）：**不包含**「[剪辑参数生效]」
- TC-JOB-L003（自定义风格）：**包含**「[剪辑参数生效]」

---

### TC-PARAM-L005 参数验证-特殊标记（音画提示词）

**数据库验证**：
- 查询 `scene_audio_candidates` 表的 narration_text 字段
- TC-JOB-L001（通用风格）：**不包含**「[音画参数生效]」
- TC-JOB-L003（自定义风格）：**包含**「[音画参数生效]」

---

### TC-PARAM-L006 参数验证-频道名称

**数据库验证**：
- 查询 `job_videos` 表的 analysis_prompt 字段
- TC-JOB-L001：包含 `翔宇通用`
- TC-JOB-L003：包含 `美食测试频道`

---

### TC-PARAM-L007 参数验证-分镜时长范围

**数据库验证**：
- 查询 `job_scenes` 表的 duration_seconds 字段
- TC-JOB-L001（通用风格）：所有分镜在 **6-12 秒**范围
- TC-JOB-L003（自定义风格）：所有分镜在 **4-8 秒**范围
- 自定义风格平均时长 < 通用风格平均时长

---

### TC-PARAM-L008 参数验证-语速配置

**数据库验证**：
- 查询 `scene_audio_candidates` 表，按 candidate_index 分组
- TC-JOB-L001（通用风格）：候选 0/1/2 对应旁白长度比例约为 4/4.5/5.5
- TC-JOB-L003（自定义风格）：候选 0/1/2 对应旁白长度比例约为 3.5/4.5/5.5
- 验证候选 0 的旁白长度不同（通用更长）

---

## 第六部分：导出功能测试

### TC-EXPORT-L001 导出任务数据

**操作**：在 TC-JOB-L003 任务详情页点击「导出数据」

**UI 验证**：
- [ ] 导出成功，打开 Markdown 报告
- [ ] 报告包含任务基本信息
- [ ] 报告包含分镜脚本
- [ ] 报告中可见「[剪辑参数生效]」标记

---

## 第七部分：风格对比总结

### TC-COMPARE-L001 通用风格 vs 自定义风格对比

**对比维度**：

| 对比项 | 通用风格（TC-JOB-L001） | 自定义风格（TC-JOB-L003） | 预期差异 |
|--------|------------------------|--------------------------|----------|
| channel_name | 翔宇通用 | 美食测试频道 | 不同 |
| duration_range | 6-12秒 | 4-8秒 | 不同 |
| speech_rates[0] | 4 | 3.5 | 不同 |
| [剪辑参数生效] | 无 | 有 | 仅自定义有 |
| [音画参数生效] | 无 | 有 | 仅自定义有 |

**数据库对比验证**：
- 从两个任务的数据中提取上述字段进行对比
- 所有差异项都应符合预期

---

## 问题记录模板

```markdown
### 问题 N
- **用例编号**：TC-XXX-LXXX
- **位置**：[页面/功能]
- **现象**：[描述]
- **控制台错误**：[如有]
- **数据库异常**：[如有]
- **修复状态**：☐ 待修复 / ☐ 已修复
```

---

## 测试结果汇总

| 用例编号 | 用例名称 | 结果 | 备注 |
|----------|----------|------|------|
| TC-STYLE-L001 | 通用风格检查 | ☐ 通过 / ☐ 失败 | |
| TC-STYLE-L002 | 创建测试专用自定义风格 | ☐ 通过 / ☐ 失败 | |
| TC-JOB-L001 | 通用风格单视频（AI Studio） | ☐ 通过 / ☐ 失败 | |
| TC-JOB-L002 | 通用风格单视频（Vertex AI） | ☐ 通过 / ☐ 失败 | |
| TC-JOB-L003 | 自定义风格单视频（AI Studio） | ☐ 通过 / ☐ 失败 | |
| TC-JOB-L004 | 自定义风格多视频混剪 | ☐ 通过 / ☐ 失败 | |
| TC-WF-L001 | 阶段1-视频分析 | ☐ 通过 / ☐ 失败 | |
| TC-WF-L002 | 阶段2-旁白生成 | ☐ 通过 / ☐ 失败 | |
| TC-WF-L003 | 阶段3-分镜提取 | ☐ 通过 / ☐ 失败 | |
| TC-WF-L004 | 阶段4-音画同步 | ☐ 通过 / ☐ 失败 | |
| TC-WF-L005 | 阶段5-最终合成 | ☐ 通过 / ☐ 失败 | |
| TC-PARAM-L001 | 参数验证-分镜数量 | ☐ 通过 / ☐ 失败 | |
| TC-PARAM-L002 | 参数验证-原声分镜 | ☐ 通过 / ☐ 失败 | |
| TC-PARAM-L003 | 参数验证-文案大纲 | ☐ 通过 / ☐ 失败 | |
| TC-PARAM-L004 | 参数验证-特殊标记（剪辑） | ☐ 通过 / ☐ 失败 | |
| TC-PARAM-L005 | 参数验证-特殊标记（音画） | ☐ 通过 / ☐ 失败 | |
| TC-PARAM-L006 | 参数验证-频道名称 | ☐ 通过 / ☐ 失败 | |
| TC-PARAM-L007 | 参数验证-分镜时长范围 | ☐ 通过 / ☐ 失败 | |
| TC-PARAM-L008 | 参数验证-语速配置 | ☐ 通过 / ☐ 失败 | |
| TC-EXPORT-L001 | 导出任务数据 | ☐ 通过 / ☐ 失败 | |
| TC-COMPARE-L001 | 通用 vs 自定义风格对比 | ☐ 通过 / ☐ 失败 | |

---

**测试人员**：________________

**测试日期**：________________

**测试结论**：☐ 全部通过 / ☐ 部分通过 / ☐ 需修复后重测
