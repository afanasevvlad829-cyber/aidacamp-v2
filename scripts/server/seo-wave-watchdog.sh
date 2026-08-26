#!/usr/bin/env bash
# Сторож SEO-конвейера: поднимает прогон, если он оборвался, а работа осталась.
#
# Зачем. Конвейер обрывался молча и не возобновлялся до следующих суток:
#   22.08.2026 — harness убил фоновые задачи через 600 с и завершил процесс на
#   13 волнах из 135 запланированных страниц (лечится
#   CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0, выставлено в /etc/profile.d/).
# Причина может быть любой — падение сети, рестарт, OOM. Поэтому сторож
# смотрит не на причину, а на факт: есть ли незакрытая работа и жив ли процесс.
#
# ⚠️ ПОЧЕМУ НЕ pgrep ПО СТРОКЕ (переписано 26.08.2026). Была проверка
# `pgrep -f 'claude -p'` — она срабатывала ложно ТРИЖДЫ за один день:
#   * ловила собственную оболочку сторожа, когда в командной строке родителя
#     встречался тот же текст;
#   * ловила диагностические команды оператора (`pgrep -fa 'claude -p'`);
#   * не была ограничена пользователем, поэтому подходил любой процесс
#     в системе с этой подстрокой (на сервере годами живут ttyd и плагины
#     со словом «claude» в имени).
# Каждый раз это выглядело одинаково: сторож молча решал «конвейер уже идёт»
# и выходил, прогон не запускался, в логе — ни строки. Теперь занятость
# определяется PID-файлом, который пишет сам прогон: совпадения по тексту
# командной строки принципиально невозможны.
#
# Второе изменение: сторож больше НЕ МОЛЧИТ. Каждый выход объясняется строкой
# в /var/log/seo-wave-watchdog.log — иначе «ничего не произошло» неотличимо от
# «всё в порядке», и диагностика упирается в пустоту.
#
# Запускается кроном раз в час.
set -uo pipefail

LOG=/home/claude-run/seo-wave-cycle.log
WDLOG=/var/log/seo-wave-watchdog.log
LOCK=/tmp/seo-wave-watchdog.lock
STAMP=/tmp/seo-wave-watchdog.last
PIDFILE=/tmp/seo-wave-run.pid
RUNNER=/opt/scripts/seo-wave-run.sh
COOLDOWN=5400
STALE_AFTER=$((6*3600))

say() { echo "[$(date '+%F %T')] $*" >> "$WDLOG"; }

exec 9>"$LOCK" || exit 0
flock -n 9 || { say "пропуск: другой сторож уже выполняется"; exit 0; }

running=0
if [ -f "$PIDFILE" ]; then
  pid=$(cat "$PIDFILE" 2>/dev/null | tr -dc '0-9')
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    owner=$(ps -o user= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ "$owner" = "claude-run" ]; then
      running=1
      age=$(( $(date +%s) - $(stat -c %Y "$PIDFILE" 2>/dev/null || echo 0) ))
      if [ "$age" -gt "$STALE_AFTER" ]; then
        say "ВНИМАНИЕ: прогон pid=$pid идёт $((age/3600)) ч — похоже, завис. Сам не убиваю, разбирать руками."
      else
        say "пропуск: прогон уже идёт (pid=$pid, $((age/60)) мин)"
      fi
    else
      say "PID-файл протух (pid=$pid принадлежит '$owner'), убираю"
      rm -f "$PIDFILE"
    fi
  else
    say "PID-файл остался от завершившегося прогона (pid=${pid:-?}), убираю"
    rm -f "$PIDFILE"
  fi
fi
[ "$running" -eq 1 ] && exit 0

REMAIN=$(sudo -u postgres psql -d aidacamp -tAc \
  "SELECT COUNT(*) FROM seo_keyword_backlog WHERE status='new' AND position >= 11" 2>/dev/null | tr -d ' ')
if [ -z "$REMAIN" ]; then say "пропуск: БД не ответила — проверить postgres"; exit 0; fi
if [ "$REMAIN" -eq 0 ] 2>/dev/null; then say "пропуск: очередь пуста, работы нет"; exit 0; fi

if [ -f "$STAMP" ]; then
  AGE=$(( $(date +%s) - $(stat -c %Y "$STAMP") ))
  if [ "$AGE" -lt "$COOLDOWN" ]; then
    say "пропуск: прошлая попытка $((AGE/60)) мин назад, жду $((COOLDOWN/60)) мин"
    exit 0
  fi
fi
date > "$STAMP"

say "поднимаю прогон: в очереди $REMAIN ключей, процесса нет"
echo "[$(date '+%F %T')] watchdog: конвейер не запущен, в бэклоге осталось $REMAIN ключей — поднимаю" >> "$LOG"
sudo -u claude-run -i "$RUNNER" >> "$LOG" 2>&1
rc=$?
say "прогон завершился, код возврата $rc"
exit $rc
