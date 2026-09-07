# Trackers and ref resolution

One input form for everything. `bin/i ref <input>` shows what any given input
resolves to without touching the network.

| Input | Tracker | Document |
| --- | --- | --- |
| (empty) | — | active issue: branch → `branch:` field → newest `in-progress` |
| `VHWWEB-312` | Jira | `VHWWEB-312.md` |
| `https://…atlassian.net/browse/X-1` | Jira | `X-1.md` |
| `https://github.com/o/r/issues/9` | GitHub | `GH-9.md` |
| `22` | GitHub, resolved via the `origin` remote | `GH-22.md` |
| `https://forge.typo3.org/issues/110434` | Redmine | `RM-110434.md` |
| free text | none — a regular, first-class case | `<slug>.md` |

`GH-` and `RM-` are deliberate prefixes, not the bare issue number: filenames
stay greppable across tools that don't know the tracker (`bin/i recall GH-101`
finds it in a Claude Code transcript; a bare `101` would match too much).

```bash
bin/i ref 22
```

<details>
<summary>Output</summary>

```json
{
  "tracker": "github",
  "key": "GH-22",
  "ref": "konradmichalik/revkit#22",
  "url": "https://github.com/konradmichalik/revkit/issues/22",
  "filename": "GH-22.md",
  "owner": "konradmichalik",
  "repo": "revkit",
  "number": 22
}
```

</details>

## Per-tracker requirements

> [!IMPORTANT]
> Missing a tracker's CLI does not abort `/i:new` — it reports the gap once
> and continues with whatever text you supplied. Check all of the below at
> once with [`bin/i doctor`](cli-reference.md#bini-doctor).

- **Jira** — [jira-cli](https://github.com/ankitpokhrel/jira-cli), authenticated (`jira me`).
- **GitHub** — [gh](https://cli.github.com/), authenticated (`gh auth status`).
- **Redmine** — `curl` only; read-only, no comment posting. Redmine hosts
  default to `forge.typo3.org`. Additional hosts go in
  `~/.config/i/trackers.json`:

  ```json
  { "redmineHosts": ["forge.typo3.org", "bugs.your-project.org"] }
  ```

- **Confluence** (optional) — [confluence-cli](https://github.com/pchuri/confluence-cli),
  for pages linked from a Jira ticket. `export CONFLUENCE_READ_ONLY=true` is
  recommended; nothing here ever writes to Confluence.

## Attachment credentials (Jira only)

`/i:new` downloads images and PDFs so they can actually be evaluated as
requirements. Authentication goes through `~/.netrc`, keeping the API token
out of command lines, environment variables, and config files:

```text
machine your-site.atlassian.net
  login you@example.com
  password <atlassian-api-token>
```

```bash
chmod 600 ~/.netrc
```

Without this entry, attachments are listed but not downloaded, and you're
asked to paste images into the chat instead.
