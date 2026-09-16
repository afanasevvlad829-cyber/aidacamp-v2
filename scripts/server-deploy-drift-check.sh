#!/bin/bash
# Server-side check: задеплоенный код должен соответствовать origin/dev на Forgejo.
# Раз в N минут (cron) сравнивает SHA задеплоенного с git.aidaplus.ru, ветка dev
# (единственная боевая с 09.09.2026; GitHub с 08.09.2026 не используется).
# При расхождении шлёт Telegram-алерт.
#
# Установка на сервере:
#   /opt/etl/scripts/server-deploy-drift-check.sh
#   crontab: */15 * * * * /opt/etl/scripts/server-deploy-drift-check.sh
#
# Требования:
#   /opt/etl/.env с TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, FORGEJO_TOKEN
#   (токен Forgejo с правом read:repository; без него скрипт молча выходит)
#   /var/www/aidacamp/current/.deployed-sha — записывается deploy.sh

set -euo pipefail

ENV_FILE="/opt/etl/.env"
DEPLOYED_SHA_FILE="/var/www/aidacamp/current/.deployed-sha"
FJ_API="https://git.aidaplus.ru/api/v1/repos/vlad/aidacamp-v2"
FJ_BRANCH="dev"
STATE_FILE="/var/lib/aidacamp-deploy-drift.state"

[ -f "$ENV_FILE" ] || { echo "no env"; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
FORGEJO_TOKEN="${FORGEJO_TOKEN:-}"
[ -z "$TELEGRAM_BOT_TOKEN" ] && exit 0
[ -z "$FORGEJO_TOKEN" ] && exit 0   # нет токена — сверять не с чем, не алертим
fj() { curl -fsSL -H "Authorization: token $FORGEJO_TOKEN" "$FJ_API/$1" 2>/dev/null; }

# 1. SHA ветки dev на Forgejo
GH_SHA=$(fj "branches/$FJ_BRANCH" | python3 -c 'import sys,json; print(json.load(sys.stdin)["commit"]["id"])' 2>/dev/null || echo "")

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
AHEAD=$(fj "compare/$DEPLOYED_SHA...$GH_SHA" | python3 -c 'import sys,json; print(json.load(sys.stdin)["total_commits"])' 2>/dev/null || echo "?")
BEHIND=$(fj "compare/$GH_SHA...$DEPLOYED_SHA" | python3 -c 'import sys,json; print(json.load(sys.stdin)["total_commits"])' 2>/dev/null || echo "?")

MSG="🚨 <b>DEPLOY DRIFT</b>

Прод (aidacamp.ru) <b>не</b> соответствует <code>dev</code> на Forgejo:

Forgejo dev: <code>${GH_SHA:0:8}</code>
Прод-сервер: <code>${DEPLOYED_SHA:0:8}</code>

Forgejo впереди на <b>$AHEAD</b> коммитов
Сервер  впереди на <b>$BEHIND</b> коммитов

→ Возможно агент задеплоил минуя git, или забыли git push, или ручная правка на сервере.
→ Проверить: <a href=\"https://git.aidaplus.ru/vlad/aidacamp-v2/compare/$DEPLOYED_SHA...$GH_SHA\">diff</a>"

curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "parse_mode=HTML" \
  -d "disable_web_page_preview=true" \
  --data-urlencode "text=$MSG" > /dev/null
