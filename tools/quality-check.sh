#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[quality-check] build"
bash ./build.sh > /tmp/aidaplus-build.log
if [[ "${QUALITY_ENFORCE_DIST_SYNC:-0}" == "1" ]]; then
  if [[ -f dist/index.htm ]] && ! git diff --quiet -- dist/index.html dist/index.htm; then
    echo "[quality-check] FAIL: dist artifacts are not synchronized with source. Run ./build.sh and commit regenerated artifacts."
    git diff --name-only -- dist/index.html dist/index.htm
    exit 1
  fi
fi
echo "[quality-check] metrics"
./tools/quality-metrics.sh > /tmp/aidaplus-quality.log
if [[ -x "./tools/function-index.sh" ]]; then
  echo "[quality-check] function-index"
  ./tools/function-index.sh > /tmp/aidaplus-function-index.log
fi
echo "[quality-check] gate"
./tools/quality-gate.sh
echo "[quality-check] OK"
