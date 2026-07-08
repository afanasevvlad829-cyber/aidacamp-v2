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
echo "── 2. Внутренние ссылки с этих страниц (ожидаем не 4xx/5xx) ──"
# Собираем уникальные внутренние href.
# @playform/compress вырезает кавычки у атрибутов (href=/ceny/), поэтому
# ловим оба варианта: href="/x/" и href=/x/.
# Строки с ' + { } $ — это JS-шаблоны из inline-скриптов, не настоящие ссылки.
LINKS=$(for p in "${PAGES[@]}"; do
  curl -s --max-time 20 "$BASE$p" \
    | grep -oE 'href=("/[^"#]*"|/[^ >"#]*)' \
    | sed 's/^href=//; s/^"//; s/"$//'
done | sort -u \
  | grep -vE "['+{}$\\\\]" \
  | grep -vE '\.(js|css|xml|txt|ico|png|jpe?g|avif|webp|svg|woff2?|pdf)$')

# Проверяем ВСЕ ссылки, без обрезания: битая может стоять на любой позиции
# (например /stati/nalogovyy-vychet-za-lager/ был 208-м из 283).
# Параллелим пачками по 12 — последовательно это минуты.
# xargs -I{} здесь не годится: на длинных списках падает с
# "command line cannot be assembled, too long".
CHECKED=$(printf '%s\n' "$LINKS" | grep -c . || echo 0)
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
    2*|3*) : ;;                       # 3xx допустим: канонизация слеша и т.п.
    *) printf '  ❌ %-44s %s\n' "$1" "$c" >> "$ERR_FILE" ;;
  esac
}

# 8 потоков, не 12: на 12 прод начинает отдавать 000 по таймауту.
N=0
while IFS= read -r l; do
  [ -z "$l" ] && continue
  check_one "$l" &
  N=$((N + 1))
  [ $((N % 8)) -eq 0 ] && wait
done <<< "$LINKS"
wait

if [ -s "$ERR_FILE" ]; then
  sort "$ERR_FILE"
  FAIL=$((FAIL + $(grep -c . "$ERR_FILE")))
fi
echo "  проверено внутренних ссылок: $CHECKED"

echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "❌ SMOKE FAILED: $FAIL проблем"
  exit 1
fi
echo "✅ SMOKE OK"
