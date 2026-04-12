#!/bin/bash
# Запуск MCP-сервера с автоперезапуском и логами в терминал
# Использование: ./scripts/mcp-run.sh

cd "$(dirname "$0")/.."

echo "━━━ АйДаКемп MCP Server ━━━"
echo "Ctrl+C для остановки"
echo ""

while true; do
  echo "[$(date '+%H:%M:%S')] Запуск MCP-сервера..."
  node scripts/mcp-server.mjs 2>&1
  CODE=$?
  echo ""
  echo "[$(date '+%H:%M:%S')] Сервер упал (код $CODE). Перезапуск через 2 сек..."
  sleep 2
done
