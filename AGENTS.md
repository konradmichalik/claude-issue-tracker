# AGENTS.md

## Project overview

A local, tracker-agnostic issue tracker for Claude Code. It works with Jira, GitHub, Redmine or no tracker at all, keeps issues as Markdown documents, investigates the codebase through subagents, tracks findings and posts status updates back to the tracker.

This repository is the tooling itself. It ships as a Claude Code plugin (`.claude-plugin/plugin.json` and `marketplace.json`, plugin name `i`): four slash commands, four subagents, one skill, two hooks (`SessionStart`, `Stop`) and `bin/i`, a small Node CLI (plain ESM, no dependencies) that is the only component talking to a tracker.

## Structure

- `.claude-plugin/plugin.json`: plugin manifest, name `i` so commands resolve as `/i:new` and so on
- `.claude-plugin/marketplace.json`: makes the repo installable via `claude plugin marketplace add ./`
- `commands/{new,update,report,note}.md`: slash commands, prompt specs and not code
- `agents/{locate,history,patterns,reproduce}.md`: subagent contracts used inside `/i:new`
- `skills/issue-management/SKILL.md`: single source of truth for document format, lifecycle and section conventions
- `hooks/hooks.json`, `session-start.sh`, `stop.sh`: SessionStart prints active-issue status, Stop nudges once per session for an unrecorded, dirty active issue
- `bin/i`: CLI for ref resolution, fetch, sync, post, attach, sessions, recall, list, status, check-note
- `lib/`: the only code that talks to trackers or parses and writes issue Markdown (`ref.js`, `doc.js`, `normalize.js`, `cache.js`, `diff.js`, `render.js`, `recall.js`, `migrate.js`, `adapters/{jira,github,redmine}.js`)
- `docs/`: `cli-reference.md`, `commands.md`, `document-format.md`, `trackers.md`
- `install.sh`, `uninstall.sh`: wrap the `claude plugin` install and uninstall commands

## Architecture rules

- `bin/i` is the single point of external access. Commands call `${CLAUDE_PLUGIN_ROOT}/bin/i <subcommand>` and never shell out to `jira`, `gh` or `curl` directly
- Adapters shell out with `execFileSync(bin, [args])`, never `execSync` with string interpolation. This keeps shell injection structurally impossible, also for any future adapter
- All adapters normalize to one shape in `lib/normalize.js` (`title, state, body, comments[], attachments[], parent, children, links[], labels`)
- The issue document format has two implementations that must stay in sync: the prose in `SKILL.md` and the regex parser in `lib/doc.js`. A format change touches both. Legacy documents are handled on read through `SECTION_ALIASES`, new writes are always canonical
- Worktree-safe `.issues/` resolution lives only in `resolveIssuesDir()` in `lib/doc.js`
- The sync cache `.issues/.cache/<key>.json` is the comparison point, `lib/diff.js` compares comments by ID
- Both hooks stay silent (exit 0, no output) when `.issues/` does not exist or no issue is active, since they run in every project. The `Stop` hook blocks at most once per session, only for a branch-resolved `in-progress` issue with a dirty tree and no `Erkenntnisse` entry today, and fails open. `check-note` treats stdin as untrusted, reads it only when it is not a TTY and validates `session_id` against `^[A-Za-z0-9._-]{1,128}$`
- `plugin.json` stays minimal. Do not add `commands`, `agents`, `skills` or `hooks` fields, they are auto-discovered and declaring them breaks validation or plugin loading

## Development commands

```bash
./install.sh                              # register and install the plugin (user scope)
claude --plugin-dir /path/to/this-repo    # session that reads the working directory live
node bin/i ref "<input>"                  # inspect ref resolution
node bin/i fetch "<ref>"                  # read-only network call
node bin/i doctor                         # check tracker CLIs
```

The installed plugin runs from `~/.claude/plugins/cache/issue-tracker/i/<version>/`, not from the working directory. To refresh it after a change run all three commands, because a plain `install` copies nothing even after a version bump:

```bash
claude plugin marketplace update issue-tracker
claude plugin uninstall i@issue-tracker
claude plugin install i@issue-tracker --scope user -y
```

## Testing

There is no test suite, linter or build step and no CI workflow. Verify a change as follows:

```bash
node --check lib/<file>.js            # syntax
claude plugin validate .              # manifest and command frontmatter
```

Then run the relevant `bin/i` subcommand (`status`, `list`, `active`) against local fixture issues in a gitignored `.issues/`, and against a real read-only tracker call where possible. Re-verify with a real `claude plugin install` after editing `plugin.json`, since `validate` misses some conflicts.

## Code style and linting

No linter or formatter is configured.

- Documents follow the tracker language: German for Jira and Redmine, English for GitHub
- Issue documents are append-only. Only checkbox state and frontmatter change in place
- Check off a requirement only after verification and never reformulate or delete its text, `/i:report` and `bin/i status` trust the checkbox as fact
- Credentials come from `~/.netrc` via `curl --netrc`. Never read the keychain or inline a token
- `.issues/` is never committed, it is gitignored
- When editing a command, keep it consistent with the others: shared tone and `Arguments`, `Workflow`, `Rules` structure, with format details deferred to the skill

## Git workflow

- Commit format: `<type>: <description>`, with type one of feat, fix, refactor, docs, test, chore, perf, ci
- Single line, describe the change and not what prompted it, no co-author trailers
- Open an issue first for anything that changes the document format or tracker sync behavior
