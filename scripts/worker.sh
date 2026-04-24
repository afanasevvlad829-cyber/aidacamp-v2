#!/usr/bin/env bash
# worker.sh — управление воркерами (git worktrees)
#
# Использование:
#   ./scripts/worker.sh new <задача>     — создать воркера
#   ./scripts/worker.sh list             — список активных воркеров
#   ./scripts/worker.sh done <задача>    — удалить после мержа PR
#   ./scripts/worker.sh open <задача>    — открыть в VS Code / Cursor

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_PARENT=$(dirname "$REPO_ROOT")
REPO_NAME=$(basename "$REPO_ROOT")

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

cmd="${1:-list}"
task="${2:-}"

case "$cmd" in

  # ─── new: создать воркер ───────────────────────────────────────────────────
  new)
    if [[ -z "$task" ]]; then
      echo "Использование: ./scripts/worker.sh new <название-задачи>"
      echo "Пример:        ./scripts/worker.sh new seo-articles"
      exit 1
    fi

    BRANCH="agent/$task"
    WORKTREE_DIR="$REPO_PARENT/${REPO_NAME}-agent-$task"

    if [[ -d "$WORKTREE_DIR" ]]; then
      echo -e "${YELLOW}⚠️  Воркер '$task' уже существует: $WORKTREE_DIR${NC}"
      exit 0
    fi

    echo -e "${CYAN}Создаю воркер: $task${NC}"

    # Создаём ветку от свежего dev
    git fetch origin --quiet
    git branch "$BRANCH" origin/dev 2>/dev/null || true

    # Создаём worktree
    git worktree add "$WORKTREE_DIR" "$BRANCH"

    # Копируем settings.json (хук SessionStart) — без settings.local.json!
    mkdir -p "$WORKTREE_DIR/.claude"
    cp "$REPO_ROOT/.claude/settings.json" "$WORKTREE_DIR/.claude/settings.json" 2>/dev/null || true

    echo ""
    echo -e "${GREEN}${BOLD}✅ Воркер создан!${NC}"
    echo ""
    echo -e "  Папка:   ${BOLD}$WORKTREE_DIR${NC}"
    echo -e "  Ветка:   ${BOLD}$BRANCH${NC}"
    echo ""
    echo -e "${BOLD}Открой Claude Code в этой папке:${NC}"
    echo -e "  ${CYAN}claude \"$WORKTREE_DIR\"${NC}"
    echo -e "  ${CYAN}cursor \"$WORKTREE_DIR\"${NC}   (если используешь Cursor)"
    echo ""
    echo -e "Или скопируй путь:"
    echo -e "  ${BOLD}$WORKTREE_DIR${NC}"
    ;;

  # ─── list: список воркеров ─────────────────────────────────────────────────
  list)
    echo -e "${BOLD}Активные воркеры:${NC}"
    echo ""

    # Заголовок
    printf "  %-25s %-30s %s\n" "ЗАДАЧА" "ВЕТКА" "PR"
    printf "  %-25s %-30s %s\n" "─────────────────────────" "──────────────────────────────" "──────────────"

    git worktree list --porcelain | awk '
      /^worktree/ { wt=$2 }
      /^branch/   { branch=substr($2, 12) }  # убираем refs/heads/
      /^$/ && branch ~ /^agent\// {
        task = branch
        gsub(/^agent\//, "", task)
        printf "  %-25s %-30s\n", task, branch
      }
    '

    echo ""

    # Открытые PR
    echo -e "${BOLD}Открытые PR в dev:${NC}"
    gh pr list --base dev --json number,title,headRefName,state 2>/dev/null \
      | python3 -c "
import sys, json
prs = json.load(sys.stdin)
if not prs:
    print('  (нет открытых PR)')
else:
    for pr in prs:
        print(f'  #{pr[\"number\"]} [{pr[\"headRefName\"]}] {pr[\"title\"]}')
" 2>/dev/null || echo "  (gh не доступен)"
    ;;

  # ─── done: удалить воркер после мержа ────────────────────────────────────
  done)
    if [[ -z "$task" ]]; then
      echo "Использование: ./scripts/worker.sh done <название-задачи>"
      exit 1
    fi

    BRANCH="agent/$task"
    WORKTREE_DIR="$REPO_PARENT/${REPO_NAME}-agent-$task"

    echo -e "${CYAN}Удаляю воркер: $task${NC}"

    git worktree remove "$WORKTREE_DIR" --force 2>/dev/null && \
      echo "  ✅ Worktree удалён" || echo "  ⚠️  Worktree не найден (уже удалён?)"

    git branch -d "$BRANCH" 2>/dev/null && \
      echo "  ✅ Локальная ветка удалена" || echo "  ℹ️  Локальная ветка не найдена"

    git push origin --delete "$BRANCH" 2>/dev/null && \
      echo "  ✅ Remote ветка удалена" || echo "  ℹ️  Remote ветка не найдена"

    echo ""
    echo -e "${GREEN}Воркер '$task' убран.${NC}"
    ;;

  # ─── open: открыть в редакторе ────────────────────────────────────────────
  open)
    if [[ -z "$task" ]]; then
      echo "Использование: ./scripts/worker.sh open <название-задачи>"
      exit 1
    fi
    WORKTREE_DIR="$REPO_PARENT/${REPO_NAME}-agent-$task"
    if [[ ! -d "$WORKTREE_DIR" ]]; then
      echo "Воркер '$task' не найден. Создай его: ./scripts/worker.sh new $task"
      exit 1
    fi
    # Пробуем открыть claude, cursor, code
    if command -v claude &>/dev/null; then
      claude "$WORKTREE_DIR"
    elif command -v cursor &>/dev/null; then
      cursor "$WORKTREE_DIR"
    elif command -v code &>/dev/null; then
      code "$WORKTREE_DIR"
    else
      echo "Открой вручную: $WORKTREE_DIR"
    fi
    ;;

  *)
    echo "Команды: new <задача> | list | done <задача> | open <задача>"
    ;;
esac
