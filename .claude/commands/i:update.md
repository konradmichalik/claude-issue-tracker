# i:update

Update an existing issue document — add information or sync from Jira.

## Arguments

- `<issue-key>` (required) - Jira issue key (e.g., `VBDI-255`)
- `<information>` (optional) - The information to add. If omitted, syncs new Jira comments.

## Workflow

1. **Read issue document**
   - Load `.claude/issues/<issue-key>.md`
   - If not found: tell the user to run `/i:new <issue-key>` first

### If `<information>` is provided

2. **Classify the input**
   Determine the type of information:
   - **Neue Anforderung** — something that was not in the original ticket but is now required
   - **Bug / Testfeedback** — issue found during testing
   - **Technische Erkenntnis** — insight gained during implementation (API behavior, limitation, workaround)
   - **Entscheidung** — a decision made about approach, scope, or trade-off

3. **Add to the correct section** (see classification table in **i-issue-management** skill)

4. **Update metadata**
   - Set `updated` date in frontmatter

5. **Confirm to user**
   - Show what was added and where
   - Show updated requirements count if applicable

### If no `<information>` is provided (Jira-Sync)

1. **Fetch Jira comments**
   ```bash
   jira issue view <issue-key> --plain --comments 10
   ```
   If `jira` is not installed or the command fails, inform the user and abort.

2. **Compare with issue document**
   - Check `updated` date in frontmatter
   - Identify comments/changes newer than `updated`
   - If no new comments: `Keine neuen Jira-Kommentare seit <updated>.`

3. **Merge new comments**
   - Append new comments to the "Erkenntnisse" section
   - Format: `- <YYYY-MM-DD>: Jira-Kommentar (<author>): <summary>`
   - Append-only — existing entries are never modified

4. **Update metadata**
   - Set `updated` date in frontmatter

5. **Confirm to user**
   - Show what was added (count and brief summary)

## Rules

- **Issue document must exist** — this command only updates, never creates
- **Classify automatically** — do not ask the user what type the note is unless ambiguous
- **Preserve existing content** — append, never overwrite
- **Keep format consistent** — use the same bullet style and date format as existing entries
- **One note per call** — if the user has multiple things, they can run the command multiple times or provide them all at once (classify each separately)
- **Append-only** — Jira-Sync fügt nur hinzu, ändert nie bestehende Einträge
- Issue document format, lifecycle, worktree-safety, and shared conventions: see **i-issue-management** skill
