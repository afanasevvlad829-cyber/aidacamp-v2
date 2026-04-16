#!/usr/bin/env bash
# Gate 3: deploy site-prod → production server
#
# Rules:
#   - must be on site-prod branch (worktree or checkout)
#   - working tree clean
#   - builds via `npm run build`
#   - rsyncs dist/client/ to prod server
#   - logs the deploy to audit

set -euo pipefail
_src="$0"; while [[ -L "$_src" ]]; do _src="$(cd "$(dirname "$_src")" && pwd)/$(readlink "$_src")"; done
SCRIPT_DIR="$(cd "$(dirname "$_src")" && pwd)"
# shellcheck source=pipeline-lib.sh
source "$SCRIPT_DIR/pipeline-lib.sh"

cd "$REPO_ROOT"
require_clean_tree

# Ensure site-prod is checked out (or use worktree)
if [[ "$(current_branch)" != "site-prod" ]]; then
  die "deploy запускается только с ветки site-prod (сейчас: $(current_branch)). Сделай 'git checkout site-prod' или создай worktree."
fi

sha="$(git rev-parse --short HEAD)"
info "Деплой site-prod @ $sha на aidacamp.ru"

info "Билд…"
npm run build
[[ -d dist/client ]] || die "dist/client отсутствует после билда"

read -r -p "⚠ Это перезапишет PROD. Продолжить? [y/N] " a
[[ "$a" == "y" || "$a" == "Y" ]] || { warn "отменено"; exit 1; }

info "rsync → prod"
rsync -az --delete \
  -e "ssh -i ~/.ssh/aidacamp_prod -o StrictHostKeyChecking=no" \
  dist/client/ \
  root@159.194.223.55:/var/www/aidacamp/

# Audit log on server
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "echo \"$(date -u +%FT%TZ) deploy $sha by $(whoami)@$(hostname)\" >> /var/log/aidacamp-deploy.log" || true

ok "Deployed $sha"
