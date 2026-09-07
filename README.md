# claude-issue-tracker

Claude Code sessions lose their working notes the moment context compacts,
and neither a Jira ticket nor a GitHub issue is a place an agent can think out
loud without a network round-trip and someone reviewing every comment. This
keeps the actual working state — requirements, decisions, findings — in local
Markdown next to the code, tracker-agnostic by design, and syncs a short
status update back to whichever tracker (or none) the work actually lives in.

## ✨ Features

- **[Any tracker, or none](docs/trackers.md)**: Jira, GitHub, Redmine, or a free-text topic — one input form resolves all of them
- **[Subagent investigation](docs/commands.md#inew)**: `/i:new` locates the code, checks history, and confirms a bug is real before you plan a fix
- **[Sync as a diff](docs/commands.md#iupdate)**: `/i:update` reports only what changed on the tracker since the last check, never a full re-fetch
- **[Consistent status updates](docs/commands.md#ireport)**: `/i:report` builds Erledigt/Offen straight from the requirement checkboxes and asks before posting anywhere
- **[Session recall](docs/document-format.md#sessions-and-the-stop-hook)**: every session that touched an issue is linked to it, and `bin/i recall` finds context that never made it into a document

## 🔥 Installation

> [!IMPORTANT]
> Requires [Claude Code](https://claude.ai/code) and Node.js. Per-tracker CLIs
> (jira-cli, gh) are optional — missing one doesn't block `/i:new`, see
> [Trackers](docs/trackers.md#per-tracker-requirements).

```bash
git clone git@github.com:konradmichalik/claude-issue-tracker.git
cd claude-issue-tracker
./install.sh
```

Registers the repo as a local Claude Code marketplace and installs the `i`
plugin at `--scope user` — global, every project on this machine. Restart
Claude Code (or start a new session) afterward for `/i:new` and the hooks to
take effect. Verify the plugin with `claude plugin list`, and which tracker
CLIs are ready with `bin/i doctor`; remove with `./uninstall.sh`.
Either way, your `.issues/` documents are untouched.

Used the earlier symlink-based version? `bin/i migrate-once` moves
`.claude/issues/` to the current layout — see
[the CLI reference](docs/cli-reference.md#bini-migrate-once).

## 🚀 Quick start

```text
/i:new VHWWEB-312
```

Fetches the ticket, investigates the codebase, and creates
`.issues/VHWWEB-312.md` once you confirm the plan.

## ⚡ Usage

| Command | What it does |
| --- | --- |
| `/i:new <ref> [text]` | Fetch, investigate, confirm, create the document and branch |
| `/i:update [ref] [text]` | File a finding with text, or sync the tracker delta without it |
| `/i:report [ref] [text]` | Build and post a status update from the requirement checkboxes |
| `/i:note [text]` | Save a session breadcrumb to the active issue |

A `SessionStart` hook shows the active issue's status at the start of every
session. A `Stop` hook nudges once, at most, for uncommitted changes with
nothing recorded today. `bin/i list` shows every local issue in a table — no
model turn needed. Full reference: [docs/commands.md](docs/commands.md).

## 📚 Documentation

| Topic | What's inside |
| --- | --- |
| [Commands](docs/commands.md) | All four commands in depth, with realistic examples |
| [Trackers and ref resolution](docs/trackers.md) | Input forms, per-tracker requirements, credentials |
| [The document format](docs/document-format.md) | Frontmatter, sections, checkbox rules, lifecycle, sessions |
| [`bin/i` reference](docs/cli-reference.md) | Every subcommand meant for direct terminal use |

## 🧑‍💻 Contributing

Please have a look at [`CONTRIBUTING.md`](CONTRIBUTING.md).

## ⭐ License

This project is licensed under [MIT](LICENSE).
