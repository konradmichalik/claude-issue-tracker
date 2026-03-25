# i:note

Add information to an existing issue document — findings, test feedback, new requirements, or decisions.

## Arguments

- `<issue-key>` (required) - Jira issue key (e.g., `VBDI-255`)
- `<information>` (required) - The information to add

## Workflow

1. **Read issue document**
   - Load `.claude/issues/<issue-key>.md`
   - If not found: tell the user to run `/i:req <issue-key>` first

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

## Rules

- **Issue document must exist** — this command only updates, never creates
- **Classify automatically** — do not ask the user what type the note is unless ambiguous
- **Preserve existing content** — append, never overwrite
- **Keep format consistent** — use the same bullet style and date format as existing entries
- **One note per call** — if the user has multiple things, they can run the command multiple times or provide them all at once (classify each separately)
- Issue document format, lifecycle, worktree-safety, and shared conventions: see **i-issue-management** skill
