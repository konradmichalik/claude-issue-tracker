import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { homedir } from 'node:os'
import { parseFrontmatter, stringifyFrontmatter, bodyOf, getSection } from './doc.js'
import { parseRef } from './ref.js'

const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', '.build', '.ddev', 'dist', 'build'])

export function findClaudeIssuesDirs(scanRoot) {
  const found = []
  function walk(dir, depth) {
    if (depth > 6) return
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (SKIP_DIRS.has(e.name.toLowerCase())) continue
      const p = join(dir, e.name)
      if (e.name === '.claude') {
        if (existsSync(join(p, 'issues'))) found.push(join(p, 'issues'))
        continue
      }
      walk(p, depth + 1)
    }
  }
  walk(scanRoot, 0)
  return found
}

function deriveTrackerFields(fm, content, filename) {
  const key = fm.key || fm.issue || filename.replace(/\.md$/, '')
  const numericKey = key.match(/(\d+)$/)?.[1]

  const resolved = collectUrls(fm, content)
    .map(u => { try { return { url: u, parsed: parseRef(u) } } catch { return null } })
    .filter(c => c && c.parsed.tracker && c.parsed.tracker !== 'none')

  // 1. A URL that identifies *this* document wins: it carries the real owner/repo,
  //    which is not always the project's own origin (cc-usage-bar/77 → spark#77).
  const own = resolved.find(c => c.parsed.key === key) ||
    resolved.find(c => numericKey && String(c.parsed.number ?? '') === numericKey)
  if (own) return { tracker: own.parsed.tracker, ref: own.parsed.ref, url: own.parsed.url || own.url }

  // 2. Otherwise trust the key's own shape. Checked before falling back to any URL in
  //    the body, because a Jira ticket may merely *link* an upstream issue
  //    (WITTE-130 references maikschneider/bw_focuspoint_images#47 — that is not its tracker).
  //    The prefixes this tool reserves come first; they match the Jira pattern too.
  if (/^GH-\d+$/.test(key)) return { tracker: 'github', ref: '', url: '' }
  if (/^RM-\d+$/.test(key)) return { tracker: 'redmine', ref: '', url: '' }
  if (/^PR-\d+$/.test(key)) return { tracker: 'none', ref: '', url: '' }
  if (/^[A-Z][A-Z0-9]*-\d+$/.test(key)) return { tracker: 'jira', ref: key, url: '' }

  // 3. Key says nothing (bare number, free text) — now a body URL is the best evidence.
  const fallback = resolved[0]
  if (fallback) return { tracker: fallback.parsed.tracker, ref: fallback.parsed.ref, url: fallback.parsed.url || fallback.url }
  return { tracker: 'none', ref: '', url: '' }
}

function collectUrls(fm, content) {
  const found = []
  if (typeof fm.source === 'string' && /^https?:\/\//.test(fm.source)) found.push(fm.source)
  if (typeof fm.url === 'string' && /^https?:\/\//.test(fm.url)) found.push(fm.url)
  const quellen = getSection(content, 'Quellen') || ''
  for (const m of quellen.matchAll(/https?:\/\/[^\s)\],"']+/g)) found.push(m[0])
  for (const m of content.matchAll(/https?:\/\/[^\s)\],"']+/g)) found.push(m[0])
  return [...new Set(found.map(u => u.replace(/[.,;]+$/, '')))]
}

export function planFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')

  // Pre-frontmatter documents (H1 heading plus "**Status:** ..." lines) are moved
  // untouched. Prepending a partial frontmatter block would leave them formally
  // migrated but headless — no key, no title, no status — which reads worse to both
  // implementations than the legacy format they are already tolerated in.
  if (!/^---\n[\s\S]*?\n---/.test(content)) {
    return { filePath, changes: ['Legacy-Format ohne Frontmatter — unverändert übernommen'], patch: {}, legacy: true }
  }

  const fm = parseFrontmatter(content)
  const changes = []
  const patch = {}
  if (fm.issue && !fm.key) { patch.key = fm.issue; changes.push('issue: → key:') }
  if (!fm.tracker) {
    Object.assign(patch, deriveTrackerFields(fm, content, basename(filePath)))
    changes.push(`+tracker:${patch.tracker}${patch.ref ? ` (${patch.ref})` : ''}`)
  }
  return { filePath, changes, patch, dropIssueField: Boolean(fm.issue), legacy: false }
}

function applyFile(filePath, plan) {
  const content = readFileSync(filePath, 'utf-8')
  writeFileSync(`${filePath}.bak`, content, 'utf-8')
  const fm = parseFrontmatter(content)
  const merged = { ...fm, ...plan.patch }
  if (plan.dropIssueField) delete merged.issue
  writeFileSync(filePath, `---\n${stringifyFrontmatter(merged)}\n---\n${bodyOf(content)}`, 'utf-8')
}

export function migrateDir(oldDir, { apply = false } = {}) {
  const projectRoot = dirname(dirname(oldDir))
  const newDir = join(projectRoot, '.issues')
  const files = readdirSync(oldDir).filter(f => f.endsWith('.md'))
  const plans = files.map(f => planFile(join(oldDir, f)))

  if (!apply) return { oldDir, newDir, plans, applied: false }

  mkdirSync(newDir, { recursive: true })
  for (const entry of readdirSync(oldDir)) {
    cpSync(join(oldDir, entry), join(newDir, entry), { recursive: true })
  }
  for (const plan of plans) {
    if (plan.legacy) continue
    applyFile(join(newDir, basename(plan.filePath)), plan)
  }
  rmSync(oldDir, { recursive: true, force: true })
  const gitignore = ensureProjectGitignoreEntry(projectRoot)
  return { oldDir, newDir, plans, applied: true, gitignore }
}

function ensureGitignoreEntry(gitignorePath) {
  let content = ''
  try { content = readFileSync(gitignorePath, 'utf-8') } catch { /* file does not exist yet */ }
  if (/^\.issues\/?\s*$/m.test(content)) return { changed: false, path: gitignorePath }
  const sep = content === '' || content.endsWith('\n') ? '' : '\n'
  writeFileSync(gitignorePath, `${content}${sep}.issues/\n`, 'utf-8')
  return { changed: true, path: gitignorePath }
}

export function ensureGlobalGitignoreEntry() {
  return ensureGitignoreEntry(join(homedir(), '.gitignore'))
}

// The global ~/.gitignore only protects this machine. A project's own .gitignore
// protects everyone who clones it — a colleague or client without this user's
// personal dotfiles is otherwise one `git add .` away from committing tracker
// documents that may contain confidential ticket content.
export function ensureProjectGitignoreEntry(projectRoot) {
  return ensureGitignoreEntry(join(projectRoot, '.gitignore'))
}
