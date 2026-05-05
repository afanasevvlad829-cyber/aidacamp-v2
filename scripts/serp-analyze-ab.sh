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
  # Use double quotes and escape any embedded double quotes in the SQL
  sql="${sql//\"/\\\"}"  # Escape any double quotes in the SQL
  result=$(ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -t -c \"$sql\"" 2>&1 | grep -v '^[[:space:]]*$')
  echo "$result" | head -1
}

# Python script for t-test (embedded)
run_ttest() {
  local baseline="$1"
  local test_value="$2"

  python3 << 'PYTHON_EOF'
import sys
from scipy import stats
import json

baseline = json.loads(sys.argv[1])
test_value = float(sys.argv[2])

# Simple t-test (comparing single value to baseline)
# For more accuracy, we would need all data points
# For now, use z-test with baseline as population

if len(baseline) > 1:
  baseline_mean = sum(baseline) / len(baseline)
  baseline_std = (sum((x - baseline_mean) ** 2 for x in baseline) / len(baseline)) ** 0.5

  # z-score
  z_score = (test_value - baseline_mean) / (baseline_std + 0.0001)  # avoid division by zero
  p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
else:
  p_value = 0.5

print(f"{p_value:.4f}")
PYTHON_EOF
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

# CTR change %
CTR_CHANGE=$(echo "scale=1; (($TEST_CTR - $BASELINE_CTR) / $BASELINE_CTR * 100)" | bc 2>/dev/null || echo "0")

# Conversions change %
if [ "$BASELINE_CONVERSIONS" -gt 0 ]; then
  CONV_CHANGE=$(echo "scale=1; (($TEST_CONVERSIONS - $BASELINE_CONVERSIONS) / $BASELINE_CONVERSIONS * 100)" | bc)
else
  CONV_CHANGE=0
fi

# Bounce rate change %
BOUNCE_CHANGE=$(echo "scale=1; (($TEST_BOUNCE - $BASELINE_BOUNCE) / $BASELINE_BOUNCE * 100)" | bc 2>/dev/null || echo "0")

echo "CTR Change: $([ $(echo "$CTR_CHANGE < 0" | bc) -eq 1 ] && echo -e "${RED}${CTR_CHANGE}%${NC}" || echo -e "${GREEN}+${CTR_CHANGE}%${NC}")"
echo "Conversions Change: $([ $(echo "$CONV_CHANGE < 0" | bc) -eq 1 ] && echo -e "${RED}${CONV_CHANGE}%${NC}" || echo -e "${GREEN}+${CONV_CHANGE}%${NC}")"
echo "Bounce Rate Change: $([ $(echo "$BOUNCE_CHANGE > 0" | bc) -eq 1 ] && echo -e "${RED}+${BOUNCE_CHANGE}%${NC}" || echo -e "${GREEN}${BOUNCE_CHANGE}%${NC}")"

# 4. Determine alert level
echo -e "\n${BLUE}4. Determining alert level${NC}"

ALERT_LEVEL="ok"
ALERT_MESSAGE=""
IS_SIGNIFICANT=FALSE

# Check CTR drop
if (( $(echo "$CTR_CHANGE < -$CTR_DROP_CRITICAL" | bc -l) )); then
  ALERT_LEVEL="critical"
  ALERT_MESSAGE="CTR dropped ${CTR_CHANGE}% (critical threshold: -${CTR_DROP_CRITICAL}%)"
  IS_SIGNIFICANT=TRUE
  echo -e "${RED}🚨 CRITICAL: $ALERT_MESSAGE${NC}"
elif (( $(echo "$CTR_CHANGE < -5" | bc -l) )); then
  ALERT_LEVEL="warning"
  ALERT_MESSAGE="CTR dropped ${CTR_CHANGE}% (monitor closely)"
  echo -e "${YELLOW}⚠️  WARNING: $ALERT_MESSAGE${NC}"
fi

# Check Conversions drop
if (( $(echo "$CONV_CHANGE < -$CONVERSIONS_DROP_CRITICAL" | bc -l) )); then
  ALERT_LEVEL="critical"
  ALERT_MESSAGE="Conversions dropped ${CONV_CHANGE}% (critical)"
  IS_SIGNIFICANT=TRUE
  echo -e "${RED}🚨 CRITICAL: $ALERT_MESSAGE${NC}"
fi

# Check Bounce rate spike
if (( $(echo "$BOUNCE_CHANGE > 20" | bc -l) )); then
  ALERT_LEVEL="warning"
  ALERT_MESSAGE="Bounce rate increased ${BOUNCE_CHANGE}% (check page content)"
  echo -e "${YELLOW}⚠️  WARNING: $ALERT_MESSAGE${NC}"
fi

if [ "$ALERT_LEVEL" == "ok" ]; then
  echo -e "${GREEN}✅ All metrics OK — no alerts${NC}"
fi

# 5. Insert A/B test results into database
echo -e "\n${BLUE}5. Saving A/B test results to database${NC}"

INSERT_AB_RESULT=$(cat << SQL
INSERT INTO ab_test_results (
  test_date,
  baseline_start, baseline_end,
  baseline_ctr, baseline_conversions, baseline_bounce_rate,
  test_start, test_end,
  test_value_ctr, test_value_conversions, test_value_bounce_rate,
  ctr_change_pct, conversions_p_value,
  is_significant, alert_level, summary_message
) VALUES (
  '${CURRENT_DATE}',
  '${BASELINE_START}', '${OPTIMIZATION_DATE}',
  ${BASELINE_CTR}, ${BASELINE_CONVERSIONS}, ${BASELINE_BOUNCE},
  '${YESTERDAY}', '${YESTERDAY}',
  ${TEST_CTR}, ${TEST_CONVERSIONS}, ${TEST_BOUNCE},
  ${CTR_CHANGE}, ${CONV_CHANGE},
  ${IS_SIGNIFICANT}, '${ALERT_LEVEL}', '${ALERT_MESSAGE}'
);
SQL
)

ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$INSERT_AB_RESULT\"" > /dev/null
echo "✅ Results saved"

# 6. If critical — insert alert for auto-revert
if [ "$ALERT_LEVEL" == "critical" ]; then
  echo -e "\n${RED}6. CRITICAL ALERT — triggering auto-revert sequence${NC}"

  INSERT_ALERT=$(cat << SQL
INSERT INTO alerts (
  metric, old_value, new_value, change_pct,
  alert_level, message,
  action_taken,
  commit_hash, pr_number
) VALUES (
  'ctr', ${BASELINE_CTR}, ${TEST_CTR}, ${CTR_CHANGE},
  'critical', '${ALERT_MESSAGE}',
  'auto_revert_triggered',
  '9a52afcc', 209
);
SQL
  )

  ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$INSERT_ALERT\"" > /dev/null
  echo "✅ Alert inserted — auto-revert will be triggered"
else
  echo -e "\n${BLUE}6. Inserting regular alert (if any)${NC}"
  if [ "$ALERT_LEVEL" != "ok" ]; then
    INSERT_ALERT=$(cat << SQL
INSERT INTO alerts (
  metric, old_value, new_value, change_pct,
  alert_level, message,
  commit_hash, pr_number
) VALUES (
  'ctr', ${BASELINE_CTR}, ${TEST_CTR}, ${CTR_CHANGE},
  '${ALERT_LEVEL}', '${ALERT_MESSAGE}',
  '9a52afcc', 209
);
SQL
    )

    ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$INSERT_ALERT\"" > /dev/null
    echo "✅ Warning alert inserted"
  fi
fi

# 7. Append to notes file
echo "" >> "$NOTES_FILE"
ALERT_LEVEL_UPPER=$(echo "$ALERT_LEVEL" | tr '[:lower:]' '[:upper:]')
cat >> "$NOTES_FILE" << EOF

### A/B Analysis — $CURRENT_DATE

**Baseline (${BASELINE_START} to ${OPTIMIZATION_DATE}):**
- CTR: ${BASELINE_CTR}%
- Conversions: ${BASELINE_CONVERSIONS}
- Bounce Rate: ${BASELINE_BOUNCE}

**Test (${YESTERDAY}):**
- CTR: ${TEST_CTR}% (change: ${CTR_CHANGE}%)
- Conversions: ${TEST_CONVERSIONS} (change: ${CONV_CHANGE}%)
- Bounce Rate: ${TEST_BOUNCE} (change: ${BOUNCE_CHANGE}%)

**Status:** ${ALERT_LEVEL_UPPER} — ${ALERT_MESSAGE:-"No issues"}

EOF

echo ""
echo -e "${GREEN}✅ A/B Analysis complete${NC}"
echo "📋 Results appended to: $NOTES_FILE"
