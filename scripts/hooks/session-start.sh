#!/usr/bin/env bash
# SessionStart hook — инжектирует роль агента в начало каждой сессии
#
# Мастер (оркестратор): MASTER_AGENT=1 в env → читает .claude/ORCHESTRATOR.md
# Суб-агент (воркер):   по умолчанию → читает .claude/WORKER.md
#
# MASTER_AGENT=1 прописан в .claude/settings.local.json (не коммитится)
# Суб-агенты запускаются без этого файла → они воркеры по умолчанию

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [[ -n "$MASTER_AGENT" ]]; then
  # --- ОРКЕСТРАТОР ---
  ROLE_FILE="$REPO_ROOT/.claude/ORCHESTRATOR.md"
  BANNER="✅ РОЛЬ: МАСТЕР-АГЕНТ / ОРКЕСТРАТОР | ветка: $BRANCH"
else
  # --- ВОРКЕР (суб-агент) ---
  ROLE_FILE="$REPO_ROOT/.claude/WORKER.md"
  if [[ "$BRANCH" == agent/* ]]; then
    BANNER="🔴 РОЛЬ: СУБ-АГЕНТ / ВОРКЕР | ветка: $BRANCH ✅"
  else
    BANNER="🔴 РОЛЬ: СУБ-АГЕНТ / ВОРКЕР | ⚠️ ветка '$BRANCH' — переключись на agent/<задача>!"
  fi
fi

# Читаем системный промпт роли
if [[ -f "$ROLE_FILE" ]]; then
  ROLE_CONTENT=$(cat "$ROLE_FILE")
else
  ROLE_CONTENT="Файл роли не найден: $ROLE_FILE"
fi

CONTEXT="$BANNER

$ROLE_CONTENT"

# Выводим JSON для Claude Code
python3 - <<PYEOF
import json, sys
context = """$CONTEXT"""
print(json.dumps({
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": context
  }
}))
PYEOF
