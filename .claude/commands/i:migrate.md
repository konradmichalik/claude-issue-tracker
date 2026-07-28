# i:migrate

Migrate existing issue documents to the current format defined in the i-issue-management skill.

## Arguments

None.

## Workflow

1. **Resolve issues directory**
   ```bash
   MAIN_DIR=$(git worktree list | head -1 | awk '{print $1}')
   ISSUES_DIR="$MAIN_DIR/.claude/issues"
   ```

2. **Scan all issue documents** in `$ISSUES_DIR/*.md`
   - If no issues found: `Keine Issue-Dokumente gefunden.` — stop.
   - **Skip non-issue documents**: filenames not matching `^[A-Z]+-\d+\.md$` (e.g., `VHW-10-abschluss.md`, `ext-solr-bug.md`) are concept/notes/bug-report files, not issues. List them in the report as `Übersprungen (kein Issue-Dokument)`.

3. **For each issue document**, compare against the skill schema and collect needed changes:

   **Frontmatter fields** (add missing with defaults):
   | Field | Default if missing |
   |-------|-------------------|
   | `key` | Derive from filename (e.g., `TEST-001.md` → `TEST-001`). Also rename legacy field `issue:` → `key:` if present. |
   | `title` | First H1 heading. If H1 matches `# <KEY>: <Titel>`, use only the part **after** the colon. Fallback: `(kein Titel)`. |
   | `status` | Read from legacy markers (in priority order): `## Status: <value>`, `- **Status:** <value>`, `\| Status \| <value> \|`. Fallback: `analysis`. |
   | `complexity` | Same legacy markers (`**Complexity:**`, table cell). Fallback: `Medium` |
   | `scope` | Same legacy markers. Fallback: `Medium (4-16h)` |
   | `created` | Legacy marker, file creation date, or today |
   | `updated` | Today |
   | `jira_synced` | **Do not invent.** Only add if the document contains evidence of a Jira sync (Jira comments under "Erkenntnisse"); then use that entry's date with time `00:00:00` and the local offset. Otherwise leave the field out — a missing `jira_synced` makes i:update treat all comments as new, which is the safe default. |

   **Required sections** (append missing sections in canonical order, empty):
   1. `## Anforderungen`
   2. `## Betroffene Bereiche`
   3. `## Offene Fragen`
   4. `## Entscheidungen`
   5. `## Aufwandsschätzung`
   6. `## Umsetzungsplan`
   7. `## Testschritte`
   8. `## Erkenntnisse`
   9. `## Quellen`

   **Section aliases** (treat as equivalent to canonical — do **not** append duplicates). Match case-insensitive, ignore leading emojis and parenthetical suffixes:

   | Existing section | Counts as |
   |---|---|
   | `## Anforderungen (DoD)`, `## Anforderungen (Definition of Done)`, `### Definition of Done` | `## Anforderungen` |
   | `## Codebase-Analyse`, `## Betroffene Codebereiche`, `## Betroffene Bereiche/Dateien` | `## Betroffene Bereiche` |
   | `## Fragen`, `## Open Questions`, `## Klärungsbedarf` | `## Offene Fragen` |
   | `## Decisions`, `## Entscheidungen & Annahmen` | `## Entscheidungen` |
   | `## Schätzung`, `## Aufwand`, `## Estimation` | `## Aufwandsschätzung` |
   | `## Plan`, `## Implementierung`, `## Vorgehen` | `## Umsetzungsplan` |
   | `## Tests`, `## Test Plan`, `## Testing` | `## Testschritte` |
   | `## Findings`, `## Notizen`, `## Ergebnisse` | `## Erkenntnisse` |
   | `## Sources`, `## Datenquellen`, `## Referenzen` | `## Quellen` |

   **Preserve everything that already exists** — never remove or reorder existing content. Legacy status markers (`## Status: ...`, `- **Status:** ...`, table rows) stay in the body even after `status:` is added to the frontmatter.

4. **Apply changes** to each issue that needs migration. Update `updated` field to today.

5. **Report results** as a table:
   ```
   Migration abgeschlossen.

   | Issue    | Änderungen                              |
   |----------|-----------------------------------------|
   | TEST-001 | +scope, +complexity, +## Offene Fragen  |
   | TEST-002 | Keine Änderungen nötig                  |
   ```

   If no issues needed changes: `Alle Issues entsprechen bereits dem aktuellen Format.`

## Rules

- **Never remove content** — only add missing fields and sections
- **Never reorder existing sections** — append missing sections after all existing content
- **Preserve checkbox states** — `[x]` stays `[x]`
- **Dry-run first** — show the planned changes table and ask for confirmation before writing
- Issue document format, lifecycle, worktree-safety, and shared conventions: see **i-issue-management** skill
