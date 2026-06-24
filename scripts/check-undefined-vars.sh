#!/usr/bin/env bash
#
# Узкий CI-гейт: ловит TS2304 "Cannot find name" в серверном TS-коде
# (src/pages/api/**, src/lib/**, src/middleware.ts).
#
# Этот класс багов падает в рантайме (напр. оставшиеся `p`, `s` после
# bulk-миграции авторизации). Полный astro check тяжёлый (OOM, 1396 ошибок),
# поэтому tsc гоняется по узкому tsconfig.check.json только по серверным .ts.
#
set -uo pipefail

cd "$(dirname "$0")/.." || exit 2

# Прогоняем tsc по узкому конфигу. Нас интересуют только TS2304 в нашем коде.
TSC_OUTPUT="$(npx tsc -p tsconfig.check.json 2>&1)"

# TS2304 = "Cannot find name". Исключаем node_modules.
FOUND="$(printf '%s\n' "$TSC_OUTPUT" | grep 'error TS2304' | grep -v 'node_modules' || true)"

if [ -n "$FOUND" ]; then
  echo "$FOUND"
  echo ""
  echo "🔴 Найдена несуществующая переменная (TS2304) — вероятно рантайм-краш. Исправь перед мержем."
  exit 1
fi

echo "✅ TS2304 не найдено в серверном коде"
exit 0
