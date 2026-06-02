#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# МИГРАЦИЯ: развести dev и prod портала
#
# ПРОБЛЕМА (на 2026-05-31):
#   aidacamp.ru/portal (боевой) ходит через nginx на порт 4181, который
#   обслуживает сервис aidacamp-dev из папки /var/www/aidacamp-dev/current.
#   То есть боевой портал физически работает на DEV-инфраструктуре.
#   Любой деплой на dev меняет боевой портал. deploy.sh prod кладёт код в
#   /var/www/aidacamp/current, которую портал НЕ читает.
#
# ЦЕЛЬ:
#   aidacamp.ru/portal  → новый сервис aidacamp-prod → /var/www/aidacamp/current
#   dev.aidacamp.ru     → остаётся aidacamp-dev      → /var/www/aidacamp-dev/current
#   БД — ОДНА ОБЩАЯ (тот же AIDAPLUS_PG_DSN), данные детей/смен/рублей едины.
#
# БЕЗОПАСНОСТЬ:
#   - Скрипт идемпотентный: повторный запуск не ломает.
#   - Делает бэкап nginx-конфига перед правкой.
#   - Откат одной командой (см. --rollback внизу).
#   - НИЧЕГО не удаляет. Старый порт 4181 продолжает работать.
#
# ЗАПУСК (только владельцем, на сервере или через ssh):
#   bash scripts/migrate-portal-prod-split.sh          # выполнить миграцию
#   bash scripts/migrate-portal-prod-split.sh --check   # только проверить состояние
#   bash scripts/migrate-portal-prod-split.sh --rollback # вернуть как было
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SSH_HOST="${SSH_HOST:-root@159.194.223.55}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/aidacamp_prod}"
SSH="ssh -i $SSH_KEY $SSH_HOST"

PROD_PORT="${PROD_PORT:-4185}"          # новый порт для прод-портала
PROD_DIR="/var/www/aidacamp/current"     # прод рабочая папка
DEV_UNIT="/etc/systemd/system/aidacamp-dev.service"
PROD_UNIT="/etc/systemd/system/aidacamp-prod.service"
NGINX_CONF="/etc/nginx/sites-enabled/aidacamp.conf"

step() { echo ""; echo "▶ $*"; }
ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠️  $*"; }

# ─── CHECK ──────────────────────────────────────────────────────────────────
do_check() {
  step "Текущее состояние"
  echo "--- кто слушает 4181 (сейчас обслуживает прод-портал) ---"
  $SSH "ss -tlnp | grep ':4181' || echo 'никто'"
  echo "--- кто слушает $PROD_PORT (целевой прод-порт) ---"
  $SSH "ss -tlnp | grep ':$PROD_PORT' || echo 'свободен'"
  echo "--- nginx: куда идёт /portal/ ---"
  $SSH "grep -nE 'location.*(portal|/p/)|proxy_pass' $NGINX_CONF | grep -iE 'portal|/p/|418' || true"
  echo "--- aidacamp-prod существует? ---"
  $SSH "systemctl is-enabled aidacamp-prod 2>/dev/null || echo 'нет юнита aidacamp-prod'"
  echo "--- методички в прод-папке? ---"
  $SSH "grep -l konkurs-zayavi-svoyu-komnatu $PROD_DIR/server/chunks/portalActivities_*.mjs 2>/dev/null && echo ЕСТЬ || echo НЕТ"
}

# ─── MIGRATE ────────────────────────────────────────────────────────────────
do_migrate() {
  step "1/5 Проверка: в прод-папке есть свежий SSR-бандл"
  $SSH "test -f $PROD_DIR/server/entry.mjs" || { echo "❌ Нет $PROD_DIR/server/entry.mjs — сначала задеплой прод-код: deploy.sh prod"; exit 1; }
  ok "прод-бандл на месте"

  step "2/5 Создаю systemd-юнит aidacamp-prod (порт $PROD_PORT, прод-папка, общая БД)"
  # Берём dev-юнит как образец, меняем WorkingDirectory/PORT/ExecStart/Description.
  # EnvironmentFile берём dev-овский — там тот же AIDAPLUS_PG_DSN (БД общая).
  $SSH "bash -s" <<REMOTE
set -e
DEV_ENVFILE=\$(grep -oP '(?<=EnvironmentFile=)\S+' $DEV_UNIT | head -1)
NODE_BIN=\$(grep -oP '(?<=ExecStart=)\S+' $DEV_UNIT | head -1)
cat > $PROD_UNIT <<UNIT
[Unit]
Description=AidaCamp PROD Astro Node Server (portal)
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROD_DIR
EnvironmentFile=\$DEV_ENVFILE
Environment=HOST=127.0.0.1
Environment=PORT=$PROD_PORT
ExecStart=\$NODE_BIN $PROD_DIR/server/entry.mjs
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable aidacamp-prod
systemctl restart aidacamp-prod
sleep 2
systemctl is-active aidacamp-prod
REMOTE
  ok "aidacamp-prod создан и запущен на порту $PROD_PORT"

  step "3/5 Health-check прод-сервиса на $PROD_PORT"
  $SSH "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PROD_PORT/portal/metodichki" | grep -qE '200|302' \
    && ok "прод-портал отвечает на $PROD_PORT" \
    || { echo "❌ прод-сервис не отвечает — НЕ переключаю nginx. Откат: systemctl stop aidacamp-prod"; exit 1; }

  step "4/5 Бэкап nginx и переключение /portal/ → $PROD_PORT"
  $SSH "bash -s" <<REMOTE
set -e
cp $NGINX_CONF ${NGINX_CONF}.bak-prod-split
# Меняем proxy_pass только в блоках портала (4181 → $PROD_PORT) внутри aidacamp.conf
sed -i 's#proxy_pass http://127.0.0.1:4181#proxy_pass http://127.0.0.1:$PROD_PORT#g' $NGINX_CONF
nginx -t
systemctl reload nginx
REMOTE
  ok "nginx переключён на прод-сервис (бэкап: ${NGINX_CONF}.bak-prod-split)"

  step "5/5 Финальная проверка"
  $SSH "curl -s -o /dev/null -w 'aidacamp.ru/portal → HTTP %{http_code}\n' https://aidacamp.ru/portal/metodichki"
  echo ""
  echo "✅ МИГРАЦИЯ ЗАВЕРШЕНА"
  echo "   Прод-портал:  aidacamp.ru/portal  → aidacamp-prod  → $PROD_DIR (порт $PROD_PORT)"
  echo "   Dev-портал:   dev.aidacamp.ru     → aidacamp-dev   → /var/www/aidacamp-dev/current (порт 4181)"
  echo "   БД общая. Теперь deploy.sh prod (с фиксом) обновляет именно прод-портал."
}

# ─── ROLLBACK ───────────────────────────────────────────────────────────────
do_rollback() {
  step "Откат: вернуть nginx на старый порт 4181 и остановить aidacamp-prod"
  $SSH "bash -s" <<REMOTE
set -e
if [ -f ${NGINX_CONF}.bak-prod-split ]; then
  cp ${NGINX_CONF}.bak-prod-split $NGINX_CONF
  nginx -t && systemctl reload nginx
  echo '  ✅ nginx восстановлен из бэкапа'
else
  echo '  ⚠️  бэкап nginx не найден — пропускаю'
fi
systemctl stop aidacamp-prod 2>/dev/null && echo '  ✅ aidacamp-prod остановлен' || true
systemctl disable aidacamp-prod 2>/dev/null || true
REMOTE
  echo ""
  echo "✅ ОТКАТ ЗАВЕРШЁН — всё как до миграции (прод-портал снова на 4181/aidacamp-dev)."
}

case "${1:-}" in
  --check)    do_check ;;
  --rollback) do_rollback ;;
  "")         do_check; echo ""; read -rp "Выполнить миграцию? [y/N] " a; [ "$a" = "y" ] && do_migrate || echo "Отменено." ;;
  *)          echo "Использование: $0 [--check|--rollback]"; exit 1 ;;
esac
