#!/bin/bash
# Безопасный деплой AidaCamp
# Использование: ./scripts/deploy.sh [dev|prod]
#
# dev  → dev.aidacamp.ru  (по умолчанию)
# prod → aidacamp.ru      (требует подтверждения)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SSH_HOST="root@159.194.223.55"

# dev использует ограниченный ключ — может писать ТОЛЬКО в /var/www/aidacamp-dev/
SSH_KEY_DEV="$HOME/.ssh/aidacamp_dev"
# prod использует полный ключ — только у владельца проекта
SSH_KEY_PROD="$HOME/.ssh/aidacamp_prod"

TARGET="${1:-dev}"

case "$TARGET" in
  dev)
    REMOTE_DIR="/var/www/aidacamp-dev/current/"
    SSR_DIR="/var/www/aidacamp-dev/current/server/"
    SERVICE="aidacamp-dev"
    LABEL="DEV (dev.aidacamp.ru)"
    SSH_KEY="$SSH_KEY_PROD"   # dev-ключа нет для SSR-папки, используем prod
    ;;
  prod)
    REMOTE_DIR="/var/www/aidacamp/current/"
    SSR_DIR="/var/www/aidacamp/current/server/"
    SERVICE="aidacamp"
    LABEL="PROD (aidacamp.ru)"
    SSH_KEY="$SSH_KEY_PROD"
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

# Сборка — ВСЕГДА с очисткой кешей (.astro / vite / dist).
# Без этого Astro может закешировать старые компоненты и задеплоить устаревший HTML.
# Инцидент 2026-04-25: 4 деплоя подряд с одной и той же старой версией LandingHero.
echo ""
echo "🔨 Сборка (fresh, кеши очищены)..."
cd "$PROJECT_DIR"
npm run build:fresh --silent

# Проверка что билд существует
if [ ! -f "dist/client/index.html" ]; then
  echo "❌ dist/client/index.html не найден. Сборка не удалась."
  exit 1
fi

# 1. Деплой статики (dist/client/ → корень сервера)
echo "🚀 Деплой статики на $LABEL..."
rsync -az --delete \
  --exclude='.env' \
  --exclude='server/' \
  --exclude='node_modules/' \
  --exclude='backup-*' \
  --exclude='client/' \
  --exclude='images/hero/' \
  --exclude='images/gallery/' \
  --exclude='images/team/' \
  -e "ssh -i $SSH_KEY" \
  dist/client/ "$SSH_HOST:$REMOTE_DIR"

# 1b. Синхронизация изображений (без --delete — не удалять старые фото)
echo "🖼️  Синхронизация изображений..."
rsync -az -e "ssh -i $SSH_KEY" dist/client/images/hero/    "$SSH_HOST:${REMOTE_DIR}images/hero/"
rsync -az -e "ssh -i $SSH_KEY" dist/client/images/gallery/ "$SSH_HOST:${REMOTE_DIR}images/gallery/"
rsync -az -e "ssh -i $SSH_KEY" dist/client/images/team/    "$SSH_HOST:${REMOTE_DIR}images/team/"

# 2. Деплой SSR-сервера (dist/server/ → server/ на сервере)
echo "🔄 Деплой SSR-сервера..."
rsync -az --delete \
  -e "ssh -i $SSH_KEY" \
  dist/server/ "$SSH_HOST:$SSR_DIR"

# 3. node_modules symlink (entry.mjs needs it to resolve packages)
REPO_MODULES="/var/www/aidacamp-dev/repo/node_modules"
if [ "$TARGET" = "prod" ]; then
  REPO_MODULES="/var/www/aidacamp/repo/node_modules"
fi
ssh -i "$SSH_KEY" "$SSH_HOST" "ln -sfn $REPO_MODULES ${REMOTE_DIR%/}/node_modules" 2>/dev/null || true

# 4. Рестарт systemd-сервиса
echo "♻️  Рестарт $SERVICE..."
ssh -i "$SSH_KEY" "$SSH_HOST" "systemctl restart $SERVICE && sleep 2 && systemctl is-active $SERVICE"

echo ""
echo "✅ Задеплоено на $LABEL"
echo "   Статика:    dist/client/ → $REMOTE_DIR"
echo "   SSR-сервер: dist/server/ → $SSR_DIR"

# Smoke-проверка: ключевые страницы должны отдавать 200 + базовый контент.
# Защита от багов вида «деплой прошёл, но html пустой/сломан».
if [ "$TARGET" = "dev" ]; then
  HOST="dev.aidacamp.ru"
else
  HOST="aidacamp.ru"
fi

echo ""
echo "🔎 Smoke-test https://$HOST ..."
SMOKE_FAILED=0
for slug in "" "ceny/" "pitanie/" "lager-programmirovaniya/" "kompyuternyy-lager/" "stati/"; do
  url="https://$HOST/$slug"
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
  if [ "$code" != "200" ]; then
    echo "   ❌ $url → HTTP $code"
    SMOKE_FAILED=1
  else
    echo "   ✅ $url → 200"
  fi
done

# Гарантия что hero-картинок нет на SEO-лендингах (после T2-перехода на CSS-эффекты)
for slug in "lager-programmirovaniya" "detskiy-lager" "kompyuternyy-lager"; do
  hero_img=$(curl -s "https://$HOST/$slug/" | grep -oE '<img src="/images/hero/[^"]*"' | head -1)
  if [ -n "$hero_img" ]; then
    echo "   ❌ $slug: hero <img> ещё в HTML — кеш не очищен или код не задеплоен"
    SMOKE_FAILED=1
  fi
done

if [ "$SMOKE_FAILED" = "1" ]; then
  echo ""
  echo "⚠️  Smoke-test НЕ прошёл — проверь страницы вручную"
  exit 2
fi
echo "   Все smoke-проверки пройдены"
