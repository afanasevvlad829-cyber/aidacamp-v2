#!/usr/bin/env bash
# money-pulse.sh — еженедельный «денежный пульс» (запускается cron'ом на aidacamp-prod).
#
# Четыре проверки, каждая ловит класс дефектов, которые в 2026 жили неделями:
#   1. Трафик и конверсия (ГЛАВНАЯ): каналы Метрики неделя-к-неделе (падение >30%
#                    при базе ≥100 визитов → 🔴) + сквозная конверсия заявки/визиты
#                    против среднего за 4 недели (падение вдвое → 🔴). Реклама
#                    остановлена (июль 2026) — деньги приносит органика.
#   2. SEO-гигиена:  canonical/robots/sitemap на ключевых страницах против эталона
#                    (любое расхождение → 🔴). Инцидент 03.07: canonical без слеша на 98 стр.
#                    Это НЕ ETL (решение владельца 14.07) — только лёгкий curl-дифф.
#   3. Безопасность: изменённые за неделю src/pages/api/* в origin/dev — интерполяция
#                    в execSync/spawn и отсутствие auth-маркеров → 🔴. Инцидент: RCE до 15.07.
#   4. Атрибуция (спящая): доля лидов с yclid/UTM ≥80% — проверяется только при
#                    активной рекламе (≥100 визитов канала «Реклама» за 7 дней),
#                    иначе ⚪ и молчит. Инцидент июня: цель Директа с 0 yclid из 25.
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

# ── Данные: лиды из leads_log ────────────────────────────────────────────────
# Дедуп с 03.07.2026 (PR #828): дубли имеют duplicate_of, смоук-тесты — is_test
# или телефон +7999000… — всё это из подсчёта исключаем.
LEADS_FILTER="duplicate_of IS NULL AND is_test IS NOT TRUE AND COALESCE(phone,'') NOT LIKE '+7999000%'"
ROW=$(sudo -u postgres psql -d aidacamp -tAc \
  "SELECT count(*),
          count(*) FILTER (WHERE COALESCE(yclid,'')<>'' OR COALESCE(ysclid,'')<>''
                              OR COALESCE(gclid,'')<>'' OR COALESCE(utm_source,'')<>'')
   FROM leads_log WHERE ts >= now() - interval '7 days' AND ${LEADS_FILTER}" 2>&1)
LEADS28=$(sudo -u postgres psql -d aidacamp -tAc \
  "SELECT count(*) FROM leads_log WHERE ts >= now() - interval '28 days' AND ${LEADS_FILTER}" 2>&1)
LEADS_OK=0
[[ "$ROW" =~ ^[0-9]+\|[0-9]+$ ]] && LEADS_OK=1
TOTAL=0; ATTRIBUTED=0
if [[ "$LEADS_OK" == "1" ]]; then TOTAL=${ROW%|*}; ATTRIBUTED=${ROW#*|}; fi

# ── 1. Трафик и конверсия (главный денежный сигнал) ─────────────────────────
# Реклама остановлена (решение владельца, июль 2026) — заявки несёт органика,
# поэтому пульс меряет каналы Метрики, а не рекламную атрибуцию.
MTOKEN=$(grep -m1 '^METRIKA_TOKEN=' /opt/mcp/.env | cut -d= -f2- | tr -d '"')
MCTR=$(grep -m1 '^METRIKA_COUNTER=' /opt/mcp/.env | cut -d= -f2- | tr -d '"')
DROP_BASE=100   # канал участвует в дроп-чеке при базе ≥100 визитов/нед
DROP_PCT=30     # красный при падении >30% неделя-к-неделе
                # (калибровка по 8 неделям Метрики 05–07.2026: обычные колебания
                #  органики и ссылочного ≤17% при базе 800–1300)

metrika_channels() { # $1=date1 $2=date2 → строки "id визиты" (id канала стабилен, имя — нет)
  curl -sS -m 25 "https://api-metrika.yandex.net/stat/v1/data?ids=${MCTR}&metrics=ym:s:visits&dimensions=ym:s:trafficSource&date1=$1&date2=$2&limit=20" \
    -H "Authorization: OAuth ${MTOKEN}" 2>/dev/null | python3 -c '
import json,sys
try:
    d=json.load(sys.stdin)
    rows=d["data"]
except Exception:
    sys.exit(1)
for r in rows:
    print(r["dimensions"][0]["id"], int(r["metrics"][0]))
'
}
ch_name() {
  case "$1" in
    organic) echo "Поиск (органика)";; referral) echo "Переходы по ссылкам";;
    direct) echo "Прямые заходы";; social) echo "Соцсети";;
    recommend) echo "Рекомендательные системы";; messenger) echo "Мессенджеры";;
    ad) echo "Реклама";; internal) echo "Внутренние переходы";;
    *) echo "$1";;
  esac
}

TRAFFIC_STATUS="🟢"; TRAFFIC_DETAIL=""; TRAFFIC_ROWS=""; AD_VISITS7=0; VISITS7=0
CUR=$(metrika_channels 7daysAgo yesterday) || CUR=""
PREV=$(metrika_channels 14daysAgo 8daysAgo) || PREV=""
if [[ -z "$MTOKEN" || -z "$CUR" ]]; then
  TRAFFIC_STATUS="🔴"
  TRAFFIC_DETAIL="Не получены данные Метрики (токен в /opt/mcp/.env или API) — слепая зона по трафику."
  RED_LINES+=("Трафик: нет данных Метрики")
else
  for ID in $(echo "$CUR"$'\n'"$PREV" | cut -d' ' -f1 | sort -u); do
    C=$(echo "$CUR"  | grep "^${ID} " | cut -d' ' -f2); C=${C:-0}
    P=$(echo "$PREV" | grep "^${ID} " | cut -d' ' -f2); P=${P:-0}
    [[ "$ID" == "ad" ]] && AD_VISITS7=$C
    [[ "$ID" != "internal" ]] && VISITS7=$(( VISITS7 + C ))
    DELTA="—"
    (( P > 0 )) && DELTA="$(( (C - P) * 100 / P ))%"
    TRAFFIC_ROWS+="$(ch_name "$ID"): ${P} → ${C} (${DELTA})
"
    # ad — остановлен сознательно, internal — не привлечение: в дроп-чек не входят
    [[ "$ID" == "ad" || "$ID" == "internal" ]] && continue
    if (( P >= DROP_BASE && C * 100 < P * (100 - DROP_PCT) )); then
      TRAFFIC_STATUS="🔴"
      RED_LINES+=("Трафик: $(ch_name "$ID") упал ${P}→${C} (>${DROP_PCT}%)")
    fi
  done
  TRAFFIC_DETAIL="Визиты за 7 дней (без внутренних): ${VISITS7}. Красный — падение канала с базой ≥${DROP_BASE} визитов/нед более чем на ${DROP_PCT}%."
  # Сквозная конверсия: заявки/визиты за 7 дней против среднего за 4 недели.
  # Guard от пуассоновского шума: красный только когда при средней конверсии
  # за 7 дней ожидалось бы ≥4 заявок — иначе на 2 лидах/нед всё было бы алертом.
  VIS28=$(curl -sS -m 25 "https://api-metrika.yandex.net/stat/v1/data?ids=${MCTR}&metrics=ym:s:visits&date1=28daysAgo&date2=yesterday" \
    -H "Authorization: OAuth ${MTOKEN}" 2>/dev/null | python3 -c 'import json,sys
try: print(int(json.load(sys.stdin)["data"][0]["metrics"][0]))
except Exception: sys.exit(1)') || VIS28=""
  if [[ "$LEADS_OK" == "1" && "$LEADS28" =~ ^[0-9]+$ && -n "$VIS28" && "$VIS28" -gt 0 && "$VISITS7" -gt 0 ]]; then
    CONV7_BP=$(( TOTAL * 10000 / VISITS7 ))        # конверсия в базисных пунктах (0.01%)
    CONV28_BP=$(( LEADS28 * 10000 / VIS28 ))
    EXPECTED7=$(( VISITS7 * CONV28_BP / 10000 ))
    TRAFFIC_DETAIL+=" Конверсия: заявок ${TOTAL} на ${VISITS7} визитов за 7 дней против среднего ${LEADS28} на ${VIS28} за 4 недели."
    if (( CONV28_BP > 0 && EXPECTED7 >= 4 && CONV7_BP * 2 < CONV28_BP )); then
      TRAFFIC_STATUS="🔴"
      RED_LINES+=("Конверсия: упала вдвое к среднему за 4 недели (${TOTAL} заявок при ожидаемых ~${EXPECTED7})")
    fi
  else
    TRAFFIC_DETAIL+=" Конверсию посчитать не удалось (leads_log или Метрика недоступны)."
  fi
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

# ── 4. Атрибуция рекламы (спящая проверка) ──────────────────────────────────
# Реклама остановлена — на нулевом рекламном трафике порог 80% был бы вечно
# красным. Проверка спит, пока визитов с рекламы <AD_ACTIVE_MIN за 7 дней
# (остаточный хвост после стопа ~130/нед), и оживает сама при перезапуске.
ATTR_STATUS="⚪"; ATTR_DETAIL=""
AD_ACTIVE_MIN=100
if (( AD_VISITS7 < AD_ACTIVE_MIN )); then
  ATTR_DETAIL="Реклама остановлена (визитов с канала «Реклама» за 7 дней: ${AD_VISITS7}, порог пробуждения ${AD_ACTIVE_MIN}) — проверка спит, алертов не даёт. При перезапуске кампаний оживёт сама."
elif [[ "$LEADS_OK" != "1" ]]; then
  ATTR_STATUS="🔴"
  ATTR_DETAIL="Ошибка запроса к leads_log: <code>$(echo "$ROW" | head -2)</code>"
  RED_LINES+=("Атрибуция: ошибка запроса к leads_log")
elif (( TOTAL == 0 )); then
  ATTR_STATUS="🔴"
  ATTR_DETAIL="Реклама активна (${AD_VISITS7} визитов), а лидов за 7 дней 0 — форма или логирование сломаны."
  RED_LINES+=("Атрибуция: реклама активна, лидов 0")
else
  PCT=$(( ATTRIBUTED * 100 / TOTAL ))
  ATTR_DETAIL="Реклама активна (${AD_VISITS7} визитов за 7 дней). Лидов: ${TOTAL}, с yclid/UTM: ${ATTRIBUTED} (${PCT}%). Порог: ≥${ATTR_THRESHOLD}%."
  if (( PCT < ATTR_THRESHOLD )); then
    ATTR_STATUS="🔴"
    RED_LINES+=("Атрибуция: ${PCT}% лидов с yclid/UTM (${ATTRIBUTED}/${TOTAL}, порог ${ATTR_THRESHOLD}%)")
  else
    ATTR_STATUS="🟢"
  fi
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
<p class="muted">Еженедельная проверка четырёх «дорогих» классов дефектов. Прогон: ${NOW_H}. Cron: понедельник 09:30 МСК, лог: /var/log/money-pulse.log</p>
<p class="overall">${OVERALL}</p>

<div class="card"><h2>${TRAFFIC_STATUS} 1. Трафик и конверсия</h2>
<p>${TRAFFIC_DETAIL}</p>
<pre>Канал: пред. 7 дней → тек. 7 дней
$(echo "$TRAFFIC_ROWS" | esc)</pre>
<p class="muted">Каналы Метрики неделя-к-неделе (реклама и внутренние переходы в дроп-чек не входят). Реклама остановлена решением владельца — заявки несут органика и ссылочный трафик, их падение = прямая потеря денег.</p></div>

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

<div class="card"><h2>${ATTR_STATUS} 4. Атрибуция рекламы (спящая)</h2>
<p>${ATTR_DETAIL}</p>
<p class="muted">Активируется при ≥100 визитах с канала «Реклама» за 7 дней. Тогда: доля лидов leads_log с yclid/ysclid/gclid/utm_source (без дублей и тестов) должна быть ≥80%. Контекст: в июне Директ неделями учился на цели с 0 yclid из 25 лидов.</p></div>

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
