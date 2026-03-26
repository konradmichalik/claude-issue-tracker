# i:estimate

Create effort estimation for a Jira ticket, formatted as a Jira comment.

## Arguments

- `<issue-key>` (required) - Jira issue key (e.g., `VBDI-255`)
- `<requirement>` (required if no issue document exists) - The requirement text from the Jira ticket

## Workflow

1. **Check for existing issue document**
   - Look for `.claude/issues/<issue-key>.md`
   - If found: use the structured requirements, affected areas, and open questions as input — do NOT re-analyze from scratch
   - If not found: require `<requirement>` argument and proceed with direct analysis

2. **Analyze requirement**
   - Read and understand the requirement (from issue document or argument)
   - Identify technical scope and affected areas
   - Identify involved dependencies (extensions, packages, APIs)

3. **Research dependencies**
   - For identified extensions/packages: research current capabilities and version constraints (use WebSearch)
   - Example: If Powermail CSV export is needed, check if the installed Powermail version supports it natively or if custom code is required
   - This directly impacts the estimate (native feature vs. custom development)

4. **Search for related previous work**
   - Extract keywords from the requirement (feature names, technologies, extensions, domains)
   - Use hints from the requirement text (e.g., mentioned modules, page types, extension names) to narrow the search
   - Search git log for related commits: `git log --all --oneline --grep="<keyword>"` for each keyword
   - Also search commit messages for Jira issue keys (pattern `[A-Z]+-\d+`) in matching commits
   - If the requirement itself contains a Jira key, search for commits with that key and related keys from the same project prefix
   - If relevant matches found: present a brief summary to the user (commit hash, message, Jira key if present) and ask whether these references are helpful to include
   - Only include confirmed references in the output (see "Referenzen" section in Output Format)
   - If no matches found or user declines, skip the Referenzen section entirely

5. **Check for missing context**
   Only ask if truly critical information is missing that would significantly change the estimate:
   - Technology/framework version (e.g., TYPO3 12 vs 13)
   - Extension versions (e.g., Powermail 8 vs 12 - capabilities differ significantly)
   - Existing codebase or extension that can be reused
   - Blocking dependencies on other tickets

   **Important:** If the ticket or issue document provides enough context, skip directly to step 6. Do not ask unnecessary questions. List all open questions in a single text message (no UI dialogs). Combine with reference confirmation from step 4 if both apply.

6. **Break down into tasks**
   - Identify logical subtasks (implementation, testing, deployment)
   - Estimate each subtask in hours (realistic, not optimistic)
   - Factor in research findings (native support vs. custom code)

7. **Generate Jira comment**
   - Use Jira wiki markup
   - Copy-ready output

8. **Update issue document** (if it exists)
   - Add estimation summary to the "Aufwandsschätzung" section
   - Update status to `estimated`
   - Update `updated` date

9. **Review with user**
   - Ask if the estimation looks correct
   - Offer adjustment (e.g., +/- 20%)
   - Regenerate Jira comment if corrected

## Output Format

```
h3. Vorgehensweise

* Subtask 1 - brief description of what to do
** Detail step or consideration
** Detail step or consideration
* Subtask 2 - brief description of what to do
** Detail step or consideration
* Subtask 3 - brief description of what to do

h3. Aufwandsschätzung

|| Aufgabe || Aufwand (in Std.) ||
| *Prio 1* | |
| Subtask 1 | X |
| Subtask 2 | X |
| *Prio 2* | |
| Subtask 3 | X |
| *Gesamt* | *X (X Tage)* |

h3. Anmerkungen

* Assumption or risk 1
* Assumption or risk 2

h3. Referenzen

* [PROJ-123|https://jira.example.com/browse/PROJ-123] - Brief description of related previous work
* {{commit abc1234}} - Brief description of related commit
```

Note: The "Referenzen" section is **only included if relevant previous work was found AND confirmed by the user** in step 4. Omit it entirely otherwise. Jira keys should be linked using Jira markup `[KEY-123|URL]` if the Jira base URL can be inferred from the requirement or context. Commits are referenced with `{{short-hash}}` and a brief description.

## Rules

- **Requires i:new first** — if no issue document exists and no `<requirement>` is given, tell the user to run `/i:new <issue-key>` first
- **Keep it short** — scannable in under 30 seconds, no prose
- Vorgehensweise: **detailed bullet points with sub-bullets** — concrete steps, tools, considerations
- Subtasks (Aufwandsschätzung): **max 3-7 items**, group small tasks. **Bold** (`*...*`) for headers (*Prio 1*, *Prio 2*, *Gesamt*)
- Anmerkungen: **max 3-5 bullet points**, only real risks or assumptions
- Only ask questions if **critical context is truly missing**
- Estimate in **hours** (realistic, include buffer). Total also in **Jira days (1 Tag = 8 Std.)**. Tasks can be < 1h (e.g., 0,5 Std.)
- **Jira wiki markup** — *bold*, _italic_, {{monospace}}, {quote}. No code fences around output.
- Issue document format, lifecycle, worktree-safety, and shared conventions: see **i-issue-management** skill
