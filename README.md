# claude-issue-tracker

Local, tracker-agnostic issue tracking for [Claude Code](https://claude.ai/code) — Jira, GitHub, Redmine, or no tracker at all, Markdown-based.

Structures a ticket (or a free-text topic with none) into a testable requirements list, investigates the codebase via subagents, tracks findings and decisions as work progresses, and posts consistently formatted status updates back. All data stays local in `.issues/`.

## Commands

| Command | What it does |
|---|---|
| `/i:new <ref> [text]` | Resolves the reference to a tracker (or none), fetches the ticket, downloads and reads attachments, follows linked Confluence pages, investigates the codebase via four subagents, and creates a structured issue document. Creates the working branch on confirmation. |
| `/i:update [ref] [text]` | With text: classifies and files a finding, bug, or decision. Without text: syncs against the tracker and reports only what changed since the last sync — no re-fetch, no guessing. |
| `/i:report [ref] [text]` | Builds a short, template-based status update from checked/unchecked requirements (plus recent decisions), shows it for confirmation, then posts it to the tracker. |
| `/i:note [text]` | Saves a session breadcrumb to the active issue — survives context compression and session restarts. |

A `SessionStart` hook shows the active issue's compact status (title, requirements checked/total, summary, open questions, last breadcrumb) at the start of every session — no command needed to see where you left off. A `Stop` hook nudges once, at most, if you're about to end a session with uncommitted changes and nothing recorded in `Erkenntnisse` for today; write one with `/i:note` and it won't ask again.

`bin/i list` shows every local issue in a table (status, tracker, requirements checked/total, last updated) — no model turn needed, just a terminal command.

## Ref resolution

One input form for everything:

| Input | Tracker | File |
|---|---|---|
| (empty) | — | active issue: branch → `branch:` field → newest `in-progress` |
| `VHWWEB-312` | Jira | `VHWWEB-312.md` |
| `https://…atlassian.net/browse/X-1` | Jira | `X-1.md` |
| `https://github.com/o/r/issues/9` | GitHub | `GH-9.md` |
| `22` | GitHub, resolved via the `origin` remote | `GH-22.md` |
| `https://forge.typo3.org/issues/110434` | Redmine | `RM-110434.md` |
| free text | none — a regular, first-class case | `<slug>.md` |

## Lifecycle

```
i:new  ──>  Implementation  ──>  done
              │        │
    i:update (delta)   i:report (status update)
              │        │
              └────────┘
```

| Status | Meaning |
|---|---|
| `analysis` | Requirements captured, implementation not yet confirmed |
| `in-progress` | Implementation under way |
| `in-review` | Code review / QA |
| `done` | All requirements met |

## Installation

```bash
git clone git@github.com:konradmichalik/claude-issue-tracker.git
cd claude-issue-tracker
./install.sh
```

This registers the repo as a local Claude Code marketplace and installs the `i` plugin at `--scope user` — global, every project on this machine. `bin/i` needs no separate install step; commands and hooks call it via `${CLAUDE_PLUGIN_ROOT}/bin/i`. Restart Claude Code (or start a new session) afterward for `/i:new` etc. and the hooks to take effect. Verify with `claude plugin list`.

`install.sh` runs exactly two commands, verified against Claude Code 2.1.263 — worth knowing if you'd rather run them yourself, or if the CLI's flags change:

```bash
claude plugin marketplace add ./            # note the "./" — a bare "." is rejected
claude plugin install i@issue-tracker --scope user -y
```

To remove: `./uninstall.sh` (or `claude plugin uninstall i@issue-tracker` + `claude plugin marketplace remove issue-tracker`). Your `.issues/` documents are untouched either way — this only removes the plugin registration.

### Migrating from the pre-plugin version

If you used the earlier symlink-based version (a different `install.sh` than the one above, since removed), issue documents live in `.claude/issues/` and predate the current frontmatter schema. Move them once:

```bash
node bin/i migrate-once --scan ~/path/to/your/projects        # dry-run — shows the plan
node bin/i migrate-once --scan ~/path/to/your/projects --apply
```

This moves `.claude/issues/` to `.issues/` per project, adds `tracker`/`ref`/`url` fields (derived from the existing key or `## Quellen`), renames the legacy `issue:` field to `key:`, and appends `.issues/` to your global `~/.gitignore` **and** to each project's own `.gitignore`. The global entry only protects this machine; the project-local one protects anyone else who ever clones the repo — a colleague or client without your personal dotfiles is otherwise one `git add .` away from committing tracker documents that may hold confidential ticket content. Migration never touches body content, never renames files, and writes a `.bak` next to every file it changes.

## Requirements

- [Claude Code](https://claude.ai/code)
- [jira-cli](https://github.com/ankitpokhrel/jira-cli) — for Jira references. Without it, `/i:new` reports the gap and continues with whatever text you supplied.
- [gh](https://cli.github.com/) — for GitHub references, authenticated (`gh auth status`).
- `curl` — for Redmine references (read-only; Redmine hosts are public trackers by default, additional hosts go in `~/.config/i/trackers.json`).
- [confluence-cli](https://github.com/pchuri/confluence-cli) (optional) — reads Confluence pages linked from a Jira ticket. `export CONFLUENCE_READ_ONLY=true` is recommended; nothing here ever writes to Confluence.
- [md-annotator](https://www.npmjs.com/package/md-annotator) (optional) — browser review of the issue document before implementation. Skipped silently when not installed.
- Node.js — for `bin/i`.

### Attachment download (`~/.netrc`, Jira only)

`/i:new` downloads images and PDFs so they can actually be evaluated as requirements. Authentication goes through `~/.netrc`, keeping the API token out of command lines, environment variables, and config files:

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

Issue documents are Markdown files in `.issues/<key>.md` in your project's main worktree. They are **not committed to git** (globally ignored via `~/.gitignore`, and locally via this repo's own `.gitignore` as a second guard) — local working documents that persist between Claude Code sessions.

Each document has:

- **Frontmatter** with `status`, `tracker`, `ref`, `branch`, `sessions` (every Claude Code session that worked on it)
- **Zusammenfassung** — what this is, why it matters, current state
- **Anforderungen** (requirements) as checkboxes — the only progress metric there is, read by `bin/i status`/`list` and `/i:report`. Check off only after verification; a requirement's text is never reformulated or deleted, only its checked state changes.
- **Betroffene Bereiche** (affected areas) with file paths
- **Entscheidungen** / **Erkenntnisse** — decisions and findings, appended as work progresses
- **Quellen** (sources) — ticket, parent, Confluence pages with version, attachment paths

Only sections with actual content are written — no empty headings.

`bin/i` is the only thing that talks to a tracker (Jira, GitHub, or Redmine): `fetch`, `sync` (diffs against the last fetch, not a re-read), `post`, `attach`. `bin/i recall <key>` searches every local Claude Code transcript for a key, for context that never made it into a document. Format details, the ref-resolution table, and section conventions: `skills/issue-management/SKILL.md`.

## License

MIT
