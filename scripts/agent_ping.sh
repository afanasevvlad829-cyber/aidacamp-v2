#!/usr/bin/env bash
# Использование: ./scripts/agent_ping.sh <agent_slug> <task_id> "<current_step>"
AGENT_SLUG="${1:-unknown}"
TASK_ID="${2:-unknown}"
STEP="${3:-working}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HEARTBEAT_DIR="$ROOT/logs/agent-heartbeats"
mkdir -p "$HEARTBEAT_DIR"

EPOCH=$(date +%s)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

printf '{\n  "agent": "%s",\n  "task": "%s",\n  "step": "%s",\n  "timestamp": "%s",\n  "epoch": %s\n}\n' \
  "$AGENT_SLUG" "$TASK_ID" "$STEP" "$TIMESTAMP" "$EPOCH" \
  > "$HEARTBEAT_DIR/${AGENT_SLUG}.json"
