# 系统模板占位符参考手册

本文档列出了所有可用的占位符变量，供系统模板和风格模板开发者参考。

---

## 占位符语法

- **格式**：`{{variable_name}}`（Mustache 风格）
- **示例**：`{{channel_name}}`、`{{video_duration}}`
- **嵌套对象**：支持点号访问（如 `{{config.channel_name}}`）

---

## 视频分析阶段占位符

用于 `_templates/analysis_params.yaml` 系统模板和风格的 `analysis_creative_layer` 创意层。

### 运行参数（任务执行时动态注入）

| 占位符 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `{{video_count}}` | number | 视频数量 | `2` |
| `{{video_descriptions}}` | string | 视频元数据描述（格式化字符串） | 见下方示例 |
| `{{storyboard_count}}` | number | 期望的分镜数量 | `15` |
| `{{script_outline_section}}` | string | 文案大纲段落（可选，带说明文字） | 见下方示例 |
| `{{original_audio_scene_count_section}}` | string | 原声使用说明段落（可选，带说明文字） | 见下方示例 |

### 风格参数（从风格配置自动注入）

| 占位符 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `{{channel_name}}` | string | 频道名称 | `翔宇通用` |
| `{{narration_language}}` | string | 旁白语言 | `zh-CN` |
| `{{min_duration}}` | number | 推荐时长范围（最小值，秒） | `6` |
| `{{max_duration}}` | number | 推荐时长范围（最大值，秒） | `12` |

### 示例值

**`video_descriptions`** 示例：
```
**video-1**
   - 标签：示例视频1
   - 时长：00:05:30.000（共 330.0 秒）
   - 时间戳范围：00:00:00.000 ~ 00:05:30.000

**video-2**
   - 标签：示例视频2
   - 时长：00:03:20.000（共 200.0 秒）
   - 时间戳范围：00:00:00.000 ~ 00:03:20.000
```

**`script_outline_section`** 示例（当用户提供大纲时）：
```

**文案大纲（script_outline）**: 第一部分介绍...，第二部分讲解...

**大纲使用说明**: 整个视频剪辑以文案为纲进行时间戳的选取。请严格按照文案大纲的逻辑顺序和内容要点，从原视频中精准选择对应的片段，确保每个分镜都能准确体现大纲中的某个核心观点，实现文案与画面的完美契合。

```

**`original_audio_scene_count_section`** 示例（当用户指定保留原声时）：
```

**使用原声的分镜数量（original_audio_scene_count）**: 2

**原声使用说明**: 请按照该数量（2个）设置分镜的 use_original_audio 字段为 true。要求从原视频中选取最合适、最具表现力的片段来使用原声开关，例如：关键对话、情感高潮、现场音效等，以达到最佳的剪辑效果和观众代入感。

```

---

## 音画同步阶段占位符

用于 `_templates/audio_sync_params.yaml` 系统模板和风格的 `audio_sync_creative_layer` 创意层。

### 运行参数（任务执行时动态注入）

| 占位符 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `{{scene_id}}` | string | 分镜 ID | `scene-1` |
| `{{video_duration}}` | number | 视频时长（秒） | `10.5` |
| `{{narration_script}}` | string | 原始旁白脚本 | `这是一段旁白文案...` |
| `{{narration_language}}` | string | 旁白语言 | `zh-CN` |
| `{{target_word_counts}}` | string | 目标字数（JSON 字符串） | `{"v1": 42, "v2": 47, "v3": 58}` |

### 风格参数（从风格配置自动注入）

音画同步阶段没有额外的风格参数占位符。所有参数都通过 `target_word_counts` 计算后注入。

### 示例值

**`target_word_counts`** 计算方式：
- 字数 = 视频时长（秒） × 语速（字/秒）
- 示例：视频时长 10 秒，语速 [4, 4.5, 5.5]
  - v1: 10 × 4 = 40 字
  - v2: 10 × 4.5 = 45 字
  - v3: 10 × 5.5 = 55 字

---

## 占位符使用注意事项

1. **必需 vs 可选**：
   - `video_descriptions`、`storyboard_count` 等核心参数是必需的
   - `script_outline_section`、`original_audio_scene_count_section` 是可选的（用户未提供时为空字符串或换行符）

2. **字符串拼接**：
   - 可选段落占位符（如 `script_outline_section`）已经包含换行符和缩进，直接插入即可

3. **数字格式**：
   - 所有数字占位符（如 `{{video_duration}}`）在模板引擎中会自动转换为字符串
   - 不需要手动加引号

4. **JSON 字符串**：
   - `target_word_counts` 已经是格式化后的 JSON 字符串，可以直接在提示词中显示

5. **占位符未找到**：
   - 如果占位符对应的变量不存在，默认行为是保留占位符（`{{variable}}`）
   - 开发模式下会在控制台输出警告

---

## 模板引擎调试

如需查看占位符替换过程，可以：

1. 在开发环境中，模板引擎会自动记录替换日志
2. 查看控制台输出：`[TemplateEngine] Render complete: { total, found, missing, logs }`
3. 检查未找到的占位符：`[TemplateEngine] Variable not found: variable_name`

---

## 版本历史

- **v1.0.0** (2025-11-16): 初始版本，统一占位符规范
