#!/usr/bin/env bash
set -euo pipefail

echo "Uninstalling plugin i@issue-tracker ..."
claude plugin uninstall i@issue-tracker || true

echo
echo "Removing marketplace 'issue-tracker' ..."
claude plugin marketplace remove issue-tracker || true

echo
echo "Done. .issues/ documents in your projects are untouched — only the plugin registration was removed."
