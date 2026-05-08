#!/bin/bash
# Безопасный деплой AidaCamp — с верификацией
# Использование: ./scripts/deploy.sh [dev|prod]
#
# dev  → dev.aidacamp.ru  (по умолчанию)
# prod → aidacamp.ru      (требует подтверждения)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SSH_HOST="root@159.194.223.55"
SSH_KEY_PROD="$HOME/.ssh/aidacamp_prod"

TARGET="${1:-dev}"

# ── 0. Pre-flight git guard ───────────────────────────────────
# Запрещаем деплой при расхождении git ↔ working tree ↔ origin.
# Обход: SKIP_GIT_GUARD=1 (только для критических hotfix владельцем).
cd "$PROJECT_DIR"
if [ "${SKIP_GIT_GUARD:-0}" != "1" ]; then
  case "$TARGET" in
    dev)  GUARD_BRANCH="dev" ;;
    prod) GUARD_BRANCH="main" ;;
    *)    GUARD_BRANCH="" ;;
  esac

  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "❌ DEPLOY BLOCKED: working tree содержит незакоммиченные изменения."
    echo ""
    git status --short | head -20
    echo ""
    echo "→ Положи изменения в git через PR:"
    echo "   git checkout -b agent/<task> origin/dev"
    echo "   git add -A && git commit -m '...' && git push origin agent/<task>"
    echo "   gh pr create --base dev"
    echo ""
    echo "Hotfix владельцем — SKIP_GIT_GUARD=1 ./scripts/deploy.sh $TARGET"
    exit 1
  fi

  if [ -n "$GUARD_BRANCH" ]; then
    echo "🔍 Pre-flight: git ↔ origin/$GUARD_BRANCH..."
    git fetch origin --quiet 2>/dev/null || true
    LOCAL_SHA=$(git rev-parse HEAD)
    REMOTE_SHA=$(git rev-parse "origin/$GUARD_BRANCH" 2>/dev/null || echo "")
    if [ -z "$REMOTE_SHA" ]; then
      echo "  ⚠️  origin/$GUARD_BRANCH не получен (сеть?)"
    elif [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
      echo "❌ DEPLOY BLOCKED: HEAD не равен origin/$GUARD_BRANCH"
      echo "    HEAD:                $LOCAL_SHA"
      echo "    origin/$GUARD_BRANCH: $REMOTE_SHA"
      echo "    Текущая ветка:       $(git branch --show-current 2>/dev/null || echo 'detached')"
      echo ""
      echo "→ Должен быть смерженный PR + checkout правильной ветки:"
      echo "   git checkout $GUARD_BRANCH && git pull origin $GUARD_BRANCH"
      echo "   ./scripts/deploy.sh $TARGET"
      echo ""
      echo "Hotfix — SKIP_GIT_GUARD=1 ./scripts/deploy.sh $TARGET"
      exit 1
    fi
    echo "  ✅ git == origin/$GUARD_BRANCH ($LOCAL_SHA)"
  fi
fi

case "$TARGET" in
  dev)
    REMOTE_DIR="/var/www/aidacamp-dev/current/"
    SSR_DIR="/var/www/aidacamp-dev/current/server/"
    SERVICE="aidacamp-dev"
    LABEL="DEV (dev.aidacamp.ru)"
    HEALTH_URL="https://dev.aidacamp.ru"
    SSH_KEY="$SSH_KEY_PROD"
    ;;
  prod)
    REMOTE_DIR="/var/www/aidacamp/current/"
    SSR_DIR="/var/www/aidacamp/current/server/"
    SERVICE="aidacamp"
    LABEL="PROD (aidacamp.ru)"
    HEALTH_URL="https://aidacamp.ru"
    SSH_KEY="$SSH_KEY_PROD"
    echo ""
    echo "⚠️  ВНИМАНИЕ: деплой на ПРОДАКШН ($LABEL)"
    echo ""
    read -p "Точно деплоить на прод? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
      echo "Отменено."
      exit 1
    fi
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

cd "$PROJECT_DIR"

# ── 0. Сборка ─────────────────────────────────────────────────
echo ""
echo "🔨 Сборка..."
npm run build --silent

if [ ! -f "dist/client/index.html" ]; then
  echo "❌ dist/client/index.html не найден. Сборка не удалась."
  exit 1
fi

# Извлекаем критичные ассеты из HTML — будем верифицировать что они залились
CRITICAL_ASSETS=$(grep -oE '/(assets|images|_astro)/[a-zA-Z0-9._/-]+\.(js|css|webp|avif|svg|png)' dist/client/index.html | sort -u | head -20)
HERO_IMAGES=$(grep -oE '/images/hero-mobile-bean[a-z0-9-]*\.(webp|avif)' dist/client/index.html | sort -u)

# ── 1. Статика (HTML, CSS, JS, _astro) ────────────────────────
echo ""
echo "🚀 Деплой статики на $LABEL..."
rsync -az --delete --stats \
  --exclude='.env' \
  --exclude='server/' \
  --exclude='node_modules/' \
  --exclude='backup-*' \
  --exclude='client/' \
  --exclude='images/hero/' \
  --exclude='images/gallery/' \
  --exclude='images/team/' \
  --exclude='data/' \
  -e "ssh -i $SSH_KEY" \
  dist/client/ "$SSH_HOST:$REMOTE_DIR"

# ── 2. Изображения root (hero-mobile, hero-desktop, og, etc) ──
echo ""
echo "🖼️  Синхронизация изображений root..."
rsync -az --stats \
  --include='*.webp' --include='*.avif' --include='*.svg' --include='*.png' --include='*.jpg' --include='*.jpeg' --include='*.gif' \
  --include='*/' --exclude='*' \
  -e "ssh -i $SSH_KEY" \
  dist/client/images/ "$SSH_HOST:${REMOTE_DIR}images/"

# ── 3. SSR ────────────────────────────────────────────────────
echo ""
echo "🔄 Деплой SSR-сервера..."
rsync -az --delete --stats \
  -e "ssh -i $SSH_KEY" \
  dist/server/ "$SSH_HOST:$SSR_DIR"

# ── 4. node_modules symlink ───────────────────────────────────
REPO_MODULES="/var/www/aidacamp-dev/repo/node_modules"
[ "$TARGET" = "prod" ] && REPO_MODULES="/var/www/aidacamp/repo/node_modules"
ssh -i "$SSH_KEY" "$SSH_HOST" "ln -sfn $REPO_MODULES ${REMOTE_DIR%/}/node_modules" || true

# ── 5. Restart SSR ────────────────────────────────────────────
echo ""
echo "♻️  Рестарт $SERVICE..."
if ssh -i "$SSH_KEY" "$SSH_HOST" "systemctl restart $SERVICE 2>&1" 2>&1 | grep -q "not found"; then
  echo "⚠️  systemd-сервис не найден ($SERVICE) — пропускаю restart"
else
  ssh -i "$SSH_KEY" "$SSH_HOST" "sleep 2 && systemctl is-active $SERVICE" || echo "⚠️  Сервис не active"
fi

# ── 6. ВЕРИФИКАЦИЯ — критичные файлы реально есть на сервере ──
echo ""
echo "🔍 Верификация..."
MISSING=0

# 6a. Проверяем hero-images явно
for img in $HERO_IMAGES; do
  REMOTE_PATH="${REMOTE_DIR}${img#/}"
  if ! ssh -i "$SSH_KEY" "$SSH_HOST" "test -f '$REMOTE_PATH'" 2>/dev/null; then
    echo "  ❌ MISSING: $REMOTE_PATH"
    MISSING=$((MISSING + 1))
  fi
done

# 6b. Проверяем что HTML обновился — что в нём актуальные хеши
LOCAL_HTML_HASH=$(md5 -q dist/client/index.html 2>/dev/null || md5sum dist/client/index.html | awk '{print $1}')
REMOTE_HTML_HASH=$(ssh -i "$SSH_KEY" "$SSH_HOST" "md5sum ${REMOTE_DIR}index.html 2>/dev/null | awk '{print \$1}'")
if [ "$LOCAL_HTML_HASH" != "$REMOTE_HTML_HASH" ]; then
  echo "  ❌ index.html на сервере НЕ совпадает с локальным!"
  echo "     local:  $LOCAL_HTML_HASH"
  echo "     remote: $REMOTE_HTML_HASH"
  MISSING=$((MISSING + 1))
fi

# 6c. HTTP healthcheck
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" || echo "000")
if [ "$HTTP_STATUS" != "200" ]; then
  echo "  ⚠️  $HEALTH_URL вернул HTTP $HTTP_STATUS"
fi

if [ $MISSING -gt 0 ]; then
  echo ""
  echo "❌ ВЕРИФИКАЦИЯ ПРОВАЛЕНА — $MISSING критичных файлов отсутствуют/несовпадают"
  exit 1
fi

echo "  ✅ HTML hash совпадает"
echo "  ✅ Все hero-images на месте ($(echo "$HERO_IMAGES" | wc -l | tr -d ' ') файлов)"
echo "  ✅ HTTP $HTTP_STATUS"


# Запишем SHA задеплоенного коммита на сервер для drift-check (cron алертит при расхождении)
DEPLOY_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
ssh -i "$SSH_KEY" "$SSH_HOST" "echo $DEPLOY_SHA > $REMOTE_DIR/.deployed-sha" 2>/dev/null || true

echo ""
echo "✅ Задеплоено на $LABEL"
echo "   $HEALTH_URL"
echo "   SHA: $DEPLOY_SHA"
