#!/usr/bin/env python3
"""
Kaizen Deploy Listener — ждёт 6 часов или команды в TG,
затем авто-деплоит улучшение в прод.

Команды:
  /cancel_kaizen  — отменить, изменения остаются на dev
  /deploy_kaizen  — выкатить в прод немедленно
  /status_kaizen  — что ждёт деплоя
"""

import os, json, time, subprocess, urllib.request
from datetime import datetime, timedelta
import psycopg2

TG_BOT    = "8619240142:AAEZluPyzdCTDNEiRFSLt7I8Ka4dC8ntfHc"
TG_CHAT   = "244314247"
REPO_DIR  = "/Users/vladimirafanasev/Aidacamp-cloude"
DB        = "postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp"
PENDING   = "/tmp/kaizen_pending.json"
AUTO_HOURS= 6   # Автодеплой через N часов без отмены
LOG       = f"{REPO_DIR}/logs/seo-kaizen-listener.log"

def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def tg(text):
    body = json.dumps({
        "chat_id": TG_CHAT,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TG_BOT}/sendMessage",
        data=body, headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        log(f"TG error: {e}")

def tg_get_updates(offset=0):
    url = (f"https://api.telegram.org/bot{TG_BOT}/getUpdates"
           f"?offset={offset}&timeout=30&allowed_updates=[\"message\"]")
    try:
        with urllib.request.urlopen(url, timeout=35) as r:
            return json.loads(r.read())
    except Exception:
        return {"ok": False, "result": []}

def deploy_prod():
    log("Деплой в прод...")
    r = subprocess.run(
        ["./scripts/deploy.sh", "prod"],
        capture_output=True, text=True, cwd=REPO_DIR, timeout=120
    )
    return r.returncode == 0, r.stderr[-300:] if r.returncode != 0 else ""

def mark_deployed(kaizen_id):
    try:
        conn = psycopg2.connect(DB)
        cur  = conn.cursor()
        cur.execute(
            "UPDATE seo_kaizen_log SET status='deployed_prod' WHERE id=%s",
            (kaizen_id,)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        log(f"DB update error: {e}")

def mark_cancelled(kaizen_id):
    try:
        conn = psycopg2.connect(DB)
        cur  = conn.cursor()
        cur.execute(
            "UPDATE seo_kaizen_log SET status='cancelled' WHERE id=%s",
            (kaizen_id,)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        log(f"DB update error: {e}")

def main():
    log("=== Kaizen Deploy Listener запущен ===")

    # Читаем pending
    if not os.path.exists(PENDING):
        log("Нет /tmp/kaizen_pending.json, выходим")
        return
    with open(PENDING) as f:
        pending = json.load(f)

    kaizen_id = pending.get("kaizen_id")
    url       = pending.get("url", "?")
    summary   = pending.get("summary", "")
    action    = pending.get("action", "")
    deadline  = datetime.now() + timedelta(hours=AUTO_HOURS)

    log(f"Pending: id={kaizen_id}, url={url}, deadline={deadline.strftime('%H:%M')}")
    tg(f"⏱ <b>Кайдзен</b>: улучшение <code>{url}</code> автоматически выкатится в прод в "
       f"{deadline.strftime('%H:%M')}.\nОтменить: /cancel_kaizen")

    offset = 0

    while datetime.now() < deadline:
        data = tg_get_updates(offset)
        if not data.get("ok"):
            time.sleep(10)
            continue

        for upd in data.get("result", []):
            offset = upd["update_id"] + 1
            msg    = upd.get("message", {})
            chat   = str(msg.get("chat", {}).get("id", ""))
            text   = msg.get("text", "").strip()

            if chat != TG_CHAT:
                continue

            if text == "/cancel_kaizen":
                log("Деплой отменён")
                mark_cancelled(kaizen_id)
                tg(f"❌ Кайдзен отменён. Изменения в <code>{url}</code> остались на dev.\n"
                   f"Задеплоить вручную: /deploy_kaizen")
                os.remove(PENDING)
                return

            elif text == "/deploy_kaizen":
                log("Ручной деплой по команде")
                ok, err = deploy_prod()
                if ok:
                    mark_deployed(kaizen_id)
                    tg(f"🚀 <b>Кайдзен задеплоен в прод!</b>\n"
                       f"<code>{url}</code> — {summary}\n"
                       f"https://aidacamp.ru{url}")
                else:
                    tg(f"❌ Ошибка деплоя:\n<code>{err}</code>")
                os.remove(PENDING)
                return

            elif text == "/status_kaizen":
                mins_left = int((deadline - datetime.now()).total_seconds() / 60)
                tg(f"⏳ <b>Кайдзен ждёт деплоя</b>\n"
                   f"Страница: <code>{url}</code>\n"
                   f"Действие: {action}\n"
                   f"<i>{summary}</i>\n"
                   f"Авто-деплой через {mins_left} мин.\n"
                   f"Отменить: /cancel_kaizen | Срочно: /deploy_kaizen")

    # Дедлайн — авто-деплой
    log(f"Дедлайн {AUTO_HOURS}ч — авто-деплой в прод")
    tg(f"🤖 <b>Кайдзен: авто-деплой в прод</b>\n<code>{url}</code>")
    ok, err = deploy_prod()
    if ok:
        mark_deployed(kaizen_id)
        tg(f"✅ <b>Кайдзен в проде!</b>\n"
           f"<code>{url}</code> — {summary}\n"
           f"Ключ поднимется в течение 1-2 недель 📈\n"
           f"https://aidacamp.ru{url}")
    else:
        tg(f"❌ Авто-деплой упал:\n<code>{err}</code>\n"
           f"Задеплойте вручную: <code>cd ~/Aidacamp-cloude && ./scripts/deploy.sh prod</code>")

    if os.path.exists(PENDING):
        os.remove(PENDING)
    log("Listener завершён")


if __name__ == "__main__":
    main()
