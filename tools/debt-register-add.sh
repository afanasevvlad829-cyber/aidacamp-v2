#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTER_FILE="$ROOT_DIR/docs/quality/debt-register.md"

if [[ $# -lt 6 ]]; then
  echo "Usage:"
  echo "  ./tools/debt-register-add.sh \"Area\" \"Type\" \"Risk\" \"Created By\" \"Fix Plan\" \"Target Iteration\""
  exit 1
fi

area="$1"
type="$2"
risk="$3"
created_by="$4"
fix_plan="$5"
target_iteration="$6"

date_now="$(date '+%Y-%m-%d')"

if [[ ! -f "$REGISTER_FILE" ]]; then
  echo "Debt register file not found: $REGISTER_FILE"
  exit 1
fi

printf '| %s | %s | %s | %s | %s | %s | %s | Open |\n' \
  "$date_now" "$area" "$type" "$risk" "$created_by" "$fix_plan" "$target_iteration" >> "$REGISTER_FILE"

echo "Debt item appended to $REGISTER_FILE"
