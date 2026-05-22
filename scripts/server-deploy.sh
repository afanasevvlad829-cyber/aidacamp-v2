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
  npm install --omit=dev --silent
fi

# 3. build
echo "→ npm run build..."
DEPLOY_ENV=dev npm run build --silent

echo "→ Деплой файлов..."

deploy_to() {
  local DIR="$1"
  local LABEL="$2"

<<<<<<< HEAD
  # Статика
=======
  # Статика — БЕЗ --delete чтобы не снести server/ и node_modules/
  # Используем --delete-excluded=no (или просто убираем --delete)
>>>>>>> 81cf09fe (kaizen(faq_add + schema_add + internal_link): /stati/lager-naro-fominsk — лагерь наро-фоминск)
  rsync -a \
    --exclude='.env' \
    --exclude='server/' \
    --exclude='node_modules/' \
    --exclude='backup-*' \
    "$REPO/dist/client/" "$DIR/" && echo "  ✅ client → $LABEL"

<<<<<<< HEAD
  # SSR
  rsync -a \
=======
  # SSR — отдельно, с --delete только внутри server/
  rsync -a --delete \
>>>>>>> 81cf09fe (kaizen(faq_add + schema_add + internal_link): /stati/lager-naro-fominsk — лагерь наро-фоминск)
    "$REPO/dist/server/" "$DIR/server/" && echo "  ✅ server → $LABEL"

  # node_modules — симлинк
  ln -sfn "$REPO/node_modules" "$DIR/node_modules" && echo "  ✅ node_modules → $LABEL"
}

if [ "$TARGET" = "dev" ] || [ "$TARGET" = "both" ]; then
  deploy_to "$DEV_DIR" "dev"
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
