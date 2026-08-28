#!/bin/bash
# Откат прода на последний бэкап, созданный deploy.sh.
#
# Использование: ./scripts/rollback.sh prod [backup-YYYYMMDD-HHMMSS]
#
# Без второго аргумента берётся самый свежий backup-* из /var/www/aidacamp/.
# deploy.sh создаёт их перед каждым прод-деплоем и хранит 3 последних.
set -euo pipefail

SSH_HOST="root@159.194.223.55"
SSH_KEY="${SSH_KEY_PROD:-$HOME/.ssh/aidacamp_prod}"
TARGET="${1:-prod}"
WANT_BACKUP="${2:-}"

if [ "$TARGET" != "prod" ]; then
  echo "❌ Откат поддержан только для prod (у dev нет бэкапов)."
  exit 1
fi

REMOTE_DIR="/var/www/aidacamp/current/"
SERVICE="aidacamp-prod"   # имя юнита совпадает с deploy.sh, не "aidacamp"
HEALTH_URL="https://aidacamp.ru"
ssh_do() { ssh -i "$SSH_KEY" "$SSH_HOST" "$@"; }

# ── 1. Выбираем бэкап ─────────────────────────────────────────
if [ -n "$WANT_BACKUP" ]; then
  BACKUP="$WANT_BACKUP"
else
  BACKUP=$(ssh_do "ls -dt /var/www/aidacamp/backup-* 2>/dev/null | head -1 | xargs -r basename" || echo "")
fi

if [ -z "$BACKUP" ]; then
  echo "❌ ОТКАТ НЕВОЗМОЖЕН: бэкапов нет в /var/www/aidacamp/"
  echo "   Прод остаётся в текущем (возможно сломанном) состоянии."
  exit 1
fi

if ! ssh_do "test -d /var/www/aidacamp/$BACKUP"; then
  echo "❌ Бэкап не найден: /var/www/aidacamp/$BACKUP"
  exit 1
fi

echo "⏮  Откат прода на: $BACKUP"

# ── 2. Сохраняем сломанное состояние (для разбора) ────────────
BROKEN="broken-$(date +%Y%m%d-%H%M%S)"
ssh_do "cp -a $REMOTE_DIR /var/www/aidacamp/$BROKEN/ 2>/dev/null" \
  && echo "  📦 Сломанное состояние сохранено → /var/www/aidacamp/$BROKEN/" \
  || echo "  ⚠️  не удалось сохранить сломанное состояние (продолжаем откат)"

# ── 3. Восстанавливаем ────────────────────────────────────────
# rsync --delete внутрь current/ безопасен: node_modules — симлинк наружу,
# он в исключениях. Корень /var/www/aidacamp/ НЕ трогаем (инцидент 2026-05-22).
ssh_do "rsync -a --delete --exclude='node_modules' --exclude='.env*' \
  /var/www/aidacamp/$BACKUP/ $REMOTE_DIR"
echo "  ✅ Файлы восстановлены"

# ── 4. Рестарт SSR ────────────────────────────────────────────
PID_BEFORE=$(ssh_do "systemctl show $SERVICE --property=MainPID --value" 2>/dev/null || echo "0")
ssh_do "systemctl restart $SERVICE"
sleep 3
SVC_STATE=$(ssh_do "systemctl is-active $SERVICE" 2>&1 || echo "failed")
PID_AFTER=$(ssh_do "systemctl show $SERVICE --property=MainPID --value" 2>/dev/null || echo "0")

if [ "$SVC_STATE" != "active" ]; then
  echo "❌ ОТКАТ НЕ ПОМОГ: $SERVICE не active (статус: $SVC_STATE)"
  echo "   journalctl -u $SERVICE -n 40 --no-pager"
  exit 1
fi
echo "  ✅ $SERVICE active (PID $PID_BEFORE → $PID_AFTER)"

# ── 5. Healthcheck ────────────────────────────────────────────
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$HEALTH_URL" || echo "000")
if [ "$HTTP" != "200" ]; then
  echo "❌ ОТКАТ НЕ ПОМОГ: $HEALTH_URL → HTTP $HTTP"
  exit 1
fi

echo ""
echo "✅ Прод откачен на $BACKUP, HTTP 200"
echo "   Сломанная версия: /var/www/aidacamp/$BROKEN/"
