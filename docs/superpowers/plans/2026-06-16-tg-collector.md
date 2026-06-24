# Telegram Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собирать посты из Telegram-канала `@vroderabotaetno` в таблицу `tg_posts` PostgreSQL через long polling бота `@Vroderabotaet_bot`.

**Architecture:** Один Python-скрипт `/opt/tg-collector/collector.py` работает как systemd-сервис. Long polling через Bot API `getUpdates`, фильтрует `channel_post`, пишет в Postgres через psycopg2. Без внешних зависимостей кроме psycopg2-binary (уже установлен на сервере).

**Tech Stack:** Python 3.12, psycopg2-binary (уже на сервере), Telegram Bot API, PostgreSQL 16, systemd

**Сервер:** `aidacamp` (SSH через MCP `mcp__aidacamp-tools__run`, service="ssh")  
**MCP files:** `mcp__aidacamp-tools__run` service="files" action="write" для записи файлов на сервер  
**Бот:** `@Vroderabotaet_bot`, токен в `/opt/tg-collector/.env`  
**Канал:** `@vroderabotaetno`  
**DB:** `postgresql://aidacamp:<password>@localhost:5432/aidacamp` (из `/opt/aidacamp-hub/.env`)

---

## Файлы

| Файл | Действие | Назначение |
|---|---|---|
| `/opt/tg-collector/.env` | Create | Токены (не в git) |
| `/opt/tg-collector/collector.py` | Create | Весь сервис: DB init, парсинг, polling loop |
| `/opt/tg-collector/test_collector.py` | Create | Юнит-тесты парсинга |
| `/etc/systemd/system/tg-collector.service` | Create | systemd unit |

---

## Task 1: Директория и `.env`

**Files:**
- Create: `/opt/tg-collector/.env`

- [ ] **Step 1: Создать директорию**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "mkdir -p /opt/tg-collector"
})
```

Ожидаем: пустой вывод, нет ошибок.

- [ ] **Step 2: Записать `.env`**

```
mcp__aidacamp-tools__run(service="files", action="write", params={
  "path": "/opt/tg-collector/.env",
  "content": "TELEGRAM_BOT_TOKEN=<токен из BotFather>\nTELEGRAM_CHANNEL=@vroderabotaetno\nDATABASE_URL=<из /opt/aidacamp-hub/.env ключ DATABASE_URL>\n"
})
```

- [ ] **Step 3: Ограничить права**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "chmod 600 /opt/tg-collector/.env && ls -la /opt/tg-collector/"
})
```

Ожидаем: `-rw------- ... .env`

---

## Task 2: Создать `collector.py`

**Files:**
- Create: `/opt/tg-collector/collector.py`

- [ ] **Step 1: Записать файл через MCP files**

```
mcp__aidacamp-tools__run(service="files", action="write", params={
  "path": "/opt/tg-collector/collector.py",
  "content": "<содержимое ниже>"
})
```

Содержимое `collector.py`:

```python
#!/usr/bin/env python3
"""
Telegram channel post collector.
Long-polls Bot API getUpdates and saves channel_post events to Postgres.
"""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

import psycopg2

BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHANNEL = os.environ["TELEGRAM_CHANNEL"]   # e.g. @vroderabotaetno
DATABASE_URL = os.environ["DATABASE_URL"]
API = f"https://api.telegram.org/bot{BOT_TOKEN}"


# ── Database ──────────────────────────────────────────────────────────────────

def init_db(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tg_posts (
                id           SERIAL PRIMARY KEY,
                message_id   INTEGER NOT NULL,
                channel      TEXT NOT NULL,
                posted_at    TIMESTAMPTZ NOT NULL,
                text         TEXT,
                photo_url    TEXT,
                published_to TEXT[] DEFAULT '{}',
                created_at   TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE (message_id, channel)
            )
        """)
    conn.commit()
    print("DB ready")


def save_post(conn, message_id, channel, posted_at, text, photo_url):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO tg_posts (message_id, channel, posted_at, text, photo_url)
            VALUES (%s, %s, to_timestamp(%s), %s, %s)
            ON CONFLICT (message_id, channel) DO NOTHING
        """, (message_id, channel, posted_at, text, photo_url))
    conn.commit()


# ── Parsing ───────────────────────────────────────────────────────────────────

def extract_text(msg):
    """Plain text from message or caption."""
    return msg.get("text") or msg.get("caption") or ""


def get_photo_url(file_id):
    """Resolve Telegram file_id to a public download URL."""
    url = f"{API}/getFile?file_id={file_id}"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read())
        if data.get("ok"):
            path = data["result"]["file_path"]
            return f"https://api.telegram.org/file/bot{BOT_TOKEN}/{path}"
    except Exception as exc:
        print(f"get_photo_url error: {exc}")
    return None


def extract_photo_url(msg):
    """Return URL of largest photo in message, or None."""
    photos = msg.get("photo")
    if not photos:
        return None
    return get_photo_url(photos[-1]["file_id"])


def process_update(conn, update):
    """Save channel_post to DB; silently ignore other update types."""
    msg = update.get("channel_post")
    if not msg:
        return

    chat_username = msg.get("chat", {}).get("username", "")
    if f"@{chat_username}" != CHANNEL:
        return

    message_id = msg["message_id"]
    posted_at = msg["date"]
    text = extract_text(msg)
    photo_url = extract_photo_url(msg)

    save_post(conn, message_id, CHANNEL, posted_at, text, photo_url)
    preview = (text[:60] + "...") if len(text) > 60 else text or "[photo]"
    print(f"[+] id={message_id} {preview}")


# ── Polling loop ──────────────────────────────────────────────────────────────

def poll(conn):
    offset = None
    print(f"Polling {CHANNEL} ...")
    while True:
        try:
            params = {
                "timeout": 30,
                "allowed_updates": json.dumps(["channel_post"]),
            }
            if offset is not None:
                params["offset"] = offset
            url = f"{API}/getUpdates?" + urllib.parse.urlencode(params)

            with urllib.request.urlopen(url, timeout=35) as r:
                data = json.loads(r.read())

            if not data.get("ok"):
                print(f"getUpdates error: {data}")
                time.sleep(5)
                continue

            for upd in data["result"]:
                process_update(conn, upd)
                offset = upd["update_id"] + 1

        except urllib.error.URLError as exc:
            print(f"Network error: {exc} — retry in 5s")
            time.sleep(5)
        except psycopg2.OperationalError as exc:
            print(f"DB reconnect: {exc}")
            time.sleep(5)
            conn = psycopg2.connect(DATABASE_URL)
        except Exception as exc:
            print(f"Unexpected error: {exc} — retry in 5s")
            time.sleep(5)


def main():
    conn = psycopg2.connect(DATABASE_URL)
    init_db(conn)
    poll(conn)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Проверить синтаксис**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "python3 -m py_compile /opt/tg-collector/collector.py && echo OK"
})
```

Ожидаем: `OK`

---

## Task 3: Юнит-тесты парсинга

**Files:**
- Create: `/opt/tg-collector/test_collector.py`

- [ ] **Step 1: Записать тесты через MCP files**

```
mcp__aidacamp-tools__run(service="files", action="write", params={
  "path": "/opt/tg-collector/test_collector.py",
  "content": "<содержимое ниже>"
})
```

Содержимое `test_collector.py`:

```python
import os
import sys
import unittest

# Фиктивные env до импорта collector (он читает их на уровне модуля)
os.environ["TELEGRAM_BOT_TOKEN"] = "fake:token"
os.environ["TELEGRAM_CHANNEL"] = "@vroderabotaetno"
os.environ["DATABASE_URL"] = "postgresql://fake"

sys.path.insert(0, "/opt/tg-collector")
from collector import extract_text, extract_photo_url, process_update


class TestExtractText(unittest.TestCase):
    def test_returns_text_field(self):
        self.assertEqual(extract_text({"text": "Hello"}), "Hello")

    def test_falls_back_to_caption(self):
        self.assertEqual(extract_text({"caption": "Cap"}), "Cap")

    def test_returns_empty_when_no_text(self):
        self.assertEqual(extract_text({"sticker": {}}), "")


class TestExtractPhotoUrl(unittest.TestCase):
    def test_returns_none_when_no_photo_key(self):
        self.assertIsNone(extract_photo_url({"text": "no photo"}))

    def test_returns_none_when_photo_is_none(self):
        self.assertIsNone(extract_photo_url({}))

    def test_returns_none_when_photo_empty_list(self):
        # not photos → True for empty list → returns None before calling get_photo_url
        self.assertIsNone(extract_photo_url({"photo": []}))


class TestProcessUpdate(unittest.TestCase):
    def test_ignores_non_channel_post(self):
        class Boom:
            def cursor(self): raise AssertionError("DB must not be called")
        # No exception → update was ignored correctly
        process_update(Boom(), {"message": {"text": "dm"}})

    def test_ignores_wrong_channel(self):
        class Boom:
            def cursor(self): raise AssertionError("DB must not be called")
        update = {
            "channel_post": {
                "message_id": 1,
                "date": 1700000000,
                "text": "other channel",
                "chat": {"username": "otherchannel"},
            }
        }
        process_update(Boom(), update)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Запустить тесты**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "cd /opt/tg-collector && python3 -m unittest test_collector -v 2>&1"
})
```

Ожидаем:
```
test_falls_back_to_caption (test_collector.TestExtractText) ... ok
test_returns_empty_when_no_text (test_collector.TestExtractText) ... ok
test_returns_text_field (test_collector.TestExtractText) ... ok
test_returns_none_when_no_photo_key (test_collector.TestExtractPhotoUrl) ... ok
test_returns_none_when_photo_empty_list (test_collector.TestExtractPhotoUrl) ... ok
test_returns_none_when_photo_is_none (test_collector.TestExtractPhotoUrl) ... ok
test_ignores_non_channel_post (test_collector.TestProcessUpdate) ... ok
test_ignores_wrong_channel (test_collector.TestProcessUpdate) ... ok

Ran 8 tests in 0.00xs
OK
```

Если тесты падают — исправить `collector.py` и повторить.

---

## Task 4: Создать таблицу `tg_posts`

- [ ] **Step 1: Создать таблицу**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "psql postgresql://aidacamp:<password>@localhost:5432/aidacamp -c \"CREATE TABLE IF NOT EXISTS tg_posts (id SERIAL PRIMARY KEY, message_id INTEGER NOT NULL, channel TEXT NOT NULL, posted_at TIMESTAMPTZ NOT NULL, text TEXT, photo_url TEXT, published_to TEXT[] DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (message_id, channel));\""
})
```

Ожидаем: `CREATE TABLE` или `NOTICE: relation already exists`.

- [ ] **Step 2: Проверить структуру**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "psql postgresql://aidacamp:<password>@localhost:5432/aidacamp -c '\\d tg_posts'"
})
```

Ожидаем: таблица с колонками `id, message_id, channel, posted_at, text, photo_url, published_to, created_at`.

---

## Task 5: systemd unit + запуск сервиса

**Files:**
- Create: `/etc/systemd/system/tg-collector.service`

- [ ] **Step 1: Создать unit-файл**

```
mcp__aidacamp-tools__run(service="files", action="write", params={
  "path": "/etc/systemd/system/tg-collector.service",
  "content": "[Unit]\nDescription=Telegram channel post collector (@vroderabotaetno)\nAfter=network-online.target postgresql.service\n\n[Service]\nWorkingDirectory=/opt/tg-collector\nEnvironmentFile=/opt/tg-collector/.env\nExecStart=/usr/bin/python3 /opt/tg-collector/collector.py\nRestart=always\nRestartSec=5\nStandardOutput=append:/var/log/tg-collector.log\nStandardError=append:/var/log/tg-collector.log\n\n[Install]\nWantedBy=multi-user.target\n"
})
```

- [ ] **Step 2: Включить и запустить**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "systemctl daemon-reload && systemctl enable tg-collector && systemctl start tg-collector"
})
```

- [ ] **Step 3: Проверить статус**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "systemctl status tg-collector --no-pager"
})
```

Ожидаем: `Active: active (running)`.

- [ ] **Step 4: Проверить логи**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "tail -20 /var/log/tg-collector.log"
})
```

Ожидаем:
```
DB ready
Polling @vroderabotaetno ...
```

Если `Active: failed` — смотреть `journalctl -u tg-collector -n 30 --no-pager` для деталей.

---

## Task 6: Smoke test

- [ ] **Step 1: Отправить тестовое сообщение в канал**

Зайти в `@vroderabotaetno` и опубликовать любой пост (например, "Тест коллектора").

- [ ] **Step 2: Подождать 5–10 секунд, проверить DB**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "psql postgresql://aidacamp:<password>@localhost:5432/aidacamp -c \"SELECT message_id, channel, posted_at, left(text,60) as text FROM tg_posts ORDER BY created_at DESC LIMIT 5;\""
})
```

Ожидаем: строка с текстом тестового поста.

- [ ] **Step 3: Проверить лог**

```
mcp__aidacamp-tools__run(service="ssh", action="run", params={
  "host": "aidacamp",
  "command": "tail -5 /var/log/tg-collector.log"
})
```

Ожидаем: `[+] id=NNN Тест коллектора`

---

## Готово

После Task 6 коллектор работает в фоне. Все посты из `@vroderabotaetno` копятся в `tg_posts`.

**Следующий шаг (Фаза 2):** `publisher.py` — читает из `tg_posts` и публикует на vc.ru / VK.
