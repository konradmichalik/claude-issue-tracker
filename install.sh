#!/usr/bin/env bash
# Registers this repo as a local Claude Code marketplace and installs the "i"
# plugin globally (scope: user — every project on this machine).
#
# Verified against Claude Code 2.1.263. `marketplace add` requires an explicit
# "./" prefix for a relative local path — a bare "." is rejected.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Registering marketplace 'issue-tracker' from $SCRIPT_DIR ..."
claude plugin marketplace add ./

echo
echo "Installing plugin i@issue-tracker (scope: user) ..."
claude plugin install i@issue-tracker --scope user -y

echo
echo "Done. Restart Claude Code (or start a new session) for /i:new, /i:update, /i:report, /i:note and the hooks to take effect."
echo "Verify the plugin with: claude plugin list"
echo "Verify tracker CLIs with: $SCRIPT_DIR/bin/i doctor"
