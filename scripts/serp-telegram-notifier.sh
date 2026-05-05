#!/bin/bash

##############################################################################
# SERP A/B Testing: Telegram Notifications for Alerts
# Runs every 15 minutes via cron: */15 * * * *
#
# Workflow:
# 1. Query alerts table for telegram_sent = false (unsent alerts)
# 2. Format each alert with appropriate emoji and summary
# 3. Send to Telegram using bot API
# 4. Update alert to telegram_sent = true
# 5. Keep history of sent notifications
##############################################################################

set -e  # Exit on any error

# Configuration
REPO_DIR="/Users/vladimirafanasev/Aidacamp-cloude"
LOG_FILE="/var/log/aidacamp-telegram-notifier.log"
DB_HOST="/var/run/postgresql"
DB_NAME="aidacamp"
DB_USER="postgres"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local msg="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${msg}" | tee -a "$LOG_FILE"
}

# Telegram send function
send_telegram() {
    local text="$1"

    if [[ -z "$TELEGRAM_BOT_TOKEN" ]] || [[ -z "$TELEGRAM_CHAT_ID" ]]; then
        log "WARNING" "⚠️ Telegram not configured (missing token or chat ID)"
        return 1
    fi

    local response=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{
            \"chat_id\": \"$TELEGRAM_CHAT_ID\",
            \"text\": \"$text\",
            \"parse_mode\": \"HTML\"
        }" 2>/dev/null)

    if echo "$response" | grep -q '"ok":true'; then
        return 0
    else
        return 1
    fi
}

# Query database
query_db() {
    local sql="$1"
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -A -t -c "$sql" 2>/dev/null || echo ""
}

# Format alert message
format_alert() {
    local alert_id=$1
    local level=$2
    local ctr_drop=$3
    local conversions_drop=$4
    local action_taken=$5
    local timestamp=$6

    local emoji="ℹ️"
    local severity="info"

    if [[ "$level" == "critical" ]]; then
        emoji="🚨"
        severity="<b>CRITICAL</b>"
    elif [[ "$level" == "warning" ]]; then
        emoji="⚠️"
        severity="<b>WARNING</b>"
    fi

    local status_emoji="⏳"
    if [[ "$action_taken" == "auto_revert_triggered" ]]; then
        status_emoji="🔄"
    elif [[ "$action_taken" == "auto_revert_executed" ]]; then
        status_emoji="✅"
    elif [[ "$action_taken" == "manual_review_required" ]]; then
        status_emoji="👁️"
    fi

    local msg="${emoji} Alert #${alert_id} [${severity}]
${status_emoji} Status: ${action_taken}
📉 CTR: ${ctr_drop}%
📉 Conversions: ${conversions_drop}%
🕐 Time: ${timestamp}"

    echo "$msg"
}

# Main logic
main() {
    log "INFO" "📢 Telegram notifier check started"

    # Query unsent alerts (last 30 minutes)
    local alerts=$(query_db "
        SELECT id, level, ctr_drop, conversions_drop, action_taken, created_at
        FROM alerts
        WHERE telegram_sent = false
          AND created_at > NOW() - INTERVAL '30 minutes'
        ORDER BY created_at DESC
    ")

    if [[ -z "$alerts" ]]; then
        log "INFO" "✅ No unsent alerts"
        return 0
    fi

    local count=0
    while IFS='|' read -r alert_id level ctr_drop conversions_drop action_taken created_at; do
        log "INFO" "📤 Preparing notification for alert #${alert_id}"

        # Format message
        local msg=$(format_alert "$alert_id" "$level" "$ctr_drop" "$conversions_drop" "$action_taken" "$created_at")

        # Send to Telegram
        if send_telegram "$msg"; then
            log "SUCCESS" "✅ Alert #${alert_id} sent to Telegram"

            # Mark as sent
            query_db "UPDATE alerts SET telegram_sent = true, telegram_sent_at = NOW() WHERE id = $alert_id" >/dev/null

            ((count++))
        else
            log "ERROR" "❌ Failed to send alert #${alert_id} to Telegram"
        fi
    done <<< "$alerts"

    log "INFO" "✅ Telegram notifier check completed (${count} notifications sent)"
}

# Execution
main "$@"
