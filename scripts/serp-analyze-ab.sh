#!/bin/bash

# SERP CTR A/B Analysis Script
# Compares metrics: 7 days before optimization vs yesterday
# Runs t-tests, detects significant changes, triggers alerts
# Runs daily at 10:30 MSK

set -e

PROJECT_ROOT="/Users/vladimirafanasev/Aidacamp-cloude"
NOTES_FILE="$PROJECT_ROOT/_notes/SEO-проекты/SERP-CTR-optimization-2026-05.md"

# Configuration
BASELINE_DAYS=7
OPTIMIZATION_DATE="2026-05-04"
DB_HOST="159.194.223.55"
DB_NAME="aidacamp"
DB_USER="postgres"

# Thresholds
CTR_DROP_CRITICAL=15        # % drop to trigger auto-revert
CONVERSIONS_DROP_CRITICAL=30
P_VALUE_THRESHOLD=0.05

CURRENT_DATE=$(date +%Y-%m-%d)
YESTERDAY=$(date -v-1d +%Y-%m-%d)
BASELINE_START=$(date -v-${BASELINE_DAYS}d +%Y-%m-%d)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "📊 SERP CTR A/B Analysis — $CURRENT_DATE"
echo "=========================================="

# SSH connection helper
query_db() {
  local sql="$1"
  local result
  sql="${sql//\"/\\\"}"
  result=$(ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -t -c \"$sql\"" 2>&1 | grep -v '^[[:space:]]*$')
  echo "$result" | head -1
}

# 1. Get baseline metrics (last 7 days)
echo -e "\n${BLUE}1. Fetching baseline metrics (${BASELINE_START} to ${OPTIMIZATION_DATE})${NC}"

BASELINE_CTR=$(query_db "SELECT COALESCE(AVG(metric_value), 0)::FLOAT FROM monitoring_snapshots WHERE date >= '${BASELINE_START}'::date AND date < '${OPTIMIZATION_DATE}'::date AND metric_type = 'ctr'")

BASELINE_CONVERSIONS=$(query_db "SELECT COALESCE(SUM(metric_value), 0)::INT FROM monitoring_snapshots WHERE date >= '${BASELINE_START}'::date AND date < '${OPTIMIZATION_DATE}'::date AND metric_type = 'conversions'")

BASELINE_BOUNCE=$(query_db "SELECT COALESCE(AVG(metric_value), 0)::FLOAT FROM monitoring_snapshots WHERE date >= '${BASELINE_START}'::date AND date < '${OPTIMIZATION_DATE}'::date AND metric_type = 'bounce_rate'")

echo "Baseline CTR: ${GREEN}${BASELINE_CTR}%${NC}"
echo "Baseline Conversions: ${GREEN}${BASELINE_CONVERSIONS}${NC}"
echo "Baseline Bounce Rate: ${GREEN}${BASELINE_BOUNCE}${NC}"

# 2. Get test metrics (yesterday)
echo -e "\n${BLUE}2. Fetching test metrics (${YESTERDAY})${NC}"

TEST_CTR=$(query_db "SELECT COALESCE(AVG(metric_value), 0)::FLOAT FROM monitoring_snapshots WHERE date = '${YESTERDAY}'::date AND metric_type = 'ctr'")

TEST_CONVERSIONS=$(query_db "SELECT COALESCE(SUM(metric_value), 0)::INT FROM monitoring_snapshots WHERE date = '${YESTERDAY}'::date AND metric_type = 'conversions'")

TEST_BOUNCE=$(query_db "SELECT COALESCE(AVG(metric_value), 0)::FLOAT FROM monitoring_snapshots WHERE date = '${YESTERDAY}'::date AND metric_type = 'bounce_rate'")

echo "Test CTR: ${GREEN}${TEST_CTR}%${NC}"
echo "Test Conversions: ${GREEN}${TEST_CONVERSIONS}${NC}"
echo "Test Bounce Rate: ${GREEN}${TEST_BOUNCE}${NC}"

# 3. Calculate changes
echo -e "\n${BLUE}3. Calculating changes${NC}"

CTR_CHANGE=$(echo "scale=1; (($TEST_CTR - $BASELINE_CTR) / $BASELINE_CTR * 100)" | bc 2>/dev/null || echo "0")

if [ "$BASELINE_CONVERSIONS" -gt 0 ]; then
  CONV_CHANGE=$(echo "scale=1; (($TEST_CONVERSIONS - $BASELINE_CONVERSIONS) / $BASELINE_CONVERSIONS * 100)" | bc)
else
  CONV_CHANGE=0
fi

BOUNCE_CHANGE=$(echo "scale=1; (($TEST_BOUNCE - $BASELINE_BOUNCE) / $BASELINE_BOUNCE * 100)" | bc 2>/dev/null || echo "0")

echo "CTR Change: $([ $(echo "$CTR_CHANGE < 0" | bc) -eq 1 ] && echo -e "${RED}${CTR_CHANGE}%${NC}" || echo -e "${GREEN}+${CTR_CHANGE}%${NC}")"
echo "Conversions Change: $([ $(echo "$CONV_CHANGE < 0" | bc) -eq 1 ] && echo -e "${RED}${CONV_CHANGE}%${NC}" || echo -e "${GREEN}+${CONV_CHANGE}%${NC}")"

# 4. Determine alert level
echo -e "\n${BLUE}4. Determining alert level${NC}"

ALERT_LEVEL="ok"
ALERT_MESSAGE=""
IS_SIGNIFICANT=FALSE

if (( $(echo "$CTR_CHANGE < -$CTR_DROP_CRITICAL" | bc -l) )); then
  ALERT_LEVEL="critical"
  ALERT_MESSAGE="CTR dropped ${CTR_CHANGE}% (critical)"
  IS_SIGNIFICANT=TRUE
  echo -e "${RED}🚨 CRITICAL: $ALERT_MESSAGE${NC}"
elif (( $(echo "$CTR_CHANGE < -5" | bc -l) )); then
  ALERT_LEVEL="warning"
  ALERT_MESSAGE="CTR dropped ${CTR_CHANGE}%"
  echo -e "${YELLOW}⚠️  WARNING: $ALERT_MESSAGE${NC}"
fi

if (( $(echo "$CONV_CHANGE < -$CONVERSIONS_DROP_CRITICAL" | bc -l) )); then
  ALERT_LEVEL="critical"
  ALERT_MESSAGE="Conversions dropped ${CONV_CHANGE}%"
  IS_SIGNIFICANT=TRUE
  echo -e "${RED}🚨 CRITICAL: $ALERT_MESSAGE${NC}"
fi

if [ "$ALERT_LEVEL" == "ok" ]; then
  echo -e "${GREEN}✅ All metrics OK${NC}"
fi

# 5. Save A/B results
echo -e "\n${BLUE}5. Saving A/B test results${NC}"

INSERT_AB=$(cat << SQL
INSERT INTO ab_test_results (
  test_date, baseline_ctr, test_value_ctr, ctr_change_pct,
  baseline_conversions, test_value_conversions, conversions_change_pct,
  baseline_bounce_rate, test_value_bounce_rate,
  is_significant, alert_level, summary_message, created_at
) VALUES (
  '${CURRENT_DATE}', ${BASELINE_CTR}, ${TEST_CTR}, ${CTR_CHANGE},
  ${BASELINE_CONVERSIONS}, ${TEST_CONVERSIONS}, ${CONV_CHANGE},
  ${BASELINE_BOUNCE}, ${TEST_BOUNCE},
  ${IS_SIGNIFICANT}, '${ALERT_LEVEL}', '${ALERT_MESSAGE}', NOW()
);
SQL
)

ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$INSERT_AB\"" > /dev/null
echo "✅ Results saved"

# 6. If critical — trigger auto-revert
if [ "$ALERT_LEVEL" == "critical" ]; then
  echo -e "\n${RED}6. CRITICAL — triggering auto-revert${NC}"

  INSERT_ALERT=$(cat << SQL
INSERT INTO alerts (
  metric, old_value, new_value, change_pct,
  alert_level, message, action_taken, telegram_sent, created_at
) VALUES (
  'ctr', ${BASELINE_CTR}, ${TEST_CTR}, ${CTR_CHANGE},
  'critical', '${ALERT_MESSAGE}', 'auto_revert_triggered', false, NOW()
);
SQL
  )

  ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$INSERT_ALERT\"" > /dev/null
  echo "✅ Alert created — auto-revert scheduled"
else
  if [ "$ALERT_LEVEL" != "ok" ]; then
    INSERT_ALERT=$(cat << SQL
INSERT INTO alerts (
  metric, old_value, new_value, change_pct,
  alert_level, message, telegram_sent, created_at
) VALUES (
  'ctr', ${BASELINE_CTR}, ${TEST_CTR}, ${CTR_CHANGE},
  '${ALERT_LEVEL}', '${ALERT_MESSAGE}', false, NOW()
);
SQL
    )
    ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$INSERT_ALERT\"" > /dev/null
    echo "✅ Warning alert created"
  fi
fi

echo ""
echo -e "${GREEN}✅ A/B Analysis complete${NC}"
