#!/usr/bin/env bash
# seo-pulse.sh — ежедневный «SEO-пульс» конвейера Labrika (cron на aidacamp-prod).
#
# Запрос владельца 18.08.2026: «хочу видеть прогресс SEO-конвейера понятный
# каждый день». Три блока, каждый — то, что реально можно снять автоматически
# и безопасно (без headless-браузера на проде — см. [[agent-browser-chrome-leak-prod]]):
#
#   1. Правки за сутки — git log dev (aidacamp-v2) и prod-чекаута codims
#      (aidacadit-school), эвристика по слову «labrika»/«seo(» в сообщении
#      коммита/merge. НЕ гарантия полноты — просто удобный срез, не источник
#      истины (источник истины — сам git).
#   2. Конкуренты + частотность — Арсенкин (service=arsenkin, уже используется
#      конвейером для LSI/top_export), ОДНА фраза в день по ротации
#      (seo-pulse-keywords.txt — правь руками под текущую волну), чтобы не
#      жечь лимит. Новый домен в ТОП-10 против вчерашнего снятия той же фразы —
#      подсвечивается. Плюс Мутаген strong-скор той же фразы. Реализация —
#      scripts/seo-pulse-arsenkin.mjs.
#   2b. Just Magic (второй источник LSI, для сравнения с Арсенкином — владелец
#      19.08.2026: «тестируем все возможные инструменты, обязательно сравнивать
#      показатели»). Задачи Just Magic не мгновенные (минуты) — двухфазная схема
#      без блокировки: сегодня забираем результат ВЧЕРАШНЕЙ задачи, сразу ставим
#      новую на сегодня. Ротация — свой pages-файл (seo-pulse-jm-pages.txt,
#      keyword+url, т.к. Just Magic анализирует конкретную страницу против ТОП-10,
#      а не голую фразу). Реализация — scripts/seo-pulse-justmagic.mjs.
#   3. Волна цикла (фронт A методики, [[seo-wave-cycle]] skill) — таблица
#      seo_wave_log (Postgres): страницы в ожидании замера (сколько дней
#      осталось), только что перемеренные (delta, выстрелило/нет), открытые
#      PR. Источник истины — сама таблица, ничего вручную логировать не нужно.
#      Лабрика-конвейер (скор/конкуренты вручную в браузере) — отдельный,
#      сюда НЕ входит: это работа агента внутри сессии, крон её не видит.
#
# ЧЕГО ЗДЕСЬ НЕТ: позиций по сайтам — это отдельный еженедельный отчёт
# (seo_weekly_check.mjs, Пн 10:00 МСК, Telegram) — [[project-money-pulse]]-стиль
# дублировать его API-нагрузку каждый день не нужно.
#
# Результат: HTML в Reports Hub (key=seo-pulse, перезапись на месте).
# Без Telegram — решение владельца 18.08.2026 (только Reports Hub).
#
# Cron тянет свежую версию из origin/dev (git show) — деплой = обычный push в dev.

set -uo pipefail
export LC_ALL=C.utf8

AIDACAMP_REPO="/opt/aidacamp-build"
CODIMS_REPO="/var/www/codims-prod/repo"
PUBLISH="/opt/reports-hub/publish.sh"
REPORT="/tmp/seo-pulse-report.html"
ARSENKIN_SCRIPT="/opt/scripts/seo-pulse-arsenkin.latest.mjs"
KEYWORDS_FILE="/opt/scripts/seo-pulse-keywords.latest.txt"
JM_SCRIPT="/opt/scripts/seo-pulse-justmagic.latest.mjs"
JM_PAGES_FILE="/opt/scripts/seo-pulse-jm-pages.latest.txt"

NOW_H="$(date '+%d.%m.%Y %H:%M %Z')"
TODAY="$(date '+%Y-%m-%d')"

esc() { sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }

# ── 1. Правки за сутки ───────────────────────────────────────────────────────
git -C "$AIDACAMP_REPO" fetch -q origin dev 2>/dev/null || true
AC_COMMITS=$(git -C "$AIDACAMP_REPO" log --since='24 hours ago' --pretty=format:'%h %s' origin/dev 2>/dev/null | grep -iE 'labrika|seo[(:/ ]' || true)
CD_COMMITS=$(git -C "$CODIMS_REPO" log --since='24 hours ago' --pretty=format:'%h %s' 2>/dev/null | grep -iE 'labrika|seo[(:/ ]' || true)
AC_N=0; [[ -n "$AC_COMMITS" ]] && AC_N=$(echo -n "$AC_COMMITS" | grep -c '^')
CD_N=0; [[ -n "$CD_COMMITS" ]] && CD_N=$(echo -n "$CD_COMMITS" | grep -c '^')

# ── 2. Арсенкин: конкуренты + частотность (ротация 1 фраза/день) ────────────
ARS_LINE=""; ARS_ERR=""
if [[ -f "$ARSENKIN_SCRIPT" && -f "$KEYWORDS_FILE" ]]; then
  ARS_LINE=$(node "$ARSENKIN_SCRIPT" "$KEYWORDS_FILE" 2>/tmp/seo-pulse-arsenkin.err) || ARS_ERR=$(cat /tmp/seo-pulse-arsenkin.err 2>/dev/null)
else
  ARS_ERR="скрипт/список ключей ещё не подтянуты кроном (первый прогон после мержа?)"
fi
ARS_KEYWORD=""; ARS_BASE=""; ARS_QUOTED=""; ARS_TOP10=""; ARS_NEW=""; ARS_PREV=""; ARS_STRONG=""
if [[ -n "$ARS_LINE" ]]; then
  # \x1F (не таб/пробел) — иначе bash схлопывает подряд идущие пустые поля
  IFS=$'\x1f' read -r ARS_KEYWORD ARS_BASE ARS_QUOTED ARS_TOP10 ARS_NEW ARS_PREV ARS_STRONG <<< "$ARS_LINE"
fi
ARS_STRONG_NOTE=""
if [[ -n "$ARS_STRONG" ]]; then
  ARS_STRONG_NOTE=" — Мутаген strong: <b>${ARS_STRONG}</b>"
  if (( $(echo "$ARS_STRONG" | cut -d. -f1) <= 10 )); then
    ARS_STRONG_NOTE+=" (можно брать в работу)"
  elif (( $(echo "$ARS_STRONG" | cut -d. -f1) >= 15 )); then
    ARS_STRONG_NOTE+=" (не в лоб — широкая)"
  fi
fi

# ── 2b. Just Magic: второй источник LSI, для сравнения с Арсенкином ─────────
JM_LINE=""; JM_ERR=""
if [[ -f "$JM_SCRIPT" && -f "$JM_PAGES_FILE" ]]; then
  JM_LINE=$(node "$JM_SCRIPT" "$JM_PAGES_FILE" 2>/tmp/seo-pulse-jm.err) || JM_ERR=$(cat /tmp/seo-pulse-jm.err 2>/dev/null)
else
  JM_ERR="скрипт/список страниц ещё не подтянуты кроном (первый прогон после мержа?)"
fi
JM_PREV_KW=""; JM_PREV_URL=""; JM_DIFF=""; JM_TODAY_KW=""; JM_SUBMIT=""
if [[ -n "$JM_LINE" ]]; then
  IFS=$'\x1f' read -r JM_PREV_KW JM_PREV_URL JM_DIFF JM_TODAY_KW JM_SUBMIT <<< "$JM_LINE"
fi

# ── 3. Волна цикла (seo_wave_log) ───────────────────────────────────────────
WAVE_PENDING=$(sudo -u postgres psql -d aidacamp -tAc "
  SELECT site || ' | ' || target_url || ' | до замера: ' || GREATEST(0, EXTRACT(day FROM measure_due_at - now())::int) || ' дн.'
  FROM seo_wave_log WHERE status='awaiting_measure' ORDER BY site, measure_due_at" 2>/dev/null || true)
WAVE_MEASURED=$(sudo -u postgres psql -d aidacamp -tAc "
  SELECT site || ' | ' || target_url || ' | ' || status || ' | delta=' || COALESCE(delta::text,'—')
  FROM seo_wave_log WHERE measured_at >= now() - interval '24 hours' ORDER BY measured_at DESC" 2>/dev/null || true)
WAVE_OPEN_PRS=$(sudo -u postgres psql -d aidacamp -tAc "
  SELECT site || ' | ' || pr_url FROM seo_wave_log WHERE pr_url IS NOT NULL AND edited_at >= now() - interval '24 hours'" 2>/dev/null || true)

# ── 4. Очередь работы (seo_keyword_backlog) ─────────────────────────────────
# Показываем не только сделанное, но и что впереди: сколько ключей ждёт, какая
# страница следующая по приоритету. Ранжирование — то же, что использует цикл
# (Шаг E.1 скилла seo-wave-cycle): коммерческие кластеры вперёд, главную не трогаем.
BACKLOG_STATE=$(sudo -u postgres psql -d aidacamp -tAc "
  SELECT site || ': в очереди ' || COUNT(*) FILTER (WHERE status='new' AND position BETWEEN 11 AND 40)
      || ', в работе ' || COUNT(*) FILTER (WHERE status='in_wave')
      || ', закрыто ' || COUNT(*) FILTER (WHERE status='done')
      || ' (частотность у ' || COUNT(volume) || '/' || COUNT(*) || ')'
  FROM seo_keyword_backlog GROUP BY site ORDER BY site" 2>/dev/null || true)
BACKLOG_NEXT=$(sudo -u postgres psql -d aidacamp -tAc "
  SELECT site || ' | ' || cluster_page || ' | ключей ' || COUNT(*)
      || ' (комм. ' || COUNT(*) FILTER (WHERE intent='commercial') || ')'
      || ' | лучшая поз. ' || MIN(position)
  FROM seo_keyword_backlog
  WHERE status='new' AND position BETWEEN 11 AND 40 AND cluster_page IS NOT NULL
    AND cluster_page !~ '^https?://[^/]+/?\$'
  GROUP BY site, cluster_page
  HAVING COUNT(*) FILTER (WHERE intent='commercial') > 0
  ORDER BY site, COUNT(*) FILTER (WHERE intent='commercial') DESC, SUM(priority) DESC" 2>/dev/null | awk '!seen[$1]++' || true)

# ── HTML-отчёт ───────────────────────────────────────────────────────────────
cat > "$REPORT" <<HTML
<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SEO-пульс — ${NOW_H}</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#1a1a1a;background:#fafafa}
 h1{font-size:1.5rem} h2{font-size:1.15rem;margin-top:1.6em}
 .card{background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:14px 18px;margin:10px 0}
 pre{background:#f4f4f4;border-radius:6px;padding:10px;overflow-x:auto;font-size:.82rem;white-space:pre-wrap}
 .muted{color:#777;font-size:.85rem}
 .new{color:#b45309;font-weight:600}
</style></head><body>
<h1>🧭 SEO-пульс</h1>
<p class="muted">Ежедневный срез: правки за сутки, конкуренты/частотность, волна цикла (фронт A). Прогон: ${NOW_H}. Cron: ежедневно 09:00 МСК, лог: /var/log/seo-pulse.log</p>

<div class="card"><h2>✏️ 1. Правки за сутки</h2>
<p>aidacamp.ru (dev): <b>${AC_N}</b> коммит(ов) | codims.ru (прод): <b>${CD_N}</b> коммит(ов)</p>
$( [[ -n "$AC_COMMITS" ]] && echo "<p class=\"muted\">aidacamp.ru:</p><pre>$(echo "$AC_COMMITS" | esc)</pre>" )
$( [[ -n "$CD_COMMITS" ]] && echo "<p class=\"muted\">codims.ru:</p><pre>$(echo "$CD_COMMITS" | esc)</pre>" )
$( [[ -z "$AC_COMMITS" && -z "$CD_COMMITS" ]] && echo "<p>За сутки правок с меткой labrika/seo в git не найдено.</p>" )
<p class="muted">Эвристика по слову «labrika»/«seo(» в сообщении коммита — не гарантия полноты, источник истины — сам git.</p></div>

<div class="card"><h2>🎯 2. Конкуренты и частотность (Арсенкин)</h2>
$( if [[ -n "$ARS_LINE" ]]; then cat <<INNER
<p>Фраза дня: <b>$(echo "$ARS_KEYWORD" | esc)</b>$( [[ -n "$ARS_BASE" ]] && echo " — частотность: ${ARS_BASE} (в кавычках: ${ARS_QUOTED})" )${ARS_STRONG_NOTE}</p>
<p>ТОП-10 (Яндекс, регион Москва):</p><pre>$(echo "$ARS_TOP10" | tr '|' '\n' | esc)</pre>
$( if [[ -n "$ARS_NEW" ]]; then echo "<p class=\"new\">⚠️ Новые домены в ТОП-10 против $( [[ -n "$ARS_PREV" ]] && echo "$ARS_PREV" || echo "прошлого снятия" ): $(echo "$ARS_NEW" | tr '|' ', ' | esc)</p>"; elif [[ -n "$ARS_PREV" ]]; then echo "<p class=\"muted\">Без изменений против снятия от ${ARS_PREV}.</p>"; else echo "<p class=\"muted\">Первое снятие этой фразы — сравнивать пока не с чем.</p>"; fi )
INNER
else
  echo "<p>Не выполнено: $(echo "${ARS_ERR:-нет данных}" | esc)</p>"
fi )
<p class="muted">Ротация — одна фраза в день (scripts/seo-pulse-keywords.txt), чтобы не жечь лимит Арсенкина. Позиции по всем сайтам — отдельный еженедельный отчёт (Пн, Telegram).</p></div>

<div class="card"><h2>🆚 2b. Just Magic — сравнение с Арсенкином</h2>
$( if [[ -n "$JM_PREV_KW" && -n "$JM_DIFF" ]]; then cat <<INNER2
<p>Результат по вчерашней фразе: <b>$(echo "$JM_PREV_KW" | esc)</b> — <a href="$(echo "$JM_PREV_URL" | esc)">$(echo "$JM_PREV_URL" | esc)</a></p>
<p class="muted">Отклонение вхождений в body от среднего ТОП-10 (отрицательное — отстаём, есть куда добавить):</p>
<pre>$(echo "$JM_DIFF" | tr ';' '\n' | esc)</pre>
INNER2
elif [[ -n "$JM_PREV_KW" ]]; then
  echo "<p>Задача по фразе «$(echo "$JM_PREV_KW" | esc)» ещё в работе у Just Magic (обычно несколько минут — заберём завтра).</p>"
else
  echo "<p>$(echo "${JM_ERR:-нет данных}" | esc)</p>"
fi )
$( [[ -n "$JM_TODAY_KW" ]] && echo "<p class=\"muted\">Сегодня поставлена задача по фразе «$(echo "$JM_TODAY_KW" | esc)» ($(echo "$JM_SUBMIT" | esc)) — результат завтра.</p>" )
<p class="muted">Ротация — своя (scripts/seo-pulse-jm-pages.txt, keyword+url — Just Magic анализирует конкретную страницу против ТОП-10, не голую фразу). Задачи не мгновенные, поэтому цикл на сутки: сегодня забираем вчерашнее, ставим новое.</p></div>

<div class="card"><h2>🌊 3. Волна цикла (фронт A, seo_wave_log)</h2>
<p class="muted">В ожидании замера:</p>
$( if [[ -n "$WAVE_PENDING" ]]; then echo "<pre>$(echo "$WAVE_PENDING" | esc)</pre>"; else echo "<p>Пусто.</p>"; fi )
<p class="muted">Перемерены за сутки:</p>
$( if [[ -n "$WAVE_MEASURED" ]]; then echo "<pre>$(echo "$WAVE_MEASURED" | esc)</pre>"; else echo "<p>Пусто.</p>"; fi )
<p class="muted">Открытые PR за сутки:</p>
$( if [[ -n "$WAVE_OPEN_PRS" ]]; then echo "<pre>$(echo "$WAVE_OPEN_PRS" | esc)</pre>"; else echo "<p>Пусто.</p>"; fi )
<p class="muted">Источник — таблица seo_wave_log, заполняется скиллом seo-wave-cycle. Лабрика-конвейер (скор/конкуренты вручную в браузере) сюда не входит — отдельная ручная работа в сессии.</p></div>

<div class="card"><h2>📋 4. Очередь работы (бэклог ключей)</h2>
$( if [[ -n "$BACKLOG_STATE" ]]; then echo "<pre>$(echo "$BACKLOG_STATE" | esc)</pre>"; else echo "<p>Бэклог пуст — нужен прогон scripts/seo-backlog-build.mjs.</p>"; fi )
<p class="muted">Следующая цель по каждому сайту (коммерческие кластеры вперёд, главная исключена):</p>
$( if [[ -n "$BACKLOG_NEXT" ]]; then echo "<pre>$(echo "$BACKLOG_NEXT" | esc)</pre>"; else echo "<p>Коммерческих кластеров в диапазоне 11-40 не осталось.</p>"; fi )
<p class="muted">Единица работы — страница со всем кластером ключей: одна правка закрывает сразу все её запросы. Приоритет = спрос (показы Вебмастера, иначе Wordstat) × близость к ТОП-10 × √размер кластера × интент (коммерция ×1.5, инфо ×0.3).</p></div>

<p class="muted">Скрипт: scripts/seo-pulse.sh (репо aidacamp-v2, самообновляется из origin/dev).</p>
</body></html>
HTML

# ── Публикация в Reports Hub (стабильный key → перезапись на месте) ─────────
PUB_OUT=$("$PUBLISH" "$REPORT" "🧭 SEO-пульс" \
  "Ежедневно: правки конвейера за сутки, конкуренты и частотность (Арсенкин), волна Labrika-оптимизации." \
  seo "seo,labrika,конвейер,конкуренты" seo-pulse 2>&1) || echo "⚠️ publish.sh: $PUB_OUT"
echo "$PUB_OUT" | tail -2

echo "✅ seo-pulse завершён: aidacamp ${AC_N} | codims ${CD_N} | арсенкин: ${ARS_KEYWORD:-нет}"
