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
   For each unchecked requirement:
   - Search the codebase for evidence that it was implemented
   - Check the affected areas listed in the issue document
   - Use `git diff main...HEAD` (or appropriate base branch) to see what changed
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

## Rules

- **Read-only on codebase** — this command only analyzes, never modifies code
- **Evidence-based** — every "Umgesetzt" needs a file reference or diff evidence
- **Honest assessment** — do not mark requirements as done if the evidence is weak
- **Include Nachträge** — requirements added via i:update count equally
- **Actionable** — if something is missing, say what specifically needs to be done
- Issue document format, lifecycle, worktree-safety, and shared conventions: see **i-issue-management** skill
