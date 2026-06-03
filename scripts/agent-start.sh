#!/usr/bin/env bash
# agent-start.sh — ПЕРВАЯ команда любого агента перед любой работой
#
# Создаёт изолированный git worktree, регистрирует агента в реестре,
# выдаёт инструкцию куда идти работать.
#
# Использование:
#   ./scripts/agent-start.sh "<название задачи>"
#
# Примеры:
#   ./scripts/agent-start.sh "fix-hero-mobile"
#   ./scripts/agent-start.sh "seo faq update"
#   ./scripts/agent-start.sh "portal shifts api"

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_PARENT=$(dirname "$REPO_ROOT")
REPO_NAME=$(basename "$REPO_ROOT")
REGISTRY="$REPO_ROOT/.agent-registry.json"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

TASK="${1:-}"

if [[ -z "$TASK" ]]; then
  echo -e "${RED}✖ Укажи задачу: ./scripts/agent-start.sh \"<название>\"${NC}"
  echo ""
  echo "Активные агенты:"
  "$REPO_ROOT/scripts/worker.sh" list 2>/dev/null || echo "  (нет)"
  exit 1
fi

# Нормализуем: пробелы/спецсимволы → дефисы, нижний регистр
TASK_SLUG=$(echo "$TASK" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
BRANCH="agent/$TASK_SLUG"
WORKTREE_DIR="$REPO_PARENT/${REPO_NAME}-agent-$TASK_SLUG"
STARTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo ""
echo -e "${CYAN}${BOLD}▶ Старт агента: $TASK_SLUG${NC}"
echo ""

# Создаём worktree
if [[ -d "$WORKTREE_DIR" ]]; then
  echo -e "${YELLOW}⚠️  Worktree уже существует: $WORKTREE_DIR${NC}"
  echo -e "   Продолжаем работу в существующем worktree."
else
  "$REPO_ROOT/scripts/worker.sh" new "$TASK_SLUG"
fi

# Обновляем реестр
[[ ! -f "$REGISTRY" ]] && echo '{"agents":[]}' > "$REGISTRY"

python3 - <<PYEOF
import json
with open("$REGISTRY") as f:
    data = json.load(f)
data["agents"] = [a for a in data["agents"] if a.get("slug") != "$TASK_SLUG"]
data["agents"].append({
    "slug":       "$TASK_SLUG",
    "task":       "$TASK",
    "branch":     "$BRANCH",
    "worktree":   "$WORKTREE_DIR",
    "started_at": "$STARTED_AT",
    "status":     "in_progress",
    "pr_url":     None
})
with open("$REGISTRY", "w") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("  ✅ Реестр обновлён")
PYEOF

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  ✅ ГОТОВО${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Задача:     ${BOLD}$TASK${NC}"
echo -e "  Ветка:      ${BOLD}$BRANCH${NC}"
echo -e "  Директория: ${BOLD}$WORKTREE_DIR${NC}"
echo ""
echo -e "${BOLD}  Открой агента в этой директории:${NC}"
echo -e "  ${CYAN}claude \"$WORKTREE_DIR\"${NC}"
echo ""
echo -e "${BOLD}  По завершении:${NC}"
echo -e "  ${CYAN}./scripts/agent-done.sh \"$TASK_SLUG\" \"описание что сделано\"${NC}"
echo ""
echo -e "${YELLOW}  ⚠️  Работай ТОЛЬКО в $WORKTREE_DIR — не в главном репо${NC}"
echo ""
