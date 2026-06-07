#!/usr/bin/env bash
# 🚫 DEPRECATED 2026-06-06 — небезопасный root-стек (агент под root на проде).
# Заменён изолированными контейнерами: ./scripts/agent-docker.sh "<задача>" "<бриф>"
# Подробности: docker/agent/README.md, DEV_PROTOCOL.md → «Правило №1».
if [ "${ALLOW_DEPRECATED:-0}" != "1" ]; then
  echo "🚫 $(basename "$0") DEPRECATED и небезопасен. Используй: ./scripts/agent-docker.sh \"<задача>\" \"<бриф>\"" >&2
  echo "   (старое поведение на свой риск: ALLOW_DEPRECATED=1 $0 ...)" >&2
  exit 1
fi
# vps-watchdog.sh — watchdog для агентов на VPS
# Мониторит heartbeats, перезапускает зависших через pm2

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HEARTBEAT_DIR="$REPO_ROOT/logs/agent-heartbeats"
WATCHDOG_LOG="$REPO_ROOT/logs/vps-watchdog.log"
TIMEOUT=120
INTERVAL=30

mkdir -p "$REPO_ROOT/logs"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$WATCHDOG_LOG"; }

restart_agent() {
  local slug="$1"
  local step="$2"
  log "RESTART [$slug] — был на шаге: $step"

  # Читаем task из registry
  local task
  task=$(python3 -c "
import json,sys
try:
  d=json.load(open('$REPO_ROOT/.agent-registry.json'))
  a=next((x for x in d.get('agents',[]) if x['slug']=='$slug'),None)
  print(a['task'] if a else '$slug')
except: print('$slug')
" 2>/dev/null)

  # Перезапускаем через pm2
  pm2 restart "agent-$slug" 2>/dev/null || \
  pm2 start "$REPO_ROOT/scripts/vps-agent-run.sh" \
    --name "agent-$slug" \
    --interpreter bash \
    -- "$task" \
    2>/dev/null

  log "RESTARTED [$slug] task: $task"
}

log "=== VPS Watchdog started (interval=${INTERVAL}s, timeout=${TIMEOUT}s) ==="

while true; do
  now=$(date +%s)

  for hb_file in "$HEARTBEAT_DIR"/*.json; do
    [[ -f "$hb_file" ]] || continue
    slug=$(basename "$hb_file" .json)

    epoch=$(python3 -c "import json; d=json.load(open('$hb_file')); print(d.get('epoch',0))" 2>/dev/null)
    step=$(python3 -c "import json; d=json.load(open('$hb_file')); print(d.get('step','?'))" 2>/dev/null)
    delta=$(( now - epoch ))

    if (( delta > TIMEOUT * 2 )); then
      log "DEAD [$slug] молчит ${delta}s — перезапускаю"
      restart_agent "$slug" "$step"
    elif (( delta > TIMEOUT )); then
      log "WARN [$slug] молчит ${delta}s — шаг: $step"
    else
      log "OK   [$slug] alive ${delta}s — $step"
    fi
  done

  sleep "$INTERVAL"
done
