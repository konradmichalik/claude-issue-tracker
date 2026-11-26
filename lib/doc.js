import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

export const CANONICAL_SECTIONS = [
  'Zusammenfassung',
  'Anforderungen',
  'Betroffene Bereiche',
  'Offene Fragen',
  'Entscheidungen',
  'Aufwandsschätzung',
  'Umsetzungsplan',
  'Testschritte',
  'Erkenntnisse',
  'Quellen'
]

export const SECTION_ALIASES = {
  'anforderungen (dod)': 'Anforderungen',
  'anforderungen (definition of done)': 'Anforderungen',
  'definition of done': 'Anforderungen',
  'codebase-analyse': 'Betroffene Bereiche',
  'betroffene codebereiche': 'Betroffene Bereiche',
  'betroffene bereiche/dateien': 'Betroffene Bereiche',
  'fragen': 'Offene Fragen',
  'open questions': 'Offene Fragen',
  'klärungsbedarf': 'Offene Fragen',
  'decisions': 'Entscheidungen',
  'entscheidungen & annahmen': 'Entscheidungen',
  'schätzung': 'Aufwandsschätzung',
  'aufwand': 'Aufwandsschätzung',
  'estimation': 'Aufwandsschätzung',
  'assessment': 'Aufwandsschätzung',
  'scope assessment': 'Aufwandsschätzung',
  'plan': 'Umsetzungsplan',
  'implementierung': 'Umsetzungsplan',
  'implementierungsplan': 'Umsetzungsplan',
  'vorgehen': 'Umsetzungsplan',
  'tests': 'Testschritte',
  'test plan': 'Testschritte',
  'testing': 'Testschritte',
  'findings': 'Erkenntnisse',
  'notizen': 'Erkenntnisse',
  'ergebnisse': 'Erkenntnisse',
  'sources': 'Quellen',
  'datenquellen': 'Quellen',
  'referenzen': 'Quellen'
}

const CANONICAL_BY_LOWER = Object.fromEntries(CANONICAL_SECTIONS.map(n => [n.toLowerCase(), n]))

function canonicalize(name) {
  const stripped = name.replace(/^[^\w(]*\s*/, '').trim()
  const key = stripped.toLowerCase()
  return SECTION_ALIASES[key] || CANONICAL_BY_LOWER[key] || stripped
}

export function resolveIssuesDir(cwd = process.cwd()) {
  try {
    const gitCommonDir = execFileSync(
      'git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { encoding: 'utf-8', cwd }
    ).trim()
    return join(dirname(gitCommonDir), '.issues')
  } catch {
    return join(cwd, '.issues')
  }
}

export function ensureIssuesDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function issuePath(dir, filename) {
  return join(dir, filename.endsWith('.md') ? filename : `${filename}.md`)
}

export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const result = {}
  const lines = match[1].split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const idx = line.indexOf(':')
    if (idx === -1) { i++; continue }
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (value === '[]') { result[key] = []; i++; continue }
    if (value === '' && lines[i + 1] && /^\s*-\s/.test(lines[i + 1])) {
      const list = []
      i++
      while (i < lines.length && /^\s*-\s/.test(lines[i])) {
        list.push(lines[i].replace(/^\s*-\s/, '').trim())
        i++
      }
      result[key] = list
      continue
    }
    result[key] = value
    i++
  }
  return result
}

export function stringifyFrontmatter(fm) {
  const lines = []
  for (const [key, value] of Object.entries(fm)) {
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      lines.push(`${key}:`)
      for (const item of value) lines.push(`  - ${item}`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }
  return lines.join('\n')
}

export function bodyOf(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, '')
}

export function setFrontmatter(content, patch) {
  const fm = { ...parseFrontmatter(content), ...patch }
  const body = bodyOf(content)
  return `---\n${stringifyFrontmatter(fm)}\n---\n${body}`
}

// Splits the body into `## ` sections. A `## ` line inside a fenced code block
// is content, not a heading.
function splitSections(content) {
  const sections = []
  let current = null
  let fence = null
  for (const line of content.split('\n')) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1]
    if (marker) {
      if (!fence) fence = marker[0]
      else if (marker[0] === fence) fence = null
    }
    const heading = !fence && !marker && line.match(/^##\s+(.+)$/)
    if (heading) {
      current = { heading: heading[1].trim(), lines: [] }
      sections.push(current)
    } else if (current) {
      current.lines.push(line)
    }
  }
  return sections
}

export function getSection(content, canonicalName) {
  const section = splitSections(content).find(s => canonicalize(s.heading) === canonicalName)
  return section ? section.lines.join('\n').trim() : null
}

export function parseRequirements(content) {
  const section = getSection(content, 'Anforderungen') || ''
  const requirements = []
  let index = 0
  for (const line of section.split('\n')) {
    const m = line.match(/^- \[([ xX])\] (.+)/)
    if (m) { requirements.push({ index, text: m[2].trim(), checked: m[1].toLowerCase() === 'x' }); index++ }
  }
  return requirements
}

export function listIssues(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = readFileSync(join(dir, f), 'utf-8')
      const fm = parseFrontmatter(content)
      const requirements = parseRequirements(content)
      const progress = { checked: requirements.filter(r => r.checked).length, total: requirements.length }
      return { file: f, key: fm.key || f.replace(/\.md$/, ''), ...fm, progress }
    })
}

export function readIssue(dir, filename) {
  const p = issuePath(dir, filename)
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf-8')
}

export function writeIssue(dir, filename, content) {
  ensureIssuesDir(dir)
  writeFileSync(issuePath(dir, filename), content, 'utf-8')
}

function currentBranch(cwd = process.cwd()) {
  try {
    return execFileSync('git', ['branch', '--show-current'], { encoding: 'utf-8', cwd }).trim()
  } catch {
    return ''
  }
}

export function resolveActiveIssue(dir, cwd = process.cwd()) {
  const branch = currentBranch(cwd)
  const issues = listIssues(dir)
  if (branch) {
    const byBranch = issues.find(i => i.branch === branch)
    if (byBranch) return { ...byBranch, resolvedBy: 'branch' }
  }
  const inProgress = issues
    .filter(i => i.status === 'in-progress')
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
  return inProgress[0] ? { ...inProgress[0], resolvedBy: 'fallback' } : null
}
