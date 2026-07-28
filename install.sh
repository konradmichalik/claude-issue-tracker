#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "Installing claude-issue-tracker..."

# Commands
mkdir -p "$CLAUDE_DIR/commands"
for cmd in "$SCRIPT_DIR/.claude/commands/"i:*.md; do
  name="$(basename "$cmd")"
  ln -sf "$cmd" "$CLAUDE_DIR/commands/$name"
  echo "  Linked command: $name"
done

# Skills
mkdir -p "$CLAUDE_DIR/skills"
ln -sfn "$SCRIPT_DIR/.claude/skills/i-issue-management" "$CLAUDE_DIR/skills/i-issue-management"
echo "  Linked skill: i-issue-management"

# Board
(cd "$SCRIPT_DIR/board" && npm install --silent && npm link --silent)
echo "  Linked board: issue-board"

echo ""
echo "Checking optional integrations:"
if command -v jira >/dev/null 2>&1 && jira me >/dev/null 2>&1; then
  echo "  jira-cli: ok"
else
  echo "  jira-cli: missing or not authenticated — tickets must be pasted manually (see README)"
fi
if command -v confluence >/dev/null 2>&1 && confluence spaces -l 1 --json >/dev/null 2>&1; then
  echo "  confluence-cli: ok"
else
  echo "  confluence-cli: missing or not configured — linked Confluence pages will be skipped (see README)"
fi
if [ -r "$HOME/.netrc" ]; then
  echo "  ~/.netrc: present — attachment downloads enabled"
else
  echo "  ~/.netrc: missing — ticket attachments cannot be downloaded (see README)"
fi

echo ""
echo "Done. Commands available: /i:new, /i:estimate, /i:update, /i:close, /i:list, /i:resume, /i:migrate, /i:board"
