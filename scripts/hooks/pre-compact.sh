#!/usr/bin/env bash
# PreCompact hook — вставляет роль и ветку в саммари перед сжатием контекста
# Срабатывает только при компакции — не спамит, но агент никогда не забывает ветку

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
MY_BRANCH_FILE="$REPO_ROOT/.claude/MY_BRANCH"
CURRENT=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [[ -n "$MASTER_AGENT" ]]; then
  MSG="РОЛЬ: ОРКЕСТРАТОР. Ветка: dev. Коммит/пуш только с MASTER_AGENT=1. Мёрджит PR от воркеров."
elif [[ -f "$MY_BRANCH_FILE" ]]; then
  ASSIGNED=$(cat "$MY_BRANCH_FILE" | tr -d '[:space:]')
  MSG="РОЛЬ: ВОРКЕР. Твоя ветка: ${ASSIGNED}. Коммить ТОЛЬКО в ${ASSIGNED}. Пуш: git push origin ${ASSIGNED}. Финал: gh pr create --base dev. Запрещено: git push origin dev или main."
else
  MSG="РОЛЬ: ВОРКЕР. Ветка не назначена. Сначала запусти: ./scripts/register-branch.sh <задача>"
fi

python3 << PYEOF
import json
msg = """$MSG"""
print(json.dumps({
  "hookSpecificOutput": {
    "hookEventName": "PreCompact",
    "additionalContext": msg
  }
}))
PYEOF
