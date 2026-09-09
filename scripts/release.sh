#!/usr/bin/env bash
#
# release.sh — ручной выкат прода одной командой.
#
# Появился 08.09.2026, когда аккаунт GitHub был заблокирован и автодеплой через
# GitHub Actions встал. Репозитории переехали на свой Forgejo
# (git.aidaplus.ru), автозапуск deploy.yml по push отключён намеренно — пока CI
# на новом месте не обкатан, прод выкатывается осознанно, с этой машины.
#
# Что делает: собирает сайт и отдаёт готовый dist/ штатному deploy.sh, который
# сам делает бэкап прода, rsync, nginx-снипет, smoke-тесты и авто-откат при
# провале. Ничего мимо deploy.sh не льётся — это тот же путь, что был в CI.
#
#   ./scripts/release.sh          # собрать и выкатить прод
#   ./scripts/release.sh --dev    # то же самое на dev-стенд
#   ./scripts/release.sh --skip-build   # выкатить уже собранный dist/
#
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="prod"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --dev)        TARGET="dev" ;;
    --skip-build) SKIP_BUILD=1 ;;
    -h|--help)    sed -n '3,17p' "$0"; exit 0 ;;
    *) echo "Неизвестный аргумент: $arg"; exit 1 ;;
  esac
done

BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
echo "🚀 Выкат на ${TARGET} из ветки ${BRANCH}"
echo

# Незакоммиченные правки — частая причина «выкатил не то»: на проде окажется
# то, чего нет ни в одной ветке. Предупреждаем, но не запрещаем (хотфикс).
if [ -n "$(git status --porcelain 2>/dev/null | grep -v '^?? ' || true)" ]; then
  echo "⚠️  В рабочем дереве есть незакоммиченные изменения:"
  git status --short | grep -v '^?? ' | head -10
  echo
  read -r -p "Выкатывать вместе с ними? [y/N] " ans
  [ "$ans" = "y" ] || [ "$ans" = "Y" ] || { echo "Отменено."; exit 1; }
  echo
fi

if [ "$SKIP_BUILD" = "0" ]; then
  echo "📦 Сборка…"
  npm run build
  echo
fi

# FORCE_BRANCH/SKIP_GIT_GUARD: deploy.sh по умолчанию требует ветку main и
# сверку с origin на GitHub. Пока GitHub недоступен, сверять не с чем —
# гарантию даёт вопрос про незакоммиченные правки выше и smoke-тесты внутри
# deploy.sh. AUTO_ROLLBACK оставляем включённым: красный smoke → откат.
FORCE_BRANCH=1 SKIP_GIT_GUARD=1 AUTO_ROLLBACK=1 SKIP_BUILD=1 \
  ./scripts/deploy.sh "$TARGET"
