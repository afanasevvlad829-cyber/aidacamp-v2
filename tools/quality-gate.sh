#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HISTORY_FILE="$ROOT_DIR/.runtime/quality/history.csv"
BASELINE_FILE="$ROOT_DIR/docs/quality/baseline.env"

if [[ ! -f "$HISTORY_FILE" ]]; then
  echo "quality-gate: no history file. Run ./tools/quality-metrics.sh first."
  exit 1
fi

latest_line="$(tail -n 1 "$HISTORY_FILE")"
IFS=',' read -r _ css_lines css_max_line css_blocks css_dupe js_lines js_max_line js_functions js_ifs js_ternaries js_state_mutations state_keys dist_lines dist_bytes dist_max_line dist_repl <<< "$latest_line"

# Absolute-tier guardrails for active runtime path.
MAX_CSS_DUPE=3
MAX_JS_IFS=95
MAX_JS_TERNARIES=10
MAX_JS_LINE_LEN=380
MAX_JS_STATE_MUTATIONS=0
MAX_DIST_BYTES=560000
MAX_DIST_LINE_LEN=1100
MAX_REPL_LINES=0

failed=0

check_max() {
  local name="$1"
  local value="$2"
  local limit="$3"
  if (( value > limit )); then
    echo "FAIL: $name=$value > $limit"
    failed=1
  else
    echo "OK:   $name=$value <= $limit"
  fi
}

check_max "css_duplicate_selectors" "$css_dupe" "$MAX_CSS_DUPE"
check_max "js_if_count" "$js_ifs" "$MAX_JS_IFS"
check_max "js_ternary_count" "$js_ternaries" "$MAX_JS_TERNARIES"
check_max "js_max_line_length" "$js_max_line" "$MAX_JS_LINE_LEN"
check_max "js_state_mutations" "$js_state_mutations" "$MAX_JS_STATE_MUTATIONS"
check_max "dist_bytes" "$dist_bytes" "$MAX_DIST_BYTES"
check_max "dist_max_line_length" "$dist_max_line" "$MAX_DIST_LINE_LEN"
check_max "replacement_char_lines" "$dist_repl" "$MAX_REPL_LINES"

check_baseline_max() {
  local name="$1"
  local value="$2"
  local baseline="$3"
  local delta="$4"
  local limit=$((baseline + delta))
  if (( value > limit )); then
    echo "FAIL: $name=$value > baseline+$delta ($limit)"
    failed=1
  else
    echo "OK:   $name=$value <= baseline+$delta ($limit)"
  fi
}

if [[ -f "$BASELINE_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$BASELINE_FILE"
  echo "quality-gate: baseline loaded from $BASELINE_FILE"

  check_baseline_max "css_duplicate_selectors" "$css_dupe" "${BASELINE_CSS_DUPE:-$css_dupe}" "${ALLOW_CSS_DUPE_DELTA:-0}"
  check_baseline_max "js_if_count" "$js_ifs" "${BASELINE_JS_IFS:-$js_ifs}" "${ALLOW_JS_IFS_DELTA:-0}"
  check_baseline_max "js_ternary_count" "$js_ternaries" "${BASELINE_JS_TERNARIES:-$js_ternaries}" "${ALLOW_JS_TERNARIES_DELTA:-0}"
  check_baseline_max "js_max_line_length" "$js_max_line" "${BASELINE_JS_MAX_LINE:-$js_max_line}" "${ALLOW_JS_MAX_LINE_DELTA:-0}"
  check_baseline_max "js_state_mutations" "$js_state_mutations" "${BASELINE_JS_STATE_MUTATIONS:-$js_state_mutations}" "${ALLOW_JS_STATE_MUTATIONS_DELTA:-0}"
  check_baseline_max "dist_bytes" "$dist_bytes" "${BASELINE_DIST_BYTES:-$dist_bytes}" "${ALLOW_DIST_BYTES_DELTA:-0}"
  check_baseline_max "dist_max_line_length" "$dist_max_line" "${BASELINE_DIST_MAX_LINE:-$dist_max_line}" "${ALLOW_DIST_MAX_LINE_DELTA:-0}"
  check_baseline_max "replacement_char_lines" "$dist_repl" "${BASELINE_DIST_REPL:-$dist_repl}" "${ALLOW_DIST_REPL_DELTA:-0}"
else
  echo "quality-gate: baseline file not found ($BASELINE_FILE), baseline checks skipped."
fi

if (( failed )); then
  echo "quality-gate: FAILED"
  exit 1
fi

echo "quality-gate: PASSED"
