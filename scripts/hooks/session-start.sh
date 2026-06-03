#!/usr/bin/env bash
# SessionStart hook — инжектирует роль и назначенную ветку в начало сессии

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
MY_BRANCH_FILE="$REPO_ROOT/.claude/MY_BRANCH"

if [[ -n "$MASTER_AGENT" ]]; then
  # ── ОРКЕСТРАТОР ──────────────────────────────────────────────────────────
  ROLE_CONTENT=$(cat "$REPO_ROOT/.claude/ORCHESTRATOR.md" 2>/dev/null || echo "ORCHESTRATOR.md не найден")
  CONTEXT="✅ РОЛЬ: ОРКЕСТРАТОР | ветка: $CURRENT_BRANCH

$ROLE_CONTENT"

elif [[ -f "$MY_BRANCH_FILE" ]]; then
  # ── ВОРКЕР С НАЗНАЧЕННОЙ ВЕТКОЙ ───────────────────────────────────────────
  ASSIGNED=$(cat "$MY_BRANCH_FILE" | tr -d '[:space:]')
  WORKER_CONTENT=$(cat "$REPO_ROOT/.claude/WORKER.md" 2>/dev/null || echo "WORKER.md не найден")

  if [[ "$CURRENT_BRANCH" == "$ASSIGNED" ]]; then
    BRANCH_STATUS="✅ ветка верная"
  else
    BRANCH_STATUS="⚠️ СЕЙЧАС НА '$CURRENT_BRANCH' — ПЕРЕКЛЮЧИСЬ: git checkout $ASSIGNED"
  fi

  CONTEXT="🔴 РОЛЬ: ВОРКЕР
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ТВОЯ ВЕТКА: $ASSIGNED  [$BRANCH_STATUS]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ЗАПОМНИ И НЕ ЗАБЫВАЙ:
  ✅ git commit    — только на ветке $ASSIGNED
  ✅ git push      — только origin/$ASSIGNED
  ✅ финал         — ./scripts/agent-done.sh
  🚫 НЕЛЬЗЯ        — git checkout dev / main
  🚫 НЕЛЬЗЯ        — git push origin dev / main
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$WORKER_CONTENT"

else
  # ── ВЕТКА НЕ НАЗНАЧЕНА — требуем запустить agent-start.sh ─────────────────
  CONTEXT="🚨 ЗАДАЧА НЕ НАЗНАЧЕНА — СТОП
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ты запущен в главном репо без назначенной ветки.
НЕ начинай работу. НЕ трогай файлы. НЕ делай git команды.

ПЕРВЫЙ ШАГ — спроси владельца название задачи, затем запусти:
  ./scripts/agent-start.sh \"<название задачи>\"

Скрипт создаст изолированный worktree и скажет куда идти работать.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

python3 - <<PYEOF
import json
context = """$CONTEXT"""
print(json.dumps({
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": context
  }
}))
PYEOF
