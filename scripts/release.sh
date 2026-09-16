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
#   ./scripts/release.sh --force        # хотфикс мимо стражей (не из dev)
#
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="prod"
SKIP_BUILD=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --dev)        TARGET="dev" ;;
    --skip-build) SKIP_BUILD=1 ;;
    --force)      FORCE=1 ;;       # хотфикс не из dev / с незакоммиченным — мимо стражей deploy.sh
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

# Стражи deploy.sh с 09.09.2026 смотрят на dev (единственная боевая ветка на
# Forgejo): чистое дерево + HEAD == origin/dev. Это и есть гарантия «выкатили то,
# что в git». Хотфикс мимо стражей — только осознанно: --force.
# AUTO_ROLLBACK оставляем включённым: красный smoke → откат.
if [ "${FORCE:-0}" = "1" ]; then
  FORCE_BRANCH=1 SKIP_GIT_GUARD=1 AUTO_ROLLBACK=1 SKIP_BUILD=1 ./scripts/deploy.sh "$TARGET"
else
  AUTO_ROLLBACK=1 SKIP_BUILD=1 ./scripts/deploy.sh "$TARGET"
fi
