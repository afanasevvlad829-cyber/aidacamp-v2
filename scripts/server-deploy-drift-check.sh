#!/bin/bash
# Server-side check: задеплоенный код должен соответствовать origin/main.
# Раз в N минут (cron) сравнивает SHA задеплоенного с GitHub origin/main.
# При расхождении шлёт Telegram-алерт.
#
# Установка на сервере:
#   /opt/etl/scripts/server-deploy-drift-check.sh
#   crontab: */15 * * * * /opt/etl/scripts/server-deploy-drift-check.sh
#
# Требования:
#   /opt/etl/.env с TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
#   /var/www/aidacamp/current/.deployed-sha — записывается deploy.sh

set -euo pipefail

ENV_FILE="/opt/etl/.env"
DEPLOYED_SHA_FILE="/var/www/aidacamp/current/.deployed-sha"
GH_REPO="afanasevvlad829-cyber/aidacamp-v2"
STATE_FILE="/var/lib/aidacamp-deploy-drift.state"

[ -f "$ENV_FILE" ] || { echo "no env"; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
[ -z "$TELEGRAM_BOT_TOKEN" ] && exit 0

# 1. SHA на GitHub
GH_SHA=$(curl -fsSL "https://api.github.com/repos/$GH_REPO/git/ref/heads/main" 2>/dev/null \
  | grep -oE '"sha":\s*"[a-f0-9]+"' | head -1 | grep -oE '[a-f0-9]{40}' || echo "")

# 2. SHA на сервере
DEPLOYED_SHA=""
[ -f "$DEPLOYED_SHA_FILE" ] && DEPLOYED_SHA=$(cat "$DEPLOYED_SHA_FILE" 2>/dev/null | tr -d '[:space:]')

# 3. Сравнение
if [ -z "$GH_SHA" ] || [ -z "$DEPLOYED_SHA" ]; then
  exit 0  # не алертим если данных нет (могут быть сетевые сбои или первый запуск)
fi

if [ "$GH_SHA" = "$DEPLOYED_SHA" ]; then
  # OK — сбросим возможный prev-alert state
  echo "ok" > "$STATE_FILE"
  exit 0
fi

# Расхождение. Чтобы не спамить — алертим только если состояние изменилось
PREV_STATE="ok"
[ -f "$STATE_FILE" ] && PREV_STATE=$(cat "$STATE_FILE")
if [ "$PREV_STATE" = "drift:$DEPLOYED_SHA:$GH_SHA" ]; then
  exit 0  # уже алертили этот же drift
fi
echo "drift:$DEPLOYED_SHA:$GH_SHA" > "$STATE_FILE"

# Узнаём ahead/behind
AHEAD=$(curl -fsSL "https://api.github.com/repos/$GH_REPO/compare/$DEPLOYED_SHA...$GH_SHA" 2>/dev/null \
  | grep -oE '"ahead_by":\s*[0-9]+' | grep -oE '[0-9]+$' || echo "?")
BEHIND=$(curl -fsSL "https://api.github.com/repos/$GH_REPO/compare/$GH_SHA...$DEPLOYED_SHA" 2>/dev/null \
  | grep -oE '"ahead_by":\s*[0-9]+' | grep -oE '[0-9]+$' || echo "?")

MSG="🚨 <b>DEPLOY DRIFT</b>

Прод (aidacamp.ru) <b>не</b> соответствует <code>main</code>:

GitHub main: <code>${GH_SHA:0:8}</code>
Прод-сервер: <code>${DEPLOYED_SHA:0:8}</code>

GitHub впереди на <b>$AHEAD</b> коммитов
Сервер  впереди на <b>$BEHIND</b> коммитов

→ Возможно агент задеплоил минуя git, или забыли git push, или ручная правка на сервере.
→ Проверить: <a href=\"https://github.com/$GH_REPO/compare/$DEPLOYED_SHA...$GH_SHA\">diff</a>"

curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "parse_mode=HTML" \
  -d "disable_web_page_preview=true" \
  --data-urlencode "text=$MSG" > /dev/null
