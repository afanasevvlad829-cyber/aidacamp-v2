#!/bin/bash
# Deploy Portal Audit Dashboard to production server

set -e

echo "🚀 Deploying Portal Audit Dashboard..."

# Configuration
SERVER="root@159.194.223.55"
SSH_KEY="~/.ssh/aidacamp_prod"
REMOTE_SCRIPT_DIR="/opt/scripts"

# 1. Copy executor script to server
echo "📤 Uploading executor script..."
scp -i "$SSH_KEY" \
  "$(dirname "$0")/run-parallel-audit.sh" \
  "$SERVER:$REMOTE_SCRIPT_DIR/"

# 2. Make executable
echo "🔐 Setting permissions..."
ssh -i "$SSH_KEY" "$SERVER" \
  "chmod +x $REMOTE_SCRIPT_DIR/run-parallel-audit.sh && \
   mkdir -p /tmp/portal-audit-runs && \
   chmod 777 /tmp/portal-audit-runs"

# 3. Verify installation
echo "✅ Verifying installation..."
ssh -i "$SSH_KEY" "$SERVER" \
  "ls -la $REMOTE_SCRIPT_DIR/run-parallel-audit.sh && \
   echo '✓ Script installed' && \
   ls -la /tmp/portal-audit-runs && \
   echo '✓ Audit directory ready'"

# 4. Build frontend
echo "🏗️  Building frontend..."
npm run build

# 5. Deploy to dev server
echo "📮 Deploying to dev.aidacamp.ru..."
ssh -i "$SSH_KEY" "$SERVER" \
  "mkdir -p /var/www/aidacamp-dev"

rsync -avz -e "ssh -i $SSH_KEY" \
  dist/client/* \
  "$SERVER:/var/www/aidacamp-dev/"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎯 Dashboard available at:"
echo "   https://dev.aidacamp.ru/admin/portal-audit"
echo ""
echo "📖 Setup guide: PORTAL_AUDIT_SETUP.md"
