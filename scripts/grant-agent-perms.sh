#!/usr/bin/env bash
# Расширяет ~/.claude/settings.json — добавляет allow/deny правила,
# чтобы агент мог делать миграции БД, рестарт сервиса, чтение логов;
# и не мог катить прод/удалять/делать DROP.
#
# Безопасно: создаёт бэкап, мёрджит без дублей, ничего не удаляет.
# Запуск: bash scripts/grant-agent-perms.sh
set -euo pipefail

SETTINGS="$HOME/.claude/settings.json"
BACKUP="$HOME/.claude/settings.json.bak.$(date +%Y%m%d-%H%M%S)"

if ! command -v jq >/dev/null 2>&1; then
  echo "❌ нужен jq. Установи: brew install jq" >&2
  exit 1
fi

# Гарантируем, что файл существует и это валидный JSON-объект
if [ ! -f "$SETTINGS" ]; then
  echo "{}" > "$SETTINGS"
  echo "📝 создал пустой $SETTINGS"
fi

if ! jq empty "$SETTINGS" 2>/dev/null; then
  echo "❌ $SETTINGS не валидный JSON. Не трогаю." >&2
  exit 1
fi

cp "$SETTINGS" "$BACKUP"
echo "💾 бэкап: $BACKUP"

ALLOW=$(cat <<'EOF'
[
  "Bash(scp -i ~/.ssh/aidacamp_prod *:*)",
  "Bash(ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55:*sudo -u postgres psql -d aidacamp -f /tmp/portal-*-migration.sql*)",
  "Bash(ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55:*sudo -u postgres psql -d aidacamp -tAc*)",
  "Bash(ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55:*sudo -u postgres psql -d aidacamp -c*)",
  "Bash(ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55:*systemctl restart aidacamp-dev*)",
  "Bash(ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55:*systemctl status aidacamp-dev*)",
  "Bash(ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55:*journalctl -u aidacamp-dev*)",
  "Bash(ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55:*cat /etc/cron.d/aidacamp-*)",
  "Bash(ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55:*tail*/var/log/aidacamp-*)",
  "Bash(./scripts/deploy.sh dev*)"
]
EOF
)

DENY=$(cat <<'EOF'
[
  "Bash(*deploy.sh prod*)",
  "Bash(*npm install*--prefix /var/www*)",
  "Bash(*npm install*/var/www/aidacamp-dev/current*)",
  "Bash(*rm -rf /*)",
  "Bash(*DROP TABLE*)",
  "Bash(*DROP DATABASE*)",
  "Bash(*TRUNCATE*)",
  "Bash(*DELETE FROM portal_*WHERE 1*)",
  "Bash(*git push*origin main*)",
  "Bash(*git push*--force*)"
]
EOF
)

# Мёрджим — unique union с тем, что уже есть. Создаём ключи, если их нет.
TMP=$(mktemp)
jq \
  --argjson allow "$ALLOW" \
  --argjson deny  "$DENY" \
  '
    .permissions = (.permissions // {})
    | .permissions.allow = ((.permissions.allow // []) + $allow | unique)
    | .permissions.deny  = ((.permissions.deny  // []) + $deny  | unique)
  ' "$SETTINGS" > "$TMP"

mv "$TMP" "$SETTINGS"

# Показать что получилось
ALLOW_COUNT=$(jq '.permissions.allow | length' "$SETTINGS")
DENY_COUNT=$(jq  '.permissions.deny  | length' "$SETTINGS")
echo ""
echo "✅ обновлён $SETTINGS"
echo "   allow: $ALLOW_COUNT правил"
echo "   deny:  $DENY_COUNT правил"
echo ""
echo "Откатить: cp \"$BACKUP\" \"$SETTINGS\""
echo "Перезапусти Claude Code чтобы новые правила подхватились."
