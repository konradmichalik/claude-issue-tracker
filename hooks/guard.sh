#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash). Turns every `bin/i post` and `bin/i move`
# (except `move --start`) into a permission prompt. Fails open: no output, exit 0
# on anything unexpected, so it never blocks unrelated commands.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "$PLUGIN_ROOT/bin/i" guard 2>/dev/null || true
