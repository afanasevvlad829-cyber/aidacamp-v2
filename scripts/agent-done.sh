#!/usr/bin/env bash
# agent-done.sh — финал работы агента
# Запускать из worktree когда задача выполнена.
# Использование: ./scripts/agent-done.sh "<slug>" "<описание>"
set -e
REPO_ROOT=$(git rev-parse --show-toplevel)
REGISTRY="$REPO_ROOT/.agent-registry.json"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
TASK_SLUG="${1:-}"; DESCRIPTION="${2:-}"
if [[ -z "$TASK_SLUG" || -z "$DESCRIPTION" ]]; then
  echo -e "${RED}✖ Использование: ./scripts/agent-done.sh \"<slug>\" \"<описание>\"${NC}"; exit 1
fi
BRANCH="agent/$TASK_SLUG"
CURRENT=$(git branch --show-current)
if [[ "$CURRENT" != "$BRANCH" ]]; then
  echo -e "${RED}✖ Ты в ветке '$CURRENT', нужна '$BRANCH'${NC}"; exit 1
fi
echo -e "${CYAN}${BOLD}▶ Финализирую: $TASK_SLUG${NC}"
echo -e "${BOLD}[1/4] Build...${NC}"
if npm run build; then echo -e "  ${GREEN}✅ Build OK${NC}"
else echo -e "  ${RED}✖ Build упал${NC}"; exit 1; fi
echo -e "${BOLD}[2/4] Коммит...${NC}"
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A && git commit -m "feat($TASK_SLUG): $DESCRIPTION"
  echo -e "  ${GREEN}✅ Закоммичено${NC}"
else echo -e "  ${YELLOW}ℹ️  Нечего коммитить${NC}"; fi
echo -e "${BOLD}[3/4] Push...${NC}"
git push origin "$BRANCH" && echo -e "  ${GREEN}✅ Запушено${NC}"
echo -e "${BOLD}[4/4] PR в dev...${NC}"
PR_BODY="## $DESCRIPTION

**Ветка:** \`$BRANCH\`

- [x] \`npm run build\` зелёный
- [ ] Проверено на dev.aidacamp.ru

*Создано через agent-done.sh*"
PR_URL=$(gh pr create --base dev --head "$BRANCH" --title "$DESCRIPTION" --body "$PR_BODY" 2>/dev/null) \
  || PR_URL=$(gh pr view "$BRANCH" --json url -q .url 2>/dev/null || echo "(gh недоступен)")
echo -e "  ${GREEN}✅ PR: $PR_URL${NC}"
if [[ -f "$REGISTRY" ]]; then
python3 - <<PYEOF
import json
with open("$REGISTRY") as f: data = json.load(f)
for a in data["agents"]:
  if a.get("slug") == "$TASK_SLUG":
    a.update({"status":"pr_opened","pr_url":"$PR_URL","finished_at":"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"})
with open("$REGISTRY","w") as f: json.dump(data,f,ensure_ascii=False,indent=2)
PYEOF
fi
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  ✅ ГОТОВО! PR: $PR_URL${NC}"
echo ""
echo -e "${BOLD}  Что дальше (владелец):${NC}"
echo -e "  1. Проверь dev.aidacamp.ru"
echo -e "  2. ${CYAN}gh pr merge --squash${NC}"
echo -e "  3. ${CYAN}./scripts/worker.sh done $TASK_SLUG${NC}"
