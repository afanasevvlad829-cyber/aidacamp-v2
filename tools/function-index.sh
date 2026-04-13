#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/.runtime/index"
OUT_FILE="$OUT_DIR/function-index.md"

mkdir -p "$OUT_DIR"

collect_functions() {
  local file="$1"
  perl -ne '
    if (/^\s*function\s+([A-Za-z0-9_\$]+)\s*\(/) {
      print "- `$1` (line $.)\n";
    } elsif (/^\s*const\s+([A-Za-z0-9_\$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_\$]+)\s*=>/) {
      print "- `$1` (line $.)\n";
    }
  ' "$file"
}

{
  echo "# Function Index"
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
  echo "## src/scripts/main.js"
  collect_functions "$ROOT_DIR/src/scripts/main.js"
  echo
  echo "## dist/index.html"
  collect_functions "$ROOT_DIR/dist/index.html"
} > "$OUT_FILE"

echo "Function index updated: $OUT_FILE"
