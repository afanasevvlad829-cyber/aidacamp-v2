#!/usr/bin/env bash
# run-task.sh — ENTRYPOINT контейнера. Клонирует репо из GitHub, запускает
# claude над брифом, коммитит, пушит ветку, открывает PR. Всё ВНУТРИ контейнера.
#
# Ожидает (через --env-file / -e):
#   GH_TOKEN            — fine-grained PAT (только этот репо: contents+PR write)
#   ANTHROPIC_API_KEY   — ключ для claude
#   REPO                — owner/name (напр. afanasevvlad829-cyber/aidacamp-v2)
#   BRANCH, SLUG        — имя ветки/слаг
# Бриф: /work/brief.txt (монтируется read-only с хоста)
set -euo pipefail

: "${GH_TOKEN:?нет GH_TOKEN}"; : "${ANTHROPIC_API_KEY:?нет ANTHROPIC_API_KEY}"
: "${REPO:?нет REPO}"; : "${BRANCH:?нет BRANCH}"; : "${SLUG:?нет SLUG}"
BRIEF_FILE="/work/brief.txt"; [ -f "$BRIEF_FILE" ] || { echo "нет $BRIEF_FILE"; exit 1; }

cd /work
echo "▶ clone $REPO (ветка dev, depth 50)"
# Клонируем именно dev: shallow-клон тянет только указанную ветку, поэтому
# branch создаём от dev напрямую (раньше клонировался main → origin/dev отсутствовал).
git clone --depth 50 --branch dev "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo
cd repo
git config user.email "agent@aidacamp.local"
git config user.name  "aidacamp-agent"
git checkout -b "$BRANCH"
export GH_TOKEN   # для gh

echo "▶ claude над брифом ($(wc -w < "$BRIEF_FILE") слов)"
# Non-root в контейнере → --dangerously-skip-permissions разрешён. Изоляция = сам контейнер.
claude -p "$(cat "$BRIEF_FILE")" --dangerously-skip-permissions 2>&1 || echo "⚠ claude вышел с ошибкой, продолжаю фиксировать изменения"

# Подстраховка: если агент не закоммитил сам — коммитим его правки
if [ -n "$(git status --porcelain)" ]; then
  git add -A && git commit -m "agent: $SLUG (auto-commit оставшихся изменений)" || true
fi

if [ -z "$(git log origin/dev..HEAD --oneline)" ]; then
  echo "✖ агент не внёс изменений — PR не создаю"
  exit 0
fi

echo "▶ push + PR"
git push origin "$BRANCH"
gh pr create --repo "$REPO" --base dev --head "$BRANCH" \
  --title "$SLUG (агент-контейнер)" \
  --body "Сгенерировано dev-агентом в изолированном контейнере. Бриф:\n\n$(cat "$BRIEF_FILE")" \
  && echo "✅ PR создан" || echo "⚠ gh pr create не удался (возможно PR уже есть)"
