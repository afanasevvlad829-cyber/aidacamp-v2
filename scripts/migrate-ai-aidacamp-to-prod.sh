#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# migrate-ai-aidacamp-to-prod.sh — перевести whoami-авторизацию ai.aidacamp.ru
# с dev-сервиса (4181) на прод-сервис (4185).
#
# Хвост после миграции портала (2026-05-31): ai.aidacamp.ru для авторизации
# ходит на /api/portal/whoami через 4181 (aidacamp-dev). Безопасно (БД и
# PORTAL_SESSION_SECRET общие), но для чистоты переводим на прод.
#
# Запуск владельцем на сервере:
#   bash scripts/migrate-ai-aidacamp-to-prod.sh --check
#   bash scripts/migrate-ai-aidacamp-to-prod.sh
#   bash scripts/migrate-ai-aidacamp-to-prod.sh --rollback
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SSH_HOST="${SSH_HOST:-root@159.194.223.55}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/aidacamp_prod}"
SSH="ssh -i $SSH_KEY $SSH_HOST"
CONF="/etc/nginx/sites-enabled/ai-aidacamp.conf"
PROD_PORT="${PROD_PORT:-4185}"

case "${1:-}" in
  --check)
    echo "▶ ai-aidacamp.conf: текущие proxy_pass на whoami"
    $SSH "grep -nE 'proxy_pass.*418' $CONF || echo 'нет ссылок на 418x'"
    ;;
  --rollback)
    echo "▶ Откат ai.aidacamp на 4181"
    $SSH "test -f ${CONF}.bak-prod && cp ${CONF}.bak-prod $CONF && nginx -t && systemctl reload nginx && echo OK || echo 'нет бэкапа'"
    ;;
  "")
    echo "▶ Перевод ai.aidacamp whoami → $PROD_PORT"
    $SSH "bash -s" <<REMOTE
set -e
cp $CONF ${CONF}.bak-prod
sed -i 's#proxy_pass http://127.0.0.1:4181#proxy_pass http://127.0.0.1:$PROD_PORT#g' $CONF
nginx -t
systemctl reload nginx
echo '  ✅ ai.aidacamp переключён на $PROD_PORT (бэкап: ${CONF}.bak-prod)'
REMOTE
    echo "Проверь вход на ai.aidacamp.ru. Откат: $0 --rollback"
    ;;
  *) echo "Использование: $0 [--check|--rollback]"; exit 1 ;;
esac
