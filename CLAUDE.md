# CLAUDE.md

## Project Overview

Local issue tracker for Claude Code — Jira-integrated, Markdown-based. Structures requirements, tracks progress, and verifies completion through a defined lifecycle.

## Repository Structure

```
.claude/
├── commands/
│   ├── i:new.md        # Requirements intake
│   ├── i:estimate.md   # Effort estimation
│   ├── i:update.md     # Add information to issues (syncs to Jira)
│   ├── i:close.md      # Definition of Done check
│   ├── i:list.md       # List all issues
│   ├── i:resume.md     # Session checkpoint with status display
│   ├── i:migrate.md    # Migrate issues to current format
│   └── i:board.md      # Open Kanban board
├── skills/
│   └── i-issue-management/
│       └── skill.md    # Shared format, lifecycle, conventions
└── board/              # Kanban board web UI (Express + Vanilla JS)
    ├── server.js
    ├── lib/issues.js
    └── public/
```

## Commands

| Command | Purpose |
|---------|---------|
| `/i:new <issue> [description]` | Requirements intake — gather info (via jira-cli or manual), assess scope, persist as issue document |
| `/i:estimate <issue>` | Effort estimation — reads issue document, outputs Jira comment (German) |
| `/i:update <issue> <info>` | Add information to issue document (findings, test feedback, new requirements) — syncs to Jira |
| `/i:close <issue>` | Definition of Done check — verify requirements against codebase |
| `/i:list` | List all local issue documents with status and progress |
| `/i:resume <issue>` | Restore session context with status display — survives context compression and session restarts |
| `/i:migrate` | Migrate existing issues to current format — adds missing fields and sections |
| `/i:board` | Open Kanban board in browser — visualize issues, drag & drop status, filter, detail view |

## Issue Document Lifecycle

```
i:new  ──>  i:estimate (optional)  ──>  Implementation  ──>  i:close
              │                              │
              │                     i:update / i:resume (as needed)
              │                              │
              └──────────────────────────────┘
```

| Status | Set by |
|--------|--------|
| `analysis` | i:new |
| `estimated` | i:estimate |
| `in-progress` | i:new (after plan confirmation) |
| `in-review` | manual or i:close (partial) |
| `done` | i:close |

## Issue Document Format

Documents are stored in `.claude/issues/<ISSUE-KEY>.md` (project-local, not committed to git). They persist between sessions and serve as the single source of truth for ticket requirements, decisions, and progress.

See `i-issue-management` skill for the full format specification.

## Key Conventions

- **German output** — issue documents, confirmations, and estimations are in German
- **Jira wiki markup** — effort estimations are formatted for direct Jira commenting
- **Worktree-safe** — issue documents resolve to the main worktree, not the current directory
- **Append-only** — existing content is never overwritten, only extended (except checkbox status and frontmatter)
- **No implementation before confirmation** — every decision point waits for user input
