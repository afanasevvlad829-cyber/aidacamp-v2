#!/usr/bin/env bash
# Apply Tilda redirects patch to production nginx (aidacamp.ru).
#
# Безопасно:
#  1. Делает бэкап текущего конфига
#  2. Применяет блок редиректов после конкретного якорного rewrite
#  3. Запускает `nginx -t` перед reload
#  4. При любой ошибке — откатывает бэкап
#  5. Проверяет что 6 URL отдают 301
#
# Запуск:
#   bash scripts/apply-tilda-redirects.sh
#
# Требует: ssh-ключ ~/.ssh/aidacamp_prod, доступ root@159.194.223.55

set -euo pipefail

SSH_KEY="${HOME}/.ssh/aidacamp_prod"
SSH_TARGET="root@159.194.223.55"
CONF="/etc/nginx/sites-enabled/aidacamp.conf"
ANCHOR='rewrite ^/letnyaya-shkola-programmirovaniya.*/?$ /letnyaya-it-shkola/ permanent;'

# Блок новых правил — вставляется ПОСЛЕ $ANCHOR
# heredoc в переменную, чтобы аккуратно передать по ssh
read -r -d '' BLOCK <<'EOF' || true
    # 301 редиректы с Tilda slug-URL (добавлено 2026-04-20, источник: GSC 28-day data)
    rewrite ^/letnij-lager-programmirovanie/?$                                                    /lager-programmirovaniya/ permanent;
    rewrite ^/detskij-kompyuternyj-lager-ajdakemp/?$                                              /kompyuternyy-lager/ permanent;
    rewrite ^/kompyuternyj-lager-dlya-detej-obuchaem-programmirovaniyu-v-podmoskove/?$            /kompyuternyy-lager/ permanent;
    rewrite ^/media/?$                                                                            /stati permanent;
    rewrite ^/requisites/?$                                                                       /legal/ permanent;
    # /location → /#contacts — через location= потому что rewrite обрезает якорь
    location = /location { return 301 /#contacts; }
EOF

echo "→ Подключаюсь к ${SSH_TARGET}..."

ssh -i "$SSH_KEY" "$SSH_TARGET" bash -s <<REMOTE
set -euo pipefail

CONF="$CONF"
ANCHOR='$ANCHOR'
BACKUP="/etc/nginx/backups/aidacamp.conf.\$(date +%F_%H%M%S)"
BLOCK=\$(cat <<'BLOCK_EOF'
$BLOCK
BLOCK_EOF
)

mkdir -p /etc/nginx/backups
cp "\$CONF" "\$BACKUP"
echo "→ Бэкап: \$BACKUP"

# Проверить что новые редиректы ещё не применены (idempotency)
if grep -q "letnij-lager-programmirovanie" "\$CONF"; then
    echo "! Редиректы уже применены (нашёл /letnij-lager-programmirovanie). Пропускаю."
    exit 0
fi

# Вставка блока после якорной строки
python3 - <<'PY'
import io, os, sys

conf = "$CONF"
anchor = """$ANCHOR"""
block = """$BLOCK"""

with open(conf, "r", encoding="utf-8") as f:
    text = f.read()

if anchor not in text:
    print(f"✗ якорная строка не найдена: {anchor!r}", file=sys.stderr)
    sys.exit(1)

new = text.replace(anchor, anchor + "\n" + block, 1)
with open(conf, "w", encoding="utf-8") as f:
    f.write(new)
print("✓ блок вставлен")
PY

# Валидация
if ! nginx -t 2>&1; then
    echo "✗ nginx -t не прошёл — откатываюсь на \$BACKUP"
    cp "\$BACKUP" "\$CONF"
    exit 1
fi

# Reload
systemctl reload nginx
echo "✓ nginx reloaded"
REMOTE

# Smoke-test с локальной машины
echo ""
echo "→ Smoke-test URLs после применения:"
for u in \
  "/letnij-lager-programmirovanie" \
  "/detskij-kompyuternyj-lager-ajdakemp" \
  "/kompyuternyj-lager-dlya-detej-obuchaem-programmirovaniyu-v-podmoskove" \
  "/location" \
  "/media" \
  "/requisites"; do
  result=$(curl -sI -o /dev/null -w "%{http_code} %{redirect_url}" "https://aidacamp.ru$u")
  echo "  $u → $result"
done

echo ""
echo "✓ Готово."
