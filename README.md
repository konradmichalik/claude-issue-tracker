# claude-issue-tracker

Local issue tracker for [Claude Code](https://claude.ai/code) — Jira-integrated, Markdown-based.

Structures requirements from Jira tickets into testable checklists, tracks implementation progress, and verifies completion against the codebase. All data stays local in `.claude/issues/`.

## Commands

| Command | What it does |
|---------|-------------|
| `/i:new <issue>` | Fetches a Jira ticket including attachments, linked Confluence pages, and parent/epic context, analyzes the codebase, and creates a structured issue document |
| `/i:estimate <issue>` | Creates an effort estimation in Jira wiki markup — optionally posts it as a comment |
| `/i:update <issue> <info>` | Adds findings, test feedback, new requirements, or decisions to an existing issue. Without arguments it pulls new Jira comments; with `--jira` it posts back |
| `/i:close <issue>` | Checks every requirement against the codebase, reports what's done, partial, or missing, and optionally transitions the Jira ticket |
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
- [jira-cli](https://github.com/ankitpokhrel/jira-cli) — automatic ticket fetching, comment sync, and write-back. Without it, ticket content has to be pasted manually.
- [confluence-cli](https://github.com/pchuri/confluence-cli) (optional) — reads Confluence pages linked from a ticket. Configure with `confluence init`; `export CONFLUENCE_READ_ONLY=true` is recommended, since nothing here ever writes to Confluence.
- [md-annotator](https://www.npmjs.com/package/md-annotator) (optional) — browser review of the issue document in `/i:new`. Skipped when not installed.
- Node.js — for the Kanban board.

### Attachment download (`~/.netrc`)

`/i:new` downloads images and PDFs from a ticket so they can actually be evaluated as requirements. Authentication goes through `~/.netrc`, which keeps the API token out of command lines, environment variables, and config files:

```
machine your-site.atlassian.net
  login you@example.com
  password <atlassian-api-token>
```

```bash
chmod 600 ~/.netrc
```

Without this entry, attachments are listed but not downloaded, and you'll be asked to paste images into the chat instead.

## How it works

Issue documents are Markdown files stored in `.claude/issues/<ISSUE-KEY>.md` within your project. They are **not committed to git** — they're local working documents that persist between Claude Code sessions.

Each document has:
- **Frontmatter** with status, dates, complexity, and the `jira_synced` timestamp
- **Anforderungen** (requirements) as checkboxes — the single source of truth for progress
- **Betroffene Bereiche** (affected areas) with file paths
- **Entscheidungen** (decisions) with dates and reasoning
- **Erkenntnisse** (findings) added during implementation
- **Quellen** (sources) — ticket, parent, Confluence pages with version, attachment paths

Downloaded attachments live next to the documents in `.claude/issues/attachments/<ISSUE-KEY>/` and are equally local-only.

## License

MIT
