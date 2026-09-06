#!/usr/bin/env bash
# SessionStart hook (matcher: startup|resume|compact).
# Prints the active issue's compact status to stdout, which Claude Code injects
# as context. No active issue, or no .issues/ at all: exit 0, no output — this
# hook runs in every project, most of which have nothing to do with this tracker.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "$PLUGIN_ROOT/bin/i" status 2>/dev/null || true
