#!/usr/bin/env bash
# Wrapper для photo-replace-server.py с venv.
# Использование: ./tools/photo-replace.sh
# Затем открой http://localhost:8765
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
VENV="$HERE/.venv"

if [ ! -d "$VENV" ]; then
  echo "📦 Создаю venv..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet pillow pillow-avif-plugin
fi

exec "$VENV/bin/python" "$HERE/photo-replace-server.py" "$@"
