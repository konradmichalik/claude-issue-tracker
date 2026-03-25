# i:req

Initial requirements intake for a Jira ticket — gather all information, assess scope, and persist as issue document.

## Arguments

- `<issue-key>` (required) - Jira issue key (e.g., `VBDI-255`)
- `<description>` (optional) - Ticket description, acceptance criteria, comments, links, images. If omitted and no issue document exists, the ticket is fetched via `jira-cli`.

## Workflow

### If issue document already exists (`.claude/issues/<issue-key>.md`)

1. Read the existing document
2. Show current status and requirements summary
3. Ask the user what to do:
   - Continue with implementation plan
   - Update requirements (use `/i:note` instead)
   - Start effort estimation (`/i:aws <issue-key>`)

### If no issue document exists (new ticket)

1. **Collect and structure requirements**
   - If no `<description>` was provided, fetch the ticket via jira-cli:
     ```bash
     jira issue view <issue-key> --plain --comments 10
     ```
     If `jira` is not installed or the command fails (auth error, ticket not found), ask the user to provide the description manually.
     **Note:** jira-cli delivers text only (title, description, comments) — no images. If the ticket contains screenshots or mockups, inform the user and ask them to provide the images separately.
   - If `<description>` was provided, use it directly.
   - Parse all inputs: ticket description, acceptance criteria, images, links, comments
   - List each requirement as a clear, testable bullet point
   - Identify implicit requirements (e.g., responsive behavior, a11y, error states)
   - Flag ambiguities or contradictions

2. **Analyze codebase impact**
   - Search the codebase for affected areas (files, modules, extensions, templates)
   - Identify existing patterns that can be reused
   - Check for related previous work: `git log --all --oneline --grep="<issue-key>"` and keyword searches
   - Note technical constraints (framework version, extension dependencies)

3. **Ask for missing context** (if needed)
   Only ask if truly critical information is missing:
   - Unclear acceptance criteria that change the scope significantly
   - Missing technical context (TYPO3 version, extension versions, API specs)
   - Dependencies on other tickets or teams
   - Design decisions not covered by description or images

   **Important:** If the ticket provides enough context, skip directly to step 4. List all open questions in a **single text message** (no UI dialogs). Combine with findings from step 2 to give the user a complete picture.

4. **Assess scope and decide next step**
   Present a short assessment to the user:
   - **Complexity**: Low / Medium / High
   - **Estimated scope**: Small (< 4h), Medium (4-16h), Large (> 16h)
   - **Recommendation**:
     - **Small/Medium with clear requirements** → Direct implementation (create plan)
     - **Large or unclear scope** → Effort estimation first (`/i:aws <issue-key>`)
     - **Missing critical info** → Resolve questions first, then re-assess

   Ask the user to confirm the recommended path before proceeding.

5. **Save issue document**
   Write the structured analysis to `.claude/issues/<issue-key>.md` using the issue document format (see below).
   - Status: `analysis`
   - All requirements as checkboxes
   - Affected areas, open questions, assessment

6. **Review in browser**
   - Open the issue document with `/annotate:md .claude/issues/<issue-key>.md`
   - The user can review and annotate the analysis visually
   - Wait for the user to confirm or request changes before proceeding

7. **Create implementation plan** (only if user confirms direct implementation)
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
- Issue document format, lifecycle, worktree-safety, and shared conventions: see **i-issue-management** skill
