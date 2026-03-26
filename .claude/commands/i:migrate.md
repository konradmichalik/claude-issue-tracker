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

3. **For each issue document**, compare against the skill schema and collect needed changes:

   **Frontmatter fields** (add missing with defaults):
   | Field | Default if missing |
   |-------|-------------------|
   | `key` | Derive from filename (e.g., `TEST-001.md` → `TEST-001`) |
   | `title` | `(kein Titel)` |
   | `status` | `analysis` |
   | `complexity` | `Medium` |
   | `scope` | `Medium (4-16h)` |
   | `created` | File creation date or today |
   | `updated` | Today |

   **Required sections** (append missing sections in canonical order, empty):
   1. `## Anforderungen`
   2. `## Betroffene Bereiche`
   3. `## Offene Fragen`
   4. `## Entscheidungen`
   5. `## Aufwandsschätzung`
   6. `## Umsetzungsplan`
   7. `## Erkenntnisse`

   **Preserve everything that already exists** — never remove or reorder existing content.

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
