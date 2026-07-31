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

3. **Add to the correct section** (see classification table in `.claude/skills/i-issue-management/SKILL.md`)

4. **Update metadata**
   - Set `updated` date in frontmatter

5. **Offer to post to Jira**
   - Only relevant for information the team should see (new requirements, bugs, decisions) — internal findings stay local
   - Build the comment body in Jira wiki markup as a status note, not a copy of the internal document
   - Ask: `Als Jira-Kommentar posten?` — default is no. Never post unasked
   - On confirmation:
     ```bash
     TMP=$(mktemp -d)
     # write the comment body to "$TMP/comment.txt" first
     jira issue comment add <issue-key> -T "$TMP/comment.txt" --no-input
     ```
   - On success: note it in the "Quellen" section as `- Jira-Kommentar gepostet <YYYY-MM-DD HH:MM>`
   - On failure: keep the local change, report the error, do not retry silently

6. **Confirm to user**
   - Show what was added and where
   - Show updated requirements count if applicable

### If no `<information>` is provided (Jira-Sync)

1. **Fetch ticket state**
   Run the preflight and the fetch block from the skill, then list the comments with timestamps:
   ```bash
   jq -r '.fields.comment.comments[]? | [.created, .author.displayName, (.body|tostring)] | @tsv' "$TMP/issue.json"
   ```
   If `jira` is unavailable, inform the user and abort — this path has no local fallback.

2. **Determine the delta**
   - Read `jira_synced` from the frontmatter — this is the cutoff, **not** `updated`
   - New are all comments with `created > jira_synced` (compare full timestamps, not dates)
   - If `jira_synced` is missing (legacy or manual issue): treat all comments as new, mention this, and set the field afterwards
   - If nothing is new: `Keine neuen Jira-Kommentare seit <jira_synced>.`

3. **Merge new comments**
   - Classify each new comment like manual input (new requirement / bug / finding / decision) and route it to the matching section
   - Comments without a clear requirement character go to "Erkenntnisse" as `- <YYYY-MM-DD>: Jira-Kommentar (<author>): <summary>`
   - Append-only — existing entries are never modified

4. **Sync new attachments and Confluence links**
   - Attachments added since `jira_synced` (`.fields.attachment[].created`): download and view them per the skill, then list them under "Quellen"
   - New Confluence links in comments: read them and record them under "Quellen"

5. **Update metadata**
   - Set `updated` date and `jira_synced` to the fetch timestamp in frontmatter

6. **Confirm to user**
   - Show what was added (count and brief summary), grouped by target section

## Rules

- **Issue document must exist** — this command only updates, never creates
- **Classify automatically** — do not ask the user what type the note is unless ambiguous
- **Preserve existing content** — append, never overwrite
- **Keep format consistent** — use the same bullet style and date format as existing entries
- **One note per call** — if the user has multiple things, they can run the command multiple times or provide them all at once (classify each separately)
- **Append-only** — Jira-Sync fügt nur hinzu, ändert nie bestehende Einträge
- **Local by default** — writing to Jira happens only after the user confirms the exact text
- **`jira_synced` is the sync cutoff** — never use `updated` for the comment delta; it also moves on local edits and is only day-accurate
- Data sources, CLI preflight, and write-back rules: read `.claude/skills/i-issue-management/SKILL.md` directly (`Read` tool), chapter „Datenquellen & CLIs"
- Issue document format, lifecycle, worktree-safety, and shared conventions: read `.claude/skills/i-issue-management/SKILL.md` directly (`Read` tool)
