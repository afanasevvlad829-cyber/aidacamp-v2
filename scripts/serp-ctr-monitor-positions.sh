#!/bin/bash

# Check ranking positions for target keywords
# Runs Tue–Thu at 08:15 MSK

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CURRENT_DATE=$(date +%Y-%m-%d)

echo "=========================================="
echo "📍 Ranking Position Check — $CURRENT_DATE"
echo "=========================================="

# Yandex Webmaster API
API_TOKEN=$(grep YANDEX_WEBMASTER_TOKEN ~/.env 2>/dev/null | cut -d= -f2 || echo "")

if [ -z "$API_TOKEN" ]; then
  echo -e "${RED}❌ ERROR: YANDEX_WEBMASTER_TOKEN not found in ~/.env${NC}"
  exit 1
fi

echo "Fetching ranking positions from Yandex Webmaster API..."

# Get position data for all queries
POSITION_DATA=$(curl -s "https://api.webmaster.yandex.net/v4/user/19303961/hosts/https:aidacamp.ru:443/query-analytics/list" \
  -H "Authorization: OAuth $API_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"filters":{"text_indicator":"AVG_POSITION"},"date_from":"'$CURRENT_DATE'","date_to":"'$CURRENT_DATE'","limit":100}' 2>/dev/null)

# Target keywords
TARGETS=("летний лагерь для детей" "лагерь детский" "летний детский лагерь" "лагерь в подмосковье" "лагерь для подростков")

echo -e "\n${YELLOW}Target Keywords Positions:${NC}\n"

for keyword in "${TARGETS[@]}"; do
  POSITION=$(echo "$POSITION_DATA" | jq -r ".queries[] | select(.query_text == \"$keyword\") | .avg_position_impression" 2>/dev/null || echo "N/A")

  if [ "$POSITION" == "N/A" ] || [ -z "$POSITION" ]; then
    echo -e "${YELLOW}$keyword${NC}: ${RED}Not in top 100${NC}"
  else
    # Check if position is good (1-3) or needs improvement (4+)
    if (( $(echo "$POSITION <= 3" | bc -l) )); then
      echo -e "${YELLOW}$keyword${NC}: ${GREEN}Position $POSITION ✅${NC}"
    elif (( $(echo "$POSITION <= 6" | bc -l) )); then
      echo -e "${YELLOW}$keyword${NC}: Position $POSITION ⏳ (target for optimization)"
    else
      echo -e "${YELLOW}$keyword${NC}: Position $POSITION 📍 (outside target range)"
    fi
  fi
done

echo -e "\n${YELLOW}Top 10 Keywords Overall:${NC}\n"

echo "$POSITION_DATA" | jq -r '.queries[] | select(.avg_position_impression != null) | "\(.query_text) — Position \(.avg_position_impression)"' 2>/dev/null | head -10 | while read line; do
  QUERY=$(echo "$line" | cut -d' ' -f1)
  POS=$(echo "$line" | grep -oP '\d+\.?\d*' | tail -1)

  # Highlight if it's a target keyword
  for target in "${TARGETS[@]}"; do
    if [ "$QUERY" == "$target" ]; then
      echo -e "${GREEN}★ $line${NC}"
      break
    fi
  done

  # If not highlighted, just print
  if ! grep -q "$QUERY" <<< "${TARGETS[@]}"; then
    echo "$line"
  fi
done

echo -e "\n${GREEN}✅ Position check complete${NC}"
