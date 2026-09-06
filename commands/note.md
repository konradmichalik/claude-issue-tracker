---
description: Save a session breadcrumb to the active issue
---

# i:note

Save a session breadcrumb — the write half of the old i:resume.

Also the command the Stop hook points you to when it holds a session back: uncommitted changes on the active issue plus no `Erkenntnisse` entry today. Writing one here satisfies that check for the rest of the session.

## Arguments

- `[text]` (optional) — what you've done and what's next. If generic or empty, summarize the current session's recent work instead.

## Workflow

1. Resolve the active issue via `${CLAUDE_PLUGIN_ROOT}/bin/i active`. None found: tell the user, stop.
2. If `text` is generic or empty, generate the breadcrumb from recent tool calls and file changes in this session — max 3-4 bullets.
3. Append to `Erkenntnisse`:
   ```
   - <date> HH:MM 🔖 <summary>
     - Erledigt: <what was completed>
     - In Arbeit: <current state>
     - Nächster Schritt: <specific next action>
   ```
4. Update `updated`.
5. Confirm, and remind: "Dieser Breadcrumb bleibt erhalten, auch wenn der Context komprimiert wird."

## Rules

- **Append-only**, timestamped, max 5 lines, "Nächster Schritt" specific enough to resume without re-reading the session.
- Reading current status is the SessionStart hook's job now, not this command's — this command only writes.
