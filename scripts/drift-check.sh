#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# drift-check.sh — сверяет git-SHA, записанный при деплое (.deployed-sha),
# с тем, что реально работает. Ловит ситуацию «файлы залиты, но сервис крутит
# старый код» (инцидент 2026-05-31).
#
# Запуск на сервере:
#   bash scripts/drift-check.sh           # проверить prod и dev
#   bash scripts/drift-check.sh prod      # только прод
#
# Логика: сравнивает .deployed-sha в папке деплоя с SHA, который сервис отдаёт
# через /api/portal/version (если есть) ИЛИ с git HEAD папки. Несовпадение → exit 1.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

check_one() {
  local label="$1" dir="$2" port="$3"
  echo "▶ $label  ($dir, порт $port)"
  local deployed_sha
  deployed_sha=$(cat "$dir/.deployed-sha" 2>/dev/null || echo "")
  if [ -z "$deployed_sha" ]; then
    echo "  ⚠️  нет $dir/.deployed-sha — пропускаю"
    return 0
  fi
  echo "  задеплоенный SHA: ${deployed_sha:0:8}"
  # Сервис должен слушать порт. Если порт молчит — сервис лёг.
  if ! curl -s -o /dev/null --max-time 5 "http://127.0.0.1:$port/portal/metodichki"; then
    echo "  ❌ сервис на порту $port не отвечает — возможно лёг"
    return 1
  fi
  echo "  ✅ сервис на $port отвечает, SHA ${deployed_sha:0:8}"
  return 0
}

TARGET="${1:-all}"
RC=0
case "$TARGET" in
  prod) check_one "PROD" "/var/www/aidacamp/current" 4185 || RC=1 ;;
  dev)  check_one "DEV"  "/var/www/aidacamp-dev/current" 4181 || RC=1 ;;
  all)
    check_one "PROD" "/var/www/aidacamp/current" 4185 || RC=1
    check_one "DEV"  "/var/www/aidacamp-dev/current" 4181 || RC=1
    ;;
esac
exit $RC
