#!/usr/bin/env bash
set -euo pipefail

CLAUDE_DIR="$HOME/.claude"

echo "Uninstalling claude-issue-tracker..."

# Commands
for cmd in i:req i:aws i:note i:dod i:issues; do
  target="$CLAUDE_DIR/commands/${cmd}.md"
  if [ -L "$target" ]; then
    rm "$target"
    echo "  Removed command: ${cmd}.md"
  fi
done

# Skills
target="$CLAUDE_DIR/skills/i-issue-management"
if [ -L "$target" ]; then
  rm "$target"
  echo "  Removed skill: i-issue-management"
fi

echo "Done. Commands removed."
