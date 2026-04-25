"""common/telegram.py — отправка сообщений в Telegram.

Переиспользуется во всех скриптах.
"""
import json
import os
import urllib.request


def _bot_token() -> str:
    return os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()


def _default_chat() -> str:
    return os.environ.get("DAILY_DIGEST_CHAT_ID", "244314247").strip()


def tg_send(text: str, chat_id: str | None = None, parse_mode: str = "Markdown") -> bool:
    """Отправляет текстовое сообщение в Telegram. Возвращает True при успехе."""
    token = _bot_token()
    if not token:
        print("tg_send: no BOT_TOKEN")
        return False
    chat = chat_id or _default_chat()
    payload = {"chat_id": chat, "text": text, "parse_mode": parse_mode}
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
        if not resp.get("ok"):
            print(f"tg_send err: {resp}")
            return False
        return True
    except Exception as e:
        print(f"tg_send exc: {e}")
        return False


def tg_photo(photo_url: str, caption: str = "", chat_id: str | None = None) -> bool:
    """Отправляет фото по URL."""
    token = _bot_token()
    if not token:
        return False
    chat = chat_id or _default_chat()
    payload = {"chat_id": chat, "photo": photo_url, "caption": caption, "parse_mode": "Markdown"}
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendPhoto",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
        return resp.get("ok", False)
    except Exception as e:
        print(f"tg_photo exc: {e}")
        return False


def fmt(n) -> str:
    """Форматирует число с пробелами: 30000 → '30 000'."""
    return f"{int(n):,}".replace(",", " ")
