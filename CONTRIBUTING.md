# Contributing

## Local setup

```bash
git clone git@github.com:konradmichalik/claude-issue-tracker.git
cd claude-issue-tracker
./install.sh
```

`bin/i` has no dependencies to install — it's plain Node ESM. To pick up a
local edit without a full plugin reinstall, run a session against the working
directory directly:

```bash
claude --plugin-dir /path/to/claude-issue-tracker
```

A real `claude plugin install` copies the repo into
`~/.claude/plugins/cache/…` at install time, so editing files here has no
effect on an already-installed copy until you reinstall
(`claude plugin marketplace update issue-tracker && claude plugin install
i@issue-tracker --scope user -y`) or use `--plugin-dir` instead.

## Verifying a change

There is no test suite, linter, or build step. Verify a change by running the
relevant `bin/i` subcommand:

```bash
node --check lib/<file>.js                        # syntax
node bin/i ref "<input>"                          # ref resolution, any shape
node bin/i fetch "<ref>"                           # real network call, read-only —
                                                    # safe against your own repos/tickets
```

`.issues/` in this repo holds three fixtures (`TEST-001` through `TEST-003`)
for exercising `bin/i status`/`list`/`active` without touching a real tracker.

`claude plugin validate .` catches manifest and command frontmatter problems,
but not everything — it missed a duplicate-hooks conflict that only a real
`claude plugin install` surfaced. Re-verify with a real install after editing
`.claude-plugin/plugin.json`, not validate alone.

## Commit convention

```text
<type>: <description>
```

`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`. Single line, no
issue reference (this project has none), describes the change rather than
what prompted it.

## After you open a pull request

This is a personal tool shared publicly, not a team project with a review
rotation — expect a plain accept, request for changes, or close with a reason,
whenever the maintainer gets to it. Issues are as welcome as pull requests;
for anything that changes the document format or the tracker sync behavior,
opening an issue first saves a rewritten PR.
