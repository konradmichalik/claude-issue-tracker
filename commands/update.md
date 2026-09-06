---
description: Add a finding to the active issue, or pull the delta since the last tracker sync
---

# i:update

Add a finding, or pull the delta since the last sync.

## Arguments

- `[ref]` (optional) — omit to resolve the active issue via `${CLAUDE_PLUGIN_ROOT}/bin/i active`.
- `[text]` (optional) — a note to classify and file. Omit to run a tracker sync instead.

## Workflow

### If `text` is supplied — classify and file

| Type | Target section | Format |
|---|---|---|
| New requirement | Anforderungen | `- [ ] <text> *(Nachtrag <date>)*` |
| Bug / test feedback | Anforderungen | `- [ ] Bug: <text> *(Testfeedback <date>)*` |
| Technical finding | Erkenntnisse | `- <date>: <text>` |
| Decision | Entscheidungen | `- <date>: <text> — Grund: <reason>` |

Append only, never overwrite. Update `updated` in the frontmatter.

### If `text` is omitted — sync

1. `tracker: none` documents have nothing to sync. Say so, stop.
2. Run `${CLAUDE_PLUGIN_ROOT}/bin/i sync "<ref>"`. It fetches fresh, diffs against `.issues/.cache/<key>.json`, and prints a change report: status, description delta, new comments with author/date, new attachments, label changes.
3. Nothing changed: say so, stop — do not touch the document.
4. Something changed: propose where each change belongs (a new comment describing a bug → Anforderungen as Testfeedback; a status change → a line in Erkenntnisse; and so on) and apply after a quick confirmation for anything non-trivial.
5. Update `updated`.

## Rules

- **No separate sync timestamp to maintain** — the sync cache under `.issues/.cache/` is the only delta marker.
- **Append-only** — sync findings extend sections, never replace them.
- Format and conventions: read `skills/issue-management/SKILL.md`.
