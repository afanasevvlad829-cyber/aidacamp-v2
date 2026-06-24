#!/bin/bash
# Серверный деплой AidaCamp: билд НА СЕРВЕРЕ (15ГБ), Мак — только оркестратор.
# Использование: ./scripts/deploy-server.sh [dev|prod]
# Зеркалит шаги deploy.sh; локальный deploy.sh остаётся запасным путём.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SSH_HOST="root@159.194.223.55"; SSH_KEY="$HOME/.ssh/aidacamp_prod"
TARGET="${1:-dev}"

if [ "$TARGET" = "prod" ] && [ "${MASTER_AGENT:-0}" != "1" ] && [ "${SKIP_GIT_GUARD:-0}" != "1" ]; then
  echo "❌ PROD DEPLOY BLOCKED — нужен MASTER_AGENT=1"; exit 1
fi

cd "$PROJECT_DIR"
case "$TARGET" in
  dev)  GUARD_BRANCH="dev";  REMOTE_DIR="/var/www/aidacamp-dev/current/"; SSR_DIR="/var/www/aidacamp-dev/current/server/"; SERVICE="aidacamp-dev";  HEALTH_URL="https://dev.aidacamp.ru"; LABEL="DEV";;
  prod) GUARD_BRANCH="main"; REMOTE_DIR="/var/www/aidacamp/current/";     SSR_DIR="/var/www/aidacamp/current/server/";     SERVICE="aidacamp-prod"; HEALTH_URL="https://aidacamp.ru";     LABEL="PROD";;
  *) echo "target dev|prod"; exit 1;;
esac

# pre-flight git guard (как в deploy.sh)
if [ "${SKIP_GIT_GUARD:-0}" != "1" ]; then
  [ -n "$(git status --porcelain)" ] && { echo "❌ working tree грязный"; exit 1; }
  git fetch origin --quiet
  SHA=$(git rev-parse "origin/$GUARD_BRANCH")
  [ "$(git rev-parse HEAD)" != "$SHA" ] && { echo "❌ HEAD != origin/$GUARD_BRANCH"; exit 1; }
else
  SHA=$(git rev-parse HEAD)
fi
echo "🔍 deploy-server → $LABEL @ ${SHA:0:8}"

if [ "$TARGET" = "prod" ] && [ "${MASTER_AGENT:-0}" = "1" ] && [ -t 0 ]; then
  read -p "Точно деплоить на ПРОД? (yes/no): " C; [ "$C" = "yes" ] || { echo "Отменено"; exit 1; }
fi

ssh -i "$SSH_KEY" "$SSH_HOST" bash -s -- "$TARGET" "$SHA" "$REMOTE_DIR" "$SSR_DIR" "$SERVICE" "$HEALTH_URL" <<'REMOTE'
set -euo pipefail
TARGET="$1"; SHA="$2"; REMOTE_DIR="$3"; SSR_DIR="$4"; SERVICE="$5"; HEALTH_URL="$6"
BUILD_DIR="/opt/aidacamp-build"
ORIGIN_URL=$(git -C /opt/aidacamp-site remote get-url origin)

# 1. checkout нужного SHA в выделенном билд-клоне
if [ ! -d "$BUILD_DIR/.git" ]; then
  echo "⬇️  init build clone…"; git clone "$ORIGIN_URL" "$BUILD_DIR"
fi
cd "$BUILD_DIR"
git fetch origin --quiet
git checkout -qf "$SHA"
git clean -qfd -e node_modules -e .lock-sha256

# 2. полные deps для билда (отдельно от runtime /opt/aidacamp-site)
LOCK=$(sha256sum package-lock.json | awk '{print $1}')
if [ ! -d node_modules/astro ] || [ "$(cat .lock-sha256 2>/dev/null)" != "$LOCK" ]; then
  echo "⚙️  npm ci (build deps)…"; npm ci --prefer-offline --legacy-peer-deps 2>&1 | tail -2
  echo "$LOCK" > .lock-sha256
fi

# 3. билд (15ГБ RAM — без флагов). dist чистим ОБЯЗАТЕЛЬНО:
# инцидент 11.06.2026 — билд поверх старого dist дал несогласованный артефакт
# (entry.mjs импортил несуществующий чанк) → SSR-прод упал на ~8 минут.
echo "🏗  npm run build…"
rm -rf dist
DEPLOY_ENV="$TARGET" npm run build --silent
[ -f dist/client/index.html ] || { echo "❌ dist не собрался"; exit 1; }
# страж согласованности: каждый чанк из entry.mjs существует
for c in $(grep -oE "chunks/[A-Za-z0-9_./-]+\.mjs" dist/server/entry.mjs | sort -u); do
  [ -f "dist/server/$c" ] || { echo "❌ несогласованный билд: нет $c"; exit 1; }
done
echo "  ✅ чанки согласованы"
HERO=$(grep -coE '/images/hero-mobile-bean[a-z0-9-]*\.(webp|avif)' dist/client/index.html || true)
echo "  ✅ dist ok (hero-refs: $HERO)"

# 4. бэкап prod
if [ "$TARGET" = "prod" ]; then
  B="backup-$(date +%Y%m%d-%H%M%S)"
  cp -a /var/www/aidacamp/current "/var/www/aidacamp/$B"
  ls -dt /var/www/aidacamp/backup-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
  echo "  💾 $B"
fi

# 5. локальные rsync (без сети!)
echo "📤 статика → $REMOTE_DIR"
rsync -a --checksum \
  --exclude='.env' --exclude='server/' --exclude='node_modules/' --exclude='backup-*' \
  --exclude='images/gallery/' --exclude='images/team/' --exclude='data/' \
  dist/client/ "$REMOTE_DIR"
rsync -a \
  --include='*.webp' --include='*.avif' --include='*.svg' --include='*.png' --include='*.jpg' --include='*.jpeg' --include='*.gif' \
  --include='*/' --exclude='*' \
  dist/client/images/ "${REMOTE_DIR}images/"
if [ "$TARGET" = "prod" ]; then
  rsync -a /var/www/aidacamp-dev/current/images/gallery/ /var/www/aidacamp/current/images/gallery/ || true
fi
if [ "$TARGET" = "dev" ]; then
  FLAT="/var/www/aidacamp-dev/"
  rsync -a --exclude='.env' --exclude='server/' --exclude='node_modules/' --exclude='backup-*' \
    --exclude='current/' --exclude='client/' --exclude='images/gallery/' --exclude='data/' \
    dist/client/ "$FLAT"
  rsync -a --include='*.webp' --include='*.avif' --include='*.svg' --include='*.png' --include='*.jpg' --include='*.jpeg' --include='*.gif' \
    --include='*/' --exclude='*' dist/client/images/ "${FLAT}images/"
fi
echo "📤 SSR → $SSR_DIR"
rsync -a --delete dist/server/ "$SSR_DIR"

# 6. runtime node_modules (/opt/aidacamp-site, --omit=dev) при изменении lock
RT=/opt/aidacamp-site
cp package.json package-lock.json "$RT/"
if [ "$(cat $RT/.lock-sha256 2>/dev/null)" != "$LOCK" ] || [ ! -d "$RT/node_modules/@astrojs/node" ]; then
  echo "⚙️  runtime npm ci…"; (cd "$RT" && npm ci --omit=dev --prefer-offline --legacy-peer-deps 2>&1 | tail -2 && echo "$LOCK" > .lock-sha256)
fi

# 7. симлинк node_modules (ExecStartPre тоже делает это, но подстраховываемся)
ln -sfn "$RT/node_modules" "${REMOTE_DIR%/}/node_modules"

# 8. рестарт + верификация
PID_BEFORE=$(systemctl show -p MainPID --value "$SERVICE")
systemctl restart "$SERVICE"; sleep 2
PID_AFTER=$(systemctl show -p MainPID --value "$SERVICE")
systemctl is-active --quiet "$SERVICE" || { echo "❌ $SERVICE не поднялся"; exit 1; }
[ "$PID_BEFORE" = "$PID_AFTER" ] && { echo "⚠️ PID не сменился"; exit 1; }
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$HEALTH_URL")
[ "$CODE" = "200" ] || { echo "❌ health $CODE"; exit 1; }
echo ""
echo "✅ Задеплоено ($TARGET) @ ${SHA:0:8} | $SERVICE PID $PID_AFTER | HTTP $CODE"
REMOTE
