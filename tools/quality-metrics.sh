#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CSS_FILE="$ROOT_DIR/src/styles/main.css"
JS_FILE="$ROOT_DIR/src/scripts/main.js"
DIST_FILE="$ROOT_DIR/dist/index.html"
OUT_DIR="$ROOT_DIR/.runtime/quality"
OUT_FILE="$OUT_DIR/latest-quality.md"
HISTORY_FILE="$OUT_DIR/history.csv"

mkdir -p "$OUT_DIR"

count_lines() {
  wc -l < "$1" | tr -d ' '
}

count_bytes() {
  wc -c < "$1" | tr -d ' '
}

max_line_len() {
  awk '{ if (length($0) > max) max = length($0) } END { print max + 0 }' "$1"
}

css_block_count() {
  { rg -n '\{' "$CSS_FILE" || true; } | wc -l | tr -d ' '
}

css_media_count() {
  { rg -n '^\s*@media\b' "$CSS_FILE" || true; } | wc -l | tr -d ' '
}

css_duplicate_selectors() {
  awk '
    /^[[:space:]]*$/ { next }
    /^[[:space:]]*\/\*/ { next }
    /^[[:space:]]*@/ { next }
    /\{/ {
      line=$0
      sub(/\{.*/, "", line)
      gsub(/[[:space:]]+/, " ", line)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
      # Ignore keyframe steps and numeric markers (from/to/0%/100% ...)
      if (line ~ /^(from|to|[0-9]+%)$/) next
      if (line != "") print line
    }
  ' "$CSS_FILE" | sort | uniq -d | wc -l | tr -d ' '
}

js_function_count() {
  { rg -n '\bfunction\b' "$JS_FILE" || true; } | wc -l | tr -d ' '
}

js_if_count() {
  { rg -n '\bif\s*\(' "$JS_FILE" || true; } | wc -l | tr -d ' '
}

js_switch_count() {
  { rg -n '\bswitch\s*\(' "$JS_FILE" || true; } | wc -l | tr -d ' '
}

js_ternary_count() {
  { rg -n '\?.*:' "$JS_FILE" || true; } | wc -l | tr -d ' '
}

js_state_mutation_count() {
  { rg -nP '\bstate\.[A-Za-z0-9_]+\s*=(?!=)' "$JS_FILE" || true; } | wc -l | tr -d ' '
}

runtime_state_key_count() {
  awk '
    /const[[:space:]]+STATE_DEFAULTS[[:space:]]*=[[:space:]]*\{/ { in_block=1; next }
    in_block && /^[[:space:]]*\};/ { in_block=0; print count + 0; exit }
    in_block && /^[[:space:]]*[a-zA-Z0-9_]+[[:space:]]*:/ { count++ }
  ' "$DIST_FILE"
}

replacement_char_count() {
  { rg -n '�' "$DIST_FILE" || true; } | wc -l | tr -d ' '
}

inline_style_tags() {
  { rg -n '<style\b' "$DIST_FILE" || true; } | wc -l | tr -d ' '
}

inline_script_tags() {
  { rg -n '<script\b' "$DIST_FILE" || true; } | wc -l | tr -d ' '
}

css_lines="$(count_lines "$CSS_FILE")"
css_bytes="$(count_bytes "$CSS_FILE")"
css_max_line="$(max_line_len "$CSS_FILE")"
css_blocks="$(css_block_count)"
css_media="$(css_media_count)"
css_dupe_selectors="$(css_duplicate_selectors)"

js_lines="$(count_lines "$JS_FILE")"
js_bytes="$(count_bytes "$JS_FILE")"
js_max_line="$(max_line_len "$JS_FILE")"
js_functions="$(js_function_count)"
js_ifs="$(js_if_count)"
js_switches="$(js_switch_count)"
js_ternaries="$(js_ternary_count)"
js_state_mutations="$(js_state_mutation_count)"
state_keys="$(runtime_state_key_count)"

dist_lines="$(count_lines "$DIST_FILE")"
dist_bytes="$(count_bytes "$DIST_FILE")"
dist_max_line="$(max_line_len "$DIST_FILE")"
dist_repl="$(replacement_char_count)"
dist_styles="$(inline_style_tags)"
dist_scripts="$(inline_script_tags)"

now_iso="$(date '+%Y-%m-%dT%H:%M:%S%z')"
expected_header="timestamp,css_lines,css_max_line,css_blocks,css_dupe_selectors,js_lines,js_max_line,js_functions,js_ifs,js_ternaries,js_state_mutations,state_keys,dist_lines,dist_bytes,dist_max_line,dist_repl"
if [[ -f "$HISTORY_FILE" ]]; then
  current_header="$(head -n 1 "$HISTORY_FILE" || true)"
  if [[ "$current_header" != "$expected_header" ]]; then
    mv "$HISTORY_FILE" "$OUT_DIR/history.legacy.$(date '+%Y%m%d%H%M%S').csv"
  fi
fi

if [[ ! -f "$HISTORY_FILE" ]]; then
  cat > "$HISTORY_FILE" <<EOF
$expected_header
EOF
fi

printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n' \
  "$now_iso" \
  "$css_lines" \
  "$css_max_line" \
  "$css_blocks" \
  "$css_dupe_selectors" \
  "$js_lines" \
  "$js_max_line" \
  "$js_functions" \
  "$js_ifs" \
  "$js_ternaries" \
  "$js_state_mutations" \
  "$state_keys" \
  "$dist_lines" \
  "$dist_bytes" \
  "$dist_max_line" \
  "$dist_repl" >> "$HISTORY_FILE"

prev_line="$(tail -n 2 "$HISTORY_FILE" | head -n 1 || true)"
delta_css_lines="-"
delta_css_dupe="-"
delta_js_lines="-"
delta_js_if="-"
delta_js_state_mut="-"
delta_dist_bytes="-"

if [[ -n "$prev_line" ]]; then
  IFS=',' read -r _ p_css_lines p_css_max_line _ p_css_dupe p_js_lines p_js_max_line _ p_js_if _ p_js_state_mut _ _ p_dist_bytes _ _ <<< "$prev_line"
  delta_css_lines=$((css_lines - p_css_lines))
  delta_css_dupe=$((css_dupe_selectors - p_css_dupe))
  delta_js_lines=$((js_lines - p_js_lines))
  delta_js_if=$((js_ifs - p_js_if))
  delta_js_state_mut=$((js_state_mutations - p_js_state_mut))
  delta_dist_bytes=$((dist_bytes - p_dist_bytes))
fi

cat > "$OUT_FILE" <<EOF
# Quality Snapshot

Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')

## Source Metrics
| Metric | CSS (\`src/styles/main.css\`) | JS (\`src/scripts/main.js\`) |
|---|---:|---:|
| Lines | $css_lines | $js_lines |
| Bytes | $css_bytes | $js_bytes |
| Max line length | $css_max_line | $js_max_line |
| Structural blocks / functions | $css_blocks | $js_functions |
| Media / switch | $css_media | $js_switches |
| Duplicate selectors / ternaries | $css_dupe_selectors | $js_ternaries |
| Conditionals (\`if\`) | - | $js_ifs |
| Direct state mutations (\`state.x =\`) | - | $js_state_mutations |
| Runtime state keys (\`STATE_DEFAULTS\`) | - | $state_keys |

## Dist Metrics
| Metric | \`dist/index.html\` |
|---|---:|
| Lines | $dist_lines |
| Bytes | $dist_bytes |
| Max line length | $dist_max_line |
| Inline <style> tags | $dist_styles |
| Inline <script> tags | $dist_scripts |
| Replacement-char lines (�) | $dist_repl |

## Delta vs Previous Snapshot
| Metric | Delta |
|---|---:|
| CSS lines | $delta_css_lines |
| CSS duplicate selectors | $delta_css_dupe |
| JS lines | $delta_js_lines |
| JS \`if\` count | $delta_js_if |
| JS direct state mutations | $delta_js_state_mut |
| Dist bytes | $delta_dist_bytes |
EOF

cat "$OUT_FILE"
