#!/usr/bin/env bash
# File Locks Diagnostic Tool
# Shows all active locks, detects orphaned locks, detects stale locks
#
# Usage:
#   bash scripts/audit-file-locks.sh          - Show all active locks
#   bash scripts/audit-file-locks.sh cleanup  - Clean up expired locks
#   bash scripts/audit-file-locks.sh stats    - Show lock statistics

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LOCK_MANAGER="$REPO_ROOT/scripts/file-lock-manager.sh"

if [[ ! -f "$LOCK_MANAGER" ]]; then
  echo "❌ File lock manager not found: $LOCK_MANAGER" >&2
  exit 1
fi

mode="${1:-audit}"

case "$mode" in
  audit|"")
    # Show all active locks with formatted output
    echo "🔒 FILE LOCK AUDIT REPORT" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    bash "$LOCK_MANAGER" audit
    ;;

  cleanup)
    # Clean up expired locks
    echo "🧹 CLEANUP EXPIRED LOCKS" >&2
    bash "$LOCK_MANAGER" cleanup
    ;;

  stats)
    # Show lock statistics
    echo "📊 LOCK STATISTICS" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

    LOCKS_DIR="${HOME}/.claude/file-locks"
    if [[ ! -d "$LOCKS_DIR" ]]; then
      echo "ℹ️  Lock directory does not exist" >&2
      exit 0
    fi

    total_locks=$(find "$LOCKS_DIR" -name "*.lock" 2>/dev/null | wc -l)
    echo "Total lock files: $total_locks" >&2

    if [[ $total_locks -gt 0 ]]; then
      active_locks=0
      expired_locks=0
      current_time=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

      for lock_file in "$LOCKS_DIR"/*.lock; do
        [[ -f "$lock_file" ]] || continue

        expires_at=$(grep "^EXPIRES_AT=" "$lock_file" | cut -d= -f2)
        if [[ "$expires_at" < "$current_time" ]]; then
          expired_locks=$((expired_locks + 1))
        else
          active_locks=$((active_locks + 1))
        fi
      done

      echo "Active locks: $active_locks" >&2
      echo "Expired locks: $expired_locks" >&2
    fi
    ;;

  *)
    cat >&2 <<'EOF'
❌ Unknown mode: $mode

Usage:
  bash scripts/audit-file-locks.sh          - Show all active locks (default)
  bash scripts/audit-file-locks.sh cleanup  - Clean up expired locks
  bash scripts/audit-file-locks.sh stats    - Show lock statistics

Examples:
  bash scripts/audit-file-locks.sh
  bash scripts/audit-file-locks.sh cleanup
  bash scripts/audit-file-locks.sh stats
EOF
    exit 1
    ;;
esac

exit 0
