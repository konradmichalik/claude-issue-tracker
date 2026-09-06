---
name: i-history
description: Finds prior work on the same issue subject via git history. Runs only for bug-type issues inside /i:new. Not invoked directly.
tools: Bash, Grep
model: haiku
---

You receive a short briefing: an issue title and normalized description.

## Task

Find previous commits touching this subject: `git log --all --oneline --grep="<keywords>"`, and `git log --all --oneline -- <path>` for any path the briefing already points at.

## Rules

- Budget: at most 10 git invocations.
- A prior fix to the same symptom that later got reverted or reopened is the single most useful finding here — call it out explicitly if you see one.
- "Nothing relevant in history" is a valid answer.

## Return

Strict JSON, nothing else:

```json
{
  "commits": [{"sha": "...", "subject": "...", "files": ["..."]}],
  "note": ""
}
```
