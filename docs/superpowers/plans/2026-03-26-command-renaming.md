# Command Renaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all issue tracker commands from technical names to intuitive, action-based names and adjust behavior for `i:new`, `i:update`, and `i:resume`.

**Architecture:** Pure Markdown file renames with content edits. No code changes. Each command file is self-contained; documentation files (CLAUDE.md, SKILL.md) reference command names and need updating.

**Tech Stack:** Markdown, git

**Spec:** `docs/superpowers/specs/2026-03-26-command-renaming-design.md`

---

### Task 1: Create i:new (replaces i:req)

**Files:**
- Create: `.claude/commands/i:new.md`
- Delete: `.claude/commands/i:req.md`

- [ ] **Step 1: Create `.claude/commands/i:new.md`**

Copy content from `i:req.md` with these changes:

1. Title: `# i:new` (was `# i:req`)
2. Description: `Create a new issue document for a Jira ticket — gather all information, assess scope, and persist.`
3. Add new guard at the start of the workflow, before "If issue document already exists":

```markdown
### If issue document already exists (`.claude/issues/<issue-key>.md`)

1. **Abbruch**: `Issue-Dokument für <issue-key> existiert bereits. Nutze /i:resume <issue-key> um daran weiterzuarbeiten.`
```

4. Remove the old "If issue document already exists" section (lines 12-19 of current i:req.md) that offered continue/update/estimate options — this is now `i:resume`'s job.
5. Replace all internal references:
   - `/i:note` → `/i:update`
   - `/i:aws` → `/i:estimate`
   - `/i:req` → `/i:new`
6. Keep the "If no issue document exists (new ticket)" workflow unchanged (steps 1-7).

- [ ] **Step 2: Verify the new file reads correctly**

Run: `head -5 .claude/commands/i:new.md`
Expected: `# i:new` as first heading

- [ ] **Step 3: Delete old file**

```bash
git rm .claude/commands/i:req.md
```

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/i:new.md
git commit -m "feat: rename i:req to i:new with existence guard"
```

---

### Task 2: Create i:update (replaces i:note)

**Files:**
- Create: `.claude/commands/i:update.md`
- Delete: `.claude/commands/i:note.md`

- [ ] **Step 1: Create `.claude/commands/i:update.md`**

Copy content from `i:note.md` with these changes:

1. Title: `# i:update`
2. Description: `Update an existing issue document — add information or sync from Jira.`
3. Arguments section:

```markdown
## Arguments

- `<issue-key>` (required) - Jira issue key (e.g., `VBDI-255`)
- `<information>` (optional) - The information to add. If omitted, syncs new Jira comments.
```

4. Add new workflow branch after "Read issue document":

```markdown
### If `<information>` is provided

(existing i:note workflow: classify, add to correct section, update metadata, confirm)

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
```

5. Replace all internal references: `/i:req` → `/i:new`
6. Rules section: Change "this command only updates, never creates" to match, add "Append-only — Jira-Sync fügt nur hinzu, ändert nie bestehende Einträge"

- [ ] **Step 2: Verify the new file reads correctly**

Run: `head -5 .claude/commands/i:update.md`
Expected: `# i:update` as first heading

- [ ] **Step 3: Delete old file**

```bash
git rm .claude/commands/i:note.md
```

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/i:update.md
git commit -m "feat: rename i:note to i:update with Jira sync"
```

---

### Task 3: Create i:resume (replaces i:breadcrumb)

**Files:**
- Create: `.claude/commands/i:resume.md`
- Delete: `.claude/commands/i:breadcrumb.md`

- [ ] **Step 1: Create `.claude/commands/i:resume.md`**

New file (not a direct copy — combines breadcrumb writing with a new resume workflow):

```markdown
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

2. **Show current state**
   - Status (from frontmatter)
   - Last breadcrumb (latest 🔖 entry from "Erkenntnisse", if any)
   - Open requirements (unchecked items from "Anforderungen" with count)

3. **Ask user**
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
- Issue document format, lifecycle, worktree-safety, and shared conventions: see **i-issue-management** skill
```

- [ ] **Step 2: Verify the new file reads correctly**

Run: `head -5 .claude/commands/i:resume.md`
Expected: `# i:resume` as first heading

- [ ] **Step 3: Delete old file**

```bash
git rm .claude/commands/i:breadcrumb.md
```

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/i:resume.md
git commit -m "feat: rename i:breadcrumb to i:resume with status display"
```

---

### Task 4: Rename i:dod → i:close, i:aws → i:estimate, i:issues → i:list

Three simple renames with internal reference updates. No behavioral changes.

**Files:**
- Create: `.claude/commands/i:close.md`, `.claude/commands/i:estimate.md`, `.claude/commands/i:list.md`
- Delete: `.claude/commands/i:dod.md`, `.claude/commands/i:aws.md`, `.claude/commands/i:issues.md`

- [ ] **Step 1: Create `i:close.md`**

Copy from `i:dod.md`, change:
- Title: `# i:close`
- Description: `Check Definition of Done — verify all requirements and close the issue.`
- Replace all old command references: `/i:req` → `/i:new`, `/i:note` → `/i:update`, `/i:dod` → `/i:close`, `/i:aws` → `/i:estimate`, `/i:breadcrumb` → `/i:resume`, `/i:issues` → `/i:list`

- [ ] **Step 2: Create `i:estimate.md`**

Copy from `i:aws.md`, change:
- Title: `# i:estimate`
- Description: `Create effort estimation for a Jira ticket, formatted as a Jira comment.`
- Replace all old command references (same replacements as above)

- [ ] **Step 3: Create `i:list.md`**

Copy from `i:issues.md`, change:
- Title: `# i:list`
- Description: `List all local issue documents with their status and progress.`
- Replace all old command references (same replacements as above)

- [ ] **Step 4: Delete old files**

```bash
git rm .claude/commands/i:dod.md .claude/commands/i:aws.md .claude/commands/i:issues.md
```

- [ ] **Step 5: Verify all new files exist**

```bash
ls .claude/commands/i:*.md
```

Expected: `i:board.md`, `i:close.md`, `i:estimate.md`, `i:list.md`, `i:new.md`, `i:resume.md`, `i:update.md`

- [ ] **Step 6: Commit**

```bash
git add .claude/commands/i:close.md .claude/commands/i:estimate.md .claude/commands/i:list.md
git commit -m "feat: rename i:dod, i:aws, i:issues to i:close, i:estimate, i:list"
```

---

### Task 5: Update SKILL.md

**Files:**
- Modify: `.claude/skills/i-issue-management/SKILL.md`

- [ ] **Step 1: Update all command references**

Find and replace throughout the file:
- `i:req` → `i:new`
- `i:aws` → `i:estimate`
- `i:note` → `i:update`
- `i:dod` → `i:close`
- `i:breadcrumb` → `i:resume`
- `i:issues` → `i:list`

This affects:
- Frontmatter `description` field
- Lifecycle diagram (ASCII art)
- Status table ("Gesetzt durch" column)
- Frontmatter field table ("Gesetzt durch" column)
- Section headings: `## Breadcrumbs (i:breadcrumb)` → `## Breadcrumbs (i:resume)`
- Section headings: `## Klassifizierung von Notizen (i:note)` → `## Klassifizierung von Notizen (i:update)`
- Section headings: `## CLI-Ausgabe (i:issues)` → `## CLI-Ausgabe (i:list)`
- All inline references in body text

- [ ] **Step 2: Verify no old names remain**

Run: `grep -E 'i:(req|aws|note|dod|breadcrumb|issues)' .claude/skills/i-issue-management/SKILL.md`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/i-issue-management/SKILL.md
git commit -m "docs: update SKILL.md command references to new names"
```

---

### Task 6: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update command table**

Replace the Commands table with:

```markdown
| Command | Purpose |
|---------|---------|
| `/i:new <issue> [description]` | Create new issue — gather info (via jira-cli or manual), assess scope, persist as issue document |
| `/i:estimate <issue>` | Effort estimation — reads issue document, outputs Jira comment (German) |
| `/i:update <issue> [info]` | Update issue document — add information or sync new Jira comments |
| `/i:close <issue>` | Definition of Done check — verify requirements against codebase |
| `/i:list` | List all local issue documents with status and progress |
| `/i:resume <issue> [checkpoint]` | Resume work on issue — show status or save session checkpoint |
| `/i:board` | Open Kanban board in browser — visualize issues, drag & drop status, filter, detail view |
```

- [ ] **Step 2: Update Repository Structure**

Replace command filenames in the tree:

```markdown
├── commands/
│   ├── i:new.md         # Create new issue
│   ├── i:estimate.md    # Effort estimation
│   ├── i:update.md      # Update issue / Jira sync
│   ├── i:close.md       # Definition of Done check
│   ├── i:list.md        # List all issues
│   ├── i:resume.md      # Resume work / session checkpoint
│   └── i:board.md       # Kanban board web UI
```

- [ ] **Step 3: Update Lifecycle diagram**

```markdown
i:new  ──>  i:estimate (optional)  ──>  Implementation  ──>  i:close
              │                              │
              │                     i:update / i:resume (as needed)
              │                              │
              └──────────────────────────────┘
```

- [ ] **Step 4: Update Status table**

| Status | Set by |
|--------|--------|
| `analysis` | i:new |
| `estimated` | i:estimate |
| `in-progress` | i:new (after plan confirmation) |
| `in-review` | manual or i:close (partial) |
| `done` | i:close |

- [ ] **Step 5: Verify no old names remain**

Run: `grep -E 'i:(req|aws|note|dod|breadcrumb|issues)' CLAUDE.md`
Expected: No matches (except possibly in git history references if any)

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md command references to new names"
```

---

### Task 7: Final verification

- [ ] **Step 1: Verify all command files exist with correct names**

```bash
ls -la .claude/commands/i:*.md
```

Expected: 7 files — `i:board.md`, `i:close.md`, `i:estimate.md`, `i:list.md`, `i:new.md`, `i:resume.md`, `i:update.md`

- [ ] **Step 2: Verify no old command files remain**

```bash
ls .claude/commands/i:req.md .claude/commands/i:aws.md .claude/commands/i:note.md .claude/commands/i:dod.md .claude/commands/i:breadcrumb.md .claude/commands/i:issues.md 2>&1
```

Expected: All "No such file or directory"

- [ ] **Step 3: Search for any remaining old name references**

```bash
grep -r -E 'i:(req|aws|note|dod|breadcrumb|issues)' .claude/commands/ .claude/skills/ CLAUDE.md
```

Expected: No matches

- [ ] **Step 4: Verify git status is clean**

```bash
git status
```

Expected: No uncommitted changes in tracked files
