# i:list

List all local issue documents with their status and progress.

## Arguments

None.

## Workflow

1. **Resolve issues directory**
   ```bash
   MAIN_DIR=$(git worktree list | head -1 | awk '{print $1}')
   ISSUES_DIR="$MAIN_DIR/.claude/issues"
   ```

2. **Scan issue documents**
   - Read all `.md` files in `$ISSUES_DIR`
   - If directory is empty or doesn't exist: `Keine Issue-Dokumente vorhanden. Starte mit /i:new <issue-key>.`

3. **Parse each document**
   - Extract frontmatter: `key`, `status`, `updated`, `complexity` (legacy documents may still use `issue:` instead of `key:` — see /i:migrate)
   - Count requirements: total checkboxes and checked checkboxes in "Anforderungen"
   - Calculate progress percentage

4. **Display CLI table**

   Sort by `updated` (newest first). Use Unicode box-drawing characters:

   ```
   ┌──────────────────────────────────────────────────────────────┐
   │  Issue Documents                                             │
   ├──────────┬────────────────┬───────────────┬──────────────────┤
   │ Issue    │ Status         │ Anforderungen │ Aktualisiert     │
   ├──────────┼────────────────┼───────────────┼──────────────────┤
   │ VBDI-255 │ in-progress    │ ████░░  4/6   │ 2026-03-15       │
   │ VBDI-312 │ analysis       │ ░░░░░░  0/4   │ 2026-03-17       │
   │ PROJ-100 │ done           │ ██████  7/7   │ 2026-03-10       │
   ├──────────┴────────────────┴───────────────┴──────────────────┤
   │  3 Issues: 1 in-progress, 1 analysis, 1 done                  │
   └──────────────────────────────────────────────────────────────┘
   ```

5. **Progress bar**
   - 6 characters wide using `█` (filled) and `░` (empty)
   - Proportional to checked/total requirements
   - Followed by `X/Y` count

6. **Summary line**
   - Total issues, grouped by status
   - Example: `3 Issues: 1 in-progress, 1 analysis, 1 done`

## Rules

- **Quick overview** — no detailed content, just the table
- **No arguments needed** — always shows all issues
- **Output as plain text** — render the table directly, not inside a code block
- Issue document format, lifecycle, worktree-safety, and shared conventions: read `.claude/skills/i-issue-management/SKILL.md` directly (`Read` tool)
