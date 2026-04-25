#!/usr/bin/env python3
"""VK Token Refresh — ежедневное обновление myTarget OAuth-токена.

Токен живёт 24 ч. Обновляем через refresh_token (не через client_credentials —
у нас ограниченный лимит: tokens_left отслеживается).

Cron: 0 2 * * *   (каждую ночь в 02:00 UTC = 05:00 МСК)
Деплой: /opt/aidacamp-tools/vk_token_refresh.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common.env import load_env
from common.vk import vk_refresh_token, vk_ensure_token
from common.telegram import tg_send

load_env()

NOTIFY = "--notify" in sys.argv   # --notify → слать TG при ошибке


def main():
    print("VK Token Refresh: checking...")
    ok = vk_ensure_token()   # сначала проверим — может ещё валиден
    if ok:
        print("✅ token still valid")
        return

    print("Token expired, refreshing via refresh_token...")
    ok = vk_refresh_token()
    if ok:
        print("✅ VK token refreshed successfully")
    else:
        msg = "🔴 VK Token Refresh FAILED — реклама VK не мониторится!"
        print(msg)
        if NOTIFY:
            tg_send(msg)
        sys.exit(1)


if __name__ == "__main__":
    main()
