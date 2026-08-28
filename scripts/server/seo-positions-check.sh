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

say "созревших волн $DUE — запускаю съём по всем проектам"
FAILED=""
for pair in $PROJECTS; do
  pid="${pair%%:*}"; name="${pair##*:}"
  RESP=$(/opt/scripts/mcp-call.sh topvisor check "{\"project_id\":\"$pid\"}" 2>&1) || RESP="ошибка вызова"
  if echo "$RESP" | grep -q "projectIds"; then
    say "  $name ($pid): съём запущен"
  else
    say "  $name ($pid): НЕ запущен — ${RESP:0:120}"
    FAILED="$FAILED $name"
  fi
done

date > "$STAMP"

if [ -n "$FAILED" ]; then
  echo "Не запустился съём:$FAILED. Лог: $LOG" | "$ALERT" error positions-check "съём позиций частично не прошёл"
  exit 1
fi
echo "Созревших волн: $DUE. Замеры подхватит конвейер." | "$ALERT" info positions-check "запущен съём позиций Топвизора"
