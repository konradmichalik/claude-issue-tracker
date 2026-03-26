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
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -d "$SCRIPT_DIR/board" ]; then
  (cd "$SCRIPT_DIR/board" && npm unlink --silent 2>/dev/null)
  echo "  Unlinked board: issue-board"
fi

echo "Done. Commands removed."
