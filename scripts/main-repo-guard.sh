#!/usr/bin/env bash
# main-repo-guard.sh — проверка можно ли агенту трогать главный репо.
#
# Использование (из любого скрипта/хука):
#   bash scripts/main-repo-guard.sh check  → exit 0 разрешено / exit 1 запрещено
#   bash scripts/main-repo-guard.sh lock   → создаёт lock-файл (главный агент)
#   bash scripts/main-repo-guard.sh unlock → удаляет lock-файл
#   bash scripts/main-repo-guard.sh status → показывает текущее состояние
#
# Логика:
#   - Если lock-файл .main-repo.lock есть → главный агент работает →
#     остальные операции git в главном репо запрещены (нужно MASTER_AGENT=1)
#   - Если lock-файла нет → разрешено всем
#   - MASTER_AGENT=1 в env всегда разрешает операцию

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MAIN_WORKTREE="$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')"
LOCK_FILE="$MAIN_WORKTREE/.main-repo.lock"

cmd="${1:-check}"

case "$cmd" in
  lock)
    if [ -z "$MAIN_WORKTREE" ]; then
      echo "✖ Не git-репо" >&2; exit 1
    fi
    echo "$$ $(date +%s) ${USER:-unknown} ${HOSTNAME:-unknown}" > "$LOCK_FILE"
    echo "✓ Lock created: $LOCK_FILE"
    ;;
  unlock)
    if [ -f "$LOCK_FILE" ]; then
      rm -f "$LOCK_FILE"
      echo "✓ Lock removed"
    else
      echo "no lock to remove"
    fi
    ;;
  status)
    if [ -f "$LOCK_FILE" ]; then
      echo "🔒 LOCKED by: $(cat "$LOCK_FILE")"
      echo "   Lock file: $LOCK_FILE"
    else
      echo "🔓 Unlocked"
    fi
    ;;
  check)
    # Если MASTER_AGENT=1 — всегда разрешено
    if [ "${MASTER_AGENT:-}" = "1" ]; then
      exit 0
    fi
    # Если мы в worktree (не в главном дереве) — всегда разрешено
    if [ "$REPO_ROOT" != "$MAIN_WORKTREE" ]; then
      exit 0
    fi
    # Мы в главном дереве, без MASTER_AGENT — проверяем lock
    if [ -f "$LOCK_FILE" ]; then
      echo "✖ Главный репо заблокирован: $(cat "$LOCK_FILE")" >&2
      echo "  Не делай git-операций в главном дереве. Работай в своём worktree." >&2
      echo "  Если ты владелец, используй MASTER_AGENT=1 ..." >&2
      exit 1
    fi
    exit 0
    ;;
  *)
    echo "Usage: $0 {check|lock|unlock|status}" >&2
    exit 2
    ;;
esac
