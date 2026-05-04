#!/bin/bash
set -e

# Создать директории для логов
mkdir -p /var/log/aidacamp
touch /var/log/aidacamp/metrica.log /var/log/aidacamp/direct.log \
      /var/log/aidacamp/vk.log /var/log/aidacamp/crm.log

# Загрузить переменные окружения
ENV_FILE="/opt/mcp/.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Aidacamp Hub cron jobs
CRON_MARKER="# aidacamp-hub-sync"
NEW_CRON="${CRON_MARKER}
# Metrica sync -- ежечасно
0 * * * * cd /opt/aidacamp-hub && /usr/bin/node cron/sync-metrica.js >> /var/log/aidacamp/metrica.log 2>&1
# Direct sync -- ежечасно
5 * * * * cd /opt/aidacamp-hub && /usr/bin/node cron/sync-direct.js >> /var/log/aidacamp/direct.log 2>&1
# VK sync -- ежечасно
10 * * * * cd /opt/aidacamp-hub && /usr/bin/node cron/sync-vk.js >> /var/log/aidacamp/vk.log 2>&1
# CRM sync -- ежедневно в полночь
0 0 * * * cd /opt/aidacamp-hub && /usr/bin/node cron/sync-crm.js >> /var/log/aidacamp/crm.log 2>&1
"

# Убрать старые записи и добавить новые
(crontab -l 2>/dev/null | grep -v "${CRON_MARKER}" | grep -v "aidacamp-hub"; echo "${NEW_CRON}") | crontab -

echo "Cron jobs registered:"
crontab -l | grep -E "aidacamp|sync-"
