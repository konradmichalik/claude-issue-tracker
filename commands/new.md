---
description: Create a new issue document — fetch from any tracker (or none), investigate the codebase via subagents, and persist
---

# i:new

Create a new issue document — fetch from any tracker (or none), investigate the codebase via subagents, and persist.

## Arguments

- `<ref>` (required) — a tracker key (`VHWWEB-312`), a tracker URL (Jira, GitHub, Redmine), a bare GitHub issue number, or free text describing a topic that has no tracker.
- `[text]` (optional) — supplements the fetched payload. For a `ref` with no tracker, this is the primary content.

## Workflow

### 1. Resolve the reference

Run `${CLAUDE_PLUGIN_ROOT}/bin/i ref "<ref>"`. It returns `{tracker, key, ref, url, filename}`.

- `tracker` is `jira`, `github`, `redmine`, or `none`.
- `filename` is the target path under `.issues/<filename>`.

### 2. Existing document — offer to switch to /i:update

If `.issues/<filename>` exists, ask: `Issue-Dokument existiert bereits. Mit /i:update fortfahren?` On confirmation, hand off to `/i:update <ref> [text]` with the same arguments and stop this workflow. On decline, stop without further action.

### 3. Fetch — skip entirely if `tracker` is `none`

Run `${CLAUDE_PLUGIN_ROOT}/bin/i fetch "<ref>"`. Returns the normalized payload: `title, state, body, comments[], attachments[], parent, children, links[], labels`.

- If the tracker's CLI is missing or unauthenticated, `bin/i fetch` reports this on stderr and exits non-zero. Tell the user once, and continue with only the supplied `[text]` if given — never abort silently.
- Attachments: `${CLAUDE_PLUGIN_ROOT}/bin/i attach "<ref>" --dest .issues/attachments/<key>` downloads `image/*` and `application/pdf` up to 10 MB, authenticated via `~/.netrc` for Jira. **View every downloaded image with `Read`** and derive visual requirements, states, and edge cases from it.
- Confluence links found in the payload body: read each once (`confluence read "<url>" --format markdown`), note title and version (`confluence info "<url>" --json`). Contradictions between ticket and page are open questions — never resolved by you.
- If the payload has a `parent`, fetch it too (`bin/i fetch <parent-key>`) — acceptance criteria for subtasks usually live there, not in the ticket itself.

### 4. Structure requirements

Parse the fetched payload and any supplied `[text]` together. List each requirement as a clear, testable bullet. Flag implicit requirements (a11y, responsive behavior, error states) and contradictions. Note per requirement where it came from when it isn't the obvious source (parent, Confluence, a specific comment).

### 5. Investigate the codebase — subagents, not manual search

Determine `type` (bug / feature / task) from tracker labels, or ask if `tracker: none` and it isn't obvious from the text.

Launch, in parallel, each with a briefing containing only the title + normalized body + acceptance criteria — no comments, no links, no attachments:

- Always: `i-locate`, `i-patterns`
- Only if `type` is bug: `i-history`, `i-reproduce`

Each agent returns strict JSON (see `agents/*.md`), including an `unresolved`/`nicht-auffindbar` outcome — treat that as a real answer, not a signal to retry. If `i-reproduce` returns `abweichend`, that goes into "Offene Fragen", not silently into "Betroffene Bereiche".

### 6. Write the document

Create `.issues/<filename>` with the frontmatter and sections defined in `skills/issue-management/SKILL.md`. **Only write a section if it has content — do not create empty headings.** `## Zusammenfassung` is mandatory: 2-4 sentences on what this is, why it matters, and the current state.

Set `tracker`, `ref`, `url` from step 1.

**Document language** follows the tracker: `jira`/`redmine` → German, `github` → English, `none` → the language of the surrounding project's own docs (ask if unclear).

### 7. Ask what's missing — once, combined

If critical information is still missing after steps 3-5 (unclear acceptance criteria that change scope, missing technical context, a design decision no source covers), ask now, in a **single message** covering every open point — never drip-fed across turns. Combine with whatever could not be fetched (missing CLI, unreachable Confluence page, a subagent's `unresolved`) so the user sees the complete picture at once. If the sources were sufficient, skip straight to step 8.

### 8. Confirm scope before implementing

Present the requirements and codebase findings, with a short informal read on complexity and likely scope to help the decision — this is not stored in the document, `complexity`/`scope` frontmatter fields were dropped for lack of any consumer. **Wait for explicit confirmation before writing implementation code.**

Optional: if `md-annotator` is installed, offer `/annotate:md .issues/<filename>` for a visual review pass before the user confirms. Skip silently if it isn't installed — ask for confirmation in the chat instead.

### 9. Create the branch

On confirmation:

- `tracker` is `jira` or `redmine`: `<KEY>-<Slug>` (slug from title, kebab-case, no type prefix)
- `tracker` is `github` or `none`: `<type>/<slug>`, where `type` comes from the issue's own label (`bug`→`fix`, `enhancement`→`feat`) or is asked for

Set `status: in-progress` and `branch: <name>` (`${CLAUDE_PLUGIN_ROOT}/bin/i set "<ref>" branch=<name>` — status can be set the same way).

### 10. Record the session

`${CLAUDE_PLUGIN_ROOT}/bin/i session-add "<ref>" <sessionId> <branch>` — the session ID is available in this session's own context.

## Rules

- **No implementation before confirmation** (step 8).
- **One message for questions** — never drip-feed across turns (step 7).
- **No invention** — insufficient information means asking, not guessing scope.
- **Bilder sind Anforderungen** — every downloaded image gets viewed and analyzed, never delegated to the user while download is possible.
- **Keine leeren Abschnitte** — a section with nothing to say is not written at all.
- Format, lifecycle, and section conventions: read `skills/issue-management/SKILL.md` (`Read` tool).
