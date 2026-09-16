#!/usr/bin/env bash
# mcp-call.sh — вызов инструмента MCP из шелла, без поднятия MCP-сессии.
#
# Использует stateless-эндпоинт POST /mcp/api/call (он есть в mcp-server.mjs;
# при сведении версий 25.08.2026 специально сохранён именно ради таких вызовов).
# Обычный /mcp требует initialize + notifications/initialized + session-id —
# для крон-скрипта это лишние три запроса и состояние.
#
# Использование:
#   mcp-call.sh <service> <action> '<params-json>'      # через тул run
#   mcp-call.sh --tool <имя_тула> '<arguments-json>'    # произвольный инструмент
#
# Токен берётся из /opt/mcp/.env (MCP_SECRET) — тот же, что у самого сервера.
set -uo pipefail

URL="${MCP_URL:-http://127.0.0.1:3457/mcp/api/call}"
TOK=$(grep -m1 '^MCP_SECRET=' /opt/mcp/.env 2>/dev/null | cut -d= -f2- | tr -d '"')
[ -z "$TOK" ] && { echo "нет MCP_SECRET в /opt/mcp/.env" >&2; exit 2; }

# ⚠️ Не писать ${3:-{}} — фигурные скобки внутри подстановки ломают разбор bash,
# и в тело уходит мусор («Invalid JSON body»). Дефолт задаём отдельной строкой.
EMPTY='{}'
if [ "${1:-}" = "--tool" ]; then
  ARGS="${3:-$EMPTY}"
  BODY=$(printf '{"name":"%s","arguments":%s}' "$2" "$ARGS")
else
  SERVICE="${1:?service}"; ACTION="${2:?action}"; PARAMS="${3:-$EMPTY}"
  BODY=$(printf '{"name":"run","arguments":{"service":"%s","action":"%s","params":%s}}' "$SERVICE" "$ACTION" "$PARAMS")
fi

RESP=$(curl -s -m 120 -X POST "$URL" \
  -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' \
  -d "$BODY") || { echo "curl упал" >&2; exit 1; }

# Отдаём текст результата, а не весь конверт MCP
echo "$RESP" | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    print(sys.stdin.read() if not sys.stdin.closed else '', end=''); sys.exit(0)
c=(d.get('content') or [{}])[0].get('text','')
print(c if c else json.dumps(d, ensure_ascii=False))
sys.exit(1 if d.get('isError') else 0)
"
