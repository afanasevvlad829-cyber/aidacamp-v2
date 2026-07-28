#!/bin/bash
# Preflight: одна дешёвая проверка токена/биллинга ПЕРЕД запуском конвейера.
#
# Два инцидента (аудит 17.07.2026), оба предотвращались минутной проверкой до старта:
#   - 16.07: ~4 часа на конвейер внешнего ревью через Replicate → «insufficient
#     credit» — денег на счету не было с самого начала;
#   - 15.07: очередь из 9 headless-агентов на сервере отработала вхолостую —
#     «401 OAuth access token has expired», все файлы разделов по 0 байт.
#
# Использование:
#   bash scripts/preflight.sh claude            — smoke headless-агента локально
#   bash scripts/preflight.sh claude <ssh-host> — smoke на сервере (тем же каналом,
#                                                 которым пойдёт очередь)
#   REPLICATE_API_TOKEN=... bash scripts/preflight.sh replicate
#                                               — токен И кредит одним вызовом
#                                                 (официальная тест-модель hello-world)
#
# Успех пишет маркер /tmp/aidacamp-preflight-<service>.ok. Страж
# scripts/hooks/guard-preflight.py не пропустит запуск очереди/конвейера без
# свежего маркера (TTL 30 минут).

set -uo pipefail

SERVICE="${1:-}"
HOST="${2:-}"
MARKER_DIR="${AIDACAMP_PREFLIGHT_DIR:-/tmp}"

die() { echo "❌ preflight ($SERVICE): $*" >&2; exit 1; }
ok()  {
  touch "$MARKER_DIR/aidacamp-preflight-$SERVICE.ok"
  echo "✅ preflight ($SERVICE): $* Маркер поставлен на 30 минут."
}

# Портативный тайм-аут: `timeout` на маке нет (грабли той же сессии), perl есть везде
with_timeout() { perl -e 'alarm shift; exec @ARGV' "$@"; }

case "$SERVICE" in
  claude)
    # Smoke-агент №0: тот же бинарь, тот же OAuth, тот же канал, что у будущей очереди
    if [[ -n "$HOST" ]]; then
      OUT=$(with_timeout 120 ssh "$HOST" 'claude -p "ping" --max-turns 1' 2>&1)
    else
      OUT=$(with_timeout 120 claude -p "ping" --max-turns 1 2>&1)
    fi
    RC=$?
    [[ $RC -ne 0 ]] && die "smoke-вызов упал (rc=$RC): ${OUT:0:300}"
    [[ -z "$OUT" ]] && die "smoke-вызов вернул пустоту — как 9 нулевых файлов 15.07"
    echo "$OUT" | grep -qiE 'oauth|token has expired|401|not logged in|/login' \
      && die "OAuth протух: ${OUT:0:300}"
    ok "headless-агент отвечает${HOST:+ на $HOST}."
    ;;

  replicate)
    [[ -z "${REPLICATE_API_TOKEN:-}" ]] \
      && die "нет REPLICATE_API_TOKEN в окружении. Возьми из .env и передай: REPLICATE_API_TOKEN=... bash scripts/preflight.sh replicate"
    # Тест-модель replicate/hello-world: копеечный запуск проверяет И валидность
    # токена, И наличие кредита — «insufficient credit» вылетает прямо на создании
    # prediction, ждать выполнения не нужно.
    # Эндпоинт /v1/models/<owner>/<name>/predictions работает ТОЛЬКО для official
    # models; hello-world к ним не относится и отдавал 404 (поймано 28.07.2026 при
    # первой же проверке живым токеном). Поэтому: GET версии → POST /v1/predictions.
    META=$(with_timeout 30 curl -sS "https://api.replicate.com/v1/models/replicate/hello-world" \
      -H "Authorization: Bearer $REPLICATE_API_TOKEN" 2>&1) || die "curl упал: ${META:0:300}"
    echo "$META" | grep -qiE 'authentication|unauthenticated|invalid.*token' \
      && die "токен невалиден: ${META:0:300}"
    VERSION_ID=$(echo "$META" | python3 -c 'import json,sys
try: print((json.load(sys.stdin).get("latest_version") or {}).get("id") or "")
except Exception: pass' 2>/dev/null)
    [[ -z "$VERSION_ID" ]] && die "не удалось получить версию hello-world: ${META:0:300}"
    RESP=$(with_timeout 60 curl -sS -X POST \
      "https://api.replicate.com/v1/predictions" \
      -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"version\":\"${VERSION_ID}\",\"input\":{\"text\":\"preflight\"}}" 2>&1) || die "curl упал: ${RESP:0:300}"
    echo "$RESP" | grep -qi 'insufficient credit' \
      && die "на счету Replicate нет денег — конвейер мертворождённый (инцидент 16.07). Пополни биллинг ДО постройки."
    echo "$RESP" | grep -qiE 'authentication|unauthenticated|invalid.*token' \
      && die "токен невалиден: ${RESP:0:300}"
    echo "$RESP" | grep -q '"id"' \
      || die "неожиданный ответ API: ${RESP:0:300}"
    ok "токен валиден, кредит есть (hello-world принят)."
    ;;

  *)
    echo "Использование: bash scripts/preflight.sh claude [ssh-host] | replicate" >&2
    echo "Для других внешних API (OpenAI, Gemini, ...) правило то же — один дешёвый" >&2
    echo "вызов, проверяющий токен и биллинг, ДО постройки конвейера (CLAUDE.md)." >&2
    exit 1
    ;;
esac
