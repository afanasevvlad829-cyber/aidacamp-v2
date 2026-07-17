#!/bin/bash
# Smoke-проверка КОНВЕРСИОННОГО контура прода — вызывается из deploy.sh после
# обычного smoke.sh (только prod). Ловит класс инцидента 16-18.04.2026
# (Partytown): сайт отдаёт 200, страницы на месте, а Метрика мертва →
# 0 конверсий в Директе → −60К₽ за 2 дня, заметили по упавшим деньгам.
#
# Использование: ./scripts/smoke-conversion.sh https://aidacamp.ru
#
# Три проверки:
#   1) статика: в HTML есть сниппет счётчика и НЕТ partytown;
#   2) headless (scripts/smoke-metrika.mjs на сервере, CDP 9222):
#      ym определён + счётчик отстучал визит + reachGoal доходит до Метрики;
#   3) /api/lead: тестовая заявка с номера +7999000… (зарезервированный
#      тест-префикс) принимается и записывается (ok:true).
#
# Провал → Telegram-алерт «конверсионный контур сломан, откатывай» + exit 1
# (в deploy.sh это fail_deploy → авто-откат). Недоступность самого чекера
# (Chrome/CDP на сервере) прод НЕ роняет — только алерт-предупреждение:
# откат не чинит сломанный чекер, а заблокированные деплои — чинят вряд ли.
#
# env: SSH_KEY, SSH_HOST — доступ к серверу (дефолты как в deploy.sh);
#      TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — алерты (нет — просто exit-код);
#      SKIP_LEAD_SMOKE=1 — не слать тестовую заявку (без CRM/TG-шума).
set -uo pipefail

BASE="${1:-https://aidacamp.ru}"
BASE="${BASE%/}"
SSH_HOST="${SSH_HOST:-root@159.194.223.55}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/aidacamp_prod}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COUNTER="96499295"
# Тест-префикс +7999000 (см. память reference_test_phones): в TG/CRM такие
# заявки узнаются как тестовые. Дедуп из PR #828 (когда домержится) тестовые
# номера сознательно НЕ отсекает — заявка проходит полный путь каждый раз.
LEAD_PHONE="+79990001144"

FAILS=()
WARNS=()

tg_send() {
  # Алерт в Telegram; без токена — молча пропускаем (локальный запуск).
  [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ] && return 0
  curl -s --max-time 10 -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    --data-urlencode text="$1" >/dev/null || true
}

echo "🎯 Конверсионный smoke: $BASE"

# ── 1. Статика: сниппет Метрики на месте, partytown не вернулся ──
echo ""
echo "── 1. HTML: сниппет Метрики / отсутствие partytown ──"
HTML=$(curl -s --max-time 20 "$BASE/")
if [ -z "$HTML" ]; then
  FAILS+=("главная не отдала HTML (curl пустой)")
else
  # ⚠️ Не заменять here-string на `echo "$HTML" | grep -q`: под pipefail
  # ранний выход grep -q даёт echo SIGPIPE и совпадение выглядит как провал.
  if grep -q "mc.yandex.ru/metrika/tag.js?id=$COUNTER" <<< "$HTML"; then
    echo "  ✅ сниппет счётчика $COUNTER в HTML"
  else
    echo "  ❌ в HTML нет сниппета счётчика $COUNTER"
    FAILS+=("в HTML нет сниппета Метрики ($COUNTER)")
  fi
  if grep -qi "partytown" <<< "$HTML"; then
    echo "  ❌ в HTML найден partytown"
    FAILS+=("в HTML найден partytown — Метрика будет задушена (инцидент 16-18.04.2026)")
  else
    echo "  ✅ partytown отсутствует"
  fi
fi

# ── 2. Headless: ym / визит / reachGoal — через Chrome на сервере ──
echo ""
echo "── 2. Headless: ym + визит + reachGoal (CDP на сервере) ──"
REMOTE_MJS="/opt/browser-agent/smoke-metrika.mjs"
if ! scp -q -i "$SSH_KEY" -o ConnectTimeout=15 \
    "$SCRIPT_DIR/smoke-metrika.mjs" "$SSH_HOST:$REMOTE_MJS"; then
  echo "  ⚠️  scp на сервер не прошёл — headless-проверка пропущена"
  WARNS+=("headless-проверка Метрики не выполнена: scp на сервер не прошёл")
else
  run_metrika() {
    ssh -i "$SSH_KEY" -o ConnectTimeout=15 "$SSH_HOST" "node $REMOTE_MJS '$BASE'"
  }
  OUT=$(run_metrika); RC=$?
  if [ "$RC" = "1" ]; then
    # Один повтор: сетевой глюк до mc.yandex.ru не должен откатывать здоровый прод
    echo "  ↻ повтор headless-проверки после провала..."
    OUT=$(run_metrika); RC=$?
  fi
  echo "  → $OUT"
  case "$RC" in
    0) echo "  ✅ Метрика живая: ym + визит + reachGoal доходят" ;;
    2) WARNS+=("headless-чекер недоступен (Chrome/CDP на сервере): $OUT") ;;
    *) FAILS+=("Метрика на проде НЕ работает (ym/визит/reachGoal): $OUT") ;;
  esac
fi

# ── 3. /api/lead: тестовая заявка записывается ──
echo ""
echo "── 3. /api/lead: тестовая заявка ($LEAD_PHONE) ──"
if [ "${SKIP_LEAD_SMOKE:-0}" = "1" ]; then
  echo "  ⏭  пропущено (SKIP_LEAD_SMOKE=1)"
else
  LEAD_PAYLOAD=$(cat <<JSON
{"phone":"$LEAD_PHONE","source":"deploy_smoke","form_id":"deploy_smoke","utm_source":"deploy","utm_campaign":"deploy-smoke","landing_url":"$BASE/","page_title":"deploy smoke"}
JSON
)
  post_lead() {
    curl -s --max-time 30 -X POST "$BASE/api/lead" \
      -H 'Content-Type: application/json' -d "$LEAD_PAYLOAD"
  }
  RESP=$(post_lead)
  if ! grep -q '"ok":true' <<< "$RESP"; then
    echo "  ↻ повтор после провала..."
    sleep 2
    RESP=$(post_lead)
  fi
  echo "  → ${RESP:0:200}"
  if grep -q '"ok":true' <<< "$RESP"; then
    echo "  ✅ заявка принята и записана"
    if grep -q '"tg":false' <<< "$RESP"; then
      WARNS+=("/api/lead принял заявку, но TG-уведомление не ушло (tg:false)")
    fi
  else
    echo "  ❌ /api/lead не принял тестовую заявку"
    FAILS+=("/api/lead не принял тестовую заявку: ${RESP:0:150}")
  fi
fi

# ── Итог ──
echo ""
if [ ${#WARNS[@]} -gt 0 ]; then
  printf '  ⚠️  %s\n' "${WARNS[@]}"
  tg_send "⚠️ Конверсионный smoke ($BASE): проверка неполная
$(printf -- '- %s\n' "${WARNS[@]}")
Прод НЕ откатываю, но чекер/уведомления требуют внимания."
fi

if [ ${#FAILS[@]} -gt 0 ]; then
  printf '  ❌ %s\n' "${FAILS[@]}"
  tg_send "🔥 КОНВЕРСИОННЫЙ КОНТУР СЛОМАН, ОТКАТЫВАЙ ($BASE)
$(printf -- '- %s\n' "${FAILS[@]}")
Деплой падает с exit 1 → авто-откат (AUTO_ROLLBACK) должен вернуть прошлую версию. Проверь: Метрика, цели, /api/lead. Инцидент-референс: Partytown 16-18.04.2026 (−60К₽/2 дня)."
  echo "❌ CONVERSION SMOKE FAILED: ${#FAILS[@]} проблем"
  exit 1
fi

echo "✅ CONVERSION SMOKE OK (Метрика + reachGoal + /api/lead)"
