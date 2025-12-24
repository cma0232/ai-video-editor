#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')

const STYLES_DIR = path.join(process.cwd(), 'styles')

const _DEFAULT_CONFIG = `config:\n  channel_name: "${'CHANNEL_NAME'}"\n`

const files = fs.readdirSync(STYLES_DIR).filter((file) => file.endsWith('.yaml'))

for (const file of files) {
  const fullPath = path.join(STYLES_DIR, file)
  const content = fs.readFileSync(fullPath, 'utf-8')

  const lines = content.split('\n')
  let inConfig = false
  const filtered = []
  for (const line of lines) {
    if (/^config:\s*$/.test(line)) {
      inConfig = true
      filtered.push(line)
      continue
    }
    if (inConfig) {
      if (/^\s{2}[a-zA-Z_]+:/.test(line) || line.trim() === '') {
        if (!/^\s{2}channel_name:/.test(line)) {
          continue
        }
      } else {
        inConfig = false
      }
    }
    filtered.push(line)
  }

  const current = filtered.join('\n')
  fs.writeFileSync(fullPath, current, 'utf-8')
}
