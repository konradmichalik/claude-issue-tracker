# The document format

Every issue is one Markdown file in `.issues/<key>.md`, in the project's main
worktree, never committed. Only sections with actual content are written —
`/i:new` never creates an empty heading.

## Frontmatter

```yaml
---
key: VHWWEB-312
title: Sortierung Zertifikatslehrgänge
status: analysis
tracker: jira
ref: VHWWEB-312
url: https://move-elevator.atlassian.net/browse/VHWWEB-312
created: 2026-09-06
updated: 2026-09-06
branch: VHWWEB-312-sortierung-lehrgaenge
sessions:
  - 2026-09-06 491b05d1 VHWWEB-312-sortierung-lehrgaenge
---
```

`tracker`/`ref`/`url` come from [ref resolution](trackers.md) and stay empty
for a topic with no tracker. `branch` is the only link back to the working
branch for a GitHub issue, since the issue number never appears in the branch
name there. `reported:` (not shown above) is set by `/i:report` once a status
update has actually been posted, so a second report doesn't repeat itself.

## Sections

```markdown
## Zusammenfassung
## Anforderungen
## Betroffene Bereiche
## Offene Fragen
## Entscheidungen
## Erkenntnisse
## Quellen
```

Canonical, kept when they have content. `Aufwandsschätzung`, `Umsetzungsplan`,
`Testschritte` and `Risiken` are optional and appear only once a command
actually writes into them.

**Anforderungen** is the only progress signal there is — `bin/i status`,
`bin/i list` and `/i:report` all read the checkbox count directly, no separate
percentage is stored anywhere. Two rules keep that signal honest:

- Check a box only once the requirement is actually verified, not once code
  for it exists.
- A requirement's text is never reformulated, shortened or deleted — only its
  checked state changes. A revised requirement is a new line
  (`*(Nachtrag <date>)*`), not an edit to the old one.

**Quellen** records provenance — the ticket, a parent/epic, a Confluence page
with its version, attachment paths — so a later re-sync can tell what changed
since a source was read.

## Lifecycle

```text
i:new  ──>  Implementation  ──>  done
              │        │
    i:update (delta)   i:report (status update)
              │        │
              └────────┘
```

| Status | Meaning |
| --- | --- |
| `analysis` | Requirements captured, implementation not yet confirmed |
| `in-progress` | Implementation under way |
| `in-review` | Code review / QA |
| `done` | All requirements met |

There is no separate estimation step and no dedicated Definition-of-Done
check — both existed in an earlier version and were never invoked across five
weeks of real usage. An effort estimate can still live under an optional
`Aufwandsschätzung` heading; it just carries no lifecycle status of its own.

## Sessions and the Stop hook

`sessions:` links an issue to every Claude Code session that worked on it —
written by `/i:new` on the first session, appended by the `SessionStart` hook
on every later one whose branch matches. `bin/i sessions <ref>` lists them;
`claude --resume <id>` picks one back up.

The `Stop` hook checks, once per session, whether the active issue has
uncommitted changes and no `Erkenntnisse` entry for today. If both are true it
holds the session back once with a reminder to run `/i:note`. Writing that
entry — or a second attempt to stop in the same session — silences it; it
never blocks twice in a row.

For anything that never made it into a document at all: `bin/i recall <key>`
searches every local Claude Code transcript for the key and prints where it
turned up, with date and session.
