#!/bin/bash
# Безопасный деплой AidaCamp
# Использование: ./scripts/deploy.sh [dev|prod]
#
# dev  → dev.aidacamp.ru  (по умолчанию)
# prod → aidacamp.ru      (требует подтверждения)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SSH_KEY="$HOME/.ssh/aidacamp_prod"
SSH_HOST="root@159.194.223.55"

TARGET="${1:-dev}"

case "$TARGET" in
  dev)
    REMOTE_DIR="/var/www/aidacamp-dev/current/"
    LABEL="DEV (dev.aidacamp.ru)"
    ;;
  prod)
    REMOTE_DIR="/var/www/aidacamp/current/"
    LABEL="PROD (aidacamp.ru)"
    echo ""
    echo "⚠️  ВНИМАНИЕ: деплой на ПРОДАКШН ($LABEL)"
    echo ""
    read -p "Точно деплоить на прод? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
      echo "Отменено."
      exit 1
    fi
    # Бэкап прода перед деплоем
    BACKUP="backup-$(date +%Y%m%d-%H%M%S)"
    echo "📦 Бэкап прода → /var/www/aidacamp/$BACKUP/"
    ssh -i "$SSH_KEY" "$SSH_HOST" "cp -a $REMOTE_DIR /var/www/aidacamp/$BACKUP/"
    echo "✅ Бэкап создан"
    ;;
  *)
    echo "Использование: $0 [dev|prod]"
    exit 1
    ;;
esac

# Сборка
echo ""
echo "🔨 Сборка..."
cd "$PROJECT_DIR"
npm run build --silent

# Проверка что билд существует
if [ ! -f "dist/client/index.html" ]; then
  echo "❌ dist/client/index.html не найден. Сборка не удалась."
  exit 1
fi

# Деплой статики (dist/client/ → корень сервера)
# --exclude: не трогать .env, server/, node_modules/, бэкапы, client/ подпапку
echo "🚀 Деплой на $LABEL..."
rsync -avz --delete \
  --exclude='.env' \
  --exclude='server/' \
  --exclude='node_modules/' \
  --exclude='backup-*' \
  --exclude='client/' \
  -e "ssh -i $SSH_KEY" \
  dist/client/ "$SSH_HOST:$REMOTE_DIR"

echo ""
echo "✅ Задеплоено на $LABEL"
echo "   Источник: dist/client/"
echo "   Назначение: $SSH_HOST:$REMOTE_DIR"
