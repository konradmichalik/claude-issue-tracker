# i:new

Create a new issue document for a Jira ticket — gather all information, assess scope, and persist.

## Arguments

- `<issue-key>` (required) - Jira issue key (e.g., `VBDI-255`)
- `<description>` (optional) - Ticket description, acceptance criteria, comments, links, images. Supplements the Jira fetch rather than replacing it; only when jira-cli is unavailable does it become the sole source.

## Workflow

### If issue document already exists (`.claude/issues/<issue-key>.md`)

1. **Abbruch**: `Issue-Dokument für <issue-key> existiert bereits. Nutze /i:resume <issue-key> um daran weiterzuarbeiten.`

### If no issue document exists (new ticket)

1. **Fetch the ticket** — whenever an issue key is given, even if `<description>` was supplied. Pasted text cannot provide attachments, parent, or links; the raw payload can.

   Run the preflight and the fetch block from the skill's „Datenquellen & CLIs" chapter, then evaluate the JSON with the jq snippets documented there: core fields incl. Jira status, attachments, context graph, links.

   Preflight failures are handled as specified in the skill — do not re-decide the behaviour here.

2. **Load and view attachments**
   - Download `image/*` and `application/pdf` attachments per the skill (`curl --netrc` into `$ISSUES_DIR/attachments/<issue-key>/`)
   - **View every downloaded image with `Read`** and derive visual requirements, states, and edge cases from it
   - Only if the download fails: ask the user to paste the images into the chat

3. **Follow Confluence links**
   - Extract wiki URLs from the ADF (jq snippet in the skill)
   - Read each linked page: `confluence read "<url>" --format markdown`, note title/version via `confluence info "<url>" --json`
   - Optionally search for related specs: `confluence search "<issue-key or feature>" --limit 5`
   - Treat these pages as a requirements source. Contradictions between ticket and page become **open questions** — never resolve them yourself

4. **Pull in the ticket context graph**
   - If the ticket has a `parent` (Epic/Story), read it — for subtasks the acceptance criteria usually live there, not in the ticket itself
   - Read linked issues (`blocks` / `is blocked by` / `relates to`) at summary level for scope and dependencies
   - List subtasks so the scope assessment covers them

5. **Structure the requirements**
   - Parse all sources together: description, acceptance criteria, comments, images, Confluence pages, parent
   - List each requirement as a clear, testable bullet point
   - Identify implicit requirements (e.g., responsive behavior, a11y, error states)
   - Flag ambiguities or contradictions
   - Note per requirement where it came from when it is not the ticket description itself

6. **Analyze codebase impact**
   - Search the codebase for affected areas (files, modules, extensions, templates)
   - Identify existing patterns that can be reused
   - Check for related previous work: `git log --all --oneline --grep="<issue-key>"` and keyword searches
   - Note technical constraints (framework version, extension dependencies)

7. **Ask for missing context** (if needed)
   Only ask if truly critical information is missing:
   - Unclear acceptance criteria that change the scope significantly
   - Missing technical context (TYPO3 version, extension versions, API specs)
   - Dependencies on other tickets or teams
   - Design decisions not covered by description, images, or linked Confluence pages

   **Important:** If the sources provide enough context, skip directly to step 8. List all open questions in a **single text message** (no UI dialogs). Combine with the codebase findings and anything that could not be fetched to give the user a complete picture.

8. **Assess scope and decide next step**
   Present a short assessment to the user:
   - **Complexity**: Low / Medium / High
   - **Estimated scope**: Small (< 4h), Medium (4-16h), Large (> 16h)
   - **Recommendation**:
     - **Small/Medium with clear requirements** → Direct implementation (create plan)
     - **Large or unclear scope** → Effort estimation first (`/i:estimate <issue-key>`)
     - **Missing critical info** → Resolve questions first, then re-assess

   Ask the user to confirm the recommended path before proceeding.

9. **Save issue document**
   Write the structured analysis to `.claude/issues/<issue-key>.md` using the issue document format.
   - Status: `analysis`
   - `jira_synced`: current timestamp, if the ticket was fetched from Jira
   - All requirements as checkboxes
   - Affected areas, open questions, assessment
   - `## Quellen`: ticket, parent, Jira links, Confluence pages (ID + version), attachment paths — including sources that could not be fetched

10. **Review in browser** (optional — requires `md-annotator`)
   - Open the issue document with `/annotate:md .claude/issues/<issue-key>.md`
   - The user can review and annotate the analysis visually
   - If `md-annotator` is not installed, skip this step and ask for confirmation in the chat instead
   - Wait for the user to confirm or request changes before proceeding

11. **Create implementation plan** (only if user confirms direct implementation)
   - Break down into ordered, concrete steps
   - Each step references specific files/modules to create or modify
   - Include test strategy (what to test, which test types)
   - Include deployment considerations if applicable
   - Update the issue document: add plan, set status to `in-progress`
   - Present the plan and **wait for user confirmation** before any implementation

## Rules

- **No implementation before plan confirmation** — gather info first, act later
- **One message for questions** — never drip-feed questions across multiple turns
- **Respect existing patterns** — identify how similar features were built before suggesting an approach
- **Read-only externally** — i:new never writes to Jira or Confluence
- **Attachments are requirements** — download and actually look at them; delegating to the user is the fallback, not the default
- **Name what is missing** — unfetched attachments, unread Confluence pages, and truncated comments belong in the output, not in silence
- Data sources, CLI preflight, jq snippets, and attachment handling: read `.claude/skills/i-issue-management/SKILL.md` directly (`Read` tool), chapter „Datenquellen & CLIs"
- Issue document format, lifecycle, worktree-safety, and shared conventions: read `.claude/skills/i-issue-management/SKILL.md` directly (`Read` tool)
