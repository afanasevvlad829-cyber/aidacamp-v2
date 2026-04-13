#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[fast-check] start"
echo "[fast-check] step: build"
bash ./build.sh

echo "[fast-check] step: smoke"
node ./tools/smoke-booking-ui-playwright.mjs

echo "[fast-check] PASS"
