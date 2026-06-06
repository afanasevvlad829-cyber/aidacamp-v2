#!/usr/bin/env bash
# sync-runtime.sh — деплой скриптов SEO-фабрики из git в /opt/seo-factory
#
# Источник правды = git (origin/dev). НЕ редактировать /opt/seo-factory вручную:
# любая ручная правка затрётся при следующем синке. Меняешь скрипт → PR в dev →
# синк (крон 06:55 или вручную) разливает в runtime.
#
# Читает файлы прямо из ref origin/dev через `git archive` — НЕ зависит от того,
# на какой ветке сейчас рабочее дерево репо (устойчиво к переключению ветки
# кроном фабрики). rsync БЕЗ --delete — сохраняет /opt-only файлы (.env, логи).
#
# Запуск: bash /opt/seo-factory/sync-runtime.sh [ref]   (ref по умолчанию origin/dev)
set -euo pipefail

REPO="${SEO_GIT_REPO:-/opt/aidacamp-site}"
RUNTIME="/opt/seo-factory"
REF="${1:-${SEO_SYNC_REF:-origin/dev}}"

git -C "$REPO" fetch origin --quiet
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Достаём scripts/seo-factory из нужного ref, не трогая working tree репо
git -C "$REPO" archive "$REF" scripts/seo-factory | tar -x -C "$TMP"

# Копируем скрипты+шаблоны в runtime. БЕЗ --delete: .env/логи/прочее в /opt сохраняются.
rsync -a "$TMP/scripts/seo-factory/" "$RUNTIME/"

echo "✅ synced $RUNTIME ← $REF @ $(git -C "$REPO" rev-parse --short "$REF")"
