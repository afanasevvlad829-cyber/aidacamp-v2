#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[architecture-check] dependency-cruiser"
npx --yes dependency-cruiser@16.10.3 src/scripts \
  --config .dependency-cruiser.cjs \
  --output-type err \
  --progress none

echo "[architecture-check] semgrep"
SEMGREP_BIN="${SEMGREP_BIN:-}"
if [[ -z "$SEMGREP_BIN" ]]; then
  if command -v semgrep >/dev/null 2>&1; then
    SEMGREP_BIN="$(command -v semgrep)"
  elif [[ -x "$HOME/.local/bin/semgrep" ]]; then
    SEMGREP_BIN="$HOME/.local/bin/semgrep"
  else
    py_minor="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    py_user_bin="$HOME/Library/Python/$py_minor/bin/semgrep"
    if [[ -x "$py_user_bin" ]]; then
      SEMGREP_BIN="$py_user_bin"
    else
      echo "[architecture-check] FAIL: semgrep not found in PATH or common user bin locations."
      exit 1
    fi
  fi
fi
export PATH="$(dirname "$SEMGREP_BIN"):$PATH"
"$SEMGREP_BIN" --config .semgrep/architecture.yml --error --metrics=off src/scripts

echo "[architecture-check] no-business-in-main"
node ./tools/check-no-business-in-main.js

echo "[architecture-check] no-legacy-path-usage"
node ./tools/check-no-legacy-path-usage.js

echo "[architecture-check] OK"
