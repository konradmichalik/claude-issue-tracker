# Kanban Board Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based Kanban board that displays `.claude/issues/*.md` files in 4 columns with drag & drop, detail view, checkbox toggling, filtering, and live refresh.

**Architecture:** Express server (`board/server.js`) serves static files from `board/public/` and exposes a REST API + SSE stream. Issue parsing lives in `board/lib/issues.js`. Vanilla JS client with no build step. Light/Dark mode via CSS custom properties.

**Tech Stack:** Node.js, Express, Vanilla JS, CSS Custom Properties, HTML5 Drag & Drop, Server-Sent Events, marked (CDN)

**Spec:** `docs/superpowers/specs/2026-03-25-kanban-board-design.md`

---

## File Structure

```
board/
├── server.js              # Express app, API routes, SSE, fs.watch, browser open
├── package.json           # { "type": "module", dependencies: { "express": "^4", "open": "^10" } }
├── lib/
│   └── issues.js          # parseIssue(), parseAllIssues(), updateStatus(), toggleCheckbox(), readRaw()
└── public/
    ├── index.html          # SPA shell: toolbar + 4 column containers + modal
    ├── style.css           # CSS custom properties, light/dark, kanban grid, cards, modal
    └── app.js              # State, render, drag & drop, filter, SSE, detail modal

.claude/commands/
└── i:board.md              # Slash command wrapper
```

**Responsibilities:**

| File | Does | Does NOT |
|------|------|----------|
| `lib/issues.js` | Parse YAML frontmatter, count checkboxes, update status/checkboxes in markdown, resolve worktree path | Anything HTTP, anything browser |
| `server.js` | HTTP server, routes, SSE connections, fs.watch, open browser | Parse markdown (delegates to issues.js) |
| `public/app.js` | Render board, handle drag & drop, filter, theme toggle, SSE listener, detail modal | Serve files, parse markdown server-side |
| `public/style.css` | All visual styling, light/dark themes, layout, animations | Logic |
| `public/index.html` | DOM structure: toolbar, columns, modal shell | Styles (linked), scripts (linked) |

---

## Task 1: Project scaffold and package.json

**Files:**
- Create: `board/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "claude-issue-board",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "open": "^10.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd board && npm install`
Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 3: Add board/node_modules to .gitignore**

Append `board/node_modules/` to the project root `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add board/package.json board/package-lock.json .gitignore
git commit -m "chore: scaffold board plugin with express dependency"
```

---

## Task 2: Issue parser (`lib/issues.js`)

**Files:**
- Create: `board/lib/issues.js`

This is the core data layer. It reads `.claude/issues/*.md`, parses YAML frontmatter and checkboxes, and provides write operations for status and checkbox toggling.

- [ ] **Step 1: Create `board/lib/issues.js` with worktree resolution**

```javascript
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Resolve the issues directory from the main git worktree.
 * Falls back to cwd-based path if not in a git repo.
 */
export function resolveIssuesDir() {
  try {
    const main = execSync('git worktree list', { encoding: 'utf-8' })
      .split('\n')[0]
      .split(/\s+/)[0]
    return join(main, '.claude', 'issues')
  } catch {
    return join(process.cwd(), '.claude', 'issues')
  }
}
```

- [ ] **Step 2: Add frontmatter + checkbox parsing**

```javascript
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

/**
 * Parse a single issue markdown file.
 * Returns structured JSON with frontmatter fields, column, progress, and requirements.
 */
export function parseIssue(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const fm = parseFrontmatter(content)
  const requirements = parseRequirements(content)
  const checked = requirements.filter(r => r.checked).length

  return {
    key: fm.key || '',
    title: fm.title || '',
    status: fm.status || 'analysis',
    complexity: fm.complexity || '',
    scope: fm.scope || '',
    created: fm.created || '',
    updated: fm.updated || '',
    column: STATUS_TO_COLUMN[fm.status] || 'backlog',
    progress: { checked, total: requirements.length },
    requirements
  }
}

/**
 * Parse YAML frontmatter between --- delimiters.
 * Simple key: value parser — no external YAML library needed.
 */
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

/**
 * Parse checkbox requirements from the Anforderungen section.
 * Returns array of { index, text, checked }.
 */
function parseRequirements(content) {
  const section = content.match(/## Anforderungen\n([\s\S]*?)(?=\n## |\n*$)/)
  if (!section) return []
  const requirements = []
  let index = 0
  for (const line of section[1].split('\n')) {
    const m = line.match(/^- \[([ x])\] (.+)/)
    if (m) {
      requirements.push({ index, text: m[2].trim(), checked: m[1] === 'x' })
      index++
    }
  }
  return requirements
}
```

- [ ] **Step 3: Add parseAllIssues()**

```javascript
/**
 * Parse all issue documents in the issues directory.
 * Returns array sorted by updated date (newest first).
 */
export function parseAllIssues() {
  const dir = resolveIssuesDir()
  if (!existsSync(dir)) return []
  const files = readdirSync(dir).filter(f => f.endsWith('.md'))
  return files
    .map(f => parseIssue(join(dir, f)))
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
}
```

- [ ] **Step 4: Add updateStatus()**

```javascript
/**
 * Update the status field in an issue's frontmatter.
 * Also updates the 'updated' date to today.
 */
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
```

- [ ] **Step 5: Add toggleCheckbox()**

```javascript
/**
 * Toggle a specific checkbox in the Anforderungen section by index.
 * Updates the 'updated' date.
 */
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
```

- [ ] **Step 6: Add readRaw()**

```javascript
/**
 * Read raw markdown content of an issue (for detail view rendering).
 */
export function readRaw(key) {
  const filePath = join(resolveIssuesDir(), `${key}.md`)
  if (!existsSync(filePath)) throw new Error(`Issue not found: ${key}`)
  return readFileSync(filePath, 'utf-8')
}
```

- [ ] **Step 7: Manually test parser with a sample issue**

Create a temporary test issue in `.claude/issues/TEST-001.md`:

```yaml
---
key: TEST-001
title: Test Issue
status: analysis
complexity: Low
scope: Small (< 4h)
created: 2026-03-25
updated: 2026-03-25
---

## Anforderungen
- [ ] First requirement
- [x] Second requirement
- [ ] Third requirement

## Betroffene Bereiche
- `test/file.ts` — test

## Offene Fragen

## Entscheidungen

## Aufwandsschätzung

## Umsetzungsplan

## Erkenntnisse
```

Run: `cd board && node -e "import { parseAllIssues } from './lib/issues.js'; console.log(JSON.stringify(parseAllIssues(), null, 2))"`

Expected: JSON array with one issue, `progress: { checked: 1, total: 3 }`, `column: "backlog"`.

- [ ] **Step 8: Clean up test issue, commit**

Delete `.claude/issues/TEST-001.md`.

```bash
git add board/lib/issues.js
git commit -m "feat: add issue parser with frontmatter, checkboxes, status and checkbox write operations"
```

---

## Task 3: Express server (`server.js`)

**Files:**
- Create: `board/server.js`

- [ ] **Step 1: Create server with static serving and issue API**

```javascript
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { watch, existsSync, mkdirSync } from 'node:fs'
import express from 'express'
import open from 'open'
import {
  parseAllIssues, updateStatus, toggleCheckbox,
  readRaw, resolveIssuesDir, COLUMN_TO_STATUS
} from './lib/issues.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.BOARD_PORT || 0

app.use(express.json())
app.use(express.static(join(__dirname, 'public')))
```

- [ ] **Step 2: Add API routes**

```javascript
// GET /api/issues — all issues as JSON
app.get('/api/issues', (req, res) => {
  try {
    res.json(parseAllIssues())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/issues/:key/status — change status (drag & drop)
app.put('/api/issues/:key/status', (req, res) => {
  try {
    const { column } = req.body
    const newStatus = COLUMN_TO_STATUS[column]
    if (!newStatus) return res.status(400).json({ error: 'Invalid column' })
    updateStatus(req.params.key, newStatus)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/issues/:key/checkbox — toggle checkbox
app.put('/api/issues/:key/checkbox', (req, res) => {
  try {
    const { index, checked } = req.body
    toggleCheckbox(req.params.key, index, checked)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/issues/:key/raw — raw markdown for detail view
app.get('/api/issues/:key/raw', (req, res) => {
  try {
    res.type('text/plain').send(readRaw(req.params.key))
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})
```

- [ ] **Step 3: Add SSE endpoint and file watcher**

```javascript
// SSE — live refresh
const clients = new Set()

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  res.write('data: connected\n\n')
  clients.add(res)
  req.on('close', () => clients.delete(res))
})

function broadcast() {
  for (const client of clients) {
    client.write('data: reload\n\n')
  }
}

// Watch issues directory for changes
const issuesDir = resolveIssuesDir()
if (!existsSync(issuesDir)) mkdirSync(issuesDir, { recursive: true })

let debounceTimer
watch(issuesDir, { persistent: false }, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(broadcast, 200)
})
```

- [ ] **Step 4: Add server startup and browser open**

```javascript
const server = app.listen(PORT, () => {
  const addr = server.address()
  const url = `http://localhost:${addr.port}`
  console.log(`Issue Board running at ${url}`)
  console.log(`Watching: ${issuesDir}`)
  console.log('Press Ctrl+C to stop.')
  open(url).catch(() => {})
})
```

- [ ] **Step 5: Test server starts and responds**

Run: `cd board && node server.js &`
Then: `curl http://localhost:<port>/api/issues`
Expected: `[]` (empty array, or issues if any exist).
Kill server afterwards.

- [ ] **Step 6: Commit**

```bash
git add board/server.js
git commit -m "feat: add express server with REST API, SSE live refresh, and browser open"
```

---

## Task 4: HTML shell (`public/index.html`)

**Files:**
- Create: `board/public/index.html`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Issue Board</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <!-- Toolbar -->
  <header class="toolbar">
    <h1 class="toolbar-title">Issue Board</h1>
    <div class="toolbar-spacer"></div>
    <input type="text" id="search" class="toolbar-search" placeholder="Suche...">
    <select id="filter-complexity" class="toolbar-select">
      <option value="">Komplexität</option>
      <option value="Low">Low</option>
      <option value="Medium">Medium</option>
      <option value="High">High</option>
    </select>
    <select id="filter-scope" class="toolbar-select">
      <option value="">Scope</option>
      <option value="Small (< 4h)">Small</option>
      <option value="Medium (4-16h)">Medium</option>
      <option value="Large (> 16h)">Large</option>
    </select>
    <button id="theme-toggle" class="toolbar-theme" aria-label="Toggle theme"></button>
  </header>

  <!-- Board -->
  <main class="board">
    <section class="column" data-column="backlog">
      <div class="column-header">
        <span class="column-dot column-dot--backlog"></span>
        <span class="column-title">Backlog</span>
        <span class="column-count" data-count="backlog">0</span>
      </div>
      <div class="column-cards" data-drop="backlog"></div>
    </section>
    <section class="column" data-column="progress">
      <div class="column-header">
        <span class="column-dot column-dot--progress"></span>
        <span class="column-title">In Progress</span>
        <span class="column-count" data-count="progress">0</span>
      </div>
      <div class="column-cards" data-drop="progress"></div>
    </section>
    <section class="column" data-column="review">
      <div class="column-header">
        <span class="column-dot column-dot--review"></span>
        <span class="column-title">Review</span>
        <span class="column-count" data-count="review">0</span>
      </div>
      <div class="column-cards" data-drop="review"></div>
    </section>
    <section class="column" data-column="done">
      <div class="column-header">
        <span class="column-dot column-dot--done"></span>
        <span class="column-title">Done</span>
        <span class="column-count" data-count="done">0</span>
      </div>
      <div class="column-cards" data-drop="done"></div>
    </section>
  </main>

  <!-- Detail Modal -->
  <dialog id="detail-modal" class="modal">
    <div class="modal-header">
      <span id="modal-key" class="modal-key"></span>
      <span id="modal-title" class="modal-title"></span>
      <button id="modal-close" class="modal-close" aria-label="Close">&times;</button>
    </div>
    <div id="modal-body" class="modal-body"></div>
  </dialog>

  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add board/public/index.html
git commit -m "feat: add HTML shell with toolbar, 4-column board, and detail modal"
```

---

## Task 5: CSS styling (`public/style.css`)

**Files:**
- Create: `board/public/style.css`

- [ ] **Step 1: Create style.css with CSS custom properties for theming**

Light mode variables on `:root`, dark mode overrides on `[data-theme="dark"]`. Key tokens:

```css
:root {
  --bg: #f8f9fa;
  --surface: #fff;
  --surface-card: #f8f9fa;
  --border: #e2e5e9;
  --text: #1a1a2e;
  --text-muted: #94a3b8;
  --accent: #6366f1;
  --accent-light: #e0e7ff;
  --dot-backlog: #94a3b8;
  --dot-progress: #6366f1;
  --dot-review: #f59e0b;
  --dot-done: #10b981;
  --badge-low-bg: #dcfce7; --badge-low-text: #166534;
  --badge-med-bg: #fef3c7; --badge-med-text: #92400e;
  --badge-high-bg: #fee2e2; --badge-high-text: #991b1b;
  --progress-track: #e2e5e9;
  --progress-fill: #6366f1;
  --modal-backdrop: rgba(0,0,0,0.3);
}

[data-theme="dark"] {
  --bg: #0f1117;
  --surface: #1a1b2e;
  --surface-card: #0f1117;
  --border: #2a2b3d;
  --text: #e2e5e9;
  --text-muted: #64748b;
  --accent: #818cf8;
  --accent-light: #1e1b4b;
  --dot-backlog: #64748b;
  --badge-low-bg: #052e16; --badge-low-text: #6ee7b7;
  --badge-med-bg: #422006; --badge-med-text: #fbbf24;
  --badge-high-bg: #450a0a; --badge-high-text: #fca5a5;
  --progress-track: #2a2b3d;
  --progress-fill: #818cf8;
  --modal-backdrop: rgba(0,0,0,0.6);
}
```

- [ ] **Step 2: Add base reset, toolbar, board grid, column, and card styles**

Implement all layout CSS. Key structural rules:

- `body`: `background: var(--bg); color: var(--text); font-family: -apple-system, ...`
- `.toolbar`: flex row, sticky top, `background: var(--surface)`, border bottom
- `.board`: `display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px;`
- `.column`: `background: var(--surface); border-radius: 8px; border: 1px solid var(--border);`
- `.card`: `background: var(--surface-card); border-radius: 6px; padding: 10px; cursor: grab;`
- `.card[data-column="done"]`: `opacity: 0.7;`
- `.column-cards`: `min-height: 60px;` (drop target)
- Drag state: `.card.dragging { opacity: 0.5; }`, `.column-cards.drag-over { outline: 2px dashed var(--accent); }`

- [ ] **Step 3: Add badge, progress bar, modal, and theme toggle styles**

- `.badge`: small rounded label with complexity-specific colors via `data-complexity` attribute
- `.progress-bar`: 40px wide, 4px tall, rounded, track + fill
- `.modal` (`<dialog>`): centered, max-width 700px, backdrop blur, scrollable body
- `.toolbar-theme`: 20px circle, `var(--text)` background, toggles icon via CSS

- [ ] **Step 4: Test visually — start server, open browser**

Run: `cd board && node server.js`
Expected: Board loads with 4 empty columns, toolbar visible, theme toggle works (even without JS logic yet — just CSS).

- [ ] **Step 5: Commit**

```bash
git add board/public/style.css
git commit -m "feat: add complete CSS with light/dark mode, kanban layout, cards, and modal"
```

---

## Task 6: Client JavaScript (`public/app.js`)

**Files:**
- Create: `board/public/app.js`

This is the largest file. Build incrementally: state + render first, then interactions.

- [ ] **Step 1: Create app.js with state management and initial fetch**

```javascript
/* global marked */

const state = {
  issues: [],
  filter: { search: '', complexity: '', scope: '' },
  theme: localStorage.getItem('board-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

// Apply saved theme immediately
document.documentElement.dataset.theme = state.theme

async function fetchIssues() {
  const res = await fetch('/api/issues')
  state.issues = await res.json()
  render()
}

fetchIssues()
```

- [ ] **Step 2: Add render function**

```javascript
const COLUMNS = ['backlog', 'progress', 'review', 'done']

function render() {
  const filtered = state.issues.filter(issue => {
    const { search, complexity, scope } = state.filter
    if (search && !issue.key.toLowerCase().includes(search) &&
        !issue.title.toLowerCase().includes(search)) return false
    if (complexity && issue.complexity !== complexity) return false
    if (scope && issue.scope !== scope) return false
    return true
  })

  for (const col of COLUMNS) {
    const container = document.querySelector(`[data-drop="${col}"]`)
    const issues = filtered.filter(i => i.column === col)
    container.innerHTML = issues.map(cardHTML).join('')
    document.querySelector(`[data-count="${col}"]`).textContent = issues.length
  }
}

function cardHTML(issue) {
  const pct = issue.progress.total > 0
    ? Math.round((issue.progress.checked / issue.progress.total) * 100)
    : 0
  return `
    <div class="card" draggable="true" data-key="${issue.key}" data-column="${issue.column}">
      <div class="card-key">${issue.key}</div>
      <div class="card-title">${issue.title}</div>
      <div class="card-footer">
        <span class="badge" data-complexity="${issue.complexity}">${issue.complexity}</span>
        <div class="progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="progress-text">${issue.progress.checked}/${issue.progress.total}</span>
        </div>
      </div>
    </div>
  `
}
```

- [ ] **Step 3: Add filter and theme toggle event listeners**

```javascript
document.getElementById('search').addEventListener('input', e => {
  state.filter.search = e.target.value.toLowerCase()
  render()
})

document.getElementById('filter-complexity').addEventListener('change', e => {
  state.filter.complexity = e.target.value
  render()
})

document.getElementById('filter-scope').addEventListener('change', e => {
  state.filter.scope = e.target.value
  render()
})

document.getElementById('theme-toggle').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light'
  document.documentElement.dataset.theme = state.theme
  localStorage.setItem('board-theme', state.theme)
})
```

- [ ] **Step 4: Test render — start server with test issues**

Create 2-3 test issues in `.claude/issues/`, start server, verify cards appear in correct columns, filter works, theme toggles.

- [ ] **Step 5: Add drag & drop**

```javascript
document.addEventListener('dragstart', e => {
  const card = e.target.closest('.card')
  if (!card) return
  card.classList.add('dragging')
  e.dataTransfer.setData('text/plain', card.dataset.key)
  e.dataTransfer.effectAllowed = 'move'
})

document.addEventListener('dragend', e => {
  const card = e.target.closest('.card')
  if (card) card.classList.remove('dragging')
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
})

for (const drop of document.querySelectorAll('[data-drop]')) {
  drop.addEventListener('dragover', e => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    drop.classList.add('drag-over')
  })

  drop.addEventListener('dragleave', () => {
    drop.classList.remove('drag-over')
  })

  drop.addEventListener('drop', async e => {
    e.preventDefault()
    drop.classList.remove('drag-over')
    const key = e.dataTransfer.getData('text/plain')
    const column = drop.dataset.drop

    // Optimistic update
    const issue = state.issues.find(i => i.key === key)
    if (!issue || issue.column === column) return
    const prevColumn = issue.column
    const prevStatus = issue.status
    issue.column = column
    render()

    try {
      const res = await fetch(`/api/issues/${key}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column })
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      // Rollback
      issue.column = prevColumn
      issue.status = prevStatus
      render()
    }
  })
}
```

- [ ] **Step 6: Test drag & drop**

Start server, drag a card between columns. Verify:
- Card moves visually on drop
- Issue file's `status` field is updated
- `updated` date is set to today

- [ ] **Step 7: Add detail modal**

```javascript
const modal = document.getElementById('detail-modal')
const modalKey = document.getElementById('modal-key')
const modalTitle = document.getElementById('modal-title')
const modalBody = document.getElementById('modal-body')

document.addEventListener('click', async e => {
  const card = e.target.closest('.card')
  if (!card || e.target.closest('.badge')) return

  const key = card.dataset.key
  const issue = state.issues.find(i => i.key === key)
  if (!issue) return

  modalKey.textContent = issue.key
  modalTitle.textContent = issue.title
  modalBody.innerHTML = '<p class="loading">Laden...</p>'
  modal.showModal()

  const res = await fetch(`/api/issues/${key}/raw`)
  const md = await res.text()

  // Strip frontmatter for display
  const body = md.replace(/^---\n[\s\S]*?\n---\n*/, '')
  modalBody.innerHTML = marked.parse(body)

  // Make checkboxes interactive
  const checkboxes = modalBody.querySelectorAll('input[type="checkbox"]')
  checkboxes.forEach((cb, idx) => {
    cb.disabled = false
    cb.dataset.index = idx
    cb.addEventListener('change', async () => {
      await fetch(`/api/issues/${key}/checkbox`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: idx, checked: cb.checked })
      })
    })
  })
})

document.getElementById('modal-close').addEventListener('click', () => modal.close())
modal.addEventListener('click', e => { if (e.target === modal) modal.close() })
```

- [ ] **Step 8: Test detail modal**

Click a card → modal opens with rendered markdown. Toggle a checkbox → verify the `.md` file is updated. Close modal with X or backdrop click.

- [ ] **Step 9: Add SSE live refresh**

```javascript
function connectSSE() {
  const es = new EventSource('/events')
  es.onmessage = (e) => {
    if (e.data === 'reload') fetchIssues()
  }
  es.onerror = () => {
    es.close()
    setTimeout(connectSSE, 3000)
  }
}

connectSSE()
```

- [ ] **Step 10: Test live refresh**

With board open in browser, manually edit an issue file. Verify board updates automatically within ~1 second.

- [ ] **Step 11: Commit**

```bash
git add board/public/app.js
git commit -m "feat: add client JS with render, drag & drop, filters, detail modal, and SSE refresh"
```

---

## Task 7: Slash command (`i:board.md`)

**Files:**
- Create: `.claude/commands/i:board.md`

- [ ] **Step 1: Create the slash command**

```markdown
# i:board

Open the Kanban board in the browser.

## Workflow

1. Resolve the board directory:
   - Check `~/.claude/board/server.js` (installed via symlink)
   - Fallback: check `board/server.js` relative to the repo root

2. Start the server:
   ```bash
   node <board-dir>/server.js
   ```

3. The server opens the browser automatically and prints the URL.

4. Tell the user: `Board gestartet. Zum Beenden Ctrl+C im Terminal drücken.`

## Rules

- Server runs in the foreground — user stops it with Ctrl+C
- If already running (port in use), inform the user and open the URL
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/i:board.md
git commit -m "feat: add /i:board slash command"
```

---

## Task 8: Installation integration

**Files:**
- Modify: `install.sh`
- Modify: `uninstall.sh`

- [ ] **Step 1: Update install.sh to symlink board directory and command**

After the existing skills section, add:

```bash
# Board
ln -sfn "$SCRIPT_DIR/board" "$CLAUDE_DIR/board"
echo "  Linked board: board/"

# Install board dependencies if needed
if [ ! -d "$SCRIPT_DIR/board/node_modules" ]; then
  echo "  Installing board dependencies..."
  (cd "$SCRIPT_DIR/board" && npm install --silent)
fi
```

Also update the final echo to include `/i:board`.

- [ ] **Step 2: Update uninstall.sh to remove board symlink**

After the skills section, add:

```bash
# Board
target="$CLAUDE_DIR/board"
if [ -L "$target" ]; then
  rm "$target"
  echo "  Removed board: board/"
fi
```

- [ ] **Step 3: Test installation**

Run: `./install.sh`
Expected: Board symlinked, dependencies installed, all commands listed.

Run: `./uninstall.sh`
Expected: Board symlink removed.

- [ ] **Step 4: Commit**

```bash
git add install.sh uninstall.sh
git commit -m "feat: integrate board plugin into install/uninstall scripts"
```

---

## Task 9: Update project documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update CLAUDE.md**

Add `i:board.md` to the commands table. Add `board/` to the repository structure. Update the echo output in the commands section.

- [ ] **Step 2: Update README.md**

Add board section explaining usage: `node board/server.js` or `/i:board`, features overview, screenshot placeholder.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: add board plugin to project documentation"
```

---

## Task 10: End-to-end smoke test

- [ ] **Step 1: Run full integration test**

1. Create 3 test issues with different statuses in `.claude/issues/`
2. Run `node board/server.js`
3. Verify in browser:
   - Cards appear in correct columns
   - Drag & drop changes status (check file)
   - Detail modal opens and renders markdown
   - Checkbox toggling writes back to file
   - Search filters cards
   - Complexity/scope dropdowns filter
   - Theme toggle switches light/dark
   - Edit a file externally → board auto-refreshes
4. Stop server with Ctrl+C

- [ ] **Step 2: Clean up test issues**

Delete test issues from `.claude/issues/`.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke test"
```
