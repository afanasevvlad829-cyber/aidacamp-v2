#!/bin/bash
# Серверный деплой AidaCamp — безопасный, без сноса server/ и node_modules/
# Запуск: bash /opt/aidacamp-site/scripts/server-deploy.sh [dev|prod|both]
set -euo pipefail

TARGET="${1:-both}"
REPO="/opt/aidacamp-site"
DEV_DIR="/var/www/aidacamp-dev/current"
PROD_DIR="/var/www/aidacamp/current"
SERVICE="aidacamp-dev"

echo "=== AidaCamp server deploy: $TARGET ==="

# 1. git pull
echo "→ git pull..."
cd "$REPO"
git pull origin dev 2>&1 | tail -3

# 2. npm install если нужно
if ! node -e "require('$REPO/node_modules/@astrojs/node')" 2>/dev/null; then
  echo "→ npm install..."
  npm install --silent
fi

# 3. build
echo "→ npm run build..."
DEPLOY_ENV=dev npm run build --silent

echo "→ Деплой файлов..."

deploy_to() {
  local DIR="$1"
  local LABEL="$2"

  # Статика — БЕЗ --delete чтобы не снести server/ и node_modules/
  rsync -a \
    --exclude='.env' \
    --exclude='server/' \
    --exclude='node_modules/' \
    --exclude='backup-*' \
    "$REPO/dist/client/" "$DIR/" && echo "  ✅ client → $LABEL"

  # SSR — отдельно, с --delete только внутри server/
  rsync -a --delete \
    "$REPO/dist/server/" "$DIR/server/" && echo "  ✅ server → $LABEL"

  # node_modules — симлинк
  ln -sfn "$REPO/node_modules" "$DIR/node_modules" && echo "  ✅ node_modules → $LABEL"
}

if [ "$TARGET" = "dev" ] || [ "$TARGET" = "both" ]; then
  deploy_to "$DEV_DIR" "dev"
  # Синхронизируем также плоский корень /var/www/aidacamp-dev/ (nginx отдаёт оттуда статику)
  # Инцидент 2026-06-12: без этого шага новые страницы появляются в current/ но не в flat-root → 404
  rsync -a \
    --exclude='.env' --exclude='server/' --exclude='node_modules/' --exclude='backup-*' \
    "$REPO/dist/client/" /var/www/aidacamp-dev/ && echo "  ✅ client → dev flat-root"
fi
if [ "$TARGET" = "prod" ] || [ "$TARGET" = "both" ]; then
  deploy_to "$PROD_DIR" "prod"
fi

# 4. Restart
echo "→ Перезапуск $SERVICE..."
systemctl restart "$SERVICE"
sleep 4
STATUS=$(systemctl is-active "$SERVICE")
echo "  Статус: $STATUS"

if [ "$STATUS" = "active" ]; then
  echo "=== Готово ✅ ==="
else
  echo "=== ОШИБКА — сервис не поднялся ==="
  journalctl -u "$SERVICE" -n 10 --no-pager
  exit 1
fi
