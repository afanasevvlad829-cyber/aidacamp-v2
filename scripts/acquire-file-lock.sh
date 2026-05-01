#!/usr/bin/env bash
# Manual File Lock Acquisition Tool
# Use this to manually lock a file before starting work
#
# Usage:
#   bash scripts/acquire-file-lock.sh <file-path> [reason]
#
# Examples:
#   bash scripts/acquire-file-lock.sh src/components/hero/Mobile.astro "Refactoring hero component styling"
#   bash scripts/acquire-file-lock.sh astro.config.mjs "Adding new build config"

set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat >&2 <<'EOF'
❌ Usage: acquire-file-lock.sh <file-path> [reason]

Examples:
  bash scripts/acquire-file-lock.sh src/components/hero/Mobile.astro
  bash scripts/acquire-file-lock.sh src/components/hero/Mobile.astro "Refactoring hero component"
  bash scripts/acquire-file-lock.sh astro.config.mjs "Adding build config"
EOF
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LOCK_MANAGER="$REPO_ROOT/scripts/file-lock-manager.sh"

if [[ ! -f "$LOCK_MANAGER" ]]; then
  echo "❌ File lock manager not found: $LOCK_MANAGER" >&2
  exit 1
fi

file_path="$1"
reason="${2:-Editing}"

# Normalize file path
file_path="${file_path#./}"

# Ensure file exists (or will exist)
if [[ ! -f "$file_path" ]]; then
  echo "⚠️  Warning: File does not exist yet: $file_path" >&2
fi

# Acquire the lock
bash "$LOCK_MANAGER" acquire "$file_path" "$reason"
