#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# health-monitor.sh — проверяет, что прод и dev порталы живы.
# Запускать на СЕРВЕРЕ по cron каждые 5 минут:
#   */5 * * * * /var/www/aidacamp/current/scripts/health-monitor.sh >> /var/log/aidacamp-health.log 2>&1
#
# Алерт в Telegram при не-(200/302). TELEGRAM_BOT_TOKEN/CHAT_ID берутся из .env.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

# Эндпойнты: имя|URL|ожидаемые коды (через запятую)
ENDPOINTS=(
  "prod-portal|https://aidacamp.ru/portal/metodichki|200,302"
  "prod-home|https://aidacamp.ru/|200"
  "dev-portal|https://dev.aidacamp.ru/portal/metodichki|200,302"
)

ENV_FILE="${ENV_FILE:-/var/www/aidacamp/.env}"
TG_TOKEN=$(grep -m1 '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' ')
TG_CHAT=$(grep -m1 '^TELEGRAM_CHAT_ID=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' ')

alert() {
  local msg="$1"
  echo "$(date '+%Y-%m-%d %H:%M:%S') ALERT: $msg"
  if [ -n "${TG_TOKEN:-}" ] && [ -n "${TG_CHAT:-}" ]; then
    curl -s -o /dev/null --max-time 10 \
      "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${TG_CHAT}" \
      --data-urlencode "text=🔴 AidaCamp health: ${msg}" || true
  fi
}

FAILED=0
for ep in "${ENDPOINTS[@]}"; do
  IFS='|' read -r name url codes <<< "$ep"
  got=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" || echo "000")
  if [[ ",$codes," == *",$got,"* ]]; then
    echo "$(date '+%H:%M:%S') OK   $name → $got"
  else
    alert "$name вернул HTTP $got (ожидалось $codes) — $url"
    FAILED=$((FAILED+1))
  fi
done

exit $FAILED
