#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ./tools/run-stage-a-batch.sh --label <name> [--mode fast|full] [--with-gate] [--no-backup]

Modes:
  fast   : build + smoke
  full   : build + quality-check + smoke

Flags:
  --with-gate   Also run ./tools/quality-gate.sh after quality-check
  --no-backup   Skip rollback snapshot creation
USAGE
}

LABEL=""
MODE="fast"
WITH_GATE=0
DO_BACKUP=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label)
      LABEL="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --with-gate)
      WITH_GATE=1
      shift
      ;;
    --no-backup)
      DO_BACKUP=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$LABEL" ]]; then
  echo "--label is required" >&2
  usage
  exit 2
fi

if [[ "$MODE" == "quick" ]]; then
  MODE="fast"
fi

if [[ "$MODE" != "fast" && "$MODE" != "full" ]]; then
  echo "--mode must be fast or full (quick is accepted as alias)" >&2
  exit 2
fi

TS="$(date +%Y%m%d_%H%M%S)"
RUN_DIR="docs/reset-audit/batch-runs"
ROLLBACK_DIR="archive/non-runtime/quarantine/rollback"
REPORT_PATH="${RUN_DIR}/stage-a-batch-${LABEL}-${TS}.md"
ROLLBACK_PATH=""

mkdir -p "$RUN_DIR" "$ROLLBACK_DIR"

snapshot() {
  if [[ "$DO_BACKUP" -eq 0 ]]; then
    return 0
  fi

  local include=()
  local candidates=(
    "dist/index.html"
    "src/styles/main.css"
    "src/scripts/main.js"
    "docs/reset-audit"
  )

  for p in "${candidates[@]}"; do
    if [[ -e "$p" ]]; then
      include+=("$p")
    fi
  done

  if [[ ${#include[@]} -eq 0 ]]; then
    return 0
  fi

  ROLLBACK_PATH="${ROLLBACK_DIR}/stage-a-batch-${LABEL}-${TS}.tgz"
  tar -czf "$ROLLBACK_PATH" "${include[@]}"
}

run_step() {
  local name="$1"
  local cmd="$2"
  local out_file="$3"
  set +e
  bash -lc "$cmd" >"$out_file" 2>&1
  local code=$?
  set -e
  echo "$code"
}

snapshot

BUILD_LOG="$(mktemp)"
QUALITY_LOG="$(mktemp)"
SMOKE_LOG="$(mktemp)"
GATE_LOG="$(mktemp)"

BUILD_CODE="$(run_step "build" "bash ./build.sh" "$BUILD_LOG")"
QUALITY_CODE="SKIP"
SMOKE_CODE="SKIP"
GATE_CODE="SKIP"

if [[ "$BUILD_CODE" -eq 0 ]]; then
  if [[ "$MODE" == "full" ]]; then
    QUALITY_CODE="$(run_step "quality-check" "./tools/quality-check.sh" "$QUALITY_LOG")"
  fi
  SMOKE_CODE="$(run_step "smoke" "node ./tools/smoke-booking-ui-playwright.mjs" "$SMOKE_LOG")"

  if [[ "$WITH_GATE" -eq 1 ]]; then
    GATE_CODE="$(run_step "quality-gate" "./tools/quality-gate.sh" "$GATE_LOG")"
  fi
fi

{
  echo "# Stage A Batch Run"
  echo
  echo "- Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "- Label: $LABEL"
  echo "- Mode: $MODE"
  if [[ -n "$ROLLBACK_PATH" ]]; then
    echo "- Rollback: $ROLLBACK_PATH"
  else
    echo "- Rollback: skipped"
  fi
  echo
  echo "## Status"
  echo
  echo "| Step | Exit code |"
  echo "|---|---:|"
  echo "| build | $BUILD_CODE |"
  if [[ "$MODE" == "full" ]]; then
    echo "| quality-check | $QUALITY_CODE |"
  fi
  echo "| smoke | $SMOKE_CODE |"
  if [[ "$WITH_GATE" -eq 1 ]]; then
    echo "| quality-gate | $GATE_CODE |"
  fi
  echo
  echo "## Logs (tail)"
  echo
  echo "### build"
  echo '```text'
  tail -n 30 "$BUILD_LOG"
  echo '```'

  if [[ "$MODE" == "full" ]]; then
    echo
    echo "### quality-check"
    echo '```text'
    tail -n 30 "$QUALITY_LOG"
    echo '```'
  fi

  echo
  echo "### smoke"
  echo '```text'
  tail -n 30 "$SMOKE_LOG"
  echo '```'

  if [[ "$WITH_GATE" -eq 1 ]]; then
    echo
    echo "### quality-gate"
    echo '```text'
    tail -n 30 "$GATE_LOG"
    echo '```'
  fi
} > "$REPORT_PATH"

rm -f "$BUILD_LOG" "$QUALITY_LOG" "$SMOKE_LOG" "$GATE_LOG"

echo "REPORT=$REPORT_PATH"
if [[ -n "$ROLLBACK_PATH" ]]; then
  echo "ROLLBACK=$ROLLBACK_PATH"
fi

if [[ "$BUILD_CODE" -ne 0 ]]; then
  exit "$BUILD_CODE"
fi
if [[ "$MODE" == "full" && "$QUALITY_CODE" != "0" ]]; then
  exit "$QUALITY_CODE"
fi
if [[ "$SMOKE_CODE" != "0" ]]; then
  exit "$SMOKE_CODE"
fi
if [[ "$WITH_GATE" -eq 1 && "$GATE_CODE" != "0" ]]; then
  exit "$GATE_CODE"
fi
