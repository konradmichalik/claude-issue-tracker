# The four commands

```text
/i:new <ref> [text]
/i:update [ref] [text]
/i:report [ref] [text]
/i:note [text]
```

All four resolve `ref` the same way — see [Trackers and ref resolution](trackers.md).
Omitting it resolves the active issue: current branch, then a document whose
`branch:` field matches, then the newest `in-progress` document.

## `/i:new`

```text
/i:new VHWWEB-312
/i:new https://github.com/konradmichalik/beacon/issues/101
/i:new "Wie können wir Stage-Inhalte auf Prod übertragen?"
```

Resolves the reference, fetches the ticket (skipped entirely for a
tracker-less topic), downloads and reads attachments, follows linked
Confluence pages, then investigates the codebase through four subagents —
`locate` and `patterns` always, `history` and `reproduce` only for a bug.
Presents the findings and **waits for confirmation** before writing any code.
On confirmation it creates the working branch and the issue document; see
[The document format](document-format.md).

Refuses to run if a document for that reference already exists — use
`/i:update` on an existing one instead.

## `/i:update`

```text
/i:update
/i:update VHWWEB-312 "Sortierung greift auf Seite 3 nicht"
```

Without `text`: syncs against the tracker and reports only the delta since the
last sync — new comments, a status change, new attachments, label changes.
Never a full re-fetch — `bin/i sync` underneath diffs against the last cached
payload; see [the `bin/i` reference](cli-reference.md) for the other internal
subcommands.

With `text`: classifies it and files it into the right section —
a new requirement, a bug report, a technical finding, or a decision.
`tracker: none` documents skip the sync path entirely; there is nothing to
sync against.

## `/i:report`

```text
/i:report
/i:report VHWWEB-312 "kurz vor dem Review"
```

Builds a status update from the requirement checkboxes — checked become
"Erledigt", unchecked become "Offen" — plus any decision or finding newer
than the last report. **Always shown for confirmation before it posts
anywhere.** Language follows the tracker: German for Jira and Redmine,
English for GitHub, asked for `tracker: none`.

Add "abschluss" (or "closing") to post a closing update instead of a
progress one; only applies it as an actual close on the tracker if every
requirement is checked.

## `/i:note`

```text
/i:note
/i:note "Rate-Limit-Middleware fertig, Tests fehlen noch"
```

Appends a timestamped breadcrumb to the active issue's Erkenntnisse section —
what was done, what's in progress, what's next. Survives context compaction
and session restarts. With no text, summarizes the session's recent work
instead of asking for one.

This is also what the `Stop` hook points you to when it holds a session back
— see [The document format](document-format.md#sessions-and-the-stop-hook).
