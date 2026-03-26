# claude-issue-tracker

Local issue tracker for [Claude Code](https://claude.ai/code) — Jira-integrated, Markdown-based.

Structures requirements from Jira tickets into testable checklists, tracks implementation progress, and verifies completion against the codebase. All data stays local in `.claude/issues/`.

## Commands

| Command | What it does |
|---------|-------------|
| `/i:new <issue>` | Fetches a Jira ticket (or takes manual input), analyzes the codebase, and creates a structured issue document with requirements, affected areas, and an implementation plan |
| `/i:estimate <issue>` | Creates an effort estimation in Jira wiki markup, ready to paste as a comment |
| `/i:update <issue> <info>` | Adds findings, test feedback, new requirements, or decisions to an existing issue — syncs to Jira |
| `/i:close <issue>` | Checks every requirement against the codebase and reports what's done, partial, or missing |
| `/i:list` | Shows all local issues in a table with status and progress bars |
| `/i:resume <issue>` | Restores session context with status display — survives context compression and session restarts |
| `/i:migrate` | Migrates existing issues to the current format — adds missing fields and sections |
| `/i:board` | Opens the Kanban board in the browser |

## Lifecycle

```
i:new  ──>  i:estimate (optional)  ──>  Implementation  ──>  i:close
                                              │
                                     i:update / i:resume (as needed)
```

1. **`/i:new PROJ-123`** — Intake: fetches ticket via `jira-cli`, structures requirements, assesses scope
2. **`/i:estimate PROJ-123`** — Estimation: breaks down into tasks with hour estimates (German, Jira markup)
3. **Implement** — Work on the ticket, add updates with `/i:update` as you go
4. **`/i:close PROJ-123`** — Verify: checks each requirement against the code with file references

## Kanban Board

Visualize and manage issues with an interactive web UI. Start with `/i:board` or run `node board/server.js` to open the board in your browser.

**Features:**
- 4-column Kanban layout (Backlog, In Progress, Review, Done)
- Drag and drop to change status
- Detail view with full issue information
- Checkbox toggling from the board
- Filter and search across issues
- Light and dark mode toggle
- Live refresh to see updates across sessions

Requires Node.js and Express.

## Installation

```bash
git clone git@github.com:konradmichalik/claude-issue-tracker.git
cd claude-issue-tracker
./install.sh
```

This symlinks commands and skills into `~/.claude/` so they're available globally.

To remove:

```bash
./uninstall.sh
```

## Requirements

- [Claude Code](https://claude.ai/code)
- [jira-cli](https://github.com/ankitpokhrel/jira-cli) (optional — for automatic ticket fetching)

## How it works

Issue documents are Markdown files stored in `.claude/issues/<ISSUE-KEY>.md` within your project. They are **not committed to git** — they're local working documents that persist between Claude Code sessions.

Each document has:
- **Frontmatter** with status, dates, and complexity
- **Anforderungen** (requirements) as checkboxes — the single source of truth for progress
- **Betroffene Bereiche** (affected areas) with file paths
- **Entscheidungen** (decisions) with dates and reasoning
- **Erkenntnisse** (findings) added during implementation

## License

MIT
