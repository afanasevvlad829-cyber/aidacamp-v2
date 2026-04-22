#!/usr/bin/env bash
# Ежедневный алерт: галлюцинации бота за последние 24 часа
# Запускается cron на сервере в 08:00
# Шлёт в Telegram если rate > 5% или есть новые флаги

set -euo pipefail

source /var/www/aidacamp-dev/current/.env 2>/dev/null || true

DB_URL="${DATABASE_URL:-postgresql://aidacamp@localhost/aidacamp}"
TG_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TG_CHAT="${TELEGRAM_CHAT_ID:-}"

if [[ -z "$TG_TOKEN" || -z "$TG_CHAT" ]]; then
  echo "[alert] Telegram credentials not set, skipping"
  exit 0
fi

send_tg() {
  curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    -d "chat_id=${TG_CHAT}" \
    -d "parse_mode=HTML" \
    --data-urlencode "text=$1" > /dev/null
}

# Подсчёт за последние 24 часа
STATS=$(psql "$DB_URL" -t -A -F'|' <<'SQL'
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN was_corrected = false THEN 1 ELSE 0 END) AS flagged,
  ROUND(
    100.0 * SUM(CASE WHEN was_corrected = false THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0)
  , 1) AS rate_pct
FROM ai_guard_flags
WHERE created_at >= NOW() - INTERVAL '24 hours'
SQL
)

TOTAL=$(echo "$STATS" | cut -d'|' -f1 | tr -d ' ')
FLAGGED=$(echo "$STATS" | cut -d'|' -f2 | tr -d ' ')
RATE=$(echo "$STATS" | cut -d'|' -f3 | tr -d ' ')

# Если данных нет
if [[ -z "$TOTAL" || "$TOTAL" == "0" ]]; then
  echo "[alert] No bot requests in last 24h, skipping"
  exit 0
fi

echo "[alert] Last 24h: total=$TOTAL, flagged=$FLAGGED, rate=${RATE}%"

# Порог: алертим если >5% или флагов >= 3
THRESHOLD=5
FLAGS_THRESHOLD=3

SEND=0
if (( $(echo "$RATE > $THRESHOLD" | bc -l 2>/dev/null || echo 0) )); then SEND=1; fi
if [[ "$FLAGGED" -ge "$FLAGS_THRESHOLD" ]] 2>/dev/null; then SEND=1; fi

if [[ "$SEND" == "0" ]]; then
  echo "[alert] OK — rate=${RATE}%, no alert needed"
  exit 0
fi

# Топ-3 последних проблемы
ISSUES=$(psql "$DB_URL" -t -A <<'SQL'
SELECT '• ' || LEFT(issue, 120)
FROM ai_guard_flags
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 3
SQL
)

MSG="<b>⚠️ АйДаКемп бот — галлюцинации за 24ч</b>

<b>Запросов:</b> ${TOTAL}
<b>Пойманных ошибок:</b> ${FLAGGED}
<b>Процент:</b> ${RATE}%

<b>Последние проблемы:</b>
${ISSUES}

Смотреть в БД: <code>SELECT * FROM ai_guard_flags ORDER BY created_at DESC LIMIT 20;</code>"

send_tg "$MSG"
echo "[alert] Telegram sent: flagged=$FLAGGED rate=${RATE}%"
