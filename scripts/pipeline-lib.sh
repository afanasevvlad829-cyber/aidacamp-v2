#!/usr/bin/env bash
# Shared helpers for pipeline scripts (ship / promote / deploy / status).
# Source this file; do not execute directly.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
ROUTING_FILE="$REPO_ROOT/.git-routing.yml"

# Colors
c_red()   { printf "\033[31m%s\033[0m" "$*"; }
c_grn()   { printf "\033[32m%s\033[0m" "$*"; }
c_yel()   { printf "\033[33m%s\033[0m" "$*"; }
c_blu()   { printf "\033[34m%s\033[0m" "$*"; }
c_dim()   { printf "\033[2m%s\033[0m" "$*"; }

die()  { echo "$(c_red "✖") $*" >&2; exit 1; }
info() { echo "$(c_blu "ℹ") $*"; }
ok()   { echo "$(c_grn "✔") $*"; }
warn() { echo "$(c_yel "⚠") $*"; }

# Parse routing YAML into three bash arrays: SITE_GLOBS / TOOLING_GLOBS / IGNORE_GLOBS
_load_routing() {
  [[ -f "$ROUTING_FILE" ]] || die ".git-routing.yml not found at $ROUTING_FILE"
  SITE_GLOBS=(); TOOLING_GLOBS=(); IGNORE_GLOBS=()
  local section=""
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    if [[ "$line" =~ ^([a-z_]+): ]]; then
      section="${BASH_REMATCH[1]}"
      continue
    fi
    if [[ "$line" =~ ^[[:space:]]+-[[:space:]]+\"?([^\"]+)\"?[[:space:]]*$ ]]; then
      local glob="${BASH_REMATCH[1]}"
      glob="${glob%\"}"; glob="${glob#\"}"
      case "$section" in
        site)    SITE_GLOBS+=("$glob") ;;
        tooling) TOOLING_GLOBS+=("$glob") ;;
        ignore)  IGNORE_GLOBS+=("$glob") ;;
      esac
    fi
  done < "$ROUTING_FILE"
}

# Convert gitignore-style glob to bash extglob-ish match
_match_glob() {
  local path="$1" glob="$2"
  # Turn ** into * for simple bash matching
  local pat="${glob//\*\*/\*}"
  # shellcheck disable=SC2053
  [[ "$path" == $pat ]] && return 0
  [[ "$path" == $pat/* ]] && return 0
  # Also match if glob has a /** at end or is a dir prefix
  local base="${glob%/**}"
  [[ "$path" == "$base"/* ]] && return 0
  return 1
}

# Pipeline infrastructure files that must live on every site branch so ./ship works.
# Checked BEFORE the tooling globs so scripts/** doesn't swallow them.
_PIPELINE_INFRA=(
  .gitignore
  .git-routing.yml
  scripts/ship.sh
  scripts/promote.sh
  scripts/deploy-pipeline.sh
  scripts/status.sh
  scripts/pipeline-lib.sh
)

# Classify a single path → prints "site" / "tooling" / "ignore" / "unknown"
classify_path() {
  local path="$1"
  _load_routing
  local g p
  for p in "${_PIPELINE_INFRA[@]}"; do [[ "$path" == "$p" ]] && { echo site; return; }; done
  for g in "${IGNORE_GLOBS[@]}";  do _match_glob "$path" "$g" && { echo ignore;  return; }; done
  for g in "${TOOLING_GLOBS[@]}"; do _match_glob "$path" "$g" && { echo tooling; return; }; done
  for g in "${SITE_GLOBS[@]}";    do _match_glob "$path" "$g" && { echo site;    return; }; done
  echo unknown
}

# Compare working-tree file to its version on a given branch.
# Returns 0 if identical, 1 if different or missing on branch.
_same_as_branch() {
  local path="$1" branch="$2"
  local disk branch_hash
  [[ -f "$path" ]] || return 1
  disk="$(git hash-object -- "$path" 2>/dev/null)" || return 1
  branch_hash="$(git rev-parse "$branch:$path" 2>/dev/null)" || return 1
  [[ "$disk" == "$branch_hash" ]]
}

# Split working-tree changes (staged + unstaged + untracked) into buckets.
# Sets arrays: CHG_SITE / CHG_TOOLING / CHG_IGNORE / CHG_UNKNOWN
# Tooling files identical to their version on 'tooling' branch are filtered out.
split_working_changes() {
  CHG_SITE=(); CHG_TOOLING=(); CHG_IGNORE=(); CHG_UNKNOWN=()
  local path cat
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    cat="$(classify_path "$path")"
    case "$cat" in
      site)    CHG_SITE+=("$path") ;;
      tooling)
        if _same_as_branch "$path" tooling; then
          : # already on tooling branch, skip
        else
          CHG_TOOLING+=("$path")
        fi
        ;;
      ignore)  CHG_IGNORE+=("$path") ;;
      *)       CHG_UNKNOWN+=("$path") ;;
    esac
  done < <(
    {
      git diff --name-only
      git diff --cached --name-only
      git ls-files --others --exclude-standard
    } | sort -u
  )
}

# Ensure we're in a clean state on a given branch (used by promote/deploy)
require_clean_tree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    die "Working tree has changes — commit or stash first."
  fi
}

current_branch() { git rev-parse --abbrev-ref HEAD; }
