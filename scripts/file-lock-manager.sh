#!/usr/bin/env bash
# File-Level Locking Manager
# Distributed lock system for multi-agent concurrent editing prevention
# Lock storage: .claude/file-locks/ (shared across all worktrees)
#
# Usage:
#   acquire <file-path> [reason]  - Acquire lock on file
#   release <file-path>           - Release lock on file
#   check <file-path>             - Check if file is locked
#   cleanup                       - Remove expired locks
#   audit                         - Show all active locks
#   force-release <file-path>     - Orchestrator override (requires MASTER_AGENT=1)

set -euo pipefail

# Configuration
LOCKS_DIR="${HOME}/.claude/file-locks"
LOCK_TTL=${LOCK_TTL:-3600}  # 1 hour default
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Agent/session identification
# AGENT_ID can be set via environment, otherwise derive from hostname+user
# (without timestamp so it's stable across script invocations)
AGENT_ID="${AGENT_ID:-$(hostname)-$(whoami)}"
SESSION_ID="${SESSION_ID:-$(basename "$(git rev-parse --git-dir 2>/dev/null)" 2>/dev/null || pwd)}"
GIT_USER="${GIT_USER:-$(git config user.name 2>/dev/null || echo 'unknown')}"
GIT_COMMIT="${GIT_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo 'HEAD')}"

# Utility functions
log_info() {
  echo "ℹ️  $*" >&2
}

log_success() {
  echo "✅ $*" >&2
}

log_error() {
  echo "❌ $*" >&2
}

log_warn() {
  echo "⚠️  $*" >&2
}

# Get lock filename from file path
get_lock_filename() {
  local file_path="$1"
  # Normalize path (remove leading ./)
  file_path="${file_path#./}"
  # Get MD5 hash and truncate to 8 chars
  local hash
  if [[ "$OSTYPE" == "darwin"* ]]; then
    hash=$(echo -n "$file_path" | md5 | head -c 8)
  else
    hash=$(echo -n "$file_path" | md5sum | cut -c1-8)
  fi
  echo "${hash}.lock"
}

# Ensure locks directory exists
ensure_locks_dir() {
  if [[ ! -d "$LOCKS_DIR" ]]; then
    mkdir -p "$LOCKS_DIR"
    log_info "Created lock directory: $LOCKS_DIR"
  fi
}

# Read lock file content
read_lock_file() {
  local lock_file="$1"
  if [[ -f "$lock_file" ]]; then
    cat "$lock_file"
  fi
}

# Write lock file
write_lock_file() {
  local lock_file="$1"
  local file_path="$2"
  local reason="${3:-}"

  local locked_at
  locked_at=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  local expires_at
  expires_at=$(date -u -d "+${LOCK_TTL}s" +'%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || \
                date -u -v+${LOCK_TTL}S +'%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || \
                echo "unknown")

  {
    echo "AGENT_ID=$AGENT_ID"
    echo "SESSION_ID=$SESSION_ID"
    echo "USER=$GIT_USER"
    echo "LOCKED_AT=$locked_at"
    echo "EXPIRES_AT=$expires_at"
    echo "GIT_COMMIT=$GIT_COMMIT"
    echo "FILE_PATH=$file_path"
    echo "REASON=$reason"
    echo "PID=$$"
  } > "$lock_file"
}

# Check if lock is expired
is_lock_expired() {
  local lock_file="$1"
  if [[ ! -f "$lock_file" ]]; then
    return 0  # No lock = not expired (return true)
  fi

  local expires_at
  expires_at=$(grep "^EXPIRES_AT=" "$lock_file" | cut -d= -f2)

  local current_time
  current_time=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

  # Simple string comparison works for ISO 8601 format
  [[ "$expires_at" < "$current_time" ]]
}

# Check if lock belongs to current agent
is_lock_mine() {
  local lock_file="$1"
  if [[ ! -f "$lock_file" ]]; then
    return 1
  fi

  local lock_agent
  lock_agent=$(grep "^AGENT_ID=" "$lock_file" | cut -d= -f2)

  [[ "$lock_agent" == "$AGENT_ID" ]]
}

# Acquire lock
acquire_lock() {
  local file_path="$1"
  local reason="${2:-Editing}"

  ensure_locks_dir

  local lock_filename
  lock_filename=$(get_lock_filename "$file_path")
  local lock_file="$LOCKS_DIR/$lock_filename"

  # Check if file is already locked by another agent
  if [[ -f "$lock_file" ]] && ! is_lock_expired "$lock_file" && ! is_lock_mine "$lock_file"; then
    local lock_content
    lock_content=$(read_lock_file "$lock_file")
    local lock_agent
    lock_agent=$(echo "$lock_content" | grep "^AGENT_ID=" | cut -d= -f2)
    local lock_expires
    lock_expires=$(echo "$lock_content" | grep "^EXPIRES_AT=" | cut -d= -f2)
    local lock_reason
    lock_reason=$(echo "$lock_content" | grep "^REASON=" | cut -d= -f2)

    log_error "FILE LOCKED: $file_path"
    log_error "   Locked by:   $lock_agent"
    log_error "   Expires at:  $lock_expires"
    log_error "   Reason:      $lock_reason"
    return 1
  fi

  # Write new lock (atomic via write to temp file then move)
  local temp_lock
  temp_lock=$(mktemp "$lock_file.tmp.XXXXXX")
  write_lock_file "$temp_lock" "$file_path" "$reason"
  mv "$temp_lock" "$lock_file"

  log_success "LOCKED: $file_path"
  log_info "   Reason:  $reason"
  log_info "   Expires: $(grep '^EXPIRES_AT=' "$lock_file" | cut -d= -f2)"

  return 0
}

# Release lock
release_lock() {
  local file_path="$1"

  ensure_locks_dir

  local lock_filename
  lock_filename=$(get_lock_filename "$file_path")
  local lock_file="$LOCKS_DIR/$lock_filename"

  if [[ ! -f "$lock_file" ]]; then
    log_warn "Lock not found: $file_path"
    return 0
  fi

  if ! is_lock_mine "$lock_file"; then
    log_error "Cannot release lock held by another agent: $file_path"
    return 1
  fi

  rm -f "$lock_file"
  log_success "RELEASED: $file_path"
  return 0
}

# Check lock status
check_lock() {
  local file_path="$1"

  ensure_locks_dir

  local lock_filename
  lock_filename=$(get_lock_filename "$file_path")
  local lock_file="$LOCKS_DIR/$lock_filename"

  if [[ ! -f "$lock_file" ]]; then
    log_success "NOT LOCKED: $file_path"
    return 0
  fi

  if is_lock_expired "$lock_file"; then
    log_warn "EXPIRED (cleanup pending): $file_path"
    return 0
  fi

  local lock_content
  lock_content=$(read_lock_file "$lock_file")

  log_warn "LOCKED: $file_path"
  echo "$lock_content" | sed 's/^/   /'

  return 1
}

# List all active locks
audit_locks() {
  ensure_locks_dir

  if [[ ! -d "$LOCKS_DIR" ]] || [[ -z "$(ls "$LOCKS_DIR"/*.lock 2>/dev/null)" ]]; then
    log_info "No active locks"
    return 0
  fi

  echo "ACTIVE LOCKS:" >&2
  local count=0

  for lock_file in "$LOCKS_DIR"/*.lock; do
    [[ -f "$lock_file" ]] || continue

    count=$((count + 1))

    if is_lock_expired "$lock_file"; then
      echo "  $count. $(grep '^FILE_PATH=' "$lock_file" | cut -d= -f2)" >&2
      echo "     Agent: $(grep '^AGENT_ID=' "$lock_file" | cut -d= -f2) (session: $(grep '^SESSION_ID=' "$lock_file" | cut -d= -f2))" >&2
      echo "     Status: EXPIRED (cleanup pending)" >&2
    else
      echo "  $count. $(grep '^FILE_PATH=' "$lock_file" | cut -d= -f2)" >&2
      echo "     Agent: $(grep '^AGENT_ID=' "$lock_file" | cut -d= -f2) (session: $(grep '^SESSION_ID=' "$lock_file" | cut -d= -f2))" >&2
      echo "     Expires: $(grep '^EXPIRES_AT=' "$lock_file" | cut -d= -f2)" >&2
      echo "     Reason: $(grep '^REASON=' "$lock_file" | cut -d= -f2)" >&2
    fi
  done

  if [[ $count -eq 0 ]]; then
    log_info "No active locks"
  fi

  return 0
}

# Cleanup expired locks
cleanup_locks() {
  ensure_locks_dir

  if [[ ! -d "$LOCKS_DIR" ]]; then
    log_info "Lock directory does not exist"
    return 0
  fi

  local count=0
  for lock_file in "$LOCKS_DIR"/*.lock; do
    [[ -f "$lock_file" ]] || continue

    if is_lock_expired "$lock_file"; then
      rm -f "$lock_file"
      count=$((count + 1))
    fi
  done

  if [[ $count -gt 0 ]]; then
    log_success "Cleaned up $count expired lock(s)"
  fi

  return 0
}

# Force release (orchestrator only)
force_release_lock() {
  local file_path="$1"

  if [[ "${MASTER_AGENT:-0}" != "1" ]]; then
    log_error "Force release requires MASTER_AGENT=1"
    return 1
  fi

  ensure_locks_dir

  local lock_filename
  lock_filename=$(get_lock_filename "$file_path")
  local lock_file="$LOCKS_DIR/$lock_filename"

  if [[ ! -f "$lock_file" ]]; then
    log_warn "Lock not found: $file_path"
    return 0
  fi

  rm -f "$lock_file"
  log_success "FORCE RELEASED: $file_path (orchestrator override)"
  return 0
}

# Main command dispatcher
main() {
  local cmd="${1:-}"

  case "$cmd" in
    acquire)
      acquire_lock "$2" "${3:-}"
      ;;
    release)
      release_lock "$2"
      ;;
    check)
      check_lock "$2"
      ;;
    cleanup)
      cleanup_locks
      ;;
    audit)
      audit_locks
      ;;
    force-release)
      force_release_lock "$2"
      ;;
    *)
      cat >&2 <<'EOF'
File-Level Locking Manager

Usage:
  file-lock-manager.sh acquire <file-path> [reason]
  file-lock-manager.sh release <file-path>
  file-lock-manager.sh check <file-path>
  file-lock-manager.sh cleanup
  file-lock-manager.sh audit
  file-lock-manager.sh force-release <file-path>  (MASTER_AGENT=1 only)

Examples:
  # Lock a file before editing
  bash scripts/file-lock-manager.sh acquire src/components/hero/Mobile.astro "Refactoring hero component"

  # Check lock status
  bash scripts/file-lock-manager.sh check src/components/hero/Mobile.astro

  # Show all locks
  bash scripts/file-lock-manager.sh audit

  # Release lock after push
  bash scripts/file-lock-manager.sh release src/components/hero/Mobile.astro

  # Clean up expired locks
  bash scripts/file-lock-manager.sh cleanup

  # Orchestrator override (requires MASTER_AGENT=1)
  MASTER_AGENT=1 bash scripts/file-lock-manager.sh force-release src/components/hero/Mobile.astro
EOF
      return 1
      ;;
  esac
}

main "$@"
