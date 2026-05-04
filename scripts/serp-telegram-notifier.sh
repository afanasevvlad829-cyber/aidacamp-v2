#!/bin/bash

# SERP CTR Monitoring — Telegram Notifier
# Reads unsent alerts from PostgreSQL, formats them, sends to Telegram
# Runs every 15 minutes

set -e

PROJECT_ROOT="/Users/vladimirafanasev/Aidacamp-cloude"

# Configuration
DB_HOST="159.194.223.55"
DB_NAME="aidacamp"
DB_USER="postgres"

# Telegram (from .env or hardcode for testing)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-8619240142:AAEZluPyzdCTDNEiRFSLt7I8Ka4dC8ntfHc}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-244314247}"
TELEGRAM_API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CURRENT_DATE=$(date +%Y-%m-%d)
CURRENT_TIME=$(date +%H:%M:%S)

echo "=========================================="
echo "💬 SERP CTR Telegram Notifier — $CURRENT_DATE $CURRENT_TIME"
echo "=========================================="

# SSH connection helper
query_db() {
  local sql="$1"
  ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$sql\""
}

# Get unsent alerts from PostgreSQL
echo -e "\n${BLUE}1. Fetching unsent alerts from PostgreSQL${NC}"

UNSENT_ALERTS=$(query_db "
  SELECT id, metric, old_value, new_value, change_pct, alert_level, message, created_at
  FROM alerts
  WHERE telegram_sent = FALSE
  ORDER BY created_at DESC
  LIMIT 10
" | tail -n +3)  # Skip header rows

if [ -z "$UNSENT_ALERTS" ]; then
  echo -e "${GREEN}✅ No unsent alerts${NC}"
  exit 0
fi

# Process each alert
echo "Found $(echo "$UNSENT_ALERTS" | wc -l) unsent alerts"

while IFS='|' read -r ALERT_ID METRIC OLD_VAL NEW_VAL CHANGE_PCT ALERT_LEVEL MESSAGE CREATED_AT; do
  # Trim whitespace
  ALERT_ID=$(echo "$ALERT_ID" | xargs)
  METRIC=$(echo "$METRIC" | xargs)
  OLD_VAL=$(echo "$OLD_VAL" | xargs)
  NEW_VAL=$(echo "$NEW_VAL" | xargs)
  CHANGE_PCT=$(echo "$CHANGE_PCT" | xargs)
  ALERT_LEVEL=$(echo "$ALERT_LEVEL" | xargs)
  MESSAGE=$(echo "$MESSAGE" | xargs)
  CREATED_AT=$(echo "$CREATED_AT" | xargs)

  # Skip empty lines
  [ -z "$ALERT_ID" ] && continue

  echo -e "\n${YELLOW}Processing alert #$ALERT_ID ($ALERT_LEVEL)${NC}"

  # Format Telegram message
  case "$ALERT_LEVEL" in
    critical)
      EMOJI="🚨"
      HEADER="CRITICAL ALERT"
      ;;
    warning)
      EMOJI="⚠️"
      HEADER="WARNING ALERT"
      ;;
    *)
      EMOJI="ℹ️"
      HEADER="INFO"
      ;;
  esac

  # Build message text
  TEXT=$(cat <<EOF
$EMOJI *SERP CTR Monitoring — $HEADER*

📊 *Metric:* $METRIC
📉 *Before:* $OLD_VAL
📈 *After:* $NEW_VAL
📊 *Change:* $CHANGE_PCT%

💬 *Details:* $MESSAGE

🕐 *Time:* $CREATED_AT
🔗 *Status:* [Dashboard](https://dev.aidacamp.ru/admin/ab-monitor)
EOF
)

  # Send to Telegram
  echo -e "${BLUE}2. Sending to Telegram (chat_id=$TELEGRAM_CHAT_ID)${NC}"

  TELEGRAM_RESPONSE=$(curl -s -X POST "$TELEGRAM_API/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{
      \"chat_id\": $TELEGRAM_CHAT_ID,
      \"text\": $(echo "$TEXT" | jq -Rs .),
      \"parse_mode\": \"Markdown\",
      \"disable_web_page_preview\": true
    }")

  # Extract message ID from response
  MESSAGE_ID=$(echo "$TELEGRAM_RESPONSE" | jq -r '.result.message_id // empty' 2>/dev/null)

  if [ -z "$MESSAGE_ID" ]; then
    # Error sending
    ERROR_MSG=$(echo "$TELEGRAM_RESPONSE" | jq -r '.description // "Unknown error"' 2>/dev/null)
    echo -e "${RED}❌ Failed to send: $ERROR_MSG${NC}"

    # Update alert with error
    UPDATE_ALERT=$(cat << SQL
UPDATE alerts
SET telegram_error = '${ERROR_MSG}'
WHERE id = $ALERT_ID;
SQL
)
    ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$UPDATE_ALERT\"" > /dev/null
    continue
  fi

  echo -e "${GREEN}✅ Sent! Message ID: $MESSAGE_ID${NC}"

  # Update alert in PostgreSQL as sent
  UPDATE_ALERT=$(cat << SQL
UPDATE alerts
SET
  telegram_sent = TRUE,
  telegram_message_id = $MESSAGE_ID,
  telegram_sent_at = NOW(),
  telegram_error = NULL
WHERE id = $ALERT_ID;
SQL
)

  ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$UPDATE_ALERT\"" > /dev/null
done <<< "$UNSENT_ALERTS"

echo ""
echo -e "${GREEN}✅ Telegram notifier complete${NC}"
