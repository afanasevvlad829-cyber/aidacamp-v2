#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

status=0

run_step() {
  local name="$1"
  shift
  echo "[full-check] step: ${name}"
  if ! "$@"; then
    echo "[full-check] FAIL: ${name}"
    status=1
  else
    echo "[full-check] OK: ${name}"
  fi
}

echo "[full-check] start"
run_step build bash ./build.sh
run_step smoke node ./tools/smoke-booking-ui-playwright.mjs
run_step quality-check ./tools/quality-check.sh
run_step quality-gate ./tools/quality-gate.sh

if [ "$status" -ne 0 ]; then
  echo "[full-check] COMPLETED WITH FAILURES"
  exit 1
fi

echo "[full-check] PASS"
