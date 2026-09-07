# `bin/i` reference

`bin/i` is the only thing in this project that talks to a tracker or parses
`.issues/` Markdown. The four commands call it internally via
`${CLAUDE_PLUGIN_ROOT}/bin/i`; the subcommands below are the subset worth
running yourself, from a terminal, without going through Claude Code at all.

## `bin/i list`

```bash
bin/i list
```

```text
KEY       STATUS       TRACKER  ANFORDERUNGEN  AKTUALISIERT
VHWWEB-312  in-progress  jira     2/5          2026-09-06
```

Every local issue, sorted by `updated`, newest first. No model turn, no
network call.

## `bin/i status`

```bash
bin/i status
```

Prints the same compact block the `SessionStart` hook shows: active issue,
status, requirements checked/total, the last few lines of Zusammenfassung,
open questions, and the most recent breadcrumb. Silent, exit 0, if there's no
`.issues/` or no active issue — it runs in every project, not just ones using
this tracker.

## `bin/i active`

```bash
bin/i active
```

Just the resolved active issue, as JSON — the same resolution `/i:update` and
`/i:note` use when `ref` is omitted. Exits 1 with no output if none resolves.

## `bin/i ref`

```bash
bin/i ref 22
```

Shows what any input resolves to, without a network call. Useful for
checking a reference before running `/i:new` on it. Full resolution table:
[Trackers and ref resolution](trackers.md).

## `bin/i recall`

```bash
bin/i recall GH-101
```

Searches every local Claude Code transcript (`~/.claude/projects/**/*.jsonl`)
for the key and prints each hit with its date, session, and a snippet of
surrounding text. For context that was discussed but never written into a
document.

## `bin/i sessions`

```bash
bin/i sessions VHWWEB-312
```

Lists the `sessions:` entries recorded for that issue — pair with
`claude --resume <id>` to pick one back up.

## `bin/i migrate-once`

```bash
bin/i migrate-once --scan ~/Sites            # dry run — always required first
bin/i migrate-once --scan ~/Sites --apply
```

One-time move from the pre-plugin `.claude/issues/` layout to `.issues/`,
across every project under `--scan`. `--scan` has no default — a command that
moves files across your projects gets no implicit scope. Dry run first,
always: it prints the plan without writing anything, so nothing on disk
changes until `--apply` is added.

<details>
<summary>What --apply actually does</summary>

For every `.claude/issues/` it finds:

- moves it to `.issues/` at the same project root
- adds `tracker`/`ref`/`url` to each document's frontmatter, derived from the
  existing key or a URL already in the document — never guessed from the
  project's own `origin` remote, since the two aren't always the same
  repository
- renames the legacy `issue:` field to `key:`
- appends `.issues/` to `~/.gitignore` **and** to that project's own
  `.gitignore` — the global entry only protects this machine, the
  project-local one protects anyone else who ever clones it
- writes a `.bak` next to every file it changes

Pre-frontmatter documents (an H1 heading plus `**Status:** …` lines) move
untouched — prepending a partial frontmatter block would leave them formally
migrated but headless.

</details>

## Internal — called by the four commands, not meant to run standalone

`fetch <ref>`, `sync <ref>`, `attach <ref> --dest <dir>`,
`post <ref> -f <file>`, `set <ref> <field>=<value>`,
`session-add <ref> <sessionId> <branch>`,
`report-template --lang <de|en> --kind <k> --json <file>`, and `check-note`
(the `Stop` hook's own check). Each does exactly one thing for one command —
`/i:update`'s sync path and `/i:report`'s template rendering, for instance —
and none of them make sense run in isolation.
