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

function canonicalize(name) {
  const stripped = name.replace(/^[^\w(]*\s*/, '').trim()
  const key = stripped.toLowerCase()
  return SECTION_ALIASES[key] || stripped
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

// (?![\s\S]) is true end-of-string — with the 'm' flag, a bare $ matches before
// every line break, not just at the end, which truncated multi-line sections.
function sectionRegex(name) {
  return new RegExp(`^##\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s+|(?![\\s\\S]))`, 'm')
}

export function getSection(content, canonicalName) {
  for (const raw of content.matchAll(/^##\s+([^\n]+)/gm)) {
    if (canonicalize(raw[1]) === canonicalName) {
      const m = content.match(sectionRegex(raw[1].trim()))
      return m ? m[1].trim() : ''
    }
  }
  return null
}

export function appendToSection(content, canonicalName, line) {
  for (const raw of content.matchAll(/^##\s+([^\n]+)/gm)) {
    if (canonicalize(raw[1]) === canonicalName) {
      const heading = `## ${raw[1].trim()}`
      const re = new RegExp(`(${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n)([\\s\\S]*?)(?=\\n## |$)`)
      return content.replace(re, (_, head, body) => {
        const trimmed = body.replace(/\s+$/, '')
        return trimmed ? `${head}${trimmed}\n${line}\n` : `${head}${line}\n`
      })
    }
  }
  const idx = CANONICAL_SECTIONS.indexOf(canonicalName)
  const insertBefore = CANONICAL_SECTIONS.slice(idx + 1).find(n => getSection(content, n) !== null)
  const newSection = `\n## ${canonicalName}\n${line}\n`
  if (insertBefore) {
    const re = new RegExp(`(?=\\n## ${insertBefore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`)
    return content.replace(re, newSection)
  }
  return content.replace(/\n*$/, '') + '\n' + newSection
}

export function parseRequirements(content) {
  const section = getSection(content, 'Anforderungen') || ''
  const requirements = []
  let index = 0
  for (const line of section.split('\n')) {
    const m = line.match(/^- \[([ x])\] (.+)/)
    if (m) { requirements.push({ index, text: m[2].trim(), checked: m[1] === 'x' }); index++ }
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
    if (byBranch) return byBranch
  }
  const inProgress = issues
    .filter(i => i.status === 'in-progress')
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
  return inProgress[0] || null
}
