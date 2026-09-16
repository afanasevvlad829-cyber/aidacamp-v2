#!/usr/bin/env bash
# seo-alert.sh — единая точка отправки алертов SEO-конвейера в Telegram.
#
# Зачем. Инвентаризация 27.08.2026 показала главную причину «каждый день что-то
# падает»: ни один SEO-скрипт не сообщал о своём отказе. Конвейер простаивал
# 23-24.08, MCP лежал 23-25.08, деплой codims стоял сутки — и каждый раз это
# обнаруживалось только при ручной проверке логов, через дни.
# Алерт не чинит поломку, но превращает «узнали через три дня» в «узнали сразу».
#
# Использование:
#   seo-alert.sh <уровень> <источник> <текст>
#     уровень: error | warn | info
#   echo "детали" | seo-alert.sh error backlog-volumes "добор частотности не идёт"
#
# Антиспам: одинаковый алерт (уровень+источник+первая строка) не повторяется
# чаще раза в 6 часов — иначе ежечасный сторож за сутки пришлёт 24 одинаковых
# сообщения, и их перестанут читать.
set -uo pipefail

LEVEL="${1:-error}"; SOURCE="${2:-seo}"; shift 2 || true
TEXT="${*:-без описания}"
DETAILS=""
[ ! -t 0 ] && DETAILS=$(head -c 1200 2>/dev/null || true)

STATE_DIR=/var/lib/seo-alerts
COOLDOWN=$((6*3600))
mkdir -p "$STATE_DIR" 2>/dev/null || STATE_DIR=/tmp

KEY=$(printf '%s|%s|%s' "$LEVEL" "$SOURCE" "$TEXT" | md5sum | cut -c1-16)
STAMP="$STATE_DIR/$KEY"
if [ -f "$STAMP" ]; then
  AGE=$(( $(date +%s) - $(stat -c %Y "$STAMP" 2>/dev/null || echo 0) ))
  [ "$AGE" -lt "$COOLDOWN" ] && exit 0
fi

TOK=$(grep -m1 '^TG_BOT_TOKEN=' /opt/etl/.env 2>/dev/null | cut -d= -f2- | tr -d '"')
CHAT=$(grep -m1 '^TG_CHAT_ID=' /opt/etl/.env 2>/dev/null | cut -d= -f2- | tr -d '"')
if [ -z "$TOK" ] || [ -z "$CHAT" ]; then
  echo "[seo-alert] нет TG_BOT_TOKEN/TG_CHAT_ID в /opt/etl/.env — алерт не отправлен" >&2
  exit 1
fi

case "$LEVEL" in
  error) ICON="🔴" ;;
  warn)  ICON="🟡" ;;
  *)     ICON="ℹ️" ;;
esac

MSG="$ICON SEO-конвейер · $SOURCE
$TEXT"
[ -n "$DETAILS" ] && MSG="$MSG

$DETAILS"

curl -s -o /dev/null -m 20 \
  "https://api.telegram.org/bot${TOK}/sendMessage" \
  -d chat_id="$CHAT" \
  --data-urlencode text="$MSG" && date > "$STAMP"
