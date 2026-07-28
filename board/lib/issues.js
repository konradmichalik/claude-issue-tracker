import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export function resolveIssuesDir() {
  try {
    const main = execSync('git worktree list', { encoding: 'utf-8', cwd: process.env.PROJECT_DIR || process.cwd() })
      .split('\n')[0]
      .split(/\s+/)[0]
    return join(main, '.claude', 'issues')
  } catch {
    return join(process.env.PROJECT_DIR || process.cwd(), '.claude', 'issues')
  }
}

const STATUS_TO_COLUMN = {
  'analysis': 'backlog',
  'estimated': 'backlog',
  'in-progress': 'progress',
  'in-review': 'review',
  'done': 'done'
}

const COLUMN_TO_STATUS = {
  'backlog': 'analysis',
  'progress': 'in-progress',
  'review': 'in-review',
  'done': 'done'
}

export function parseIssue(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const fm = parseFrontmatter(content)
  const legacy = parseLegacyHeader(content)
  const requirements = parseRequirements(content)
  const checked = requirements.filter(r => r.checked).length
  const fileKey = filePath.split('/').pop().replace(/\.md$/, '')
  const status = fm.status || legacy.status || 'analysis'

  return {
    key: fm.key || legacy.key || fileKey,
    title: fm.title || legacy.title || fileKey,
    status,
    complexity: fm.complexity || legacy.complexity || '',
    scope: fm.scope || legacy.scope || '',
    created: fm.created || legacy.created || '',
    updated: fm.updated || legacy.updated || '',
    column: STATUS_TO_COLUMN[status] || 'backlog',
    progress: { checked, total: requirements.length },
    requirements
  }
}

function parseLegacyHeader(content) {
  const result = {}
  const h1 = content.match(/^#\s+([^\n]+)/m)
  if (h1) {
    const m = h1[1].match(/^([A-Z]+-\d+):\s*(.+)$/)
    if (m) { result.key = m[1]; result.title = m[2].trim() }
    else { result.title = h1[1].trim() }
  }
  // "## Status: `value`" or "- **Status:** value" or "| Status | value |"
  const status = content.match(/(?:##\s+Status:\s*`?([^`\n]+?)`?$)|(?:[-*]\s*\*\*Status:\*\*\s*([^\n]+))|(?:\|\s*Status\s*\|\s*([^|\n]+?)\s*\|)/m)
  if (status) {
    const v = (status[1] || status[2] || status[3] || '').trim().toLowerCase()
    if (v) result.status = v
  }
  const complexity = content.match(/(?:[-*]\s*\*\*Complexity:?\*\*\s*([^\n]+))|(?:\|\s*Complexity\s*\|\s*([^|\n]+?)\s*\|)/i)
  if (complexity) result.complexity = (complexity[1] || complexity[2] || '').trim()
  const scope = content.match(/(?:[-*]\s*\*\*Scope:?\*\*\s*([^\n]+))|(?:\|\s*Scope\s*\|\s*([^|\n]+?)\s*\|)/i)
  if (scope) result.scope = (scope[1] || scope[2] || '').trim()
  const created = content.match(/(?:[-*]\s*\*\*Created:?\*\*\s*([^\n]+))|(?:\|\s*Created\s*\|\s*([^|\n]+?)\s*\|)/i)
  if (created) result.created = (created[1] || created[2] || '').trim()
  return result
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const result = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    result[key] = value
  }
  return result
}

function parseRequirements(content) {
  let section = content.match(/## Anforderungen[^\n]*\n([\s\S]*?)(?=\n## |\n*$)/)
  let body = section ? section[1] : null
  // Legacy fallback: collect all top-level checkboxes if no Anforderungen section
  if (!body) body = content
  const requirements = []
  let index = 0
  for (const line of body.split('\n')) {
    const m = line.match(/^- \[([ x])\] (.+)/)
    if (m) {
      requirements.push({ index, text: m[2].trim(), checked: m[1] === 'x' })
      index++
    }
  }
  return requirements
}

export function parseAllIssues() {
  const dir = resolveIssuesDir()
  if (!existsSync(dir)) return []
  const files = readdirSync(dir).filter(f => f.endsWith('.md'))
  return files
    .map(f => parseIssue(join(dir, f)))
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
}

export function updateStatus(key, newStatus) {
  const filePath = join(resolveIssuesDir(), `${key}.md`)
  if (!existsSync(filePath)) throw new Error(`Issue not found: ${key}`)
  let content = readFileSync(filePath, 'utf-8')
  const today = new Date().toISOString().slice(0, 10)
  content = content.replace(/^(status:\s*).+$/m, `$1${newStatus}`)
  content = content.replace(/^(updated:\s*).+$/m, `$1${today}`)
  writeFileSync(filePath, content, 'utf-8')
}

export { COLUMN_TO_STATUS }

export function toggleCheckbox(key, checkboxIndex, checked) {
  const filePath = join(resolveIssuesDir(), `${key}.md`)
  if (!existsSync(filePath)) throw new Error(`Issue not found: ${key}`)
  let content = readFileSync(filePath, 'utf-8')
  const today = new Date().toISOString().slice(0, 10)

  let currentIdx = 0
  const lines = content.split('\n')
  let inSection = false
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## Anforderungen')) { inSection = true; continue }
    if (inSection && lines[i].startsWith('## ')) break
    if (inSection && /^- \[[ x]\] /.test(lines[i])) {
      if (currentIdx === checkboxIndex) {
        lines[i] = checked
          ? lines[i].replace('- [ ] ', '- [x] ')
          : lines[i].replace('- [x] ', '- [ ] ')
        break
      }
      currentIdx++
    }
  }

  content = lines.join('\n')
  content = content.replace(/^(updated:\s*).+$/m, `$1${today}`)
  writeFileSync(filePath, content, 'utf-8')
}

export function readRaw(key) {
  const filePath = join(resolveIssuesDir(), `${key}.md`)
  if (!existsSync(filePath)) throw new Error(`Issue not found: ${key}`)
  return readFileSync(filePath, 'utf-8')
}

export function createIssue({ key, title, complexity, scope, status }) {
  const dir = resolveIssuesDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const filePath = join(dir, `${key}.md`)
  if (existsSync(filePath)) throw new Error(`Issue already exists: ${key}`)
  const today = new Date().toISOString().slice(0, 10)
  const content = `---
key: ${key}
title: ${title}
status: ${status}
complexity: ${complexity}
scope: ${scope}
created: ${today}
updated: ${today}
---

## Anforderungen

## Betroffene Bereiche

## Offene Fragen

## Entscheidungen

## Aufwandsschätzung

## Umsetzungsplan

## Testschritte

## Erkenntnisse

## Quellen
`
  writeFileSync(filePath, content, 'utf-8')
}
