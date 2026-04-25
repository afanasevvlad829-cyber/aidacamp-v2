#!/usr/bin/env bash
# UserPromptSubmit hook — напоминание о ветке в каждом сообщении

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
MY_BRANCH_FILE="$REPO_ROOT/.claude/MY_BRANCH"
CURRENT=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [[ -n "$MASTER_AGENT" ]]; then
  MSG="[Оркестратор | ветка: dev | коммит/пуш через MASTER_AGENT=1]"
elif [[ -f "$MY_BRANCH_FILE" ]]; then
  ASSIGNED=$(cat "$MY_BRANCH_FILE" | tr -d '[:space:]')
  if [[ "$CURRENT" == "$ASSIGNED" ]]; then
    MSG="[Воркер | твоя ветка: ${ASSIGNED} OK | пуш: git push origin ${ASSIGNED} | финал: gh pr create --base dev]"
  else
    MSG="[Воркер | твоя ветка: ${ASSIGNED} | СЕЙЧАС НА: ${CURRENT} — переключись: git checkout ${ASSIGNED}]"
  fi
else
  MSG="[Воркер без ветки — запусти: ./scripts/register-branch.sh <задача>]"
fi

python3 << PYEOF
import json
msg = """$MSG"""
print(json.dumps({
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": msg
  }
}))
PYEOF
