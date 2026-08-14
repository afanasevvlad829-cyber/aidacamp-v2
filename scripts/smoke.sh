#!/bin/bash
# Smoke-тест задеплоенного окружения.
#
# Использование: ./scripts/smoke.sh https://aidacamp.ru
#                ./scripts/smoke.sh https://dev.aidacamp.ru
#
# Проверяет:
#   1) критичные страницы отдают 200 (без редиректов);
#   2) внутренние ссылки с этих страниц не ведут в 404/5xx.
#
# Пункт 2 ловит битые перелинковки — например /stati/nalogovyy-vychet-za-lager/,
# который жил в коде и отдавал 404 (найден вручную 2026-07-08).
set -uo pipefail

BASE="${1:-}"
if [ -z "$BASE" ]; then echo "Использование: $0 <base-url>"; exit 1; fi
BASE="${BASE%/}"

# Критичные страницы: главная, деньги, конверсия, контент.
PAGES=(
  "/"
  "/ceny/"
  "/nalogovyj-vychet/"
  "/o-lagere/"
  "/razmeshchenie/"
  "/stati/"
  "/zapisatsya/"
  "/lager-v-podmoskove/"
  "/stati/nedorogoy-lager/"
  "/putyovki-v-lager-2026/"
)

FAIL=0
code_of() { curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$1" || echo "000"; }

echo "🔥 Smoke: $BASE"
echo ""
echo "── 1. Критичные страницы (ожидаем 200 без редиректа) ──"
for p in "${PAGES[@]}"; do
  c=$(code_of "$BASE$p")
  if [ "$c" = "200" ]; then
    printf '  ✅ %-28s %s\n' "$p" "$c"
  else
    printf '  ❌ %-28s %s\n' "$p" "$c"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "── 2. SSR-редиректы (ожидаем 2xx/3xx — что nginx проксирует слаг в Node) ──"
# Здесь раньше обходились ВСЕ внутренние ссылки со страниц выше: ~243 запроса,
# 53с на окружение (замер 14.08.2026), и всегда уже ПОСЛЕ выката.
#
# Эту работу забрал scripts/check-internal-links.mjs — он сверяет ссылки с
# собранным dist/ прямо на сборке: доли секунды, до деплоя, и по всем 345
# страницам вместо десяти. Так нашлись /lager-podmoskovje/ и /smeny/ — оба 404
# на проде, мимо прежней проверки (они не на критичных страницах).
#
# По сети осталось то, что по dist/ проверить нельзя в принципе: редирект-стабы
# (prerender=false + Astro.redirect). Файла в dist/ у них нет, а работают они
# только если nginx проксирует слаг в Node — это конфиг сервера, не репозиторий.
# Инцидент b70ae7b2: страница-редирект попала в репо, блок в nginx руками не
# добавили — прод отдавал 404 с 02.08 по 07.08.2026.
REDIRECT_SLUGS=$(grep -rl --include='*.astro' 'prerender = false' src/pages 2>/dev/null \
  | grep -v -E '^src/pages/(portal|staff|api)/' \
  | while read -r f; do
      grep -q 'return Astro.redirect' "$f" || continue
      slug="${f#src/pages/}"
      echo "/${slug%.astro}/"
    done | sort)

ERR_FILE=$(mktemp)
trap 'rm -f "$ERR_FILE"' EXIT

check_one() {
  local url="$BASE$1" c
  # `curl -w "%{http_code}"` сам печатает 000 при сбое — добавлять `|| echo 000`
  # нельзя, иначе коды склеиваются ("000000") и проверка врёт.
  c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$url")
  # 000 = сетевой сбой (часто просто параллельный таймаут) — один повтор
  [ "$c" = "000" ] && { sleep 1; c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 25 "$url"); }
  case "$c" in
    2*|3*) : ;;                       # 2xx тоже ок: часть стабов отдаёт мета-рефреш
    *) printf '  ❌ %-44s %s\n' "$1" "$c" >> "$ERR_FILE" ;;
  esac
}

# 8 потоков, не 12: на 12 прод начинает отдавать 000 по таймауту.
CHECKED=0
while IFS= read -r l; do
  [ -z "$l" ] && continue
  check_one "$l" &
  CHECKED=$((CHECKED + 1))
  [ $((CHECKED % 8)) -eq 0 ] && wait
done <<< "$REDIRECT_SLUGS"
wait

if [ -s "$ERR_FILE" ]; then
  sort "$ERR_FILE"
  FAIL=$((FAIL + $(grep -c . "$ERR_FILE")))
fi
echo "  проверено редирект-слагов: $CHECKED"

echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "❌ SMOKE FAILED: $FAIL проблем"
  exit 1
fi
echo "✅ SMOKE OK"
