#!/bin/bash
# guard-no-partytown.sh
#
# Блокирует билд, если Partytown вернулся в проект.
# Причина: Partytown ломает Яндекс.Метрика `ym('reachGoal', ...)` и приводит к
# каскаду: Метрика-цель age_select = 0 reaches → PAY_FOR_CONVERSION Директа
# видит 0 конверсий → алгоритм сворачивает показы → трафик = 0.
# Был инцидент 16-18 апреля 2026 (2 дня без конверсий, Директ встал полностью).
#
# Вызывается автоматически при `npm run build`. Если что-то из списка найдено — exit 1.

set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0

echo "🔒 guard: проверяю что Partytown не вернулся..."

# 1. package.json НЕ должен иметь зависимости @astrojs/partytown
if grep -qE '"@astrojs/partytown"' "$ROOT/package.json"; then
  echo "❌ package.json содержит @astrojs/partytown. Удалите зависимость."
  fail=1
fi

# 2. astro.config.mjs НЕ должен импортировать partytown
if grep -qE "from '@astrojs/partytown'|partytown\(" "$ROOT/astro.config.mjs"; then
  echo "❌ astro.config.mjs импортирует/использует partytown. Уберите integration."
  fail=1
fi

# 3. В исходниках не должно быть <script type="text/partytown">
if grep -rE 'type="text/partytown"' "$ROOT/src" 2>/dev/null | head -1 | grep -q .; then
  echo "❌ В src/ найден <script type=\"text/partytown\">. Уберите."
  fail=1
fi

# 4. В build output тоже проверяем — на всякий случай (если build был c старым config)
if [ -d "$ROOT/dist" ]; then
  if grep -rl "/~partytown/partytown.js" "$ROOT/dist" 2>/dev/null | head -1 | grep -q .; then
    echo "⚠️ dist/ содержит partytown.js — очистите dist/ и пересоберите."
    # Не exit — это предупреждение
  fi
fi

if [ "$fail" -eq 1 ]; then
  echo ""
  echo "🚫 БИЛД ОСТАНОВЛЕН. Подробности — CLAUDE.md → «Запрещённые зависимости»."
  exit 1
fi

echo "✅ guard: Partytown отсутствует, билд можно продолжать."
exit 0
