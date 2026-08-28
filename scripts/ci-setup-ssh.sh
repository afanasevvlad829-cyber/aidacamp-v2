#!/bin/bash
# Подготовка SSH на GitHub-раннере: приватный ключ + доверие к хосту.
#
# Ожидает переменную окружения SSH_KEY (из secrets.SSH_KEY_PROD).
# Ключ передаётся через env, а не через ${{ secrets }} прямо в скрипт:
# многострочный секрет иначе вклеивается в тело bash-скрипта.
set -euo pipefail

HOST="159.194.223.55"
KEY_PATH="$HOME/.ssh/aidacamp_prod"

if [ -z "${SSH_KEY:-}" ]; then
  echo "::error::Секрет SSH_KEY_PROD не задан."
  echo "Добавь приватный ключ: Settings → Secrets and variables → Actions → SSH_KEY_PROD"
  exit 1
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
printf '%s\n' "$SSH_KEY" > "$KEY_PATH"
chmod 600 "$KEY_PATH"
echo "✅ Ключ записан: $KEY_PATH"

# ── known_hosts ───────────────────────────────────────────────
# ssh-keyscan флапает: дефолтный таймаут 5 с, а сервер после деплоя
# отвечает медленнее (deploy.sh открывает десятки SSH-сессий подряд).
# Инцидент 2026-07-08: keyscan упал ровно через 5 с, `bash -e` уронил шаг,
# и весь деплой встал — при полностью здоровом сервере.
#
# Поэтому: три попытки с увеличенным таймаутом, и keyscan НЕ роняет шаг.
for i in 1 2 3; do
  if ssh-keyscan -T 15 -H "$HOST" >> "$HOME/.ssh/known_hosts" 2>/dev/null; then
    echo "✅ known_hosts заполнен (попытка $i)"
    break
  fi
  echo "⚠️  ssh-keyscan: попытка $i не удалась"
  [ "$i" -lt 3 ] && sleep 5
done

# Страховка на случай, если все три попытки провалились: accept-new
# доверится хосту при первом подключении (а не откажет, как StrictHostKeyChecking=ask).
# Это не ослабляет защиту после первого коннекта: подмена ключа всё так же оборвёт ssh.
cat >> "$HOME/.ssh/config" <<EOF
Host $HOST
  StrictHostKeyChecking accept-new
  ConnectTimeout 20
  ServerAliveInterval 15
  ServerAliveCountMax 4
EOF
chmod 600 "$HOME/.ssh/config"

if [ -s "$HOME/.ssh/known_hosts" ]; then
  echo "✅ SSH готов ($(grep -c . "$HOME/.ssh/known_hosts") записей в known_hosts)"
else
  echo "⚠️  known_hosts пуст — полагаемся на StrictHostKeyChecking=accept-new"
fi
