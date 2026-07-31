# i:resume

Resume work on an existing issue — show current state or save a session checkpoint.

## Arguments

- `<issue-key>` (required) - Jira issue key (e.g., `VBDI-255`)
- `<checkpoint>` (optional) - What you've done and what's next. If provided, saves a breadcrumb instead of showing status.

## Workflow

### If issue document does not exist

1. `Kein Issue-Dokument für <issue-key> gefunden. Nutze /i:new <issue-key> um es anzulegen.`

### If `<checkpoint>` is provided (save breadcrumb)

1. **Read issue document**
   - Load `.claude/issues/<issue-key>.md`

2. **Generate checkpoint** (if `<checkpoint>` is generic or empty-ish)
   - Analyze recent tool calls and file changes in the current session
   - Summarize: what was done, what's in progress, what's next
   - Keep it concise — max 3-4 bullet points

3. **Write to issue document**
   Append to the "Erkenntnisse" section:

   ```
   - <YYYY-MM-DD> HH:MM 🔖 <checkpoint summary>
     - Erledigt: <what was completed>
     - In Arbeit: <current state of work>
     - Nächster Schritt: <what to do next>
   ```

4. **Update metadata**
   - Set `updated` date in frontmatter

5. **Confirm to user**
   - Show the saved checkpoint
   - Remind: "Dieser Breadcrumb bleibt erhalten, auch wenn der Context komprimiert wird."

### If no `<checkpoint>` is provided (resume)

1. **Read issue document**
   - Load `.claude/issues/<issue-key>.md`

2. **Auto-advance status** (if applicable)
   - If status is `analysis` or `estimated` AND a "Umsetzungsplan" section with content exists:
     - Set status to `in-progress`
     - Update `updated` date
     - Note the status change in the output: `Status: analysis → in-progress (Umsetzungsplan vorhanden)`

3. **Show current state**
   - Status (from frontmatter, reflecting any auto-advance)
   - Last breadcrumb (latest 🔖 entry from "Erkenntnisse", if any)
   - Open requirements (unchecked items from "Anforderungen" with count)

4. **Ask user**
   - "Was möchtest du tun?"
     - Weiterarbeiten (implementation)
     - Schätzen (`/i:estimate <issue-key>`)
     - Aktualisieren (`/i:update <issue-key>`)

## Auto-Breadcrumb on Session End

When used as the last action before ending a session, include:
- Files that were modified (with brief description of changes)
- Open questions or blockers
- Explicit next step so the next session can pick up immediately

## Rules

- **Issue document must exist** — never creates a new document
- **Append-only** — never overwrite existing breadcrumbs
- **Timestamped** — always include date AND time (HH:MM) to distinguish multiple breadcrumbs per day
- **Actionable** — "Nächster Schritt" must be specific enough to resume without re-reading the full context
- **Compact** — max 5 lines per breadcrumb, no prose
- Issue document format, lifecycle, worktree-safety, and shared conventions: read `.claude/skills/i-issue-management/SKILL.md` directly (`Read` tool)
