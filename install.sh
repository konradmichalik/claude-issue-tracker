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

echo "Done. Commands available: /i:new, /i:estimate, /i:update, /i:close, /i:list, /i:resume, /i:board"
