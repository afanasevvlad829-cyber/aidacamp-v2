#!/usr/bin/env bash
# setup-hooks.sh — установка git-хуков из scripts/git-hooks в .git/hooks
# Запускать один раз после clone или после изменения хуков.
# (Альтернатива: git config core.hooksPath scripts/git-hooks — но это per-clone.)

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
SRC="$REPO_ROOT/scripts/git-hooks"
DST="$REPO_ROOT/.git/hooks"

if [ ! -d "$SRC" ]; then
  echo "✖ scripts/git-hooks не найдена" >&2
  exit 1
fi

for hook in "$SRC"/*; do
  name="$(basename "$hook")"
  cp "$hook" "$DST/$name"
  chmod +x "$DST/$name"
  echo "✓ installed $name"
done

# Дополнительно: настроить core.hooksPath чтобы hooks автоматически синхронизировались
# при будущих изменениях scripts/git-hooks (без повторного запуска setup).
git config core.hooksPath scripts/git-hooks
echo "✓ core.hooksPath = scripts/git-hooks (хуки берутся напрямую из tracked-файлов)"
