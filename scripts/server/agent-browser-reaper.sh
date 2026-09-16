#!/bin/bash
# Reaper осиротевших headless Chrome от agent-browser.
# Причина: agent-browser не чистит старые сессии -> накопление -> своп-трэшинг (инцидент 11.08.2026).
# Убивает chrome старше THRESHOLD_SEC, КРОМЕ процессов в cgroup управляемого юнита.
# Fail-safe: если cgroup юнита не читается — не трогает ничего.
set -uo pipefail
UNIT="agent-browser-chrome.service"
THRESHOLD_SEC=${THRESHOLD_SEC:-14400}   # 4 часа
DRY_RUN=${DRY_RUN:-0}
LOG=/var/log/agent-browser-reaper.log
PATTERN='/root/\.agent-browser/browsers/.*/chrome'
ts() { date "+%Y-%m-%d %H:%M:%S"; }
CG=$(systemctl show "$UNIT" -p ControlGroup --value 2>/dev/null)
CGPROCS="/sys/fs/cgroup${CG}/cgroup.procs"
if [ -z "$CG" ] || [ ! -r "$CGPROCS" ]; then
  echo "$(ts) SKIP: cgroup юнита недоступна ($CGPROCS)" >> "$LOG"; exit 0
fi
managed=" $(tr "\n" " " < "$CGPROCS") "
killed=0
for pid in $(pgrep -f "$PATTERN" 2>/dev/null); do
  case "$managed" in *" $pid "*) continue;; esac
  age=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d " ")
  [ -n "${age:-}" ] || continue
  if [ "$age" -gt "$THRESHOLD_SEC" ]; then
    comm=$(ps -o comm= -p "$pid" 2>/dev/null)
    if [ "$DRY_RUN" = "1" ]; then
      echo "$(ts) DRY: убил бы pid=$pid age=${age}s comm=$comm" >> "$LOG"
    else
      kill -9 "$pid" 2>/dev/null && { echo "$(ts) KILL pid=$pid age=${age}s comm=$comm" >> "$LOG"; killed=$((killed+1)); }
    fi
  fi
done
[ "$killed" -gt 0 ] && echo "$(ts) итого убито: $killed" >> "$LOG"
exit 0
