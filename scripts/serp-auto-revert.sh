#!/bin/bash

# SERP CTR Monitoring — Automatic Revert on Critical Alert
# Monitors for critical alerts and auto-reverts commits if conditions met
# Runs every 30 minutes

set -e

PROJECT_ROOT="/Users/vladimirafanasev/Aidacamp-cloude"
cd "$PROJECT_ROOT"

# Configuration
DB_HOST="159.194.223.55"
DB_NAME="aidacamp"
DB_USER="postgres"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CURRENT_DATE=$(date +%Y-%m-%d)
CURRENT_TIME=$(date +%H:%M:%S)

echo "=========================================="
echo "⏮️  SERP CTR Auto-Revert Monitor — $CURRENT_DATE $CURRENT_TIME"
echo "=========================================="

# SSH connection helper
query_db() {
  local sql="$1"
  ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$sql\""
}

# Get triggered-but-not-executed revert alerts
echo -e "\n${BLUE}1. Checking for triggered revert alerts${NC}"

REVERT_ALERTS=$(query_db "
  SELECT id, metric, old_value, new_value, change_pct, alert_level, message, commit_hash, pr_number, created_at
  FROM alerts
  WHERE alert_level = 'critical'
    AND action_taken = 'auto_revert_triggered'
  ORDER BY created_at DESC
  LIMIT 5
" | tail -n +3)

if [ -z "$REVERT_ALERTS" ]; then
  echo -e "${GREEN}✅ No critical alerts requiring revert${NC}"
  exit 0
fi

echo "Found $(echo "$REVERT_ALERTS" | wc -l) critical alerts that need revert"

# Process each revert alert
while IFS='|' read -r ALERT_ID METRIC OLD_VAL NEW_VAL CHANGE_PCT ALERT_LEVEL MESSAGE COMMIT_HASH PR_NUM CREATED_AT; do
  # Trim whitespace
  ALERT_ID=$(echo "$ALERT_ID" | xargs)
  METRIC=$(echo "$METRIC" | xargs)
  OLD_VAL=$(echo "$OLD_VAL" | xargs)
  NEW_VAL=$(echo "$NEW_VAL" | xargs)
  CHANGE_PCT=$(echo "$CHANGE_PCT" | xargs)
  ALERT_LEVEL=$(echo "$ALERT_LEVEL" | xargs)
  MESSAGE=$(echo "$MESSAGE" | xargs)
  COMMIT_HASH=$(echo "$COMMIT_HASH" | xargs)
  PR_NUM=$(echo "$PR_NUM" | xargs)
  CREATED_AT=$(echo "$CREATED_AT" | xargs)

  # Skip empty lines
  [ -z "$ALERT_ID" ] && continue

  echo -e "\n${RED}Processing revert for alert #$ALERT_ID${NC}"
  echo "Metric: $METRIC | Change: $CHANGE_PCT% | Commit: $COMMIT_HASH"

  # Safety check: ensure we're on dev branch
  CURRENT_BRANCH=$(git branch --show-current)
  if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo -e "${RED}❌ ERROR: Not on 'dev' branch (currently: $CURRENT_BRANCH)${NC}"
    continue
  fi

  # Fetch latest to ensure we have the commit
  echo -e "${BLUE}Fetching latest commits from origin...${NC}"
  git fetch origin dev

  # Check if commit exists
  if ! git log --oneline | grep -q "^$COMMIT_HASH"; then
    echo -e "${RED}❌ ERROR: Commit $COMMIT_HASH not found in history${NC}"

    # Update alert as failed
    UPDATE_ALERT=$(cat << SQL
UPDATE alerts
SET action_taken = 'auto_revert_failed'
WHERE id = $ALERT_ID;
SQL
)
    ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$UPDATE_ALERT\"" > /dev/null
    continue
  fi

  # Proceed with revert
  echo -e "${YELLOW}Executing: git revert $COMMIT_HASH --no-edit${NC}"

  REVERT_START=$(date +%s)
  REVERT_OUTPUT=$(git revert "$COMMIT_HASH" --no-edit 2>&1) || {
    REVERT_ERROR="$REVERT_OUTPUT"
    echo -e "${RED}❌ Revert failed:${NC}"
    echo "$REVERT_ERROR"

    # Update alert as failed
    UPDATE_ALERT=$(cat << SQL
UPDATE alerts
SET action_taken = 'auto_revert_failed'
WHERE id = $ALERT_ID;
SQL
)
    ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$UPDATE_ALERT\"" > /dev/null
    git revert --abort 2>/dev/null || true
    continue
  }

  echo -e "${GREEN}✅ Revert commit created${NC}"

  # Get the new revert commit hash
  REVERT_COMMIT=$(git log -1 --format="%H")
  echo "Revert commit: $REVERT_COMMIT"

  # Push to origin dev
  echo -e "${BLUE}Pushing revert commit to origin/dev...${NC}"

  PUSH_OUTPUT=$(git push origin dev 2>&1) || {
    PUSH_ERROR="$PUSH_OUTPUT"
    echo -e "${RED}❌ Push failed:${NC}"
    echo "$PUSH_ERROR"

    # Revert the revert locally since we can't push
    git reset --hard HEAD~1
    echo "Rolled back local revert commit"

    # Update alert as failed
    UPDATE_ALERT=$(cat << SQL
UPDATE alerts
SET action_taken = 'auto_revert_failed'
WHERE id = $ALERT_ID;
SQL
)
    ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$UPDATE_ALERT\"" > /dev/null
    continue
  }

  REVERT_END=$(date +%s)
  REVERT_DURATION=$((REVERT_END - REVERT_START))

  echo -e "${GREEN}✅ Revert commit pushed successfully${NC}"

  # Update alert as executed
  UPDATE_ALERT=$(cat << SQL
UPDATE alerts
SET
  action_taken = 'auto_revert_executed',
  action_timestamp = NOW(),
  action_log = 'Revert commit: $REVERT_COMMIT'
WHERE id = $ALERT_ID;
SQL
)
  ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$UPDATE_ALERT\"" > /dev/null
  echo -e "${BLUE}Updated alerts table${NC}"

  # Insert into revert_history
  INSERT_REVERT=$(cat << SQL
INSERT INTO revert_history (
  trigger_alert_id,
  commit_hash,
  pr_number,
  revert_command,
  git_output,
  deploy_status
) VALUES (
  $ALERT_ID,
  '$COMMIT_HASH',
  $PR_NUM,
  'git revert $COMMIT_HASH --no-edit && git push origin dev',
  'Revert commit: $REVERT_COMMIT',
  'pending'
);
SQL
)
  ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$INSERT_REVERT\"" > /dev/null
  echo -e "${GREEN}✅ Logged revert to revert_history${NC}"

  # Trigger deployment script to deploy revert
  echo -e "${BLUE}Deploying revert to dev.aidacamp.ru...${NC}"
  ./scripts/deploy.sh dev > /tmp/serp-revert-deploy.log 2>&1 || {
    echo -e "${RED}⚠️  Deployment had issues (check logs)${NC}"
  }

  echo -e "${GREEN}✅ Revert execution complete${NC}"
done <<< "$REVERT_ALERTS"

echo ""
echo -e "${GREEN}✅ Auto-revert monitor complete${NC}"
