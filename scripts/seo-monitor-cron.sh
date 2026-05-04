#!/bin/bash
# SEO Daily Monitor — запуск в 07:00 каждый день
# Установка:
# crontab -e
# Добавить строку:
# 0 7 * * * /Users/vladimirafanasev/Aidacamp-cloude/scripts/seo-monitor-cron.sh >> /Users/vladimirafanasev/Aidacamp-cloude/_notes/SEO/logs/cron.log 2>&1

cd /Users/vladimirafanasev/Aidacamp-cloude

# Проверяем переменные окружения
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "⚠️  TELEGRAM_BOT_TOKEN не установлен"
fi

if [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "⚠️  TELEGRAM_CHAT_ID не установлен"
fi

# Запускаем скрипт
echo "$(date '+%Y-%m-%d %H:%M:%S') — Запуск SEO Daily Monitor"
python3 scripts/seo-daily-monitor.py

if [ $? -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') — ✅ Успешно завершено"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') — ❌ Ошибка выполнения"
    exit 1
fi
