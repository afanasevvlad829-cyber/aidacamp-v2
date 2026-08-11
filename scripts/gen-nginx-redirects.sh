#!/bin/bash
# Генерация nginx-снипета для SSR-редиректов (prerender=false + Astro.redirect).
#
# Зачем: SSR-редирект работает на проде только если nginx проксирует его слаг
# в Node (127.0.0.1:4185). Инцидент b70ae7b2 (02.08.2026): страница-редирект
# попала в репо, nginx-блок руками не добавили — прод отдавал 404 до 07.08.
# Теперь список слагов генерируется из репо, deploy.sh кладёт его в
# /etc/nginx/snippets/aidacamp-ssr-redirects.conf (include в aidacamp.conf).
#
# Использование: ./scripts/gen-nginx-redirects.sh [выходной-файл]
# Без аргумента — вывод в stdout.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT="${1:-/dev/stdout}"

# Слаги: страницы src/pages/**.astro с prerender=false и Astro.redirect.
# portal/staff/api — SSR-приложения со своими location-блоками, не редиректы.
SLUGS=$(grep -rl --include='*.astro' 'prerender = false' src/pages \
  | grep -v -E '^src/pages/(portal|staff|api)/' \
  | while read -r f; do
      grep -q 'return Astro.redirect' "$f" || continue
      slug="${f#src/pages/}"
      echo "${slug%.astro}"
    done | sort)

if [ -z "$SLUGS" ]; then
  echo "❌ gen-nginx-redirects: не найдено ни одной redirect-страницы — что-то не так" >&2
  exit 1
fi

# Валидация: слаг попадает в regex location — ничего кроме [a-z0-9/-] быть не должно,
# иначе сломанный снипет уронит nginx -t (или, хуже, изменит смысл regex).
BAD=$(echo "$SLUGS" | grep -v -E '^[a-z0-9][a-z0-9/-]*$' || true)
if [ -n "$BAD" ]; then
  echo "❌ gen-nginx-redirects: недопустимые символы в слагах:" >&2
  echo "$BAD" >&2
  exit 1
fi

{
  echo "# ── АВТОГЕНЕРАЦИЯ — НЕ ПРАВИТЬ РУКАМИ ─────────────────────────────────"
  echo "# Источник: scripts/gen-nginx-redirects.sh (репо aidacamp-v2),"
  echo "# перезаписывается deploy.sh при каждом прод-деплое."
  echo "# Слаги: src/pages/**.astro с prerender=false + Astro.redirect."
  echo "# Подключается include'ом в server-блоке aidacamp.ru (aidacamp.conf)."
  echo "# Всего слагов: $(echo "$SLUGS" | wc -l | tr -d ' ')"
  echo "$SLUGS" | while read -r slug; do
    cat <<EOF
location ~ ^/${slug}/?\$ {
    proxy_pass http://127.0.0.1:4185;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
EOF
  done
} > "$OUT"
