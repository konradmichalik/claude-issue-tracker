# i:close

Check Definition of Done — verify all requirements and close the issue.

## Arguments

- `<issue-key>` (required) - Jira issue key (e.g., `VBDI-255`)

## Workflow

1. **Read issue document**
   - Load `.claude/issues/<issue-key>.md`
   - If not found: tell the user to run `/i:new <issue-key>` first

2. **Extract all requirements**
   - Collect all checkboxes from the "Anforderungen" section (including Nachträge and Testfeedback)
   - Note which are already checked and which are open

3. **Verify each requirement against the codebase**
   Determine the base branch instead of assuming `main`:
   ```bash
   BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
   [ -n "$BASE" ] || BASE=$(git config --get init.defaultBranch)
   [ -n "$BASE" ] || for b in main master; do
     git rev-parse --verify "$b" >/dev/null 2>&1 && BASE="$b" && break
   done
   git diff "$BASE...HEAD" --stat
   ```
   Keep the `[ -n "$BASE" ] ||` guards — in a `cmd | sed || fallback` chain the exit status comes from `sed`, which succeeds on empty input, so the fallback never fires. If `BASE` stays empty or equals the current branch, say so and verify against the working tree instead of a diff.
   For each unchecked requirement:
   - Search the codebase for evidence that it was implemented
   - Check the affected areas listed in the issue document
   - Use the diff against `$BASE` to see what changed
   - Consult the "Quellen" section — attachments and Confluence pages define visual and functional acceptance criteria
   - Classify as:
     - **Umgesetzt** — clear evidence in code
     - **Teilweise umgesetzt** — partially done, describe what's missing
     - **Nicht umgesetzt** — no evidence found
     - **Nicht prüfbar** — cannot verify from code alone (e.g., visual requirement, needs manual test)

4. **Present results**

   ```
   ## DoD-Check: <ISSUE-KEY>

   ### Umgesetzt (X/Y)
   - [x] Requirement 1 — `path/to/file.ts:42`
   - [x] Requirement 2 — `path/to/component.html:15`

   ### Teilweise umgesetzt
   - [ ] Requirement 3 — Mobile-Ansicht fehlt noch (Desktop implementiert in `view.ts:88`)

   ### Nicht umgesetzt
   - [ ] Requirement 4

   ### Nicht prüfbar (manueller Test nötig)
   - [ ] Requirement 5 — Visuelles Layout, Screenshot-Vergleich empfohlen

   ### Zusammenfassung
   X von Y Anforderungen umgesetzt. [Empfehlung: was noch zu tun ist]
   ```

5. **Update issue document**
   - Check off verified requirements in the issue document
   - If all requirements are met: set status to `done`
   - If open items remain: keep current status, list what's missing
   - Update `updated` date

6. **Offer Jira transition** (only if all requirements are met)
   - Read the current Jira status: `jira issue view <issue-key> --raw | jq -r '.fields.status.name'`
   - Ask which target status is intended and confirm — never transition automatically
   - On confirmation:
     ```bash
     jira issue move <issue-key> "<STATE>" --comment "<optionale Zusammenfassung>"
     ```
   - `STATE` must match the project's workflow exactly. If the transition is rejected, report the error and ask for the correct name instead of guessing
   - On success: record `- Jira-Status gesetzt auf <STATE> am <YYYY-MM-DD HH:MM>` under "Quellen"
   - If requirements are still open, skip this step entirely

## Rules

- **Read-only on codebase** — this command only analyzes, never modifies code
- **No transition without confirmation** — and never while requirements are open
- Data sources, CLI preflight, and write-back rules: read `.claude/skills/i-issue-management/SKILL.md` directly (`Read` tool), chapter „Datenquellen & CLIs"
- **Evidence-based** — every "Umgesetzt" needs a file reference or diff evidence
- **Honest assessment** — do not mark requirements as done if the evidence is weak
- **Include Nachträge** — requirements added via i:update count equally
- **Actionable** — if something is missing, say what specifically needs to be done
- Issue document format, lifecycle, worktree-safety, and shared conventions: read `.claude/skills/i-issue-management/SKILL.md` directly (`Read` tool)
