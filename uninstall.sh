#!/usr/bin/env bash
set -euo pipefail

CLAUDE_DIR="$HOME/.claude"

echo "Uninstalling claude-issue-tracker..."

# Commands
for cmd in "$CLAUDE_DIR/commands/"i:*.md; do
  if [ -L "$cmd" ]; then
    name="$(basename "$cmd")"
    rm "$cmd"
    echo "  Removed command: $name"
  fi
done

# Skills
target="$CLAUDE_DIR/skills/i-issue-management"
if [ -L "$target" ]; then
  rm "$target"
  echo "  Removed skill: i-issue-management"
fi

# Board
target="$CLAUDE_DIR/board"
if [ -L "$target" ]; then
  rm "$target"
  echo "  Removed board: board/"
fi

echo "Done. Commands removed."
