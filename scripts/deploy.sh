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

# ── GUARD: прод-деплой только с MASTER_AGENT=1 ───────────────
# Защита от прямого запуска агентами/скриптами без явного разрешения.
if [ "$TARGET" = "prod" ] && [ "${MASTER_AGENT:-0}" != "1" ] && [ "${SKIP_GIT_GUARD:-0}" != "1" ]; then
  echo "❌ PROD DEPLOY BLOCKED"
  echo ""
  echo "   Прод-деплой требует явного разрешения владельца."
  echo "   Запускай только так:"
  echo "     MASTER_AGENT=1 ./scripts/deploy.sh prod"
  echo ""
  echo "   Агентам запрещено деплоить в прод напрямую."
  exit 1
fi

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
    SERVICE="aidacamp-prod"
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
    # Ротация: храним только 3 последних бэкапа (каждый ~575 МБ — иначе диск забивается)
    echo "🧹 Ротация бэкапов (оставляю 3 последних)..."
    ssh -i "$SSH_KEY" "$SSH_HOST" "ls -dt /var/www/aidacamp/backup-* 2>/dev/null | tail -n +4 | xargs -r rm -rf"
    echo "✅ Старые бэкапы удалены"
    echo "📸 Restic-снапшот критичных данных (галерея/.env/БД) перед деплоем..."
    ssh -i "$SSH_KEY" "$SSH_HOST" "/opt/restic-snapshot.sh" >/dev/null 2>&1 \
      && echo "✅ Снапшот создан (restic)" \
      || echo "⚠️  снапшот не создан — см. /var/log/restic-snapshot.log (деплой продолжается)"
    ;;
  *)
    echo "Использование: $0 [dev|prod]"
    exit 1
    ;;
esac

cd "$PROJECT_DIR"

# ── 0. Сборка ─────────────────────────────────────────────────
echo ""
echo ""
echo "📦 Зависимости (синк с lockfile перед сборкой)..."
if [ ! -d node_modules ] || ! cmp -s package-lock.json node_modules/.package-lock.json 2>/dev/null; then
  echo "  ⚙️  lockfile изменился или node_modules нет → npm ci..."
  npm ci
else
  echo "  ✅ node_modules в синке"
fi
echo "🔨 Сборка..."

# ── guard: пути импортов во вложенных API-файлах ──────────────
# Файлы в src/pages/api/portal/*/  на уровень глубже и требуют ../../../../lib/
# Python bulk-замены могут ставить ../../../ — ловим до сборки, а не внутри vite.
BROKEN_IMPORTS=$(find src/pages/api/portal -mindepth 2 -name "*.ts" \
  | xargs grep -l "from '\.\./\.\./\.\./lib/" 2>/dev/null || true)
if [ -n "$BROKEN_IMPORTS" ]; then
  echo "❌ guard: битые пути импортов (нужен ../../../../lib/ вместо ../../../lib/):"
  echo "$BROKEN_IMPORTS"
  exit 1
fi
echo "🔒 guard: пути импортов OK"

# DEPLOY_ENV=dev → assetsPrefix отключён, JS/CSS грузятся с того же хоста
# DEPLOY_ENV=prod → assetsPrefix=https://huhodirekeka.begetcdn.cloud (CDN)
# Явная V8-куча: на 8ГБ Маке под нагрузкой дефолт падает (Abort trap/137, инцидент 11.06.2026)
NODE_OPTIONS="--max-old-space-size=5120" DEPLOY_ENV="$TARGET" npm run build --silent

if [ ! -f "dist/client/index.html" ]; then
  echo "❌ dist/client/index.html не найден. Сборка не удалась."
  exit 1
fi

# Извлекаем критичные ассеты из HTML — будем верифицировать что они залились
CRITICAL_ASSETS=$(grep -oE '/(assets|images|_astro)/[a-zA-Z0-9._/-]+\.(js|css|webp|avif|svg|png)' dist/client/index.html | sort -u | head -20)
HERO_IMAGES=$(grep -oE '/images/hero-mobile-bean[a-z0-9-]*\.(webp|avif)' dist/client/index.html | sort -u)

# ── 1. Статика (HTML, CSS, JS, _astro) ────────────────────────
# ВАЖНО: эти --exclude защищают runtime-данные, если веб-корень и SSR-дерево
# лежат рядом (current/ + .env + node_modules в одной папке). НИКОГДА не
# добавляй сюда --delete и не указывай REMOTE_DIR на «плоский» веб-корень:
# `rsync --delete` по такому корню сносит current/, .env и node_modules
# целиком. Инцидент 2026-05-22: ручной `rsync --delete` в /var/www/aidacamp-dev/
# (живой nginx-root dev) удалил весь current/ + .env — dev упал бы при рестарте.
echo ""
echo "🚀 Деплой статики на $LABEL..."
# Статика кладётся в REMOTE_DIR/client/ — там её ищет Astro standalone SSR-сервер
# (entry.mjs резолвит ../client/ относительно server/).
# REMOTE_DIR = current/ → SSR читает current/client/.
rsync -az --checksum --stats \
  --exclude='.env' \
  --exclude='current/' \
  --exclude='server/' \
  --exclude='node_modules/' \
  --exclude='backup-*' \
  --exclude='client/' \
  --exclude='images/hero/' \
  --exclude='images/gallery/' \
  --exclude='images/team/' \
  --exclude='data/' \
  -e "ssh -i $SSH_KEY" \
  dist/client/ "${SSH_HOST}:${REMOTE_DIR}client/"

# ── 2. Изображения root (hero-mobile, hero-desktop, og, etc) ──
echo ""
echo "🖼️  Синхронизация изображений root..."
rsync -az --stats \
  --include='*.webp' --include='*.avif' --include='*.svg' --include='*.png' --include='*.jpg' --include='*.jpeg' --include='*.gif' \
  --include='*/' --exclude='*' \
  -e "ssh -i $SSH_KEY" \
  dist/client/images/ "${SSH_HOST}:${REMOTE_DIR}client/images/"

# ── 2b. Галерея (admin-uploaded photos) ───────────────────────
# Фото загружаются через админку в /var/www/aidacamp-dev/current/images/gallery/
# и не входят в сборку. На prod синхронизируем с dev вручную.
if [ "$TARGET" = "prod" ]; then
  echo ""
  echo "🖼️  Синхронизация галереи dev → prod..."
  ssh -i "$SSH_KEY" "$SSH_HOST" \
    "rsync -a /var/www/aidacamp-dev/current/images/gallery/ /var/www/aidacamp/current/images/gallery/"
  echo "  ✅ Галерея синхронизирована"
fi

# ── 2c. DEV: статика → плоский корень nginx (/var/www/aidacamp-dev/) ───────
# На dev nginx отдаёт статику из ПЛОСКОГО корня, а не из current/ (см. инцидент
# flat-root). Дублируем статику туда БЕЗ --delete — ничего не удаляем,
# .env / data/ / images/gallery/ остаются нетронутыми.
if [ "$TARGET" = "dev" ]; then
  FLAT_DIR="/var/www/aidacamp-dev/"
  echo ""
  echo "🚀 [dev] Статика → плоский корень nginx ($FLAT_DIR)..."
  rsync -az --stats \
    --exclude='.env' \
    --exclude='server/' \
    --exclude='node_modules/' \
    --exclude='backup-*' \
    --exclude='current/' \
    --exclude='client/' \
    --exclude='images/gallery/' \
    --exclude='data/' \
    -e "ssh -i $SSH_KEY" \
    dist/client/ "$SSH_HOST:$FLAT_DIR"
  echo "🖼️  [dev] Картинки root → плоский корень..."
  rsync -az \
    --include='*.webp' --include='*.avif' --include='*.svg' --include='*.png' --include='*.jpg' --include='*.jpeg' --include='*.gif' \
    --include='*/' --exclude='*' \
    -e "ssh -i $SSH_KEY" \
    dist/client/images/ "$SSH_HOST:${FLAT_DIR}images/"
fi

# ── 3. SSR ────────────────────────────────────────────────────
echo ""
echo "🔄 Деплой SSR-сервера..."
rsync -az --delete --stats \
  -e "ssh -i $SSH_KEY" \
  dist/server/ "$SSH_HOST:$SSR_DIR"

# ── 4. node_modules — синк package.json и переустановка при изменении ──
echo ""
echo "📦 node_modules..."
# Единый каталог с node_modules — репо на сервере
REPO_DIR="/opt/aidacamp-site"
REPO_MODULES="$REPO_DIR/node_modules"

# 4a. Синкаем package.json + package-lock.json на сервер
rsync -az -e "ssh -i $SSH_KEY" package.json package-lock.json "$SSH_HOST:$REPO_DIR/"

# 4b. Сверяем хеш package-lock.json с сохранённым. Если изменился → npm ci.
LOCAL_LOCK_HASH=$(shasum -a 256 package-lock.json | awk '{print $1}')
REMOTE_LOCK_HASH=$(ssh -i "$SSH_KEY" "$SSH_HOST" \
  "cat '$REPO_DIR/.lock-sha256' 2>/dev/null || echo none")
MODULES_OK=$(ssh -i "$SSH_KEY" "$SSH_HOST" \
  "test -d '$REPO_MODULES/@astrojs/node' && echo ok || echo missing")

if [ "$MODULES_OK" = "missing" ] || [ "$LOCAL_LOCK_HASH" != "$REMOTE_LOCK_HASH" ]; then
  echo "  ⚙️  package-lock изменился (или модули отсутствуют) → npm ci..."
  ssh -i "$SSH_KEY" "$SSH_HOST" \
    "cd '$REPO_DIR' && npm ci --omit=dev --prefer-offline --legacy-peer-deps 2>&1 | tail -3 && echo '$LOCAL_LOCK_HASH' > '$REPO_DIR/.lock-sha256'"
  echo "  ✅ node_modules обновлены (hash=${LOCAL_LOCK_HASH:0:8}…)"
else
  echo "  ✅ node_modules актуальны (hash=${LOCAL_LOCK_HASH:0:8}…)"
fi

# Симлинк node_modules → deploy-директория (не сносится rsync, т.к. exclude выше)
ssh -i "$SSH_KEY" "$SSH_HOST" "ln -sfn $REPO_MODULES ${REMOTE_DIR%/}/node_modules" || true

# ── 5. Restart SSR ────────────────────────────────────────────
echo ""
echo "♻️  Рестарт $SERVICE..."

# Запоминаем PID до рестарта (чтобы потом убедиться что он изменился)
PID_BEFORE=$(ssh -i "$SSH_KEY" "$SSH_HOST" "systemctl show $SERVICE --property=MainPID --value 2>/dev/null" 2>/dev/null || echo "0")

RESTART_OUT=$(ssh -i "$SSH_KEY" "$SSH_HOST" "systemctl restart $SERVICE 2>&1" 2>&1)
if echo "$RESTART_OUT" | grep -q "not found"; then
  echo "❌ systemd-сервис не найден ($SERVICE)."
  echo "   Файлы залиты, но SSR НЕ перезапущен — сайт отдаёт старый код."
  echo "   Проверь имя: ssh $SSH_HOST 'systemctl list-units | grep aidacamp'"
  exit 1
fi
sleep 3
SVC_STATE=$(ssh -i "$SSH_KEY" "$SSH_HOST" "systemctl is-active $SERVICE" 2>&1)
if [ "$SVC_STATE" != "active" ]; then
  echo "❌ Сервис $SERVICE не active после рестарта (статус: $SVC_STATE)."
  echo "   Логи: ssh $SSH_HOST 'journalctl -u $SERVICE -n 30 --no-pager'"
  exit 1
fi

# Проверяем что PID реально сменился (новый процесс, а не старый)
PID_AFTER=$(ssh -i "$SSH_KEY" "$SSH_HOST" "systemctl show $SERVICE --property=MainPID --value 2>/dev/null" 2>/dev/null || echo "0")
if [ "$PID_BEFORE" = "$PID_AFTER" ] && [ "$PID_BEFORE" != "0" ]; then
  echo "⚠️  ВНИМАНИЕ: PID не изменился ($PID_AFTER) — сервис мог НЕ перезапуститься."
  echo "   Файлы залиты, но Node-процесс остался старый → возможны 500 при dynamic import."
  echo "   Перезапусти вручную: ssh $SSH_HOST 'systemctl restart $SERVICE'"
  exit 1
fi

SVC_START=$(ssh -i "$SSH_KEY" "$SSH_HOST" "systemctl show $SERVICE --property=ActiveEnterTimestamp --value 2>/dev/null" 2>/dev/null || echo "")
echo "  ✅ $SERVICE active  PID: $PID_AFTER  started: $SVC_START"

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
REMOTE_HTML_HASH=$(ssh -i "$SSH_KEY" "$SSH_HOST" "md5sum ${REMOTE_DIR}client/index.html 2>/dev/null | awk '{print \$1}'")
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
