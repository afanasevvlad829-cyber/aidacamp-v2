#!/bin/bash
# Cherry-pick staff-документов из PR #248 в новый чистый PR на dev.
# Запускать с владельца (master). Идемпотентно: повторный запуск чистит pr248-tmp.
#
# Что делает:
#   1. Скачивает ветку PR #248 в локальный pr248-tmp
#   2. Переключается на свежий dev (origin/dev)
#   3. Создаёт agent/staff-docs-cherrypick (или сбрасывает если есть)
#   4. Чекаутит ТОЛЬКО staff-файлы из pr248-tmp:
#      - public/staff/docs/*.docx (7 регламентов: руководитель, преподаватель, вожатый, ЧС, и т.д.)
#      - src/pages/staff/index.astro (страница /staff/)
#      - src/pages/api/staff-log.ts (API для логирования)
#   5. Коммитит + пушит + открывает PR в dev

set -euo pipefail

cd "$(dirname "$0")/.."

echo "🔄 Cherry-pick staff/* из PR #248..."

# 1. Скачиваем ветку PR #248
echo ""
echo "1/6 → fetch origin pull/248/head:pr248-tmp"
git branch -D pr248-tmp 2>/dev/null || true
git fetch origin pull/248/head:pr248-tmp

# 2. Переключаемся на свежий dev
echo ""
echo "2/6 → checkout dev + pull origin dev"
git checkout dev
git pull origin dev

# 3. Создаём agent-ветку
echo ""
echo "3/6 → создаём agent/staff-docs-cherrypick"
git branch -D agent/staff-docs-cherrypick 2>/dev/null || true
git checkout -b agent/staff-docs-cherrypick

# 4. Чекаутим только staff-файлы
echo ""
echo "4/6 → checkout pr248-tmp -- public/staff src/pages/staff src/pages/api/staff-log.ts"
git checkout pr248-tmp -- public/staff src/pages/staff src/pages/api/staff-log.ts

echo ""
echo "Файлы готовы:"
git status --short

# 5. Commit + push
echo ""
echo "5/6 → commit + push"
git add -A
git commit -m "feat(staff): cherry-pick регламенты команды из PR #248

Из PR #248 (большой rebase-конфликт по 46 файлам) изолирована staff-часть:

public/staff/docs/:
  01-rukovoditel-smeny.docx       — регламент руководителя смены
  02-prepodavatel.docx            — регламент преподавателя
  03-vozhatiy.docx                — регламент вожатого
  04-vozhatiy-rasshirennaya.docx  — расширенная инструкция вожатого
  05-instruktsiya-chs.docx        — инструкция при ЧС
  06-cheklistpriemki.docx         — чек-лист приёмки
  07-igrovaya-mehanika.docx       — игровая механика лагеря

src/pages/staff/index.astro       — страница /staff/ для команды
src/pages/api/staff-log.ts        — API для логирования действий staff"

git push origin agent/staff-docs-cherrypick

# 6. Открываем PR
echo ""
echo "6/6 → gh pr create --base dev"
gh pr create --base dev \
  --title "feat(staff): регламенты команды (cherry-pick из #248)" \
  --body "Cherry-pick изолированной staff-части PR #248. Без 37 устаревших файлов hero/glass-orbs.

**Что внутри:**
- 7 регламентов в \`public/staff/docs/*.docx\`: руководитель смены, преподаватель, вожатый (+расширенная), ЧС, чек-лист приёмки, игровая механика
- \`/staff/\` — внутренняя страница доступа к документам
- \`/api/staff-log\` — endpoint для логирования действий

**После merge:** документы будут доступны по https://aidacamp.ru/staff/ (после прод-выката)."

echo ""
echo "✅ Готово. Ссылка на PR — выше."
echo ""
echo "Дальше я (мастер-агент) сам:"
echo "  • смержу новый PR в dev"
echo "  • деплоить dev"
echo "  • PR dev → main"
echo "  • после твоего './scripts/deploy.sh prod' — проверю что /staff/ доступен"
