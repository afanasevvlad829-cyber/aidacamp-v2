#!/usr/bin/env bash
# Gate 2: promote dev → site-prod
#
# Moves the site-prod pointer to match dev after verification:
#   - dev must be clean
#   - dev must build successfully (npm run build)
#   - user confirms
#
# Does NOT deploy. That is gate 3 (./deploy).

set -euo pipefail
_src="$0"; while [[ -L "$_src" ]]; do _src="$(cd "$(dirname "$_src")" && pwd)/$(readlink "$_src")"; done
SCRIPT_DIR="$(cd "$(dirname "$_src")" && pwd)"
# shellcheck source=pipeline-lib.sh
source "$SCRIPT_DIR/pipeline-lib.sh"

cd "$REPO_ROOT"

CUR="$(current_branch)"
[[ "$CUR" == "dev" ]] || die "promote запускается только с ветки dev (сейчас: $CUR)"
require_clean_tree

dev_sha="$(git rev-parse dev)"
prod_sha="$(git rev-parse site-prod)"
if [[ "$dev_sha" == "$prod_sha" ]]; then
  ok "dev уже == site-prod — promote не нужен"
  exit 0
fi

info "Промоушен dev ($dev_sha) → site-prod ($prod_sha)"
git --no-pager log --oneline "site-prod..dev"
echo

info "Билд dev для проверки…"
if ! npm run build >/dev/null 2>&1; then
  die "npm run build упал — promote отменён"
fi
ok "Билд прошёл"

read -r -p "Промоутить? [y/N] " a
[[ "$a" == "y" || "$a" == "Y" ]] || { warn "отменено"; exit 1; }

git branch -f site-prod dev
ok "site-prod → $(git rev-parse --short dev)"
git push origin site-prod || warn "push site-prod failed"

info "Готово. Для деплоя на прод: ./deploy"
