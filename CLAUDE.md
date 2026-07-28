# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local issue tracker for Claude Code — Jira-integrated, Markdown-based. Structures requirements, tracks progress, and verifies completion through a defined lifecycle.

**This repo is the tooling itself, not a project that uses it.** It ships slash commands (prompt specs), one skill, and a Kanban board web UI. `install.sh` symlinks the commands and skill into `~/.claude/` and `npm link`s the board binary, so **editing a file here changes behavior globally in every project immediately** — no reinstall needed (except when adding/removing a command file, which needs a new symlink).

## Layout

```
.claude/commands/i:*.md              # slash commands — prompt specs, not code
.claude/skills/i-issue-management/   # SKILL.md — single source of truth for format & lifecycle
.claude/issues/                      # local test fixtures (TEST-001..003), gitignored
board/server.js                      # Express API + SSE, opens browser on start
board/lib/issues.js                  # the only code that parses/writes issue Markdown
board/public/                        # vanilla JS frontend (app.js, style.css, index.html)
install.sh / uninstall.sh            # symlink commands+skill, npm link the board
```

Command filenames contain a literal colon (`i:board.md` → `/i:board`); it is not a directory namespace.

## Board Development

```bash
cd board && npm install
PROJECT_DIR=/path/to/some/project node server.js   # or `issue-board` after install.sh
BOARD_PORT=3000 node server.js                     # default port is 0 → random free port
```

- `PROJECT_DIR` decides which project's `.claude/issues/` is served; it defaults to `process.cwd()`. Without it you'll be editing this repo's own TEST fixtures.
- `/i:board` starts the server backgrounded and reuses a running instance (`pgrep -f issue-board`); `/i:board stop` kills it.
- There is no test suite, linter, or build step. Verify board changes by running the server against the TEST fixtures and exercising the UI.
- Live refresh: `fs.watch` on the issues dir → debounced SSE `reload` on `/events`. Changes made by Claude commands appear in the browser without a manual reload.

## Architecture

External access is centralized in the skill's **„Datenquellen & CLIs"** chapter — CLI preflight, the `jira issue view --raw` + jq snippets, attachment download, Confluence reads, and write-back rules all live there. Commands reference it instead of restating it; add new external access there, not in a command.

| CLI | Role |
|-----|------|
| `jira-cli` | Primary. `--raw` is the important path: it exposes `attachment[]`, `issuelinks`, `subtasks`, `parent`, `status` and the ADF description that `--plain` throws away. |
| `confluence-cli` | Optional, read-only. Reads pages linked from a ticket (`read --format markdown`, `search --cql`). |
| `acli` (official) | **Not** an alternative — its command set covers only `admin`, `feedback`, `jira`, `rovodev`. No Confluence. |
| Atlassian Remote MCP | Viable but not used: costlier in context, not deterministically pipeable, unavailable in headless runs. |

Writes to Jira (`comment add`, `issue move`) always require explicit user confirmation and never happen as a side effect of a reading command.

The issue document format is consumed by **two independent implementations** that must stay in sync:

1. **Commands + skill (prose)** — Claude reads/writes the Markdown by following `SKILL.md`.
2. **`board/lib/issues.js` (regex)** — parses frontmatter, the `## Anforderungen` checkbox list, and legacy formats; writes back via targeted line replacement.

Consequence: **changing the format is a three-file change** — `SKILL.md` (spec), `board/lib/issues.js` (parser/writer), and `i:migrate.md` (upgrade path for existing documents, including its section-alias table). Missing one silently degrades one half of the system.

Other cross-cutting details:

- **5 statuses map onto 4 board columns** (`STATUS_TO_COLUMN` / `COLUMN_TO_STATUS` in `board/lib/issues.js`). `analysis` and `estimated` both render in *backlog*, and dragging back into backlog writes `analysis` — the `estimated` distinction is lost by design.
- **Progress is derived, never stored.** Checkbox counts in `## Anforderungen` are the single source of truth for both `/i:list` and the board.
- **`jira_synced` is the Jira comment cutoff** and must only move on an actual Jira fetch. `updated` is day-accurate and also moves on local edits, so using it for the delta drops same-day comments. The board's `updateStatus`/`toggleCheckbox` rewrite only `status`/`updated` — keep it that way.
- **Legacy tolerance is deliberate.** `parseLegacyHeader` and the section-alias table exist so pre-frontmatter issues (H1 keys, `**Status:**` lines, status tables) still render instead of erroring. Keep new writes canonical; only reads are lenient.
- **Worktree resolution is duplicated** — `git worktree list | head -1` in both the command prose and `resolveIssuesDir()`. Issue documents always live in the main worktree.
- Commands are self-contained prompts that delegate shared rules to the skill rather than restating them. The skill sets `disable-model-invocation: true`, so it loads only when a command references it.

## Issue Document Lifecycle

```
i:new  ──>  i:estimate (optional)  ──>  Implementation  ──>  i:close
              │                              │
              │                     i:update / i:resume (as needed)
              └──────────────────────────────┘
```

| Status | Set by |
|--------|--------|
| `analysis` | i:new |
| `estimated` | i:estimate |
| `in-progress` | i:new (after plan confirmation) |
| `in-review` | manual or i:close (partial) |
| `done` | i:close |

Full frontmatter schema, section conventions, breadcrumb format, and note classification: see `.claude/skills/i-issue-management/SKILL.md`.

## Commands

| Command | Purpose |
|---------|---------|
| `/i:new <issue> [description]` | Requirements intake — raw Jira fetch, attachments, linked Confluence pages, parent/epic context, codebase analysis |
| `/i:estimate <issue>` | Effort estimation (German, wiki markup) — optionally posted as a Jira comment |
| `/i:update <issue> <info> [--jira]` | Add findings or requirements; without info it pulls new Jira comments. `--jira` posts back. |
| `/i:close <issue>` | Definition of Done check against the codebase — optionally transitions the Jira ticket |
| `/i:list` | List all issue documents with status and progress |
| `/i:resume <issue> [checkpoint]` | Show status, or save a breadcrumb checkpoint |
| `/i:migrate` | Migrate existing issues to the current format |
| `/i:board [stop]` | Open / stop the Kanban board |

## Key Conventions

- **German output** — issue documents, confirmations, and estimations are in German. Command specs and code stay in English.
- **Append-only** — existing content is never overwritten, only extended (except checkbox status and frontmatter).
- **No implementation before confirmation** — every decision point waits for user input.
- **No invention** — when information is insufficient, ask rather than inferring scope.
- **`.claude/issues/` is never committed** — local working documents plus downloaded `attachments/`, gitignored here and in consuming projects.
- **Credentials via `~/.netrc`** — attachment downloads use `curl --netrc`, so no token appears in command lines, environment, or config. Never read the keychain or inline a token.
- When editing a command, keep changes consistent with the other seven; they share tone, section structure (`Arguments` / `Workflow` / `Rules`), and defer format details to the skill.
