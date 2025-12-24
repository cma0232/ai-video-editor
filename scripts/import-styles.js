#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const yaml = require('yaml')

const PROJECT_ROOT = path.join(process.cwd())
const STYLES_DIR = path.join(PROJECT_ROOT, 'styles')
const WORKFLOW_PATH = path.join(
  PROJECT_ROOT,
  '34.全自动剪辑_这个n8n工作流让AI当导演批量剪辑任意视频，秒变爆款！.json',
)

if (!fs.existsSync(WORKFLOW_PATH)) {
  console.error('Workflow JSON not found at', WORKFLOW_PATH)
  process.exit(1)
}

const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf-8'))

const STYLE_PREFIX = '设置参数-'
const STYLE_SUFFIX = '风格'

const styleNodes = workflow.nodes.filter((node) => {
  if (node.type !== 'n8n-nodes-base.set') return false
  if (!node.name?.startsWith(STYLE_PREFIX)) return false
  if (node.name === '设置参数-综合') return false
  if (node.name === '设置参数-提取提示词') return false
  if (node.name === '设置参数-旁白-音画同步') return false
  if (node.name === '设置参数-音画同步') return false
  if (node.name === '设置参数-视频网址') return false
  return node.name.endsWith(STYLE_SUFFIX) || node.name === '设置参数-通用解说风格'
})

const audioSyncNode = workflow.nodes.find((node) => node.name === '设置参数-音画同步')
if (!audioSyncNode) {
  console.error('Audio sync prompt node not found')
  process.exit(1)
}
const audioAssignment = audioSyncNode.parameters.assignments.assignments.find(
  (item) => item.name === '视频分析提示词',
)
let audioPrompt = audioAssignment?.value || ''
if (audioPrompt.startsWith('=')) audioPrompt = audioPrompt.slice(1)

const sanitizeAudioPrompt = (text) => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\{\{\s*\$\('遍历'\)\.item\.json\.scene_id\s*\}\}/g, '{{scene_id}}')
    .replace(/\{\{\s*\$\('遍历'\)\.item\.json\.duration_seconds\s*\}\}/g, '{{duration_seconds}}')
    .replace(/\{\{\s*\$\('需求输入'\)\.item\.json\['语言'\]\s*\}\}/g, '{{narration_language}}')
    .replace(/\{\{\s*\$\('遍历'\)\.item\.json\.narration_script\s*\}\}/g, '{{narration_script}}')
    .replace(
      /\{\{\s*\$\('设置参数-提取提示词'\)\.first\(\)\.json\['完整视频分镜'\]\s*\}\}/g,
      '{{full_storyboards}}',
    )
    .replace(
      /\{\{\s*Math\.round\(\$json\["duration_seconds"\] \* 4\)\s*\}\}/g,
      '{{duration_seconds * 4}}',
    )
    .replace(
      /\{\{\s*Math\.round\(\$json\["duration_seconds"\] \* 4\.5\)\s*\}\}/g,
      '{{duration_seconds * 4.5}}',
    )
    .replace(
      /\{\{\s*Math\.round\(\$json\["duration_seconds"\] \* 5\.5\)\s*\}\}/g,
      '{{duration_seconds * 5.5}}',
    )
    .trim()
}

audioPrompt = sanitizeAudioPrompt(audioPrompt)

const sanitizeAnalysisPrompt = (text) => {
  return text
    .replace(/^=/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\{\{\s*\$\('需求输入'\)\.item\.json\['分镜数量'\]\s*\}\}/g, '{{storyboard_count}}')
    .replace(/\{\{\s*\$\('需求输入'\)\.item\.json\['语言'\]\s*\}\}/g, '{{narration_language}}')
    .trim()
}

const toBlock = (label, text) => {
  const lines = text.split('\n')
  const body = lines.map((line) => `  ${line}`).join('\n')
  return `${label}: |\n${body}\n`
}

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

ensureDir(STYLES_DIR)

const styleData = styleNodes.map((node) => {
  const name = node.name.replace(STYLE_PREFIX, '')
  const assignments = node.parameters.assignments.assignments
  const promptAssignment = assignments.find((item) => item.name === '视频剪辑提示词')
  const voiceAssignment = assignments.find((item) => item.name === '音色')
  if (!promptAssignment) {
    throw new Error(`Prompt assignment missing for ${name}`)
  }
  const analysisPrompt = sanitizeAnalysisPrompt(promptAssignment.value)
  const channelMatch = analysisPrompt.match(/频道名称[^:]*:\s*([^\n]+)/)
  const channelName = channelMatch ? channelMatch[1].trim() : '翔宇解说'

  return {
    originalName: name,
    analysisPrompt,
    voiceId: voiceAssignment?.value || '',
    channelName,
  }
})

const SLUG_MAP = {
  通用解说风格: 'general',
  毒舌电影风格: 'spicy-film',
  俏皮自然纪录片风格: 'playful-nature-doc',
  深度拉片风格: 'deep-dive-film',
  顾我电影风格: 'guwo-film',
  商品评测风格: 'product-review',
  历史纪录片风格: 'history-doc',
  儿童动画片风格: 'kids-animation',
  'TikTok 商品介绍风格': 'tiktok-product',
  'TikTok 文字商品介绍风格': 'tiktok-text-product',
  引人入胜纪录片风格: 'engaging-doc',
  游戏解说风格: 'gaming-commentary',
  综艺娱乐解说风格: 'variety-show',
  长视频剪辑短视频风格: 'long-to-short',
  演讲风格: 'speech',
}

const DESCRIPTION_MAP = {
  通用解说风格: 'AI通用风格视频解说模板',
  毒舌电影风格: '犀利毒舌电影解析风格',
  俏皮自然纪录片风格: '俏皮拟人化自然纪录片风格',
  深度拉片风格: '深度拉片教学型影视解析',
  顾我电影风格: '顾我式电影情绪共鸣风格',
  商品评测风格: '理性犀利的商品评测解说',
  历史纪录片风格: '沉浸式历史纪录片风格',
  儿童动画片风格: '儿童向动画故事讲述风格',
  'TikTok 商品介绍风格': '短视频商品介绍风格',
  'TikTok 文字商品介绍风格': '图文结合的商品介绍风格',
  引人入胜纪录片风格: '情绪张力纪录片风格',
  游戏解说风格: '高能游戏解说风格',
  综艺娱乐解说风格: '综艺娱乐节奏解说风格',
  长视频剪辑短视频风格: '长内容拆条短视频风格',
  演讲风格: '激励型演讲解说风格',
}

const DEFAULT_CONFIG = {
  storyboard_count: 15,
  duration_range: { min: 6, max: 12 },
  speech_rates: [4.0, 4.5, 5.5],
}

const buildYamlContent = (meta, audioPromptText) => {
  const header = `id: ${meta.slug}\nname: ${meta.originalName}\ndescription: ${meta.description}\n`
  const analysisBlock = toBlock('analysis_prompt', meta.analysisPrompt)
  const audioBlock = toBlock('audio_sync_prompt', audioPromptText)
  const configLines = [
    'config:',
    `  storyboard_count: ${DEFAULT_CONFIG.storyboard_count}`,
    `  channel_name: "${meta.channelName}"`,
    '  duration_range:',
    `    min: ${DEFAULT_CONFIG.duration_range.min}`,
    `    max: ${DEFAULT_CONFIG.duration_range.max}`,
    `  speech_rates: [${DEFAULT_CONFIG.speech_rates.join(', ')}]`,
  ]
  if (meta.voiceId) {
    configLines.push(`  voice_id: "${meta.voiceId}"`)
  }
  const configBlock = `${configLines.join('\n')}\n`
  return `${header}\n${analysisBlock}\n${audioBlock}\n${configBlock}`
}

styleData.forEach((style) => {
  const slug = SLUG_MAP[style.originalName]
  if (!slug) {
    console.warn(`No slug mapping for ${style.originalName}, skipping...`)
    return
  }
  const description = DESCRIPTION_MAP[style.originalName] || `${style.originalName}模板`
  const targetPath = path.join(STYLES_DIR, `${slug}.yaml`)
  const fileContent = buildYamlContent(
    {
      slug,
      originalName: style.originalName,
      description,
      analysisPrompt: style.analysisPrompt,
      channelName: style.channelName,
      voiceId: style.voiceId,
    },
    audioPrompt,
  )
  fs.writeFileSync(targetPath, fileContent, 'utf-8')
  console.log('Generated', targetPath)
})

console.log('Done.')
