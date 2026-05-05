#!/bin/bash

##############################################################################
# SERP A/B Testing: Automated Revert on Critical Alerts
# Runs every 30 minutes via cron: */30 * * * *
#
# Workflow:
# 1. Query alerts table for action_taken = 'auto_revert_triggered'
# 2. For each alert, execute git revert of the failed deployment
# 3. Push reverted commit to origin/dev
# 4. Update alert to action_taken = 'auto_revert_executed'
# 5. Trigger deployment: ./scripts/deploy.sh dev
# 6. Log result to revert_history table
##############################################################################

set -e  # Exit on any error

# Configuration
REPO_DIR="/Users/vladimirafanasev/Aidacamp-cloude"
LOG_FILE="/var/log/aidacamp-auto-revert.log"
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

# Notification function
notify() {
    local level=$1
    local msg=$2

    if [[ -z "$TELEGRAM_BOT_TOKEN" ]] || [[ -z "$TELEGRAM_CHAT_ID" ]]; then
        return
    fi

    local emoji="ℹ️"
    [[ "$level" == "ERROR" ]] && emoji="❌"
    [[ "$level" == "SUCCESS" ]] && emoji="✅"
    [[ "$level" == "WARNING" ]] && emoji="⚠️"

    local text="${emoji} [Auto-Revert] ${msg}"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="$text" \
        -d parse_mode="HTML" \
        >/dev/null 2>&1 || true
}

# Query database
query_db() {
    local sql="$1"
    psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -A -t -c "$sql" 2>/dev/null || echo ""
}

# Main logic
main() {
    log "INFO" "🔄 Auto-revert check started"

    cd "$REPO_DIR"

    # Fetch latest from remote
    git fetch origin dev 2>/dev/null || true

    # Query alerts with action_taken = 'auto_revert_triggered'
    local alerts=$(query_db "
        SELECT id, commit_hash, ctr_drop, conversions_drop
        FROM alerts
        WHERE action_taken = 'auto_revert_triggered'
        ORDER BY created_at DESC
        LIMIT 5
    ")

    if [[ -z "$alerts" ]]; then
        log "INFO" "✅ No critical alerts requiring revert"
        return 0
    fi

    # Process each alert
    while IFS='|' read -r alert_id commit_hash ctr_drop conversions_drop; do
        log "INFO" "🎯 Processing alert #${alert_id}: revert commit ${commit_hash:0:8}"

        # Check if commit exists
        if ! git rev-parse --quiet --verify "$commit_hash^{commit}" >/dev/null 2>&1; then
            log "ERROR" "❌ Commit ${commit_hash:0:8} not found in repository"
            query_db "UPDATE alerts SET action_taken = 'revert_failed', notes = 'Commit not found' WHERE id = $alert_id" >/dev/null
            notify "ERROR" "Alert #${alert_id}: Commit ${commit_hash:0:8} not found"
            continue
        fi

        # Execute revert
        if git revert --no-edit "$commit_hash" 2>&1 | tee -a "$LOG_FILE"; then
            log "SUCCESS" "✅ Git revert successful for commit ${commit_hash:0:8}"

            # Push reverted commit
            if git push origin dev 2>&1 | tee -a "$LOG_FILE"; then
                log "SUCCESS" "✅ Pushed revert to origin/dev"

                # Update alert status
                query_db "
                    UPDATE alerts
                    SET action_taken = 'auto_revert_executed',
                        executed_at = NOW()
                    WHERE id = $alert_id
                " >/dev/null

                # Insert into revert_history
                query_db "
                    INSERT INTO revert_history (alert_id, commit_hash, status, deployed_at)
                    VALUES ($alert_id, '$commit_hash', 'success', NOW())
                " >/dev/null

                # Trigger deployment
                log "INFO" "📦 Triggering deployment to dev..."
                if bash "$REPO_DIR/scripts/deploy.sh" dev 2>&1 | tee -a "$LOG_FILE"; then
                    log "SUCCESS" "✅ Deployment completed successfully"
                    notify "SUCCESS" "Alert #${alert_id}: Revert deployed. CTR↓${ctr_drop}%, Conv↓${conversions_drop}%"
                else
                    log "ERROR" "❌ Deployment failed"
                    notify "ERROR" "Alert #${alert_id}: Revert failed during deployment"
                fi
            else
                log "ERROR" "❌ Failed to push revert to origin/dev"
                notify "ERROR" "Alert #${alert_id}: Failed to push revert"
            fi
        else
            log "ERROR" "❌ Git revert failed for commit ${commit_hash:0:8}"
            query_db "UPDATE alerts SET action_taken = 'revert_failed' WHERE id = $alert_id" >/dev/null
            notify "ERROR" "Alert #${alert_id}: Revert execution failed"
        fi
    done <<< "$alerts"

    log "INFO" "✅ Auto-revert check completed"
}

# Execution
main "$@"
