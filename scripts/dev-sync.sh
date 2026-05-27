#!/usr/bin/env bash
# dev-sync.sh — синхронизировать локальные правки в ветку dev и задеплоить.
#
# Делает всё одной командой:
#   1. переключается на dev
#   2. коммитит любые локальные изменения (вкл. новые файлы)
#   3. подтягивает origin/dev (rebase) — твои коммиты встают поверх
#   4. пушит в origin/dev (MASTER_AGENT=1)
#   5. деплоит dev (NODE_OPTIONS=--max-old-space-size=8192 ./scripts/deploy.sh dev)
#
# Использование:
#   bash scripts/dev-sync.sh ["сообщение коммита"]
#
# При конфликте rebase останавливается с подсказкой — ничего не теряется.

set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-chore(sync): локальные правки $(date +%F-%H%M)}"
# Хук требует semantic-commits: если сообщение не начинается с допустимого типа — префиксуем chore:
if ! printf '%s' "$MSG" | grep -qE '^(feat|fix|docs|style|refactor|test|perf|build|ci|chore|revert)(\(|:)'; then
  MSG="chore: $MSG"
fi

step() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$1"; }
err()  { printf '\033[1;31m✖ %s\033[0m\n' "$1"; }

# 0. На какой ветке сейчас
CUR="$(git rev-parse --abbrev-ref HEAD)"
step "Текущая ветка: $CUR"

# 1. Переключиться на dev (untracked-файлы переедут сами; tracked-изменения не должны висеть)
if [ "$CUR" != "dev" ]; then
  step "Переключаюсь на dev"
  if ! git checkout dev; then
    err "Не удалось переключиться на dev — есть несохранённые изменения в текущей ветке."
    err "Закоммить или спрячь их (git stash), затем повтори."
    exit 1
  fi
fi

# 2. Закоммитить локальные изменения, если есть
if [ -n "$(git status --porcelain)" ]; then
  step "Коммичу локальные изменения: $MSG"
  MASTER_AGENT=1 git add -A
  MASTER_AGENT=1 git commit -m "$MSG"
  ok "Закоммичено"
else
  ok "Рабочее дерево чистое — коммитить нечего"
fi

# 3. Подтянуть origin/dev (rebase)
step "Подтягиваю origin/dev (rebase)"
if ! git pull --rebase origin dev; then
  err "Конфликт при rebase. Разреши конфликты в файлах, затем:"
  echo "    git add <файлы> && git rebase --continue && bash scripts/dev-sync.sh"
  echo "  откат, если что:  git rebase --abort"
  exit 1
fi
ok "dev синхронизирован с origin/dev"

# 4. Запушить
step "Пушу в origin/dev"
MASTER_AGENT=1 git push origin dev
ok "Запушено"

# 5. Деплой
step "Деплою dev"
NODE_OPTIONS=--max-old-space-size=8192 ./scripts/deploy.sh dev

ok "Готово: dev синхронизирован и задеплоен → https://dev.aidacamp.ru"
