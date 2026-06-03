#!/usr/bin/env bash
# session-stop.sh — автоуборка после агента
#
# Срабатывает при завершении сессии Claude Code (хук Stop).
# Если PR из текущей ветки смёрджен → удаляет свой worktree.
# Если PR не смёрджен или нет PR → молчит, ничего не трогает.

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || exit 0)
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
REGISTRY="$REPO_ROOT/.agent-registry.json"

# Только для agent/* веток, не для main/dev
[[ "$CURRENT_BRANCH" != agent/* ]] && exit 0

# Проверяем статус PR
PR_STATE=$(gh pr view "$CURRENT_BRANCH" --json state -q .state 2>/dev/null || echo "NONE")

if [[ "$PR_STATE" == "MERGED" ]]; then
  CURRENT_WORKTREE=$(git rev-parse --show-toplevel)
  MAIN_REPO=$(git worktree list | head -1 | awk '{print $1}')

  # Не удалять если это главный репо
  if [[ "$CURRENT_WORKTREE" == "$MAIN_REPO" ]]; then
    exit 0
  fi

  # Обновляем реестр
  SLUG="${CURRENT_BRANCH#agent/}"
  if [[ -f "$REGISTRY" ]]; then
    python3 - <<PYEOF 2>/dev/null
import json
with open("$REGISTRY") as f: data = json.load(f)
for a in data["agents"]:
    if a.get("slug") == "$SLUG":
        a["status"] = "cleaned_up"
        a["cleaned_at"] = "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
with open("$REGISTRY","w") as f: json.dump(data,f,ensure_ascii=False,indent=2)
PYEOF
  fi

  # Удаляем worktree (папку) — ветка в git остаётся
  cd "$MAIN_REPO"
  git worktree remove --force "$CURRENT_WORKTREE" 2>/dev/null
fi

exit 0
