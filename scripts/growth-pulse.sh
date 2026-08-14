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

# ── SVG-график (bar chart) ───────────────────────────────────────────────────
# Вход: JSON {labels[],values[],current[],color,title,avg} → SVG-строка.
# По правилам dataviz: тонкие бары со скруглённым верхом, одна ось, пунктирная
# референс-линия среднего, текущая (неполная) неделя приглушена, подписи
# значений — выборочно (максимум и последняя завершённая), текст — серым.
svg_chart() {
  node -e '
    const d = JSON.parse(process.argv[1]);
    const W = 640, H = 190, PT = 26, PB = 26, PL = 8, PR = 8;
    const n = d.values.length || 1;
    const max = Math.max(...d.values, d.avg || 0, 1);
    const plotH = H - PT - PB, plotW = W - PL - PR;
    const bw = Math.min(44, Math.floor(plotW / n * 0.55));
    const step = plotW / n;
    const y = v => PT + plotH - (v / max) * plotH;
    let out = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${d.title}" style="max-width:100%;height:auto">`;
    // референс-линия среднего за завершённые недели
    if (d.avg > 0) {
      out += `<line x1="${PL}" y1="${y(d.avg)}" x2="${W-PR}" y2="${y(d.avg)}" stroke="#b9b9b9" stroke-dasharray="4 4" stroke-width="1"/>`;
      out += `<text x="${W-PR}" y="${y(d.avg)-4}" text-anchor="end" font-size="10" fill="#8a8a8a">ср. ${d.avg}</text>`;
    }
    const iMax = d.values.indexOf(Math.max(...d.values));
    let iLastDone = -1;
    for (let i = n - 1; i >= 0; i--) if (!d.current[i]) { iLastDone = i; break; }
    d.values.forEach((v, i) => {
      const x = PL + step * i + (step - bw) / 2;
      const h = Math.max((v / max) * plotH, v > 0 ? 2 : 0);
      const op = d.current[i] ? 0.35 : 1;
      out += `<rect x="${x.toFixed(1)}" y="${(PT+plotH-h).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="3" fill="${d.color}" fill-opacity="${op}"><title>нед. ${d.labels[i]}: ${v}${d.current[i] ? " (текущая, неполная)" : ""}</title></rect>`;
      out += `<text x="${(x+bw/2).toFixed(1)}" y="${H-10}" text-anchor="middle" font-size="10" fill="#8a8a8a">${d.labels[i]}</text>`;
      if (v > 0 && (i === iMax || i === iLastDone))
        out += `<text x="${(x+bw/2).toFixed(1)}" y="${(PT+plotH-h-5).toFixed(1)}" text-anchor="middle" font-size="11" fill="#444">${v}</text>`;
    });
    out += `<line x1="${PL}" y1="${PT+plotH}" x2="${W-PR}" y2="${PT+plotH}" stroke="#ddd" stroke-width="1"/></svg>`;
    process.stdout.write(out);
  ' "$1" 2>/dev/null || echo "<!-- svg failed -->"
}

# Собирает JSON для svg_chart из psql-строк «label|value|current»
rows_json() { # $1 = rows, $2 = color, $3 = title, $4 = avg
  node -e '
    const lines = process.argv[1].trim().split("\n").filter(Boolean);
    const d = { labels: [], values: [], current: [], color: process.argv[2], title: process.argv[3], avg: parseInt(process.argv[4] || "0", 10) };
    for (const l of lines) { const [a, b, c] = l.split("|"); d.labels.push(a); d.values.push(parseInt(b, 10) || 0); d.current.push(c === "1"); }
    process.stdout.write(JSON.stringify(d));
  ' "$1" "$2" "$3" "${4:-0}" 2>/dev/null
}

# ── 1. Заявки по неделям (8 недель, текущая неполная помечается) ─────────────
LEADS_ROWS=$(PSQL "
  SELECT to_char(date_trunc('week', ts), 'DD.MM') AS wk,
         count(*),
         (date_trunc('week', ts) = date_trunc('week', now()))::int AS current
  FROM leads_log
  WHERE ts >= date_trunc('week', now()) - interval '49 days' AND $CLEAN
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
  WHERE ts >= date_trunc('week', now()) - interval '49 days'
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
  ORDER BY 2 DESC LIMIT 10")
[[ "$DIRECT_ROWS" == *ERROR* ]] && { WARN+=("запрос Директа: $DIRECT_ROWS"); DIRECT_ROWS=""; }

# Таблица — только отображение (топ-10 по расходу). Математика и стоп-лоссы —
# по ПОЛНОМУ множеству кампаний (инцидент: топ-15 по кликам ÷ все заявки
# искажал CPA и прятал дорогие кампании с малым числом кликов).
TOTAL_COST=$(PSQL "
  SELECT coalesce(round(sum(cost)),0)::int FROM direct_campaign_stats
  WHERE date >= current_date - 14")
[[ "$TOTAL_COST" =~ ^[0-9]+$ ]] || { WARN+=("запрос полного расхода: $TOTAL_COST"); TOTAL_COST=0; }

DIRECT_HTML=""
while IFS='|' read -r CID COST CLICKS CLEADS CNAME; do
  [[ -z "${CID:-}" ]] && continue
  CPA="—"
  (( CLEADS > 0 )) && CPA="$(( COST / CLEADS )) ₽"
  DIRECT_HTML+="<tr><td>${CNAME}</td><td class=r>${COST} ₽</td><td class=r>${CLICKS}</td><td class=r>${CLEADS}</td><td class=r>${CPA}</td></tr>"
done <<< "$DIRECT_ROWS"

# Стоп-лосс кандидаты — полное множество, без LIMIT
STOPLOSS_ROWS=$(PSQL "
  SELECT s.campaign_id, round(sum(s.cost))::int, left(max(s.campaign_name), 48)
  FROM direct_campaign_stats s
  LEFT JOIN (
    SELECT utm_campaign, count(*) n FROM leads_log
    WHERE ts >= now() - interval '14 days' AND $CLEAN GROUP BY 1
  ) l ON l.utm_campaign = s.campaign_id::text
  WHERE s.date >= current_date - 14
  GROUP BY s.campaign_id
  HAVING round(sum(s.cost)) >= $STOPLOSS_RUB AND coalesce(max(l.n),0) = 0
  ORDER BY 2 DESC")
if [[ "$STOPLOSS_ROWS" != *ERROR* ]]; then
  while IFS='|' read -r CID COST CNAME; do
    [[ -z "${CID:-}" ]] && continue
    DECISIONS+=("💸 Директ «${CNAME}» (${CID}): ${COST} ₽ за 14 дней, 0 заявок с меткой кампании → пауза/стоп-лосс?")
  done <<< "$STOPLOSS_ROWS"
fi

# Расход по неделям (8 недель) — для графика
SPEND_ROWS=$(PSQL "
  SELECT to_char(date_trunc('week', date), 'DD.MM'),
         round(sum(cost))::int,
         (date_trunc('week', date) = date_trunc('week', now()))::int
  FROM direct_campaign_stats
  WHERE date >= (date_trunc('week', now()) - interval '49 days')::date
  GROUP BY date_trunc('week', date) ORDER BY date_trunc('week', date)")
[[ "$SPEND_ROWS" == *ERROR* ]] && SPEND_ROWS=""

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
# «scheduled» с прошедшей датой — это УЖЕ вышедшие по расписанию студии посты:
# реестр не переводит их в published (проверено по живому каналу 14.08.2026,
# статьи выходят ежедневно). Очередь = только записи без даты или с будущей.
ZEN_QUEUE=$(PSQL "
  SELECT count(*) FROM publications
  WHERE channel = 'dzen' AND status <> 'published'
    AND (published_at IS NULL OR published_at >= now())")
if [[ "$ZEN_QUEUE" =~ ^[0-9]+$ ]]; then
  (( ZEN_QUEUE > 0 )) && DECISIONS+=("📰 Дзен: ${ZEN_QUEUE} материалов без даты публикации или с будущей → проверить очередь в студии?")
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

# ── Графики и дельты ─────────────────────────────────────────────────────────
LEADS_SVG=$(svg_chart "$(rows_json "$LEADS_ROWS" "#d97a1f" "Заявки по неделям" "$AVG_N")")
VISITS_SVG=$(svg_chart "$(rows_json "$VISITS_ROWS" "#2f6fb0" "Визиты по неделям" "")")
SPEND_SVG=""
[[ -n "$SPEND_ROWS" ]] && SPEND_SVG=$(svg_chart "$(rows_json "$SPEND_ROWS" "#8a8a8a" "Расход Директа по неделям, ₽" "")")

# Дельта к прошлой неделе: «↑ +25%» / «↓ −40%» / «=» (текстом, не только цветом)
delta() { # $1=текущее $2=предыдущее
  local CUR=${1:-0} PREV=${2:-0}
  if (( PREV == 0 )); then (( CUR > 0 )) && echo "↑ новый" || echo "="; return; fi
  local D=$(( (CUR - PREV) * 100 / PREV ))
  if (( D > 0 )); then echo "↑ +${D}%"; elif (( D < 0 )); then echo "↓ ${D}%"; else echo "="; fi
}
read -r LW_PREV <<< "$(PSQL "
  WITH w AS (SELECT date_trunc('week', ts) wk, count(*) n FROM leads_log
             WHERE ts >= date_trunc('week', now()) - interval '14 days'
               AND ts < date_trunc('week', now()) AND $CLEAN GROUP BY 1)
  SELECT coalesce((SELECT n FROM w ORDER BY wk ASC LIMIT 1),0)")"
LEADS_DELTA=$(delta "$LW_N" "${LW_PREV:-0}")
VISITS_DELTA=$(delta "$VIS_LW" "$VIS_PREV")

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
 .tiles{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
 .tile{flex:1 1 180px;background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:12px 16px}
 .tl{font-size:.8rem;color:#777} .tv{font-size:1.7rem;font-weight:650;margin:2px 0}
 .td{font-size:.95rem;font-weight:500;color:#555} .ts{font-size:.8rem;color:#777}
 table{border-collapse:collapse;margin:8px 0} td,th{border:1px solid #ddd;padding:4px 10px;font-size:.9rem} .r{text-align:right}
 pre{background:#f4f4f4;border-radius:6px;padding:10px;overflow-x:auto;font-size:.82rem;white-space:pre-wrap}
 .muted{color:#777;font-size:.85rem}
 ul{margin:6px 0 2px 18px}
</style></head><body>
<h1>📈 Пульс роста</h1>
<p class="muted">Прогон: ${NOW_H}. Cron: понедельник 09:45 МСК. Позиции 4 сайтов — отдельным TG-сообщением (seo_weekly_check, пн 10:00). Гигиена и безопасность — money-pulse (пн 09:30).</p>

<div class="tiles">
<div class="tile"><div class="tl">Заявки за неделю</div><div class="tv">${LW_N} <span class="td">${LEADS_DELTA}</span></div><div class="ts">среднее 3 нед: ${AVG_N}</div></div>
<div class="tile"><div class="tl">Визиты за неделю</div><div class="tv">${VIS_LW} <span class="td">${VISITS_DELTA}</span></div><div class="ts">предыдущая: ${VIS_PREV}</div></div>
<div class="tile"><div class="tl">Директ, 14 дней</div><div class="tv">${TOTAL_COST} ₽</div><div class="ts">платных заявок: ${PAID_LEADS_14} · CPA: ${PAID_CPA}</div></div>
</div>

<div class="card"><h2>🎯 Решения на эту неделю</h2><ul>${DEC_HTML}</ul>
<p class="muted">Каждое отвечается «да/нет» одной репликой агенту — это единственные рычаги, остальное крутится само.</p></div>

<div class="card"><h2>Заявки по неделям <span class="muted">(aidacamp.ru, чистые; пунктир — среднее, бледный бар — текущая неполная неделя)</span></h2>
${LEADS_SVG}
<details><summary class="muted">Каналы за 7 дней (${A7_MARKED} из ${A7_TOTAL} с меткой) и таблица</summary>
<table>${CH_TABLE}</table><table>${LEADS_TABLE}</table></details></div>

<div class="card"><h2>Визиты по неделям</h2>
${VISITS_SVG}
<details><summary class="muted">Таблица</summary><table>${VISITS_TABLE}</table></details></div>

<div class="card"><h2>Директ</h2>
$( [[ -n "$SPEND_SVG" ]] && echo "$SPEND_SVG" )
$( [[ -n "$DIRECT_HTML" ]] && echo "<details><summary class=muted>Кампании за 14 дней (топ-10 по расходу; итоги считаются по всем)</summary><table><tr><th>Кампания</th><th>Расход</th><th>Клики</th><th>Заявки*</th><th>CPA</th></tr>${DIRECT_HTML}</table><p class=muted>* Заявки с utm_campaign = ID кампании; слаг-метки — только в общем счётчике. VK Ads закрыт 14.08.2026.</p></details>" || echo "<p class=muted>Активных кампаний нет (межсезонье с 14.08.2026).</p>" )</div>

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

Заявки: ${LW_N} ${LEADS_DELTA} (ср. ${AVG_N})
Визиты: ${VIS_LW} ${VISITS_DELTA}
Директ 14д: ${TOTAL_COST} ₽ · заявок ${PAID_LEADS_14} · CPA ${PAID_CPA}

Решения:${DEC_TG}

📊 Графики: https://dev.aidacamp.ru/reports-hub/#growth-pulse"
    curl -sS -m 15 -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      -d chat_id="${TG_CHAT}" --data-urlencode text="${MSG}" >/dev/null \
      || echo "⚠️ Telegram-сводка не отправилась"
    echo "📨 Telegram-сводка отправлена (решений: ${#DECISIONS[@]})"
  else
    echo "⚠️ Нет TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID в ${ENV_FILE} — сводка пропущена"
  fi
fi

echo "✅ growth-pulse завершён: решений ${#DECISIONS[@]}, предупреждений ${#WARN[@]}"
