#!/usr/bin/env bash
# money-pulse.sh — еженедельный «денежный пульс» (запускается cron'ом на aidacamp-prod).
#
# Три проверки, каждая ловит класс дефектов, которые в 2026 жили неделями:
#   1. Атрибуция:    доля лидов с yclid/UTM в leads_log за 7 дней (<80% → 🔴).
#                    Инцидент июня: Директ учился на цели с 0 yclid из 25 лидов.
#   2. SEO-гигиена:  canonical/robots/sitemap на ключевых страницах против эталона
#                    (любое расхождение → 🔴). Инцидент 03.07: canonical без слеша на 98 стр.
#                    Это НЕ ETL (решение владельца 14.07) — только лёгкий curl-дифф.
#   3. Безопасность: изменённые за неделю src/pages/api/* в origin/dev — интерполяция
#                    в execSync/spawn и отсутствие auth-маркеров → 🔴. Инцидент: RCE до 15.07.
#
# Результат: HTML в Reports Hub (key=money-pulse, перезапись на месте);
# Telegram-алерт — ТОЛЬКО при наличии красного.
#
# Запуск:  bash money-pulse.sh              — обычный прогон
#          bash money-pulse.sh --rebaseline — переснять SEO-эталон (после осознанных
#                                             изменений canonical/robots; диффы уйдут)
# Эталон:  /opt/scripts/money-pulse-baseline/  (снимается сам при первом прогоне)
# Cron:    строка в crontab root сама вытягивает свежую версию скрипта из origin/dev
#          (git show origin/dev:scripts/money-pulse.sh) — деплой = обычный push в dev.

set -uo pipefail
# Без UTF-8-локали python внутри publish.sh роняет эмодзи в заголовке (surrogates)
export LC_ALL=C.utf8

SITE="https://aidacamp.ru"
BUILD_REPO="/opt/aidacamp-build"
BASELINE_DIR="/opt/scripts/money-pulse-baseline"
ENV_FILE="/opt/aidacamp-tools/.env"
PUBLISH="/opt/reports-hub/publish.sh"
REPORT="/tmp/money-pulse-report.html"
ATTR_THRESHOLD=80
CURL="curl -sS -m 25 --retry 2"

REBASELINE=0
[[ "${1:-}" == "--rebaseline" ]] && REBASELINE=1

# Ключевые страницы (деньги + топ SEO). Меняешь список → --rebaseline.
PAGES=(
  /
  /ceny/
  /o-lagere/
  /otzyvy/
  /zapisatsya/
  /nalogovyj-vychet/
  /it-lager-dlya-detey/
  /pitanie/
  /razmeshchenie/
  /detskiy-lager/
  /detskiy-lager-podmoskove/
  /it-lager/
  /lager-v-podmoskove/
  /detskie-lagerya/
  /lager-dlya-shkolnikov/
  /lager-dlya-podrostkov/
  /lager-na-leto-2026/
  /detskie-lagerya-v-podmoskove-tseny-2026/
  /lager-programmirovaniya/
  /stati/
)

RED_LINES=()   # краткие строки для Telegram
NOW_H="$(date '+%d.%m.%Y %H:%M %Z')"

# ── 1. Атрибуция ─────────────────────────────────────────────────────────────
# Дедуп с 03.07.2026 (PR #828): дубли имеют duplicate_of, смоук-тесты — is_test
# или телефон +7999000… — всё это из подсчёта исключаем.
ATTR_STATUS="🟢"; ATTR_DETAIL=""
SQL="SELECT count(*),
            count(*) FILTER (WHERE COALESCE(yclid,'')<>'' OR COALESCE(ysclid,'')<>''
                                OR COALESCE(gclid,'')<>'' OR COALESCE(utm_source,'')<>'')
     FROM leads_log
     WHERE ts >= now() - interval '7 days'
       AND duplicate_of IS NULL
       AND is_test IS NOT TRUE
       AND COALESCE(phone,'') NOT LIKE '+7999000%'"
ROW=$(sudo -u postgres psql -d aidacamp -tAc "$SQL" 2>&1)
if [[ "$ROW" =~ ^[0-9]+\|[0-9]+$ ]]; then
  TOTAL=${ROW%|*}; ATTRIBUTED=${ROW#*|}
  if (( TOTAL == 0 )); then
    ATTR_STATUS="🔴"
    ATTR_DETAIL="0 лидов за 7 дней (после фильтра дублей и тестов) — либо сезонная тишина, либо форма/логирование сломаны."
    RED_LINES+=("Атрибуция: 0 лидов за 7 дней")
  else
    PCT=$(( ATTRIBUTED * 100 / TOTAL ))
    ATTR_DETAIL="Лидов за 7 дней: ${TOTAL}, с yclid/UTM: ${ATTRIBUTED} (${PCT}%). Порог: ≥${ATTR_THRESHOLD}%."
    if (( PCT < ATTR_THRESHOLD )); then
      ATTR_STATUS="🔴"
      RED_LINES+=("Атрибуция: ${PCT}% лидов с yclid/UTM (${ATTRIBUTED}/${TOTAL}, порог ${ATTR_THRESHOLD}%)")
    fi
  fi
else
  ATTR_STATUS="🔴"
  ATTR_DETAIL="Ошибка запроса к leads_log: <code>$(echo "$ROW" | head -2)</code>"
  RED_LINES+=("Атрибуция: ошибка запроса к leads_log")
fi

# ── 2. SEO-гигиена ───────────────────────────────────────────────────────────
# Снимок на страницу: HTTP-код | canonical | meta robots | X-Robots-Tag.
# Astro минифицирует атрибуты без кавычек (rel=canonical href=...) — парсим оба вида.
SEO_STATUS="🟢"; SEO_DETAIL=""; SEO_DIFF=""; SEO_VIOLATIONS=""
SNAP="/tmp/money-pulse-pages.txt"; : > "$SNAP"
$CURL "${SITE}/robots.txt" -o /tmp/mp-robots.txt 2>/dev/null
ROBOTS_MD5=$(md5sum /tmp/mp-robots.txt | cut -d' ' -f1)
# Проверяем ТОТ sitemap, на который указывает robots.txt (замечен рассинхрон
# sitemap.xml vs sitemap-0.xml — канон для поисковиков именно из robots.txt)
SITEMAP_CODE=$($CURL -o /tmp/mp-sitemap.xml -w '%{http_code}' "${SITE}/sitemap.xml" 2>/dev/null)
SM="/tmp/money-pulse-sitemap.txt"; : > "$SM"
echo "sitemap.xml HTTP=${SITEMAP_CODE}" >> "$SM"
for P in "${PAGES[@]}"; do
  URL="${SITE}${P}"
  HDRS=$($CURL -o /tmp/mp-page.html -D - -w '%{http_code}' "$URL" 2>/dev/null)
  CODE=$(echo "$HDRS" | tail -1)
  XROBOTS=$(echo "$HDRS" | grep -i '^x-robots-tag:' | head -1 | sed 's/^[Xx]-[Rr]obots-[Tt]ag:[[:space:]]*//' | tr -d '\r')
  CANON=$(grep -o '<link[^>]*rel="\?canonical"\?[^>]*>' /tmp/mp-page.html | head -1 \
          | sed -E 's/.*href="?([^" >]+).*/\1/')
  RTAG=$(grep -o '<meta[^>]*name="\?robots"\?[^>]*>' /tmp/mp-page.html | head -1)
  ROBOTS=$(echo "$RTAG" | sed -n 's/.*content="\([^"]*\)".*/\1/p')
  [[ -z "$ROBOTS" && -n "$RTAG" ]] && ROBOTS=$(echo "$RTAG" | sed -n 's/.*content=\([^ >]*\).*/\1/p')
  IN_SITEMAP="да"
  grep -q "<loc>${URL}</loc>" /tmp/mp-sitemap.xml || IN_SITEMAP="НЕТ"
  echo "${P} | ${CODE} | canonical=${CANON:-НЕТ} | robots=${ROBOTS:--} | x-robots=${XROBOTS:--} | sitemap=${IN_SITEMAP}" >> "$SNAP"
  # Инварианты — красные ВСЕГДА, даже если дефект успел попасть в эталон
  [[ "$CODE" != "200" ]] && SEO_VIOLATIONS+="🔴 ${P} — HTTP ${CODE} (ожидается 200)
"
  if [[ "$CODE" == "200" && "${CANON:-}" != "$URL" ]]; then
    SEO_VIOLATIONS+="🔴 ${P} — canonical «${CANON:-НЕТ}», ожидается «${URL}»
"
  fi
  if echo "${ROBOTS:-} ${XROBOTS:-}" | grep -qi 'noindex\|none'; then
    SEO_VIOLATIONS+="🔴 ${P} — noindex (robots=${ROBOTS:-—}, x-robots=${XROBOTS:-—})
"
  fi
  [[ "$IN_SITEMAP" == "НЕТ" ]] && SEO_VIOLATIONS+="🔴 ${P} — отсутствует в sitemap.xml
"
done
echo "robots.txt md5=${ROBOTS_MD5}" >> "$SM"

mkdir -p "$BASELINE_DIR"
BP="$BASELINE_DIR/pages.txt"; BS="$BASELINE_DIR/sitemap.txt"
if [[ ! -f "$BP" || "$REBASELINE" == "1" ]]; then
  cp "$SNAP" "$BP"; cp "$SM" "$BS"; cp /tmp/mp-robots.txt "$BASELINE_DIR/robots.txt"
  SEO_DETAIL="Эталон снят ($(wc -l < "$BP") страниц) и сохранён в ${BASELINE_DIR}. Сравнение — со следующего прогона."
else
  DIFF_P=$(diff "$BP" "$SNAP" 2>&1 || true)
  DIFF_S=$(diff "$BS" "$SM" 2>&1 || true)
  if [[ -n "$DIFF_P" || -n "$DIFF_S" ]]; then
    SEO_STATUS="🔴"
    SEO_DIFF="${DIFF_P}
${DIFF_S}"
    N_CH=$(echo "$DIFF_P" | grep -c '^<' || true)
    SEO_DETAIL="Расхождения с эталоном (страниц затронуто: ~${N_CH}). Если изменения осознанные — переснять эталон: <code>bash money-pulse.sh --rebaseline</code>."
    RED_LINES+=("SEO: расхождение canonical/robots/sitemap с эталоном (~${N_CH} стр)")
  else
    SEO_DETAIL="Все $(wc -l < "$BP") страниц, robots.txt и sitemap.xml совпадают с эталоном."
  fi
fi
if [[ -n "$SEO_VIOLATIONS" ]]; then
  SEO_STATUS="🔴"
  N_V=$(echo -n "$SEO_VIOLATIONS" | grep -c '^' || true)
  RED_LINES+=("SEO: нарушены инварианты (${N_V}) — не-200/canonical/noindex/sitemap")
fi

# ── 3. Безопасность API ──────────────────────────────────────────────────────
# Смотрим origin/dev (не рабочее дерево — оно обновляется нерегулярно).
SEC_STATUS="🟢"; SEC_DETAIL=""; SEC_FINDINGS=""
if git -C "$BUILD_REPO" fetch -q origin dev 2>/dev/null; then FETCH_OK=1; else FETCH_OK=0; fi
CHANGED=$(git -C "$BUILD_REPO" log --since='7 days ago' --name-only --pretty=format: origin/dev -- 'src/pages/api/' 2>/dev/null | sort -u | grep . || true)
if [[ -z "$CHANGED" ]]; then
  SEC_DETAIL="За 7 дней файлы src/pages/api/* в dev не менялись."
  [[ "$FETCH_OK" == "0" ]] && SEC_DETAIL="$SEC_DETAIL ⚠️ git fetch не прошёл — анализ по последнему известному состоянию origin/dev."
else
  N_FILES=$(echo "$CHANGED" | wc -l)
  SEC_DETAIL="Изменённых файлов за 7 дней: ${N_FILES}."
  while IFS= read -r F; do
    git -C "$BUILD_REPO" cat-file -e "origin/dev:${F}" 2>/dev/null || { SEC_FINDINGS+="🗑 ${F} — удалён из dev
"; continue; }
    CONTENT=$(git -C "$BUILD_REPO" show "origin/dev:${F}")
    # (a) шелл-вызовы с интерполяцией — паттерн RCE
    INJ=$(echo "$CONTENT" | grep -nE '(execSync|spawnSync|spawn|execFile|exec)[[:space:]]*\(' | grep -F '${' || true)
    if [[ -n "$INJ" ]]; then
      SEC_STATUS="🔴"
      SEC_FINDINGS+="🔴 ${F} — exec/spawn с интерполяцией:
$(echo "$INJ" | head -5 | sed 's/^/    /')
"
      RED_LINES+=("Безопасность: ${F} — exec/spawn с интерполяцией")
    fi
    # (b) нет ни одного auth-маркера — повод посмотреть глазами
    if ! echo "$CONTENT" | grep -qiE 'auth|session|token|cookie|secret|bearer|x-api-key'; then
      SEC_STATUS="🔴"
      SEC_FINDINGS+="🔴 ${F} — изменён, auth-маркеров не найдено (если эндпоинт публичный по замыслу — ок, но глянуть глазами)
"
      RED_LINES+=("Безопасность: ${F} — изменён без auth-маркеров")
    fi
  done <<< "$CHANGED"
  [[ -z "$SEC_FINDINGS" ]] && SEC_FINDINGS="Во всех изменённых файлах: интерполяции в exec/spawn нет, auth-маркеры на месте.
"
fi

# ── HTML-отчёт ───────────────────────────────────────────────────────────────
OVERALL="🟢 Всё зелёное"
(( ${#RED_LINES[@]} > 0 )) && OVERALL="🔴 Красных проверок: ${#RED_LINES[@]}"

esc() { sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }

cat > "$REPORT" <<HTML
<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Денежный пульс — ${NOW_H}</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#1a1a1a;background:#fafafa}
 h1{font-size:1.5rem} h2{font-size:1.15rem;margin-top:1.6em}
 .card{background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:14px 18px;margin:10px 0}
 pre{background:#f4f4f4;border-radius:6px;padding:10px;overflow-x:auto;font-size:.82rem;white-space:pre-wrap}
 .muted{color:#777;font-size:.85rem}
 .overall{font-size:1.2rem;font-weight:600}
</style></head><body>
<h1>💰 Денежный пульс</h1>
<p class="muted">Еженедельная проверка трёх «дорогих» классов дефектов. Прогон: ${NOW_H}. Cron: понедельник 09:30 МСК, лог: /var/log/money-pulse.log</p>
<p class="overall">${OVERALL}</p>

<div class="card"><h2>${ATTR_STATUS} 1. Атрибуция лидов</h2>
<p>${ATTR_DETAIL}</p>
<p class="muted">Считается по leads_log за 7 дней: исключены дубли (duplicate_of), тестовые заявки (is_test, смоук-телефоны). Атрибуция = yclid/ysclid/gclid или utm_source. Контекст: в июне Директ неделями учился на цели с 0 yclid.</p></div>

<div class="card"><h2>${SEO_STATUS} 2. SEO-гигиена ключевых страниц</h2>
<p>${SEO_DETAIL}</p>
$( [[ -n "$SEO_VIOLATIONS" ]] && { echo "<p>Нарушенные инварианты (красные независимо от эталона):</p><pre>$(echo "$SEO_VIOLATIONS" | esc)</pre>"; } || true )
$( [[ -n "$SEO_DIFF" ]] && { echo "<p>Дифф (&lt; эталон, &gt; сейчас):</p><pre>$(echo "$SEO_DIFF" | esc)</pre>"; } || true )
<details><summary class="muted">Текущий снимок (${#PAGES[@]} страниц)</summary><pre>$(esc < "$SNAP")
$(esc < "$SM")</pre></details>
<p class="muted">Лёгкий curl-дифф canonical/meta-robots/X-Robots-Tag/robots.txt/sitemap против эталона. Контекст: 03.07 canonical без слеша жил на 98 страницах до случайного аудита.</p></div>

<div class="card"><h2>${SEC_STATUS} 3. Безопасность API (src/pages/api/*)</h2>
<p>${SEC_DETAIL}</p>
$( [[ -n "$SEC_FINDINGS" ]] && echo "<pre>$(echo "$SEC_FINDINGS" | esc)</pre>" || true )
<p class="muted">git log origin/dev за 7 дней: exec/spawn с \${…}-интерполяцией и отсутствие auth-маркеров в изменённых роутах. Контекст: RCE в /api жил до аудита 15.07.</p></div>

<p class="muted">Скрипт: scripts/money-pulse.sh (репо aidacamp-v2, самообновляется из origin/dev). Эталон SEO: ${BASELINE_DIR} (переснять: --rebaseline).</p>
</body></html>
HTML

# ── Публикация в Reports Hub (стабильный key → перезапись на месте) ─────────
PUB_OUT=$("$PUBLISH" "$REPORT" "💰 Денежный пульс" \
  "Еженедельно: атрибуция лидов, SEO-гигиена ключевых страниц, безопасность API. Красное = деньги уже утекают." \
  analytics "деньги,атрибуция,seo,безопасность" money-pulse 2>&1) || echo "⚠️ publish.sh: $PUB_OUT"
echo "$PUB_OUT" | tail -2

# ── Telegram — ТОЛЬКО при красном (MP_NO_TG=1 — тихий ручной прогон) ────────
if (( ${#RED_LINES[@]} > 0 )) && [[ "${MP_NO_TG:-0}" != "1" ]]; then
  TG_TOKEN=$(grep -m1 '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
  TG_CHAT=$(grep -m1 '^TELEGRAM_CHAT_ID=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
  if [[ -n "$TG_TOKEN" && -n "$TG_CHAT" ]]; then
    MSG="🔴 Денежный пульс (${NOW_H}):"
    for L in "${RED_LINES[@]}"; do MSG+=$'\n'"• ${L}"; done
    MSG+=$'\n'"Отчёт: https://dev.aidacamp.ru/reports-hub/#money-pulse"
    curl -sS -m 15 -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      -d chat_id="${TG_CHAT}" --data-urlencode text="${MSG}" >/dev/null \
      || echo "⚠️ Telegram-алерт не отправился"
    echo "📨 Telegram-алерт отправлен (${#RED_LINES[@]} красных)"
  else
    echo "⚠️ Нет TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID в ${ENV_FILE} — алерт пропущен"
  fi
fi

echo "✅ money-pulse завершён: ${OVERALL}"
