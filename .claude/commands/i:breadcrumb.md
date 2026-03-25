# i:breadcrumb

Save a session checkpoint to the issue document — survives context compression and session restarts.

## Arguments

- `<issue-key>` (required) - Jira issue key (e.g., `VBDI-255`)
- `<checkpoint>` (optional) - What you've done and what's next. If omitted, auto-generate from recent activity.

## Workflow

1. **Read issue document**
   - Load `.claude/issues/<issue-key>.md`
   - If not found: tell the user to run `/i:req <issue-key>` first

2. **Generate checkpoint** (if no `<checkpoint>` provided)
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
- Issue document format, lifecycle, worktree-safety, and shared conventions: see **i-issue-management** skill
