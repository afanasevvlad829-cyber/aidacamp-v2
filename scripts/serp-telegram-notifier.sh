#!/bin/bash

# SERP CTR Monitoring — Telegram Notifications
# Sends alerts to Telegram every 15 minutes
# Runs as cron job

set -e

# Configuration
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"  # Set via environment or .env
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"      # Set via environment or .env
DB_HOST="159.194.223.55"
DB_NAME="aidacamp"
DB_USER="postgres"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo -e "${RED}❌ ERROR: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set${NC}"
  exit 1
fi

CURRENT_DATE=$(date +%Y-%m-%d)
CURRENT_TIME=$(date +%H:%M:%S)

echo "=========================================="
echo "📱 SERP CTR Telegram Notifier — $CURRENT_DATE $CURRENT_TIME"
echo "=========================================="

# SSH connection helper
query_db() {
  local sql="$1"
  ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -t -c \"$sql\"" 2>/dev/null | grep -v '^[[:space:]]*$'
}

# Get recent alerts (last 30 minutes)
echo -e "\n${BLUE}Checking for new alerts...${NC}"

RECENT_ALERTS=$(query_db "
  SELECT id, metric, old_value, new_value, change_pct, alert_level, message
  FROM alerts
  WHERE created_at >= NOW() - INTERVAL '30 minutes'
  AND telegram_sent = false
  ORDER BY created_at DESC
  LIMIT 10
")

if [ -z "$RECENT_ALERTS" ]; then
  echo -e "${GREEN}✅ No new alerts to send${NC}"
  exit 0
fi

echo "Found $(echo "$RECENT_ALERTS" | wc -l) new alerts"

# Send each alert to Telegram
while IFS='|' read -r ALERT_ID METRIC OLD_VAL NEW_VAL CHANGE_PCT ALERT_LEVEL MESSAGE; do
  # Trim whitespace
  ALERT_ID=$(echo "$ALERT_ID" | xargs)
  METRIC=$(echo "$METRIC" | xargs)
  OLD_VAL=$(echo "$OLD_VAL" | xargs)
  NEW_VAL=$(echo "$NEW_VAL" | xargs)
  CHANGE_PCT=$(echo "$CHANGE_PCT" | xargs)
  ALERT_LEVEL=$(echo "$ALERT_LEVEL" | xargs)
  MESSAGE=$(echo "$MESSAGE" | xargs)

  # Skip empty lines
  [ -z "$ALERT_ID" ] && continue

  # Format emoji based on alert level
  case "$ALERT_LEVEL" in
    critical)
      EMOJI="🚨"
      STATUS="КРИТИЧНО"
      ;;
    warning)
      EMOJI="⚠️"
      STATUS="ВНИМАНИЕ"
      ;;
    *)
      EMOJI="ℹ️"
      STATUS="ИНФОРМАЦИЯ"
      ;;
  esac

  # Build message
  TELEGRAM_MESSAGE="${EMOJI} *${STATUS}*

📊 Метрика: \`${METRIC}\`
📉 Изменение: \`${CHANGE_PCT}%\`
💬 ${MESSAGE}

🕐 ${CURRENT_TIME}"

  echo -e "\n${BLUE}Sending alert #$ALERT_ID to Telegram...${NC}"

  # Send to Telegram
  CURL_RESPONSE=$(curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{
      \"chat_id\": \"${TELEGRAM_CHAT_ID}\",
      \"text\": \"${TELEGRAM_MESSAGE}\",
      \"parse_mode\": \"Markdown\"
    }")

  # Check if message was sent successfully
  if echo "$CURL_RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Message sent${NC}"

    # Update alerts table
    UPDATE_ALERT="UPDATE alerts SET telegram_sent = true WHERE id = $ALERT_ID;"
    ssh -i ~/.ssh/aidacamp_prod root@$DB_HOST "psql -U postgres -d $DB_NAME -c \"$UPDATE_ALERT\"" > /dev/null
    echo "Updated database"
  else
    echo -e "${RED}❌ Failed to send message${NC}"
    echo "Response: $CURL_RESPONSE"
  fi
done <<< "$RECENT_ALERTS"

echo ""
echo -e "${GREEN}✅ Telegram notifier complete${NC}"
