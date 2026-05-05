#!/bin/bash

# Check ranking positions for target keywords
# Runs Tue–Thu at 08:15 MSK

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="/Users/vladimirafanasev/Aidacamp-cloude"
ENV_FILE="$PROJECT_ROOT/.env"
CURRENT_DATE=$(date +%Y-%m-%d)

echo "=========================================="
echo "📍 Ranking Position Check — $CURRENT_DATE"
echo "=========================================="

# Yandex Webmaster API
API_TOKEN=$(grep YANDEX_WEBMASTER_TOKEN "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "")

if [ -z "$API_TOKEN" ]; then
  echo -e "${RED}❌ ERROR: YANDEX_WEBMASTER_TOKEN not found in $ENV_FILE${NC}"
  exit 1
fi

echo "Fetching ranking positions from Yandex Webmaster API..."

# Target keywords for tracking
KEYWORDS=(
  "летний лагерь для детей"
  "лагерь детский"
  "летний детский лагерь"
  "лагерь в подмосковье"
  "лагерь для подростков"
)

# Fetch position data from Webmaster API
echo "Requesting position data..."
POSITION_DATA=$(curl -s "https://api.webmaster.yandex.net/v4/user/19303961/hosts/https:aidacamp.ru:443/query-analytics/list" \
  -H "Authorization: OAuth $API_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"filters\":{\"text_indicator\":\"QUERY\"},\"limit\":100}" 2>/dev/null || echo "{}")

echo -e "\n${YELLOW}Target Keywords Positions:${NC}"

# Parse and display positions for target keywords
for kw in "${KEYWORDS[@]}"; do
  # Find the query in the response and get the latest position
  QUERY_DATA=$(echo "$POSITION_DATA" | jq ".text_indicator_to_statistics[] | select(.text_indicator.value | contains(\"$kw\"))" 2>/dev/null)
  
  if [ -z "$QUERY_DATA" ]; then
    echo -e "❓ $kw: No data"
    continue
  fi
  
  # Get the latest position (last entry in positions array)
  LATEST_POS=$(echo "$QUERY_DATA" | jq '.statistics[] | select(.field == "POSITION") | .value' 2>/dev/null | tail -1)
  LATEST_DATE=$(echo "$QUERY_DATA" | jq '.statistics[] | select(.field == "POSITION") | .date' 2>/dev/null | tail -1)
  
  if [ ! -z "$LATEST_POS" ]; then
    # Check if in top 3
    if (( $(echo "$LATEST_POS <= 3" | bc -l) )); then
      echo -e "${GREEN}✅ $kw: Position ${LATEST_POS} (${LATEST_DATE})${NC}"
    elif (( $(echo "$LATEST_POS <= 5" | bc -l) )); then
      echo -e "${YELLOW}⚡ $kw: Position ${LATEST_POS} (${LATEST_DATE})${NC}"
    else
      echo -e "📍 $kw: Position ${LATEST_POS} (${LATEST_DATE})"
    fi
  else
    echo -e "❓ $kw: Could not parse position data"
  fi
done

echo -e "\n${YELLOW}Top 10 Keywords by Latest Position:${NC}"
echo "$POSITION_DATA" | jq -r '.text_indicator_to_statistics[0:10] | .[] | 
  .text_indicator.value as $query | 
  (.statistics[] | select(.field == "POSITION") | .value) |
  last as $pos |
  "\($query): \($pos)"' 2>/dev/null | sort -t ':' -k2 -n

echo -e "\n${GREEN}✅ Position check complete.${NC}"
echo "📊 Data updated: $(echo "$POSITION_DATA" | jq -r '.text_indicator_to_statistics[0].statistics[-1].date' 2>/dev/null)"
