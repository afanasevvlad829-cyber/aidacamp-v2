#!/usr/bin/env bash
# Pipeline dashboard — show state of all stages at a glance.
set -euo pipefail
_src="$0"; while [[ -L "$_src" ]]; do _src="$(cd "$(dirname "$_src")" && pwd)/$(readlink "$_src")"; done
SCRIPT_DIR="$(cd "$(dirname "$_src")" && pwd)"
# shellcheck source=pipeline-lib.sh
source "$SCRIPT_DIR/pipeline-lib.sh"

cd "$REPO_ROOT"
git fetch --quiet origin 2>/dev/null || true

sha() { git rev-parse --short "$1" 2>/dev/null || echo "—"; }
subj() { git log -1 --format='%s' "$1" 2>/dev/null || echo "—"; }

echo
echo "$(c_blu '═══ Pipeline status ═══')"
echo
printf "  %-20s %-10s  %s\n" "branch" "sha" "subject"
printf "  %-20s %-10s  %s\n" "------" "---" "-------"
for b in dev site-prod tooling main safety/dev-backup-20260414; do
  if git show-ref --verify --quiet "refs/heads/$b"; then
    printf "  %-20s %-10s  %s\n" "$b" "$(sha "$b")" "$(subj "$b")"
  fi
done
echo

echo "$(c_blu '═══ Flow ═══')"
dev_sha="$(sha dev)"
prod_sha="$(sha site-prod)"
if [[ "$dev_sha" == "$prod_sha" ]]; then
  ok "dev == site-prod ($dev_sha)  —  сайт синхронизирован"
else
  ahead=$(git rev-list --count site-prod..dev 2>/dev/null || echo "?")
  behind=$(git rev-list --count dev..site-prod 2>/dev/null || echo "?")
  warn "dev отличается от site-prod: +$ahead / -$behind (ожидает promote)"
fi

# Working tree
echo
split_working_changes
echo "$(c_blu '═══ Working tree ═══')"
echo "  current branch: $(c_grn "$(current_branch)")"
echo "  site:    ${#CHG_SITE[@]} changes"
echo "  tooling: ${#CHG_TOOLING[@]} changes"
echo "  ignore:  ${#CHG_IGNORE[@]} changes"
(( ${#CHG_UNKNOWN[@]} )) && warn "unknown: ${#CHG_UNKNOWN[@]} — ${CHG_UNKNOWN[*]}"
echo
