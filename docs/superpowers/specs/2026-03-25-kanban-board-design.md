# Kanban Board Plugin — Design Spec

## Overview

A browser-based Kanban board that visualizes local issue documents (`.claude/issues/*.md`) with full interactivity: drag & drop status changes, detail views, checkbox toggling, filtering, and live refresh.

## Architecture

**Stack**: Express.js server, Vanilla JS/CSS client, no build step.

**Structure**:

```
board/
├── server.js          # Express server, API routes, SSE, file watcher
├── public/
│   ├── index.html     # SPA shell
│   ├── style.css      # Light/Dark mode, Kanban layout
│   └── app.js         # Client logic: drag & drop, filter, SSE, detail view
├── lib/
│   └── issues.js      # Issue parsing (YAML frontmatter + checkboxes), read/write
└── package.json       # Only express as dependency
```

**Entry points**:

- CLI: `node board/server.js` (standalone)
- Claude Code: `/i:board` slash command (wrapper)

**Installation**: `install.sh` symlinks `board/` to `~/.claude/board/` and the command to `~/.claude/commands/`.

**Worktree safety**: Issues directory resolved via `git worktree list | head -1`, same as existing commands.

## Kanban Columns

4 columns with status mapping:

| Column | Statuses | Dot Color |
|--------|----------|-----------|
| Backlog | `analysis`, `estimated` | gray (#94a3b8) |
| In Progress | `in-progress` | indigo (#6366f1) |
| Review | `in-review` | amber (#f59e0b) |
| Done | `done` | green (#10b981) |

Default status when dropping into a column:

- Backlog → `analysis`
- In Progress → `in-progress`
- Review → `in-review`
- Done → `done`

## API Design

```
GET  /                          → public/index.html
GET  /api/issues                → All issues as JSON
PUT  /api/issues/:key/status    → Change status (drag & drop)
PUT  /api/issues/:key/checkbox  → Toggle checkbox (index + checked)
GET  /api/issues/:key/raw       → Raw markdown for detail view
GET  /events                    → SSE stream for live refresh
```

### Issue JSON format

```json
{
  "key": "VBDI-255",
  "title": "Login-Seite responsive machen",
  "status": "in-progress",
  "complexity": "Medium",
  "scope": "Small (< 4h)",
  "created": "2026-03-20",
  "updated": "2026-03-24",
  "column": "progress",
  "progress": { "checked": 3, "total": 5 },
  "requirements": [
    { "index": 0, "text": "Breakpoints für Mobile", "checked": true },
    { "index": 1, "text": "Tablet-Ansicht testen", "checked": false }
  ]
}
```

### Live Refresh

`fs.watch()` on issues directory. On change, send SSE event `data: reload`. Client reconnects via `EventSource('/events')` and re-fetches `/api/issues`.

## Client Architecture

Single `app.js` file, no framework.

**State**: Central `state` object with `issues`, `filter`, `theme`. Mutations trigger re-render of affected columns.

**Drag & Drop**: Native HTML5 API (`draggable`, `dragover`, `drop`). Optimistic UI update + `PUT /api/issues/:key/status`. Rollback on error.

**Detail View**: Click on card opens modal overlay. Fetches raw markdown via `/api/issues/:key/raw`, renders client-side with `marked` (CDN). Checkboxes clickable → `PUT /api/issues/:key/checkbox`.

**Filter/Search**: Toolbar with text search (key + title), complexity dropdown, scope dropdown. Purely client-side filtering on loaded state.

**Theme Toggle**: Button in toolbar. Sets `data-theme="dark"` on `<html>`, persists in `localStorage`. Default follows `prefers-color-scheme`.

## Visual Design

Minimalist, modern, responsive.

**Color palette**:

- Accent: Indigo (#6366f1 light, #818cf8 dark)
- Complexity badges: Low (green), Medium (amber), High (red)
- Column dots: gray → indigo → amber → green
- Progress bars: indigo fill, muted track

**Card anatomy**:

- Issue key (indigo, small, bold)
- Title (1-2 lines)
- Complexity badge + progress bar with count

**Light mode**: White columns (#fff) on light gray background (#f8f9fa), subtle borders (#e2e5e9).

**Dark mode**: Dark blue columns (#1a1b2e) on near-black background (#0f1117), muted borders (#2a2b3d).

**Done cards**: Reduced opacity (0.7).

**Theme switching**: CSS custom properties on `:root` and `[data-theme="dark"]`, no duplicate rules.

## Dependencies

- `express` (server)
- `marked` (CDN, client-side markdown rendering for detail view)
- No build tools, no bundler, no transpiler

## Out of Scope

- Issue creation/deletion from the board
- Jira sync from the board
- Multi-user/auth
- Persistent board settings beyond theme preference
