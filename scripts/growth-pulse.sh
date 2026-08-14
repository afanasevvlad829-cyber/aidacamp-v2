#!/usr/bin/env bash
# growth-pulse.sh — еженедельный «Пульс роста» (пн 09:45 МСК, cron на aidacamp-prod).
#
# Зачем: владельцу нужна ОДНА точка отслеживания результата и явные рычаги,
# вместо ручного обхода кабинетов Директа/Метрики/CRM. Сводка шлётся в Telegram
# ВСЕГДА (в отличие от money-pulse, который алертит только на красное), и всегда
# в одном формате:
#   • метрика результата — заявки/неделю (leads_log, чистые);
#   • опережающие — визиты/неделю (visits) и платные заявки с меткой (CPA);
#   • ОЧЕРЕДЬ РЕШЕНИЙ — каждое сформулировано как «да/нет» с конкретным действием.
#
# Что НЕ дублируется здесь:
#   • позиции 4 сайтов — их шлёт seo_weekly_check.mjs (пн 10:00 МСК);
#   • гигиена canonical/robots и безопасность API — money-pulse (пн 09:30 МСК).
#
# Запуск:  bash growth-pulse.sh            — обычный прогон (отчёт + TG)
#          GP_NO_TG=1 bash growth-pulse.sh — тихий прогон без Telegram
# Cron:    строка в crontab root тянет свежую версию из origin/dev
#          (git show origin/dev:scripts/growth-pulse.sh) — деплой = push в dev.

set -uo pipefail
export LC_ALL=C.utf8

ENV_FILE="/opt/aidacamp-tools/.env"
PUBLISH="/opt/reports-hub/publish.sh"
REPORT="/tmp/growth-pulse-report.html"
# Кампания считается кандидатом на стоп-лосс: расход за 14 дней ≥ порога и 0 заявок с её меткой
STOPLOSS_RUB=3000

PSQL() { sudo -u postgres psql -d aidacamp -tA -F'|' -c "$1" 2>&1; }

NOW_H="$(date '+%d.%m.%Y %H:%M %Z')"
DECISIONS=()   # очередь решений для Telegram и отчёта
WARN=()        # технические проблемы самого пульса (сломанный запрос и т.п.)

# Фильтр «чистых» заявок — тот же, что в money-pulse (дедуп PR #828)
CLEAN="duplicate_of IS NULL AND is_test IS NOT TRUE AND COALESCE(phone,'') NOT LIKE '+7999000%'"

# ── 1. Заявки по неделям (5 недель, текущая неполная помечается) ─────────────
LEADS_ROWS=$(PSQL "
  SELECT to_char(date_trunc('week', ts), 'DD.MM') AS wk,
         count(*),
         (date_trunc('week', ts) = date_trunc('week', now()))::int AS current
  FROM leads_log
  WHERE ts >= date_trunc('week', now()) - interval '28 days' AND $CLEAN
  GROUP BY date_trunc('week', ts) ORDER BY date_trunc('week', ts)")
[[ "$LEADS_ROWS" == *ERROR* ]] && { WARN+=("запрос заявок: $LEADS_ROWS"); LEADS_ROWS=""; }

# Последняя ЗАВЕРШЁННАЯ неделя против средней за 3 предыдущие — правило падения
read -r LW_N AVG_N <<< "$(PSQL "
  WITH w AS (
    SELECT date_trunc('week', ts) wk, count(*) n
    FROM leads_log
    WHERE ts >= date_trunc('week', now()) - interval '28 days'
      AND ts <  date_trunc('week', now()) AND $CLEAN
    GROUP BY 1)
  SELECT coalesce((SELECT n FROM w ORDER BY wk DESC LIMIT 1), 0),
         coalesce(round((SELECT avg(n) FROM (SELECT n FROM w ORDER BY wk DESC OFFSET 1 LIMIT 3) p)), 0)" \
  | tr '|' ' ')"
LW_N=${LW_N:-0}; AVG_N=${AVG_N:-0}
if (( AVG_N >= 2 && LW_N * 2 < AVG_N )); then
  DECISIONS+=("📉 Заявки: ${LW_N} за неделю против средних ${AVG_N} — падение ×2. Разобрать источники (сезон? формы? трафик?)")
fi

# ── 2. Каналы заявок за 7 дней ───────────────────────────────────────────────
CH_ROWS=$(PSQL "
  SELECT CASE
      WHEN COALESCE(yclid,'')<>'' OR utm_medium IN ('cpc','cpm','cpa') THEN 'платный (Директ/VK)'
      WHEN utm_source='codims' THEN 'переходы с codims.ru'
      WHEN COALESCE(ysclid,'')<>'' THEN 'Яндекс (органика)'
      WHEN COALESCE(utm_source,'')<>'' THEN 'другое: '||utm_source
      ELSE 'без метки' END AS ch, count(*)
  FROM leads_log
  WHERE ts >= now() - interval '7 days' AND $CLEAN
  GROUP BY 1 ORDER BY 2 DESC")
[[ "$CH_ROWS" == *ERROR* ]] && { WARN+=("запрос каналов: $CH_ROWS"); CH_ROWS=""; }

# ── 3. Визиты по неделям ─────────────────────────────────────────────────────
VISITS_ROWS=$(PSQL "
  SELECT to_char(date_trunc('week', ts), 'DD.MM'),
         count(*),
         (date_trunc('week', ts) = date_trunc('week', now()))::int
  FROM visits
  WHERE ts >= date_trunc('week', now()) - interval '28 days'
  GROUP BY date_trunc('week', ts) ORDER BY date_trunc('week', ts)")
[[ "$VISITS_ROWS" == *ERROR* ]] && { WARN+=("запрос визитов: $VISITS_ROWS"); VISITS_ROWS=""; }
read -r VIS_LW VIS_PREV <<< "$(PSQL "
  WITH w AS (SELECT date_trunc('week', ts) wk, count(*) n FROM visits
             WHERE ts >= date_trunc('week', now()) - interval '14 days'
               AND ts < date_trunc('week', now()) GROUP BY 1)
  SELECT coalesce((SELECT n FROM w ORDER BY wk DESC LIMIT 1),0),
         coalesce((SELECT n FROM w ORDER BY wk ASC LIMIT 1),0)" | tr '|' ' ')"

# ── 4. Директ за 14 дней: покампанийно × заявки с меткой кампании ────────────
DIRECT_ROWS=$(PSQL "
  -- имя кампании ПОСЛЕДНИМ полем: в названиях встречается «|» (разделитель psql),
  -- read в bash складывает остаток строки в последнюю переменную целиком
  SELECT s.campaign_id,
         round(sum(s.cost))::int   AS cost,
         sum(s.clicks)::int        AS clicks,
         coalesce(max(l.n), 0)     AS leads,
         left(max(s.campaign_name), 48)
  FROM direct_campaign_stats s
  LEFT JOIN (
    SELECT utm_campaign, count(*) n FROM leads_log
    WHERE ts >= now() - interval '14 days' AND $CLEAN
    GROUP BY 1
  ) l ON l.utm_campaign = s.campaign_id::text
  WHERE s.date >= current_date - 14
  GROUP BY s.campaign_id
  HAVING round(sum(s.cost)) >= 1
  ORDER BY 3 DESC LIMIT 15")
[[ "$DIRECT_ROWS" == *ERROR* ]] && { WARN+=("запрос Директа: $DIRECT_ROWS"); DIRECT_ROWS=""; }

TOTAL_COST=0; PAID_LEADS_BYCAMP=0
DIRECT_HTML=""
while IFS='|' read -r CID COST CLICKS CLEADS CNAME; do
  [[ -z "${CID:-}" ]] && continue
  TOTAL_COST=$(( TOTAL_COST + COST ))
  PAID_LEADS_BYCAMP=$(( PAID_LEADS_BYCAMP + CLEADS ))
  CPA="—"
  (( CLEADS > 0 )) && CPA="$(( COST / CLEADS )) ₽"
  DIRECT_HTML+="<tr><td>${CNAME}</td><td class=r>${COST} ₽</td><td class=r>${CLICKS}</td><td class=r>${CLEADS}</td><td class=r>${CPA}</td></tr>"
  if (( COST >= STOPLOSS_RUB && CLEADS == 0 )); then
    DECISIONS+=("💸 Директ «${CNAME}» (${CID}): ${COST} ₽ за 14 дней, 0 заявок с меткой кампании → пауза/стоп-лосс?")
  fi
done <<< "$DIRECT_ROWS"

# Платные заявки суммарно (по любой платной метке, не только по campaign_id —
# слаг-кампании вроде spb-doroga попадают сюда)
PAID_LEADS_14=$(PSQL "
  SELECT count(*) FROM leads_log
  WHERE ts >= now() - interval '14 days' AND $CLEAN
    AND (COALESCE(yclid,'')<>'' OR utm_medium IN ('cpc','cpm','cpa'))")
[[ "$PAID_LEADS_14" =~ ^[0-9]+$ ]] || PAID_LEADS_14=0

# Платные заявки со СЛАГОМ в метке (не числовой ID) — их нельзя привязать к кампании
# автоматически. Прецедент 07.08: заявка retarget-crm-aug принадлежала кампании
# 713146852, которой без этой проверки пульс предложил бы стоп-лосс.
SLUG_LEADS=$(PSQL "
  SELECT utm_campaign || '×' || count(*) FROM leads_log
  WHERE ts >= now() - interval '14 days' AND $CLEAN
    AND (COALESCE(yclid,'')<>'' OR utm_medium IN ('cpc','cpm','cpa'))
    AND COALESCE(utm_campaign,'') <> '' AND utm_campaign !~ '^[0-9]+$'
  GROUP BY utm_campaign ORDER BY 1" | paste -sd', ' -)
if [[ -n "$SLUG_LEADS" && "$SLUG_LEADS" != *ERROR* ]]; then
  DECISIONS+=("⚠️ Платные заявки со слаг-метками (${SLUG_LEADS}) не привязаны к ID кампаний — сверь слаг с кампанией, прежде чем стопить что-то из списка выше")
fi
PAID_CPA="—"
(( PAID_LEADS_14 > 0 && TOTAL_COST > 0 )) && PAID_CPA="$(( TOTAL_COST / PAID_LEADS_14 )) ₽"

# ── 5. Дзен-очередь из реестра контента ──────────────────────────────────────
ZEN_QUEUE=$(PSQL "
  SELECT count(*) FROM publications
  WHERE channel = 'dzen' AND status <> 'published'")
if [[ "$ZEN_QUEUE" =~ ^[0-9]+$ ]]; then
  (( ZEN_QUEUE > 0 )) && DECISIONS+=("📰 Дзен: ${ZEN_QUEUE} материалов в реестре не опубликованы → публикуем очередью?")
else
  WARN+=("запрос Дзен-очереди: $ZEN_QUEUE"); ZEN_QUEUE="?"
fi

# ── 6. Атрибуция свежих заявок (контроль фикса PR #1491) ─────────────────────
read -r A7_TOTAL A7_MARKED <<< "$(PSQL "
  SELECT count(*),
         count(*) FILTER (WHERE COALESCE(yclid,'')<>'' OR COALESCE(ysclid,'')<>''
                             OR COALESCE(gclid,'')<>'' OR COALESCE(utm_source,'')<>'')
  FROM leads_log WHERE ts >= now() - interval '7 days' AND $CLEAN" | tr '|' ' ')"
A7_TOTAL=${A7_TOTAL:-0}; A7_MARKED=${A7_MARKED:-0}

# ── HTML-отчёт ───────────────────────────────────────────────────────────────
esc() { sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }
rows() { # "дата|число|флаг" → строки таблицы (флаг=1 → пометка «текущая»)
  while IFS='|' read -r D N C; do
    [[ -z "${D:-}" ]] && continue
    M=""; [[ "${C:-0}" == "1" ]] && M=" <span class=muted>(текущая, неполная)</span>"
    echo "<tr><td>нед. ${D}${M}</td><td class=r>${N}</td></tr>"
  done
}
LEADS_TABLE=$(echo "$LEADS_ROWS" | rows)
VISITS_TABLE=$(echo "$VISITS_ROWS" | rows)
CH_TABLE=$(echo "$CH_ROWS" | while IFS='|' read -r CH N; do [[ -n "${CH:-}" ]] && echo "<tr><td>$(echo "$CH" | esc)</td><td class=r>${N}</td></tr>"; done)

DEC_HTML=""; DEC_TG=""
if (( ${#DECISIONS[@]} > 0 )); then
  for D in "${DECISIONS[@]}"; do
    DEC_HTML+="<li>$(echo "$D" | esc)</li>"
    DEC_TG+=$'\n'"• ${D}"
  done
else
  DEC_HTML="<li>Решений не требуется — всё идёт своим ходом.</li>"
  DEC_TG=$'\n'"• Решений не требуется"
fi
WARN_HTML=""
(( ${#WARN[@]} > 0 )) && WARN_HTML="<div class=card><h2>⚠️ Технические проблемы пульса</h2><pre>$(printf '%s\n' "${WARN[@]}" | esc)</pre></div>"

cat > "$REPORT" <<HTML
<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Пульс роста — ${NOW_H}</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#1a1a1a;background:#fafafa}
 h1{font-size:1.5rem} h2{font-size:1.15rem;margin-top:0}
 .card{background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:14px 18px;margin:10px 0}
 .role{background:#eef6ff;border-color:#b7d7f5}
 table{border-collapse:collapse;margin:8px 0} td,th{border:1px solid #ddd;padding:4px 10px;font-size:.9rem} .r{text-align:right}
 pre{background:#f4f4f4;border-radius:6px;padding:10px;overflow-x:auto;font-size:.82rem;white-space:pre-wrap}
 .muted{color:#777;font-size:.85rem}
 ul{margin:6px 0 2px 18px}
</style></head><body>
<h1>📈 Пульс роста</h1>
<p class="muted">Прогон: ${NOW_H}. Cron: понедельник 09:45 МСК. Позиции 4 сайтов — отдельным TG-сообщением (seo_weekly_check, пн 10:00). Гигиена и безопасность — money-pulse (пн 09:30).</p>

<div class="card role"><h2>Твоя роль в этом отчёте</h2>
<p><b>Метрика результата:</b> заявки/неделю. <b>Опережающие:</b> визиты/неделю, платные заявки с меткой (CPA).<br>
<b>Точка отслеживания:</b> это сообщение по понедельникам — больше никуда ходить не нужно.<br>
<b>Рычаги:</b> список «Решения» ниже — каждое отвечается «да/нет» одной репликой агенту.</p></div>

<div class="card"><h2>🎯 Решения на эту неделю</h2><ul>${DEC_HTML}</ul></div>

<div class="card"><h2>Заявки (aidacamp.ru, чистые)</h2>
<table>${LEADS_TABLE}</table>
<p>Последняя завершённая неделя: <b>${LW_N}</b>, средняя за 3 предыдущие: <b>${AVG_N}</b>.</p>
<p class="muted">Каналы за 7 дней (${A7_MARKED} из ${A7_TOTAL} заявок с меткой):</p>
<table>${CH_TABLE}</table></div>

<div class="card"><h2>Визиты (aidacamp.ru)</h2>
<table>${VISITS_TABLE}</table>
<p>Последняя завершённая неделя: <b>${VIS_LW}</b> (предыдущая: ${VIS_PREV}).</p></div>

<div class="card"><h2>Директ, 14 дней</h2>
<table><tr><th>Кампания</th><th>Расход</th><th>Клики</th><th>Заявки*</th><th>CPA</th></tr>${DIRECT_HTML}</table>
<p>Итого: <b>${TOTAL_COST} ₽</b>, платных заявок по любой метке: <b>${PAID_LEADS_14}</b> (CPA: <b>${PAID_CPA}</b>).</p>
<p class="muted">* Заявки с utm_campaign = ID кампании. Кампании со слагом в метке (spb-doroga и т.п.) видны только в общем счётчике платных заявок. VK Ads в пульс не входит (1 активная кампания, ручной обзор).</p></div>

<div class="card"><h2>Контент</h2>
<p>Дзен-очередь (реестр контента): <b>${ZEN_QUEUE}</b> материалов без публикации.</p></div>
${WARN_HTML}
<p class="muted">Скрипт: scripts/growth-pulse.sh (репо aidacamp-v2, cron сам тянет свежую версию из origin/dev).</p>
</body></html>
HTML

# ── Публикация в Reports Hub (стабильный key → перезапись на месте) ─────────
PUB_OUT=$("$PUBLISH" "$REPORT" "📈 Пульс роста" \
  "Еженедельно: заявки/визиты/CPA + очередь решений владельцу. Одна точка отслеживания результата." \
  analytics "рост,заявки,директ,решения" growth-pulse 2>&1) || echo "⚠️ publish.sh: $PUB_OUT"
echo "$PUB_OUT" | tail -2

# ── Telegram — ВСЕГДА (это точка отслеживания, не алерт) ────────────────────
if [[ "${GP_NO_TG:-0}" != "1" ]]; then
  TG_TOKEN=$(grep -m1 '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
  TG_CHAT=$(grep -m1 '^TELEGRAM_CHAT_ID=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
  if [[ -n "$TG_TOKEN" && -n "$TG_CHAT" ]]; then
    MSG="📈 Пульс роста (${NOW_H})
Заявки/нед: ${LW_N} (среднее 3 нед: ${AVG_N})
Визиты/нед: ${VIS_LW} (пред: ${VIS_PREV})
Директ 14д: ${TOTAL_COST} ₽ → платных заявок: ${PAID_LEADS_14} (CPA: ${PAID_CPA})

Решения:${DEC_TG}

Отчёт: https://dev.aidacamp.ru/reports-hub/#growth-pulse"
    curl -sS -m 15 -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      -d chat_id="${TG_CHAT}" --data-urlencode text="${MSG}" >/dev/null \
      || echo "⚠️ Telegram-сводка не отправилась"
    echo "📨 Telegram-сводка отправлена (решений: ${#DECISIONS[@]})"
  else
    echo "⚠️ Нет TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID в ${ENV_FILE} — сводка пропущена"
  fi
fi

echo "✅ growth-pulse завершён: решений ${#DECISIONS[@]}, предупреждений ${#WARN[@]}"
