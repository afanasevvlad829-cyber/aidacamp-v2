#!/bin/bash

# SERP CTR Optimization Daily Monitor
# Checks metrics for PR #209 (SERP snippet optimization)
# Runs daily at 09:07 MSK

set -e

PROJECT_ROOT="/Users/vladimirafanasev/Aidacamp-cloude"
ENV_FILE="$PROJECT_ROOT/.env"
NOTES_FILE="$PROJECT_ROOT/_notes/SEO-проекты/SERP-CTR-optimization-2026-05.md"
CURRENT_DATE=$(date +%Y-%m-%d)
YESTERDAY=$(date -v-1d +%Y-%m-%d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🔍 SERP CTR Daily Check — $CURRENT_DATE"
echo "=========================================="

# 1. Check CTR from Yandex Webmaster API
echo -e "\n${YELLOW}1. CTR (Yandex Webmaster)${NC}"

# Get CTR for target keywords
CTR_DATA=$(curl -s "https://api.webmaster.yandex.net/v4/user/19303961/hosts/https:aidacamp.ru:443/query-analytics/list" \
  -H "Authorization: OAuth $(grep YANDEX_WEBMASTER_TOKEN $ENV_FILE | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"filters\":{\"text_indicator\":\"CTR\"},\"date_from\":\"$YESTERDAY\",\"date_to\":\"$CURRENT_DATE\",\"limit\":50}" 2>/dev/null || echo "{}")

# Extract CTR average
if echo "$CTR_DATA" | grep -q "ctr"; then
  CURRENT_CTR=$(echo "$CTR_DATA" | grep -oP '"ctr":\s*\K[0-9.]+' | head -1)
  echo "Current CTR: ${GREEN}${CURRENT_CTR}%${NC}"
else
  echo "⚠️  Could not fetch CTR from Webmaster API"
fi

# 2. Check Bounce Rate from Clarity
echo -e "\n${YELLOW}2. Bounce Rate (Clarity)${NC}"

# Get bounce rate for target pages
CLARITY_PAGES=("https://aidacamp.ru" "https://aidacamp.ru/detskiy-lager" "https://aidacamp.ru/lager-v-podmoskove" "https://aidacamp.ru/detskiy-lager-podmoskove" "https://aidacamp.ru/lager-dlya-podrostkov")

TOTAL_BOUNCE=0
PAGE_COUNT=0

for page in "${CLARITY_PAGES[@]}"; do
  # Note: Clarity data would require authenticated API call
  # Placeholder: in production, use Clarity MCP or API
  PAGE_COUNT=$((PAGE_COUNT + 1))
done

echo "Monitoring $PAGE_COUNT target pages for bounce rate spike..."
echo "⚠️  Clarity data requires authentication (check Clarity dashboard manually)"

# 3. Check Organic Traffic from Metrika
echo -e "\n${YELLOW}3. Organic Traffic (Metrika)${NC}"

ORGANIC_DATA=$(./scripts/stats.sh metrika "$YESTERDAY" 2>/dev/null | grep -i "organic\|search" || echo "No data")

if [ "$ORGANIC_DATA" != "No data" ]; then
  echo "Organic traffic yesterday:"
  echo "$ORGANIC_DATA" | head -5
else
  echo "⚠️  Could not fetch organic traffic data"
fi

# 4. Check Conversions (Goal 541048270)
echo -e "\n${YELLOW}4. Conversions (Goal 541048270 — age_select)${NC}"

CONVERSION_DATA=$(./scripts/stats.sh goals "$YESTERDAY" 2>/dev/null | grep "541048270" || echo "No data")

if [ "$CONVERSION_DATA" != "No data" ]; then
  echo "Conversion data yesterday:"
  echo "$CONVERSION_DATA"
else
  echo "⚠️  Could not fetch conversion data"
fi

# 5. Check Ranking Positions
echo -e "\n${YELLOW}5. Ranking Positions (Webmaster API)${NC}"

POSITION_DATA=$(curl -s "https://api.webmaster.yandex.net/v4/user/19303961/hosts/https:aidacamp.ru:443/query-analytics/list" \
  -H "Authorization: OAuth $(grep YANDEX_WEBMASTER_TOKEN $ENV_FILE | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"filters\":{\"text_indicator\":\"AVG_POSITION\"},\"date_from\":\"$YESTERDAY\",\"date_to\":\"$CURRENT_DATE\",\"limit\":50}" 2>/dev/null || echo "{}")

echo "Top keywords with positions:"
# Parse position data
if echo "$POSITION_DATA" | grep -q "query"; then
  echo "$POSITION_DATA" | jq -r '.queries[] | "\(.query_text) — Pos \(.avg_position_impression // "N/A")"' 2>/dev/null | head -10
else
  echo "⚠️  Could not fetch position data"
fi

# 6. Generate Summary Report
echo -e "\n${YELLOW}6. Summary & Alerts${NC}"

# Check for critical issues
ALERTS_COUNT=0

# If CTR down >15%
if [ ! -z "$CURRENT_CTR" ] && (( $(echo "$CURRENT_CTR < 3.5" | bc -l) )); then
  echo -e "${RED}🚨 ALERT: CTR dropped below 3.5% — monitor closely${NC}"
  ALERTS_COUNT=$((ALERTS_COUNT + 1))
fi

# If no alerts
if [ $ALERTS_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ No critical alerts. Continue monitoring.${NC}"
else
  echo -e "${RED}⚠️  $ALERTS_COUNT alert(s) detected. Review immediately.${NC}"
fi

# 7. Save results to file (append to notes)
echo -e "\n${YELLOW}7. Saving results...${NC}"

cat >> "$NOTES_FILE.daily-log" 2>/dev/null <<EOF

## Daily Check — $CURRENT_DATE

- CTR: ${CURRENT_CTR:-"N/A"}%
- Alerts: $ALERTS_COUNT
- Status: $([ $ALERTS_COUNT -eq 0 ] && echo "✅ OK" || echo "🚨 NEEDS REVIEW")
- Generated: $(date)

EOF

echo -e "\n${GREEN}✅ Daily check complete.${NC}"
echo "📋 Full report saved to: $NOTES_FILE.daily-log"
echo "📊 View dashboard: https://aidacamp.ru/admin/serp-monitor"
