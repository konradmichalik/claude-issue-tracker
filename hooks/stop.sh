#!/usr/bin/env bash
# Stop hook. Fires when a session tries to end. Blocks once (via
# {"decision":"block","reason":...} on stdout) with a reminder to run /i:note
# when all of these hold: the active issue was resolved by branch match, is
# in-progress, has uncommitted changes, and has no "Erkenntnisse" entry today.
# Self-resolving: once that entry exists, or once already nagged in this
# session, it stays silent. Never blocks twice, never blocks on a guess.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "$PLUGIN_ROOT/bin/i" check-note 2>/dev/null || true
