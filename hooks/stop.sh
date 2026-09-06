#!/usr/bin/env bash
# Stop hook. Fires when a session tries to end. If the active issue has
# uncommitted changes and no "Erkenntnisse" entry for today, blocks once
# (via {"decision":"block","reason":...} on stdout) and reminds to run
# /i:note. Self-resolving: once that entry exists, or once already nagged
# for this session, it stays silent — never blocks twice in a row.
set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "$PLUGIN_ROOT/bin/i" check-note 2>/dev/null || true
