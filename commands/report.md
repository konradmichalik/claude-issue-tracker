---
description: Post a short, consistently formatted status update to the tracker
---

# i:report

Post a short, consistently formatted status update to the tracker.

## Arguments

- `[ref]` (optional) — omit to resolve the active issue.
- `[text]` (optional) — steers content or tone; does not replace the template.

## Workflow

1. Resolve `ref` (or the active issue). If no local document exists for it, source content from the branch's commits and its diff against base instead of a document — say so in the output rather than pretending a document was consulted.
2. Determine `kind`: `fortschritt`/`progress` (default), or `abschluss`/`closing` if the user says so or all requirements are checked off.
3. Determine language from `tracker`: `jira`/`redmine` → German, `github` → English, `none` → ask.
4. Build the report from the Anforderungen checkboxes — `done` = checked (`- [x]`), `open` = unchecked, including Nachträge and Testfeedback. This is a snapshot of the current state, not a diff of what changed. Fold in `Entscheidungen`/`Erkenntnisse` newer than the last `reported:` date (or `created` if never reported) as extra lines under `done` where they explain a checkbox's status; do not use them as a replacement source when the checkbox list itself has nothing new. `next` comes from the first unchecked item, or `Umsetzungsplan` if more specific. Render via:
   ```
   ${CLAUDE_PLUGIN_ROOT}/bin/i report-template --lang <de|en> --kind <kind> --json <tmpfile>
   ```
   where `<tmpfile>` is `{"done": [...], "open": [...], "next": "..."}`.
5. **Show the exact text and ask for confirmation before posting. Never post as a side effect of anything else.**
6. On confirmation:
   ```
   ${CLAUDE_PLUGIN_ROOT}/bin/i post "<ref>" -f <tmpfile-with-final-text>
   ```
   Add `--close` only for `abschluss`/`closing`, and only if all requirements are checked.
7. Set `reported: <today>` in the frontmatter (`${CLAUDE_PLUGIN_ROOT}/bin/i set "<ref>" reported=<date>`).

## Rules

- **Confirmation before every post** — no exceptions.
- **No content invention** — if there is nothing new since the last report, say so instead of posting filler.
- Template and language rules: read `skills/issue-management/SKILL.md`.
