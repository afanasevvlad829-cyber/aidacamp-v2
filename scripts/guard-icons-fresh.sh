#!/usr/bin/env bash
# guard-icons-fresh.sh — fails if src/styles/icons.css is out of sync with manifest
# Called by `npm run build`. Also useful as a pre-commit hook.
#
# Usage: bash scripts/guard-icons-fresh.sh

set -e

ICONS_CSS="src/styles/icons.css"
MANIFEST="src/data/icons-manifest.json"

# Regenerate to a temp file and diff
TMPFILE=$(mktemp /tmp/icons-fresh-XXXXXX.css)
node scripts/build-icons-css.mjs --out "$TMPFILE" 2>/dev/null || {
  echo "[guard-icons-fresh] ERROR: build-icons-css.mjs failed"
  rm -f "$TMPFILE"
  exit 1
}

if ! diff -q "$ICONS_CSS" "$TMPFILE" > /dev/null 2>&1; then
  echo "[guard-icons-fresh] ERROR: $ICONS_CSS is out of sync with $MANIFEST"
  echo "  Run: npm run icons"
  rm -f "$TMPFILE"
  exit 1
fi

rm -f "$TMPFILE"
echo "[guard-icons-fresh] OK — icons.css is in sync with manifest"
