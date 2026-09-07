# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local, tracker-agnostic issue tracker for Claude Code — Jira, GitHub, Redmine, or no tracker at all, Markdown-based. Structures requirements, investigates the codebase via subagents, tracks findings, and posts consistently formatted status updates back.

**This repo is the tooling itself, not a project that uses it.** It ships as a Claude Code plugin (`.claude-plugin/plugin.json` + `marketplace.json`): four slash commands, four subagents, one skill, two hooks (`SessionStart`, `Stop`), and `bin/i` — a small Node CLI that is the *only* thing that talks to a tracker.

**Editing a file here does not change global behavior by itself.** `claude plugin install` copies the repo into `~/.claude/plugins/cache/issue-tracker/i/<version>/` at install time — that cache, not this working directory, is what every session actually runs. After any change, either `claude plugin marketplace update issue-tracker && claude plugin install i@issue-tracker --scope user -y` to refresh the installed copy, or use `claude --plugin-dir <this-repo>` for a session that reads the working directory live. This was verified empirically, not assumed — an earlier version of this file claimed live effect and was wrong.

The rebuild that produced this layout replaced an earlier, Jira-only, command-heavy version. The decisions behind it — including five weeks of real usage data across 1,165 transcripts that showed `/i:close`, `/i:list`, `/i:board`, and `/i:migrate` were never invoked — are not repeated here; they live in conversation history and in the commit that made this change.

A second pass compared this design against Beads (graph tracker for AI agents), Backlog.md (Markdown tasks + CLI/MCP), and Anthropic's own write-up on harnesses for long-running agents. The comparison confirmed the external-sync design (none of the three talk to a real tracker) but found the progress side underbuilt: nothing forced a session to leave a record, and checkboxes had no reader. `bin/i status`/`list`/`report-template` reading requirement checkboxes, and the `Stop` hook, are the result — see "Key Conventions" and the Anforderungen rules in `SKILL.md`.

## Layout

```
.claude-plugin/plugin.json           plugin manifest; name is "i" so /i:new etc. keep their addresses
.claude-plugin/marketplace.json      makes the repo installable via `claude plugin marketplace add ./`
install.sh / uninstall.sh            wrap the two `claude plugin` commands that register + install it globally
commands/{new,update,report,note}.md slash commands — prompt specs, not code
agents/{locate,history,patterns,reproduce}.md   subagent contracts used inside /i:new
skills/issue-management/SKILL.md     single source of truth for format, lifecycle, section conventions
hooks/hooks.json + session-start.sh  SessionStart hook: prints active-issue status, silent if none
hooks/stop.sh                        Stop hook: nudges once per session for an unrecorded, dirty active issue
bin/i                                CLI: ref resolution, fetch/sync/post/attach, sessions, recall, migrate-once, list, check-note
lib/                                 the only code that talks to a tracker or parses/writes issue Markdown
  ref.js         input → {tracker, key, ref, url, filename}
  doc.js         frontmatter, sections, active-issue resolution, worktree-safe .issues/ path
  normalize.js   per-tracker payload → one common shape; includes the ADF→Markdown walker (Stage 1)
  cache.js       .issues/.cache/<key>.json — the sync comparison point
  diff.js        feed-diff between two cached payloads, human-readable change report
  render.js      i:report templates (German for jira/redmine, English for github)
  recall.js      greps ~/.claude/projects/**/*.jsonl for a key across all local sessions
  migrate.js     one-time move of .claude/issues/ → .issues/, field migration, ~/.gitignore *and* per-project .gitignore entry
  adapters/{jira,github,redmine}.js   shell out via execFileSync (argument arrays, never string interpolation)
```

Command filenames have no `i:` prefix — the plugin name (`i`) plus the commands directory produces `/i:new` from `commands/new.md`.

**`plugin.json` stays minimal — do not add `commands`, `agents`, `skills`, or `hooks` fields back in.** They're auto-discovered by directory/file convention (verified against Claude Code 2.1.263), and declaring them explicitly does not just duplicate the convention — it actively breaks it: an explicit `"agents": "./agents"` fails validation (`agents: Invalid input`), and an explicit `"hooks": "./hooks/hooks.json"` makes the plugin fail to load entirely (`Duplicate hooks file detected` — the standard path loads automatically regardless). Both were caught only by actually installing the plugin (`claude plugin install`), not by `claude plugin validate` alone — validate missed the hooks conflict. Re-verify with a real install after any `plugin.json` edit, not just validate.

## Working on `bin/i` / `lib/`

```bash
node bin/i ref "<input>"                 # inspect ref resolution for any input shape
node bin/i fetch "<ref>"                 # real network call — safe (read-only) against your own repos/tickets
node bin/i sync "<ref>"                  # requires a prior fetch's cache entry to show a diff
node --check lib/<file>.js               # no test suite; this plus the fixtures below is the verification loop
```

- `.issues/` in *this* repo holds three tiny fixtures (`TEST-001` through `TEST-003`) for exercising `doc.js` and `bin/i status`/`active` without touching a real tracker. Globally gitignored (`~/.gitignore`) and locally gitignored (this repo's own `.gitignore`) — never commit them.
- There is no test suite, linter, or build step. Verify a change by running the relevant `bin/i` subcommand against the fixtures, and against a real read-only tracker call where one is available (fetching your own public GitHub issues costs nothing and proves the adapter end-to-end).
- Adapters use `execFileSync` with argument arrays, never `execSync` with string interpolation — this is a deliberate choice to make shell injection structurally impossible, not an style preference to relax under time pressure.

## Architecture

`bin/i` is the single point of external access. Commands never shell out to `jira`/`gh`/`curl` directly — they call `${CLAUDE_PLUGIN_ROOT}/bin/i <subcommand>` and work from its output. This is the load-bearing decision of the rebuild: it's what makes the tracker adapter swappable and what keeps three prompt specs from each re-deriving how to talk to Jira.

| Adapter | Role |
|---|---|
| `lib/adapters/jira.js` | shells to `jira-cli` (`issue view --raw`, `comment add`, `move`) |
| `lib/adapters/github.js` | shells to `gh` (`issue view --json`, `comment`, `close`) |
| `lib/adapters/redmine.js` | `curl` against `<host>/issues/<id>.json` — read-only, no write-back implemented |

All three normalize to one shape in `lib/normalize.js` (`title, state, body, comments[], attachments[], parent, children, links[], labels`). Jira's ADF description/comments go through a real (not stubbed) recursive walker — paragraphs, headings, lists, code blocks, links stage cleanly; tables and panels render as a visible placeholder rather than silently dropping content. That placeholder is the trigger for writing a fuller ADF converter, not a permanent limitation — do it when a real ticket's acceptance criteria live in a table.

The issue document format is consumed by **two independent implementations** that must stay in sync:

1. **Commands + skill (prose)** — Claude reads/writes the Markdown by following `SKILL.md`.
2. **`lib/doc.js` (regex)** — parses frontmatter, canonical sections + aliases, writes back via targeted replacement.

Consequence: **changing the format is a two-file change** — `SKILL.md` (spec) and `lib/doc.js` (parser/writer). There is no `/i:migrate` command anymore; a format change to already-migrated documents is either backward-compatible (aliases in `SKILL.md` / `doc.js` handle it on read) or a one-off script, not a standing command.

Other cross-cutting details:

- **Checkboxes are the only progress metric, and now have readers.** `doc.js#listIssues` computes `{checked, total}` per document; `bin/i status` (the `SessionStart` hook) and `bin/i list` show it, and `/i:report` sources its Erledigt/Offen lists directly from checked/unchecked requirements — not from free-text summarization. They were tracked at 26% completion across 114 real pre-rebuild documents specifically because nothing read them; giving them a reader is the fix, not removing them. Two rules make the signal trustworthy (see `SKILL.md`, „Anforderungen"): check off only after verification, and never reformulate or delete a requirement's text — only its checked state changes.
- **The `Stop` hook is the enforcement point for writing anything down at all.** A dirty working tree on the active issue with no `Erkenntnisse` entry today blocks the session once (`bin/i check-note`, JSON `{"decision":"block","reason":...}` on stdout) and points at `/i:note`. Self-resolving: writing the entry removes the trigger, and a per-session-ID marker under `.issues/.cache/.stop-nag/` prevents a second block in the same session regardless. No command run means no hook fire — it only engages once there's something to lose.
- **The sync cache (`.issues/.cache/<key>.json`) replaces the old `jira_synced` timestamp.** `lib/diff.js` compares cached vs. fresh payloads by comment ID, not by date — this works identically across trackers and has no same-day miss window.
- **`sessions:` in the frontmatter is the session↔issue link.** Written by `/i:new` (first session) and appended to by the `SessionStart` hook (every later session on a matching branch). `bin/i recall <key>` is the escape hatch for context that never made it into the document at all — it searches raw transcripts, not just this repo's memory of them.
- **Worktree resolution lives in exactly one place**: `resolveIssuesDir()` in `lib/doc.js`, using `git rev-parse --path-format=absolute --git-common-dir` (verified against git 2.49). No command or the hook re-implements this.
- **Legacy tolerance is deliberate, in one direction.** `SECTION_ALIASES` in `lib/doc.js` and `SKILL.md` exist so pre-rebuild documents still render instead of erroring. New writes are always canonical; only reads are lenient.
- Both hooks must be silent (exit 0, no output) whenever `.issues/` doesn't exist or there's no active issue — they run in every project, not just ones using this tracker. The `Stop` hook additionally stays silent on a clean working tree and on a repeat within the same session — it should never be the reason a session can't end.

## Issue Document Lifecycle

```
i:new  ──>  Implementation  ──>  done
              │        │
    i:update (delta)   i:report (status update)
              │        │
              └────────┘
```

| Status | Set by |
|--------|--------|
| `analysis` | i:new |
| `in-progress` | i:new (after plan confirmation) |
| `in-review` | manual |
| `done` | manual, typically after an `/i:report --close` |

Full frontmatter schema, ref-resolution table, section conventions, and report templates: see `skills/issue-management/SKILL.md`.

## Commands

| Command | Purpose |
|---------|---------|
| `/i:new <ref> [text]` | Resolve reference (any tracker, or none) → fetch → attachments/Confluence → subagent investigation → confirm → branch → document |
| `/i:update [ref] [text]` | With text: classify and file a finding/bug/decision. Without: sync diff against the tracker. |
| `/i:report [ref] [text]` | Build and post a status update from checked/unchecked requirements, German (jira/redmine) or English (github) |
| `/i:note [text]` | Session breadcrumb — the write half of what used to be `/i:resume` |

## Key Conventions

- **Document language follows the tracker** — German for Jira/Redmine, English for GitHub, ask for `tracker: none`. This replaced a blanket "always German" rule once real usage showed 43% of `/i:new` calls were non-Jira, much of it English-language OSS repos.
- **Append-only** — existing content is never overwritten, only extended (except checkbox status and frontmatter).
- **Check off only after verification; never reformulate or delete a requirement's text.** Both `/i:report` and `bin/i status`/`list` trust the checkbox as a claim of fact, not a claim of effort.
- **No implementation before confirmation** — every decision point waits for user input.
- **No invention** — when information is insufficient, ask rather than inferring scope.
- **Not every task has an issue** — an active issue doesn't obligate every session to route through it. For work unrelated to that issue (a quick fix, exploration, a chore with no tracker relevance), don't force-search for a matching issue and don't attach findings to one that doesn't fit.
- **`.issues/` is never committed** — local working documents plus downloaded `attachments/` and the `.cache/` sync state. `migrate-once --apply` guards this two ways: `~/.gitignore` (this machine) and the target project's own `.gitignore` (everyone who ever clones it). The global entry alone is not enough for a project other people can clone.
- **Credentials via `~/.netrc`** — Jira attachment downloads use `curl --netrc`, so no token appears in command lines, environment, or config. Never read the keychain or inline a token.
- **Shell out via argument arrays, never string interpolation** — every adapter uses `execFileSync(bin, [args])`, not `execSync(\`bin ${arg}\`)`. This is not negotiable when adding a fourth tracker.
- When editing a command, keep changes consistent with the other three; they share tone, section structure (`Arguments` / `Workflow` / `Rules`), and defer format details to the skill.
