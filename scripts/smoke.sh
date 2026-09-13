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
echo "── 3. Стили: главная реально получает Tailwind ──"
# Вторая линия после check-css-utilities.mjs (тот проверяет dist/, этот — живой сайт).
# Инцидент 08.09.2026: главный CSS публичной части похудел с 220 КБ до 25 КБ, сайт
# 12 часов отдавался голым HTML. Все коды ответов при этом были 200, файлы на месте —
# поэтому smoke обязан смотреть В содержимое CSS, а не только на его доступность.
HOME_HTML=$(curl -s --max-time 15 "$BASE/")
CSS_HREF=$(printf '%s' "$HOME_HTML" | grep -oE 'href=["'"'"']?/_astro/[A-Za-z0-9._-]+\.css' | sed 's|href=["'"'"']*||' | head -1)
if [ -n "$CSS_HREF" ]; then
  # inlineStylesheets: 'auto'|'never' — утилиты в подключённом файле.
  CSS_BODY=$(curl -s --max-time 20 "$BASE$CSS_HREF")
  CSS_SIZE=$(printf '%s' "$CSS_BODY" | wc -c | tr -d ' ')
  # Чистая bash-проверка подстроки, не пайп в grep: grep -q закрывает stdin, как
  # только находит совпадение, и на многосоткилобайтном теле пишущий в пайп
  # printf получает SIGPIPE ДО того, как успевает дописать остаток — при
  # set -o pipefail это превращает пайплайн в "не найдено" на страницах, где
  # совпадение вообще-то есть (сломано 11.09.2026, поймано на живом деплое).
  if [[ "$CSS_BODY" == *'.flex{'* ]]; then
    printf '  ✅ %-44s %s байт\n' "Tailwind в подключённом CSS" "$CSS_SIZE"
  else
    printf '  ❌ %-44s %s байт (сайт без стилей!)\n' "утилит Tailwind нет в" "$CSS_SIZE"; FAIL=$((FAIL + 1))
  fi
else
  # inlineStylesheets: 'always' (с 11.09.2026) — утилиты прямо в <style> главной.
  # Раньше страж падал тут ложно: «нет <link>» ≠ «нет стилей», Astro просто
  # кладёт CSS в HTML другим способом — страж обязан проверить оба варианта.
  INLINE_SIZE=$(printf '%s' "$HOME_HTML" | wc -c | tr -d ' ')
  if [[ "$HOME_HTML" == *'.flex{'* ]]; then
    printf '  ✅ %-44s %s байт\n' "Tailwind инлайном в HTML" "$INLINE_SIZE"
  else
    printf '  ❌ %-44s\n' "ни <link> на CSS, ни инлайн-утилит Tailwind нет"; FAIL=$((FAIL + 1))
  fi
fi

echo ""
echo "── 4. CSRF: form-POST со своим Origin проходит, с чужим — 403 ──"
# checkOrigin (Astro) сравнивает Origin с URL запроса; за nginx URL собирается из
# X-Forwarded-Proto + Host под security.allowedDomains. Если что-то из этого
# разъедется — свой Origin получит 403 и вход в портал сломается молча (апрель 2026).
# Пробуем один неверный код: ожидаем любой ответ, кроме 403/000 (рейт-лимит логина —
# 10 попыток в минуту с IP, одна попытка на smoke укладывается).
csrf_post() { curl -s -o /dev/null -w "%{http_code}" --max-time 15 -X POST -H "Origin: $1" \
  -H "Content-Type: application/x-www-form-urlencoded" --data "password=000000" "$BASE/api/portal/login" || echo "000"; }
c_own=$(csrf_post "$BASE"); c_evil=$(csrf_post "https://evil.example")
if [ "$c_own" != "403" ] && [ "$c_own" != "000" ]; then
  printf '  ✅ %-44s %s\n' "свой Origin → не 403" "$c_own"
else
  printf '  ❌ %-44s %s\n' "свой Origin получил" "$c_own"; FAIL=$((FAIL + 1))
fi
if [ "$c_evil" = "403" ]; then
  printf '  ✅ %-44s %s\n' "чужой Origin → 403" "$c_evil"
else
  printf '  ❌ %-44s %s (защита не работает)\n' "чужой Origin получил" "$c_evil"; FAIL=$((FAIL + 1))
fi

echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "❌ SMOKE FAILED: $FAIL проблем"
  exit 1
fi
echo "✅ SMOKE OK"
