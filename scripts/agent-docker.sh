#!/usr/bin/env bash
# agent-docker.sh — запускает dev-агента в ОДНОРАЗОВОМ изолированном контейнере.
#
# Безопасность:
#   - контейнер под non-root (USER agent), --rm (удаляется после задачи)
#   - НЕ монтирует прод-файлы/секреты; репо клонируется внутри из GitHub
#   - секреты только через --env-file (scoped GitHub PAT + ANTHROPIC_API_KEY)
#   - радиус поражения = только репозиторий (по правам PAT)
#
# Использование: ./scripts/agent-docker.sh "<задача>" ["<детальный бриф>"]
set -euo pipefail

TITLE="${1:?Использование: $0 \"<задача>\" [\"<бриф>\"]}"
BRIEF="${2:-$TITLE}"
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//')
BRANCH="agent/$SLUG"
REPO="${AGENT_REPO:-afanasevvlad829-cyber/aidacamp-v2}"
IMAGE="${AGENT_IMAGE:-aidacamp-agent:latest}"
SECRETS="${AGENT_SECRETS:-$HOME/.agent-secrets.env}"

[ -f "$SECRETS" ] || { echo "✖ Нет файла секретов: $SECRETS (см. docker/agent/agent-secrets.env.example)"; exit 1; }
docker image inspect "$IMAGE" >/dev/null 2>&1 || { echo "✖ Нет образа $IMAGE. Собери: docker build -t $IMAGE docker/agent"; exit 1; }

# Бриф во временный файл → единственное, что монтируется с хоста (read-only)
BRIEF_TMP="$(mktemp)"; printf '%s\n' "$BRIEF" > "$BRIEF_TMP"
trap 'rm -f "$BRIEF_TMP"' EXIT

echo "🚀 Агент в контейнере: $SLUG → ветка $BRANCH (репо $REPO)"
docker run --rm \
  --env-file "$SECRETS" \
  -e REPO="$REPO" -e BRANCH="$BRANCH" -e SLUG="$SLUG" \
  -v "$BRIEF_TMP:/work/brief.txt:ro" \
  --memory=2g --cpus=2 \
  "$IMAGE"

echo "✅ Контейнер завершён и удалён. Проверь PR в dev."
