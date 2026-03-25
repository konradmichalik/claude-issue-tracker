# CLAUDE.md

## Project Overview

Local issue tracker for Claude Code — Jira-integrated, Markdown-based. Structures requirements, tracks progress, and verifies completion through a defined lifecycle.

## Repository Structure

```
.claude/
├── commands/
│   ├── i:req.md        # Requirements intake
│   ├── i:aws.md        # Effort estimation
│   ├── i:note.md       # Add information to issues
│   ├── i:dod.md        # Definition of Done check
│   ├── i:issues.md     # List all issues
│   └── i:breadcrumb.md # Session checkpoint
└── skills/
    └── i-issue-management/
        └── skill.md    # Shared format, lifecycle, conventions
```

## Commands

| Command | Purpose |
|---------|---------|
| `/i:req <issue> [description]` | Requirements intake — gather info (via jira-cli or manual), assess scope, persist as issue document |
| `/i:aws <issue>` | Effort estimation — reads issue document, outputs Jira comment (German) |
| `/i:note <issue> <info>` | Add information to issue document (findings, test feedback, new requirements) |
| `/i:dod <issue>` | Definition of Done check — verify requirements against codebase |
| `/i:issues` | List all local issue documents with status and progress |
| `/i:breadcrumb <issue> [checkpoint]` | Save session checkpoint — survives context compression and session restarts |

## Issue Document Lifecycle

```
i:req  ──>  i:aws (optional)  ──>  Implementation  ──>  i:dod
              │                          │
              │                     i:note / i:breadcrumb (as needed)
              │                          │
              └──────────────────────────┘
```

| Status | Set by |
|--------|--------|
| `analysis` | i:req |
| `estimated` | i:aws |
| `in-progress` | i:req (after plan confirmation) |
| `in-review` | manual or i:dod (partial) |
| `done` | i:dod |

## Issue Document Format

Documents are stored in `.claude/issues/<ISSUE-KEY>.md` (project-local, not committed to git). They persist between sessions and serve as the single source of truth for ticket requirements, decisions, and progress.

See `i-issue-management` skill for the full format specification.

## Key Conventions

- **German output** — issue documents, confirmations, and estimations are in German
- **Jira wiki markup** — effort estimations are formatted for direct Jira commenting
- **Worktree-safe** — issue documents resolve to the main worktree, not the current directory
- **Append-only** — existing content is never overwritten, only extended (except checkbox status and frontmatter)
- **No implementation before confirmation** — every decision point waits for user input
