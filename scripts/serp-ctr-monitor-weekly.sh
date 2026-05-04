#!/bin/bash

# SERP CTR Optimization Weekly Report
# Runs every Monday at 10:13 MSK
# Compares metrics: 1 week before optimization vs 1 week after

set -e

PROJECT_ROOT="/Users/vladimirafanasev/Aidacamp-cloude"
NOTES_FILE="$PROJECT_ROOT/_notes/SEO-проекты/SERP-CTR-optimization-2026-05.md"

# Optimization date: 2026-05-04
OPTIMIZATION_DATE="2026-05-04"
WEEK_BEFORE_START="2026-04-27"
WEEK_BEFORE_END="2026-05-03"
WEEK_AFTER_START="2026-05-04"
WEEK_AFTER_END="2026-05-10"

CURRENT_DATE=$(date +%Y-%m-%d)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "📊 SERP CTR Weekly Report — $CURRENT_DATE"
echo "=========================================="

# 1. Compare CTR Before vs After
echo -e "\n${BLUE}1. CTR Comparison${NC}"
echo "Before optimization ($WEEK_BEFORE_START to $WEEK_BEFORE_END):"

BEFORE_CTR=$(curl -s "https://api.webmaster.yandex.net/v4/user/19303961/hosts/https:aidacamp.ru:443/query-analytics/list" \
  -H "Authorization: OAuth $(grep YANDEX_WEBMASTER_TOKEN ~/.env 2>/dev/null | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"date_from\":\"$WEEK_BEFORE_START\",\"date_to\":\"$WEEK_BEFORE_END\"}" 2>/dev/null | jq '.queries[].ctr // 0 | tonumber' | awk '{sum+=$1} END {if (NR>0) printf "%.2f", sum/NR; else print "N/A"}')

echo "Average CTR before: ${GREEN}${BEFORE_CTR}%${NC}"

echo ""
echo "After optimization ($WEEK_AFTER_START to $WEEK_AFTER_END):"

AFTER_CTR=$(curl -s "https://api.webmaster.yandex.net/v4/user/19303961/hosts/https:aidacamp.ru:443/query-analytics/list" \
  -H "Authorization: OAuth $(grep YANDEX_WEBMASTER_TOKEN ~/.env 2>/dev/null | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"date_from\":\"$WEEK_AFTER_START\",\"date_to\":\"$WEEK_AFTER_END\"}" 2>/dev/null | jq '.queries[].ctr // 0 | tonumber' | awk '{sum+=$1} END {if (NR>0) printf "%.2f", sum/NR; else print "N/A"}')

echo "Average CTR after: ${GREEN}${AFTER_CTR}%${NC}"

if [ "$BEFORE_CTR" != "N/A" ] && [ "$AFTER_CTR" != "N/A" ]; then
  CTR_CHANGE=$(echo "scale=1; ($AFTER_CTR - $BEFORE_CTR) / $BEFORE_CTR * 100" | bc)
  if (( $(echo "$CTR_CHANGE > 0" | bc -l) )); then
    echo -e "Change: ${GREEN}+${CTR_CHANGE}%${NC}"
  else
    echo -e "Change: ${RED}${CTR_CHANGE}%${NC}"
  fi
fi

# 2. Compare Positions
echo -e "\n${BLUE}2. Position Changes for Target Keywords${NC}"

TARGET_KEYWORDS=(
  "летний лагерь для детей"
  "лагерь детский"
  "летний детский лагерь"
  "лагерь в подмосковье"
  "лагерь для подростков"
)

for keyword in "${TARGET_KEYWORDS[@]}"; do
  echo -e "\nKeyword: ${YELLOW}$keyword${NC}"
  echo "⚠️  Position data requires Webmaster API (see weekly-monitor-positions.sh)"
done

# 3. Compare Bounce Rate
echo -e "\n${BLUE}3. Bounce Rate (Clarity)${NC}"
echo "Target pages bounce rate comparison:"
echo "⚠️  Clarity data requires dashboard access or authenticated API"

# 4. Compare Conversions
echo -e "\n${BLUE}4. Conversion Changes (Goal 541048270)${NC}"

BEFORE_CONVERSIONS=$(./scripts/stats.sh query "SELECT COUNT(*) as conversions FROM metrika_goals WHERE date >= '${WEEK_BEFORE_START}' AND date <= '${WEEK_BEFORE_END}' AND goal_id = 541048270" 2>/dev/null | tail -1 | grep -oP '\d+' || echo "0")

AFTER_CONVERSIONS=$(./scripts/stats.sh query "SELECT COUNT(*) as conversions FROM metrika_goals WHERE date >= '${WEEK_AFTER_START}' AND date <= '${WEEK_AFTER_END}' AND goal_id = 541048270" 2>/dev/null | tail -1 | grep -oP '\d+' || echo "0")

echo "Conversions before: $BEFORE_CONVERSIONS"
echo "Conversions after: $AFTER_CONVERSIONS"

if [ "$BEFORE_CONVERSIONS" != "0" ]; then
  CONV_CHANGE=$(echo "scale=1; ($AFTER_CONVERSIONS - $BEFORE_CONVERSIONS) / $BEFORE_CONVERSIONS * 100" | bc 2>/dev/null || echo "N/A")
  echo "Change: ${CONV_CHANGE}%"
fi

# 5. Summary Table
echo -e "\n${BLUE}5. Summary Table${NC}"
cat <<EOF

| Metric | Before | After | Change | Status |
|--------|--------|-------|--------|--------|
| CTR | ${BEFORE_CTR}% | ${AFTER_CTR}% | $([ "$BEFORE_CTR" != "N/A" ] && echo "${CTR_CHANGE}%" || echo "N/A") | $([ "$BEFORE_CTR" != "N/A" ] && (( $(echo "$CTR_CHANGE >= 20" | bc -l) )) && echo "✅ WIN" || echo "⏳ MONITOR") |
| Conversions | $BEFORE_CONVERSIONS | $AFTER_CONVERSIONS | $([ "$BEFORE_CONVERSIONS" != "0" ] && echo "${CONV_CHANGE}%" || echo "N/A") | $([ "$AFTER_CONVERSIONS" -ge "$BEFORE_CONVERSIONS" ] && echo "✅ GOOD" || echo "⚠️  CHECK") |
| Bounce rate | ? | ? | ? | ⏳ See Clarity |
| Avg position | ? | ? | ? | ⏳ Pending |

EOF

# 6. Save to notes
echo "" >> "$NOTES_FILE"
cat >> "$NOTES_FILE" <<EOF

### Weekly Report — $CURRENT_DATE

**CTR:** Before $BEFORE_CTR% → After $AFTER_CTR% ($([ "$BEFORE_CTR" != "N/A" ] && echo "${CTR_CHANGE}%" || echo "N/A"))
**Conversions:** Before $BEFORE_CONVERSIONS → After $AFTER_CONVERSIONS
**Status:** ⏳ Ongoing monitoring

EOF

echo -e "\n${GREEN}✅ Weekly report generated${NC}"
echo "📋 Results appended to: $NOTES_FILE"
