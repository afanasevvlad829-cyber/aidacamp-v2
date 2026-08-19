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
#      подсвечивается. Реализация — scripts/seo-pulse-arsenkin.mjs.
#   3. Волна конвейера — РУЧНОЙ лог /opt/scripts/seo-conveyor-log.jsonl. Скор
#      Лабрики и разбор конкурентов вручную (в браузере) — это работа агента
#      внутри сессии, крон её не делает и не может; агент, который вёл волну,
#      сам дописывает строку в конце волны:
#        {"date":"YYYY-MM-DD","site":"aidacamp"|"codims","pages":N,
#         "score_before":N,"score_after":N,"competitors_checked":N,"notes":"..."}
#      Нет строки за сегодня → отчёт честно показывает «конвейер сегодня не
#      запускался», а не выдумывает данные.
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
CONVEYOR_LOG="/opt/scripts/seo-conveyor-log.jsonl"
ARSENKIN_SCRIPT="/opt/scripts/seo-pulse-arsenkin.latest.mjs"
KEYWORDS_FILE="/opt/scripts/seo-pulse-keywords.latest.txt"

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
ARS_KEYWORD=""; ARS_BASE=""; ARS_QUOTED=""; ARS_TOP10=""; ARS_NEW=""; ARS_PREV=""
if [[ -n "$ARS_LINE" ]]; then
  # \x1F (не таб/пробел) — иначе bash схлопывает подряд идущие пустые поля
  IFS=$'\x1f' read -r ARS_KEYWORD ARS_BASE ARS_QUOTED ARS_TOP10 ARS_NEW ARS_PREV <<< "$ARS_LINE"
fi

# ── 3. Волна конвейера (ручной лог) ─────────────────────────────────────────
CONVEYOR_TODAY=""
[[ -f "$CONVEYOR_LOG" ]] && CONVEYOR_TODAY=$(grep "\"date\":\"${TODAY}\"" "$CONVEYOR_LOG" || true)

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
<h1>🧭 SEO-пульс конвейера</h1>
<p class="muted">Ежедневный срез конвейера Labrika-оптимизации. Прогон: ${NOW_H}. Cron: ежедневно 09:00 МСК, лог: /var/log/seo-pulse.log</p>

<div class="card"><h2>✏️ 1. Правки за сутки</h2>
<p>aidacamp.ru (dev): <b>${AC_N}</b> коммит(ов) | codims.ru (прод): <b>${CD_N}</b> коммит(ов)</p>
$( [[ -n "$AC_COMMITS" ]] && echo "<p class=\"muted\">aidacamp.ru:</p><pre>$(echo "$AC_COMMITS" | esc)</pre>" )
$( [[ -n "$CD_COMMITS" ]] && echo "<p class=\"muted\">codims.ru:</p><pre>$(echo "$CD_COMMITS" | esc)</pre>" )
$( [[ -z "$AC_COMMITS" && -z "$CD_COMMITS" ]] && echo "<p>За сутки правок с меткой labrika/seo в git не найдено.</p>" )
<p class="muted">Эвристика по слову «labrika»/«seo(» в сообщении коммита — не гарантия полноты, источник истины — сам git.</p></div>

<div class="card"><h2>🎯 2. Конкуренты и частотность (Арсенкин)</h2>
$( if [[ -n "$ARS_LINE" ]]; then cat <<INNER
<p>Фраза дня: <b>$(echo "$ARS_KEYWORD" | esc)</b>$( [[ -n "$ARS_BASE" ]] && echo " — частотность: ${ARS_BASE} (в кавычках: ${ARS_QUOTED})" )</p>
<p>ТОП-10 (Яндекс, регион Москва):</p><pre>$(echo "$ARS_TOP10" | tr '|' '\n' | esc)</pre>
$( if [[ -n "$ARS_NEW" ]]; then echo "<p class=\"new\">⚠️ Новые домены в ТОП-10 против $( [[ -n "$ARS_PREV" ]] && echo "$ARS_PREV" || echo "прошлого снятия" ): $(echo "$ARS_NEW" | tr '|' ', ' | esc)</p>"; elif [[ -n "$ARS_PREV" ]]; then echo "<p class=\"muted\">Без изменений против снятия от ${ARS_PREV}.</p>"; else echo "<p class=\"muted\">Первое снятие этой фразы — сравнивать пока не с чем.</p>"; fi )
INNER
else
  echo "<p>Не выполнено: $(echo "${ARS_ERR:-нет данных}" | esc)</p>"
fi )
<p class="muted">Ротация — одна фраза в день (scripts/seo-pulse-keywords.txt), чтобы не жечь лимит Арсенкина. Позиции по всем сайтам — отдельный еженедельный отчёт (Пн, Telegram).</p></div>

<div class="card"><h2>🌊 3. Волна конвейера сегодня</h2>
$( if [[ -n "$CONVEYOR_TODAY" ]]; then echo "<pre>$(echo "$CONVEYOR_TODAY" | esc)</pre>"; else echo "<p>Конвейер сегодня не запускался (или агент не дописал запись в лог).</p>"; fi )
<p class="muted">Скор Лабрики и разбор конкурентов вручную — это работа агента в браузере внутри сессии, крон её не делает. Формат записи — в шапке scripts/seo-pulse.sh.</p></div>

<p class="muted">Скрипт: scripts/seo-pulse.sh (репо aidacamp-v2, самообновляется из origin/dev).</p>
</body></html>
HTML

# ── Публикация в Reports Hub (стабильный key → перезапись на месте) ─────────
PUB_OUT=$("$PUBLISH" "$REPORT" "🧭 SEO-пульс" \
  "Ежедневно: правки конвейера за сутки, конкуренты и частотность (Арсенкин), волна Labrika-оптимизации." \
  seo "seo,labrika,конвейер,конкуренты" seo-pulse 2>&1) || echo "⚠️ publish.sh: $PUB_OUT"
echo "$PUB_OUT" | tail -2

echo "✅ seo-pulse завершён: aidacamp ${AC_N} | codims ${CD_N} | арсенкин: ${ARS_KEYWORD:-нет}"
