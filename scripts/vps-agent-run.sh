#!/usr/bin/env bash
# vps-agent-run.sh — запуск агента на VPS через claude headless
# Использование: ./scripts/vps-agent-run.sh "<task>" [--max-turns 50]
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASK="${1:-}"
MAX_TURNS="${2:-50}"

if [[ -z "$TASK" ]]; then
  echo "Использование: $0 \"<task>\" [max-turns]"
  exit 1
fi

TASK_SLUG=$(echo "$TASK" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
LOG_DIR="$REPO_ROOT/logs/agents"
mkdir -p "$LOG_DIR"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting agent: $TASK_SLUG" | tee -a "$LOG_DIR/$TASK_SLUG.log"

# Стартуем worktree
bash "$REPO_ROOT/scripts/agent-start.sh" "$TASK"

WORKTREE_DIR="$(dirname "$REPO_ROOT")/${REPO_ROOT##*/}-agent-$TASK_SLUG"

# Запускаем claude headless в worktree
cd "$WORKTREE_DIR"
claude \
  --no-session-persistence \
  --max-turns "$MAX_TURNS" \
  --permission-mode bypassPermissions \
  -p "Ты агент. Задача: $TASK. Worktree: $WORKTREE_DIR. Читай AGENTS.md и DEV_PROTOCOL.md. Пингуй каждые 2-3 шага: ./scripts/agent_ping.sh $TASK_SLUG $TASK_SLUG \"step N: описание\". Финал: ./scripts/agent-done.sh $TASK_SLUG \"описание\"." \
  2>&1 | tee -a "$LOG_DIR/$TASK_SLUG.log"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Agent finished: $TASK_SLUG" | tee -a "$LOG_DIR/$TASK_SLUG.log"
