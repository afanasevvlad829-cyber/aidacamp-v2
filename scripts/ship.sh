#!/usr/bin/env bash
# Gate 1: ship local changes to the right branch(es).
#
# Splits working-tree changes into site / tooling / ignore using .git-routing.yml
# and commits each bucket to the appropriate branch:
#   site    → current feature branch (or dev if on dev)
#   tooling → `tooling` branch (via temporary worktree, keeps your HEAD where it is)
#
# Usage:
#   ./ship                    # interactive: show plan, ask to confirm
#   ./ship -m "msg"           # use given commit message for both buckets
#   ./ship --site-only        # only commit site changes
#   ./ship --tooling-only     # only commit tooling changes
#   ./ship --dry-run          # show plan, do nothing

set -euo pipefail
_src="$0"; while [[ -L "$_src" ]]; do _src="$(cd "$(dirname "$_src")" && pwd)/$(readlink "$_src")"; done
SCRIPT_DIR="$(cd "$(dirname "$_src")" && pwd)"
# shellcheck source=pipeline-lib.sh
source "$SCRIPT_DIR/pipeline-lib.sh"

MSG=""
DRY_RUN=0
SITE_ONLY=0
TOOLING_ONLY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message) MSG="$2"; shift 2 ;;
    --dry-run)    DRY_RUN=1; shift ;;
    --site-only)  SITE_ONLY=1; shift ;;
    --tooling-only) TOOLING_ONLY=1; shift ;;
    -h|--help)
      sed -n '2,18p' "$0"; exit 0 ;;
    *) die "Unknown arg: $1" ;;
  esac
done

cd "$REPO_ROOT"
split_working_changes

echo
info "План ship:"
echo "  $(c_grn 'site'   ) (${#CHG_SITE[@]}):    ${CHG_SITE[*]:-—}"
echo "  $(c_blu 'tooling') (${#CHG_TOOLING[@]}): ${CHG_TOOLING[*]:-—}"
echo "  $(c_dim 'ignore' ) (${#CHG_IGNORE[@]}):  ${CHG_IGNORE[*]:-—}"
if (( ${#CHG_UNKNOWN[@]} )); then
  echo "  $(c_yel 'unknown') (${#CHG_UNKNOWN[@]}): ${CHG_UNKNOWN[*]}"
  warn "Unknown paths — add them to .git-routing.yml"
fi
echo

(( DRY_RUN )) && { info "dry-run — ничего не делаю"; exit 0; }

# Nothing to ship
if (( ${#CHG_SITE[@]} == 0 && ${#CHG_TOOLING[@]} == 0 )); then
  ok "Нечего шипить — нет изменений"
  exit 0
fi

if [[ -z "$MSG" ]]; then
  read -r -p "Commit message: " MSG
  [[ -z "$MSG" ]] && die "Пустое сообщение"
fi

# --- Site bucket: commit on current branch ---
if (( ${#CHG_SITE[@]} && ! TOOLING_ONLY )); then
  local_branch="$(current_branch)"
  info "Коммит site → $local_branch"
  git add -- "${CHG_SITE[@]}"
  git commit -m "$MSG" --only -- "${CHG_SITE[@]}"
  ok "site: committed to $local_branch"
fi

# --- Tooling bucket: commit on tooling branch via worktree ---
if (( ${#CHG_TOOLING[@]} && ! SITE_ONLY )); then
  info "Коммит tooling → tooling branch"

  WT_DIR="$(mktemp -d -t aidacamp-tooling-XXXXXX)"
  trap 'rm -rf "$WT_DIR"' EXIT

  # Save current file contents of tooling files to a tarball, unstage them, apply on tooling branch
  TAR="$WT_DIR/tooling.tar"
  tar -cf "$TAR" -- "${CHG_TOOLING[@]}"

  git worktree add --quiet "$WT_DIR/wt" tooling
  (
    cd "$WT_DIR/wt"
    tar -xf "$TAR"
    git add -- "${CHG_TOOLING[@]}"
    if git diff --cached --quiet; then
      warn "tooling: нет реальных отличий от tooling branch, скип"
    else
      git commit -m "$MSG" >/dev/null
      ok "tooling: committed to tooling branch"
    fi
  )
  git worktree remove --force "$WT_DIR/wt" >/dev/null

  # Files remain physically present in the main worktree as untracked.
  # They live committed only on the 'tooling' branch — don't stage them here.
fi

# Push current branch
if (( ! TOOLING_ONLY && ${#CHG_SITE[@]} )); then
  info "Push $(current_branch) → origin"
  git push -u origin "$(current_branch)" || warn "push failed (check remote)"
fi
if (( ! SITE_ONLY && ${#CHG_TOOLING[@]} )); then
  info "Push tooling → origin"
  git push -u origin tooling || warn "push failed (check remote)"
fi

ok "ship завершён"
