#!/bin/bash
# Установить и запустить systemd сервис Aidacamp Hub

set -e

SERVICE_FILE="/opt/aidacamp-hub/systemd/aidacamp-hub.service"
SYSTEMD_DIR="/etc/systemd/system"
ENV_FILE="/opt/aidacamp-hub/.env"

echo "Установка Aidacamp Hub API Service..."

# Проверить наличие .env
if [ ! -f "$ENV_FILE" ]; then
  echo "Файл .env не найден. Копирую из .env.example..."
  cp /opt/aidacamp-hub/.env.example "$ENV_FILE"
  echo "Отредактируй $ENV_FILE перед запуском сервиса!"
fi

# Установить npm зависимости
echo "Устанавливаю npm зависимости..."
cd /opt/aidacamp-hub
npm install --production 2>/dev/null || echo "npm install: некоторые пакеты могут уже быть установлены"

# Скопировать unit файл
cp "$SERVICE_FILE" "$SYSTEMD_DIR/aidacamp-hub.service"
echo "Скопирован: $SYSTEMD_DIR/aidacamp-hub.service"

# Перезагрузить systemd и включить сервис
systemctl daemon-reload
systemctl enable aidacamp-hub
echo "Сервис включён в автозапуск"

# Создать директории для логов
mkdir -p /var/log/aidacamp
echo "Директория логов создана: /var/log/aidacamp"

echo ""
echo "Чтобы запустить сервис:"
echo "   systemctl start aidacamp-hub"
echo "   systemctl status aidacamp-hub"
echo "   journalctl -u aidacamp-hub -f"
