#!/usr/bin/env bash
# Manual File Lock Release Tool
# Use this to manually release a lock before push (or override an expired lock)
#
# Usage:
#   bash scripts/release-file-lock.sh <file-path>
#
# Examples:
#   bash scripts/release-file-lock.sh src/components/hero/Mobile.astro
#   bash scripts/release-file-lock.sh astro.config.mjs

set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat >&2 <<'EOF'
❌ Usage: release-file-lock.sh <file-path>

Examples:
  bash scripts/release-file-lock.sh src/components/hero/Mobile.astro
  bash scripts/release-file-lock.sh src/components/hero/Mobile.astro
  bash scripts/release-file-lock.sh astro.config.mjs
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

# Normalize file path
file_path="${file_path#./}"

# Release the lock
bash "$LOCK_MANAGER" release "$file_path"
