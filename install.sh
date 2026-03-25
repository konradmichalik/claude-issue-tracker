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
ln -sfn "$SCRIPT_DIR/board" "$CLAUDE_DIR/board"
echo "  Linked board: board/"

# Install board dependencies if needed
if [ ! -d "$SCRIPT_DIR/board/node_modules" ]; then
  echo "  Installing board dependencies..."
  (cd "$SCRIPT_DIR/board" && npm install --silent)
fi

echo "Done. Commands available: /i:req, /i:aws, /i:note, /i:dod, /i:issues, /i:board"
