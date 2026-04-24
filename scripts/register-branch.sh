#!/usr/bin/env bash
# register-branch.sh — агент запускает это чтобы зарегистрировать свою ветку
#
# Использование (агент пишет в терминале):
#   ./scripts/register-branch.sh agent/seo-articles
#
# После этого:
#   - агент переключается на эту ветку (создаёт если нет)
#   - MY_BRANCH записывается в .claude/
#   - pre-commit хук будет блокировать коммиты не в эту ветку

set -e

BRANCH="${1:-}"
REPO_ROOT=$(git rev-parse --show-toplevel)

if [[ -z "$BRANCH" ]]; then
  echo ""
  echo "Использование: ./scripts/register-branch.sh agent/<задача>"
  echo ""
  echo "Существующие agent/* ветки:"
  git branch -a | grep agent/ | sed 's|.*agent/|  agent/|' | sort -u
  echo ""
  exit 1
fi

# Нормализуем — добавляем agent/ если не указано
if [[ "$BRANCH" != agent/* ]]; then
  BRANCH="agent/$BRANCH"
fi

echo "Регистрирую ветку: $BRANCH"

# Создаём ветку от origin/dev если не существует
git fetch origin --quiet
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout -b "$BRANCH" origin/dev
  echo "✅ Ветка создана от origin/dev"
else
  git checkout "$BRANCH"
  echo "✅ Переключился на существующую ветку"
fi

# Записываем назначение
mkdir -p "$REPO_ROOT/.claude"
echo "$BRANCH" > "$REPO_ROOT/.claude/MY_BRANCH"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Твоя ветка: $BRANCH"
echo "  Записано в: .claude/MY_BRANCH"
echo ""
echo "  Теперь ты можешь:"
echo "    git commit (только в $BRANCH)"
echo "    git push origin $BRANCH"
echo "    gh pr create --base dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
