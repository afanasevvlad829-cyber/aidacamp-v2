#!/usr/bin/env bash
# seo-positions-check.sh — съём позиций Топвизора ПО ПОТРЕБНОСТИ, а не по календарю.
#
# Решение владельца 27.08.2026: ежедневный съём не нужен, «раз в четыре-пять дней
# или раз в неделю». Вместо фиксированного расписания скрипт смотрит, есть ли
# волны, которым пора мериться (measure_due_at наступил, замера ещё нет). Съём
# запускается только тогда — естественным образом выходит раз в 4-5 дней, потому
# что таков срок замера волны, и деньги не тратятся, когда мерить нечего.
#
# Зачем вообще. Автопроверка в проекте Топвизора выключена. С 25.08 съёмов не
# было, 49 волн ждали замера — цикл «правка → замер → гипотеза» стоял, конвейер
# работал вслепую (инвентаризация 27.08.2026).
#
# Запускается кроном раз в сутки. Обычно молчит.
set -uo pipefail

PROJECTS="11807186:aidacamp 28354270:codims 28585795:icepartners 29041803:vlad-a"
MIN_DUE="${MIN_DUE:-3}"          # меньше стольких созревших волн — не тратим съём
MIN_INTERVAL="${MIN_INTERVAL:-3}" # и не чаще раза в столько суток
STAMP=/var/lib/seo-alerts/last-positions-check
LOG=/var/log/seo-positions-check.log
ALERT=/opt/scripts/seo-alert.sh

say() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }
mkdir -p "$(dirname "$STAMP")" 2>/dev/null || true

if [ -f "$STAMP" ]; then
  AGE_D=$(( ( $(date +%s) - $(stat -c %Y "$STAMP") ) / 86400 ))
  if [ "$AGE_D" -lt "$MIN_INTERVAL" ]; then
    say "пропуск: прошлый съём $AGE_D сут назад, минимум $MIN_INTERVAL"
    exit 0
  fi
fi

DUE=$(sudo -u postgres psql -d aidacamp -tAc \
  "SELECT COUNT(*) FROM seo_wave_log WHERE status='awaiting_measure' AND measure_due_at <= now()" 2>/dev/null | tr -d ' ')
if [ -z "$DUE" ]; then
  say "БД не ответила"
  echo "psql не ответил при подсчёте созревших волн" | "$ALERT" error positions-check "не могу проверить, нужен ли съём позиций"
  exit 1
fi
if [ "$DUE" -lt "$MIN_DUE" ] 2>/dev/null; then
  say "пропуск: созревших волн $DUE (порог $MIN_DUE)"
  exit 0
fi

# ── Google — раз в неделю, Яндекс — при каждом съёме (решение владельца 27.10.2026) ──
# Google был ~75% стоимости проверок, а волны меряются по Яндексу. Поэтому Яндекс
# снимаем как раньше, а Google добавляем, только если с прошлого его съёма прошло
# GOOGLE_INTERVAL суток. Индексы регионов берём у самого Топвизора (searcher_key:
# 0 — Яндекс, 1 — Google). Если узнать их не вышло — снимаем всё, как до правки:
# лишний Google дешевле, чем пропущенный замер волн.
GOOGLE_INTERVAL="${GOOGLE_INTERVAL:-7}"
GOOGLE_STAMP=/var/lib/seo-alerts/last-positions-check-google
GOOGLE_DUE=1
if [ -f "$GOOGLE_STAMP" ]; then
  G_AGE_D=$(( ( $(date +%s) - $(stat -c %Y "$GOOGLE_STAMP") ) / 86400 ))
  [ "$G_AGE_D" -lt "$GOOGLE_INTERVAL" ] && GOOGLE_DUE=0
fi

# Вывод: строки "<project_id> <yandex-индексы через запятую> <google-индексы через запятую>", "-" если пусто.
REGIONS=$(/opt/scripts/mcp-call.sh topvisor projects '{"show_searchers_and_regions":1}' 2>/dev/null | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
items = data.get("result", data) if isinstance(data, dict) else data
for pr in items if isinstance(items, list) else []:
    found = {0: [], 1: []}
    for s in pr.get("searchers") or []:
        key = s.get("searcher_key", s.get("searcher"))
        key = int(key) if str(key) in ("0", "1") else None
        if str(s.get("enabled", 1)) == "0" or key is None:
            continue
        for r in s.get("regions") or []:
            if str(r.get("enabled", 1)) != "0" and r.get("index") is not None:
                found[key].append(str(r["index"]))
    if pr.get("searchers") is not None:
        print(pr["id"], ",".join(found[0]) or "-", ",".join(found[1]) or "-")
')

[ "$GOOGLE_DUE" = 1 ] && G_NOTE="Google тоже (прошло ≥${GOOGLE_INTERVAL} сут)" || G_NOTE="без Google (был < ${GOOGLE_INTERVAL} сут назад)"
say "созревших волн $DUE — запускаю съём по всем проектам, $G_NOTE"
FAILED=""
GOOGLE_SENT=0
for pair in $PROJECTS; do
  pid="${pair%%:*}"; name="${pair##*:}"
  line=$(printf '%s\n' "$REGIONS" | awk -v p="$pid" '$1==p')
  if [ -z "$line" ]; then
    # индексов нет — старое поведение: все поисковики
    PARAMS="{\"project_id\":\"$pid\"}"; WHAT="все поисковики (регионы не определены)"
    [ "$GOOGLE_DUE" = 1 ] && GOOGLE_SENT=1
  else
    ya=$(echo "$line" | awk '{print $2}'); go=$(echo "$line" | awk '{print $3}')
    idx=""; WHAT=""
    [ "$ya" != "-" ] && idx="$ya" && WHAT="Яндекс"
    if [ "$GOOGLE_DUE" = 1 ] && [ "$go" != "-" ]; then
      idx="${idx:+$idx,}$go"; WHAT="${WHAT:+$WHAT + }Google"; GOOGLE_SENT=1
    fi
    if [ -z "$idx" ]; then
      say "  $name ($pid): пропуск — нечего снимать (Яндекс выключен, Google не по графику)"
      continue
    fi
    PARAMS="{\"project_id\":\"$pid\",\"regions_indexes\":[$idx]}"
  fi
  RESP=$(/opt/scripts/mcp-call.sh topvisor check "$PARAMS" 2>&1) || RESP="ошибка вызова"
  if echo "$RESP" | grep -q "projectIds"; then
    say "  $name ($pid): съём запущен — $WHAT"
  else
    say "  $name ($pid): НЕ запущен — ${RESP:0:120}"
    FAILED="$FAILED $name"
  fi
done

date > "$STAMP"
[ "$GOOGLE_SENT" = 1 ] && date > "$GOOGLE_STAMP"

# ── Страж классификации замеров (08.09.2026) ────────────────────────────────
# Статус волны ставит агент конвейера по правилу из скилла seo-wave-cycle:
#   delta >= 2 → improved, delta <= -2 → regressed, иначе flat.
# Правило чисто арифметическое, но исполняет его LLM — и ошибается. 08.09.2026
# волна /stati/detskiy-lager-v-lesu/ с delta=11.0 (23→12) была записана как
# flat. Цена ошибки конкретная: по шагу M4 скилла страница со статусом flat вне
# ТОП-10 идёт на НОВУЮ ГИПОТЕЗУ немедленно — то есть конвейер потратил бы волну
# на страницу, которая только что выросла на 11 позиций. Плюс перекос в
# статистике, по которой судят, работает ли конвейер вообще.
# Одна ошибка на 50 измеренных волн — не эпидемия, но ловится она арифметикой
# за секунду, а не чтением отчётов. Проверяем и сообщаем, НЕ исправляя молча:
# расхождение может означать и то, что кто-то поменял правило в скилле.
MISMATCH=$(sudo -u postgres psql -d aidacamp -tAc "
  SELECT count(*) FROM seo_wave_log
   WHERE delta IS NOT NULL AND status IN ('improved','flat','regressed')
     AND status <> CASE WHEN delta >= 2 THEN 'improved'
                        WHEN delta <= -2 THEN 'regressed' ELSE 'flat' END" 2>/dev/null | tr -d ' ')
if [ -n "$MISMATCH" ] && [ "$MISMATCH" -gt 0 ] 2>/dev/null; then
  DETAIL=$(sudo -u postgres psql -d aidacamp -tAc "
    SELECT string_agg(site||' '||target_url||' delta='||round(delta::numeric,1)||' записано '||status, E'\n')
      FROM seo_wave_log
     WHERE delta IS NOT NULL AND status IN ('improved','flat','regressed')
       AND status <> CASE WHEN delta >= 2 THEN 'improved'
                          WHEN delta <= -2 THEN 'regressed' ELSE 'flat' END" 2>/dev/null)
  say "расхождений статуса с delta: $MISMATCH"
  printf '%s\n' "$DETAIL" | "$ALERT" warn positions-check "статус волны не сходится с delta ($MISMATCH шт.)"
else
  say "классификация замеров сходится с delta"
fi

if [ -n "$FAILED" ]; then
  echo "Не запустился съём:$FAILED. Лог: $LOG" | "$ALERT" error positions-check "съём позиций частично не прошёл"
  exit 1
fi
echo "Созревших волн: $DUE. Замеры подхватит конвейер." | "$ALERT" info positions-check "запущен съём позиций Топвизора"
