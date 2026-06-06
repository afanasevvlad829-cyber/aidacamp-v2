#!/usr/bin/env bash
# Использование: ./scripts/agent_watchdog.sh [--interval 30] [--timeout 120] [--once]
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HEARTBEAT_DIR="$ROOT/logs/agent-heartbeats"
WATCHDOG_LOG="$ROOT/logs/watchdog.log"

INTERVAL=30
TIMEOUT=120
ONCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --interval) INTERVAL="$2"; shift 2 ;;
    --timeout)  TIMEOUT="$2";  shift 2 ;;
    --once)     ONCE=1;        shift   ;;
    *) shift ;;
  esac
done

mkdir -p "$ROOT/logs"

notify() {
  local title="$1" message="$2"
  osascript -e "display notification \"$message\" with title \"$title\" sound name \"Basso\""
}

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$WATCHDOG_LOG"
}

run_once() {
  local now=$(date +%s)
  python3 - "$now" "$TIMEOUT" "$HEARTBEAT_DIR" << 'PYEOF'
import json, os, glob, sys
now, timeout, hb_dir = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
for hb_file in glob.glob(os.path.join(hb_dir, "*.json")):
    slug = os.path.basename(hb_file).replace(".json","")
    try:
        hb = json.load(open(hb_file))
        delta = now - int(hb.get("epoch", 0))
        step  = hb.get("step", "?")
        mins  = delta // 60
        if delta > timeout:
            print(f"DEAD|🔴 Agent Dead: {slug}|Молчит {mins} мин — последний шаг: {step}")
        elif delta > timeout // 2:
            print(f"WARN|🟡 Agent Slow: {slug}|Нет пинга {mins} мин — шаг: {step}")
        else:
            print(f"OK|{slug}|alive {delta}s — {step}")
    except Exception as e:
        print(f"ERR|🔴 Agent Error: {slug}|{e}")
PYEOF
}

log "=== Watchdog started (interval=${INTERVAL}s, timeout=${TIMEOUT}s) ==="

while true; do
  while IFS='|' read -r state title message; do
    log "$state [$title] $message"
    if [[ "$state" == "DEAD" || "$state" == "WARN" || "$state" == "ERR" ]]; then
      notify "$title" "$message"
    fi
  done < <(run_once)
  [[ $ONCE -eq 1 ]] && break
  sleep "$INTERVAL"
done
