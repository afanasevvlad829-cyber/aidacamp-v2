#!/usr/bin/env bash
# SessionStart hook — сверка реестра фоновых задач.
#
# Роль воркер/оркестратор (MY_BRANCH, git-ветка на агента в общем чекауте)
# убрана 31.08.2026 — вводилась во времена, когда несколько агентов толкались
# ветками в одном каталоге через GitHub; сейчас изоляция идёт через
# git worktree (agent-docker.sh) + GitHub branch protection на dev/main,
# отдельная роль-обвязка избыточна.

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

REGISTRY_HOOK="$REPO_ROOT/scripts/hooks/agent-task-registry.py"
if [[ -f "$REGISTRY_HOOK" ]]; then
  RECON=$(python3 "$REGISTRY_HOOK" --reconcile 2>/dev/null)
  if [[ -n "$RECON" ]]; then
    python3 - <<PYEOF
import json
context = """$RECON"""
print(json.dumps({
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": context
  }
}))
PYEOF
  fi
fi
