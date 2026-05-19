#!/usr/bin/env python3
"""
SEO Deploy Listener — ждёт /deploy_seo в TG, деплоит в прод.
Запускается автоматически после seo-auto-improve.sh, живёт 24 часа.
"""
import os, sys, json, time, subprocess, urllib.request, urllib.parse
from datetime import datetime

TG_BOT   = "8619240142:AAEZluPyzdCTDNEiRFSLt7I8Ka4dC8ntfHc"
TG_CHAT  = "244314247"
REPO_DIR = "/Users/vladimirafanasev/Aidacamp-cloude"
TIMEOUT_HOURS = 24
LOG = f"{REPO_DIR}/logs/seo-deploy-listener.log"

def tg_send(text):
    body = json.dumps({"chat_id": TG_CHAT, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TG_BOT}/sendMessage",
        data=body, headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"TG error: {e}")

def tg_get_updates(offset=0):
    url = f"https://api.telegram.org/bot{TG_BOT}/getUpdates?offset={offset}&timeout=30&allowed_updates=[\"message\"]"
    try:
        with urllib.request.urlopen(url, timeout=35) as r:
            return json.loads(r.read())
    except:
        return {"ok": False, "result": []}

def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line)
    with open(LOG, 'a') as f:
        f.write(line + "\n")

def deploy_prod():
    log("Запускаю деплой в прод...")
    result = subprocess.run(
        ["./scripts/deploy.sh", "prod"],
        cwd=REPO_DIR, capture_output=True, text=True
    )
    if result.returncode == 0:
        log("Деплой в прод: OK")
        return True, result.stdout
    else:
        log(f"Деплой в прод: ОШИБКА\n{result.stderr}")
        return False, result.stderr

def main():
    log("=== SEO Deploy Listener запущен ===")
    improved = ""
    if os.path.exists("/tmp/seo_improved_pages.txt"):
        with open("/tmp/seo_improved_pages.txt") as f:
            improved = f.read().strip()

    offset = 0
    deadline = time.time() + TIMEOUT_HOURS * 3600
    tg_send(f"👂 Жду <b>/deploy_seo</b> для деплоя в прод.\nЕсть {TIMEOUT_HOURS} часов.")

    while time.time() < deadline:
        data = tg_get_updates(offset)
        if not data.get("ok"):
            time.sleep(5)
            continue

        for upd in data.get("result", []):
            offset = upd["update_id"] + 1
            msg = upd.get("message", {})
            chat_id = str(msg.get("chat", {}).get("id", ""))
            text = msg.get("text", "").strip()

            if chat_id != TG_CHAT:
                continue

            if text == "/deploy_seo":
                log(f"Получена команда /deploy_seo от {chat_id}")
                tg_send("🚀 Деплою в прод...")
                ok, output = deploy_prod()
                if ok:
                    tg_send("✅ <b>Задеплоено в прод!</b>\nhttps://aidacamp.ru")
                else:
                    tg_send(f"❌ Ошибка деплоя:\n<code>{output[:500]}</code>")
                log("Завершаю работу")
                sys.exit(0)

            elif text == "/cancel_seo":
                log("Деплой отменён пользователем")
                tg_send("❌ Деплой SEO-правок отменён. Изменения остались на dev.")
                sys.exit(0)

            elif text == "/status_seo":
                tg_send(f"⏳ Жду команду /deploy_seo или /cancel_seo\n\n<b>Что готово:</b>\n{improved}")

    log(f"Таймаут {TIMEOUT_HOURS}ч — деплой не был одобрен")
    tg_send(f"⏰ Таймаут {TIMEOUT_HOURS}ч истёк. SEO-правки остались на dev, в прод не выкачены.\nЧтобы задеплоить вручную: <code>cd ~/Aidacamp-cloude && ./scripts/deploy.sh prod</code>")

if __name__ == "__main__":
    os.makedirs(f"{REPO_DIR}/logs", exist_ok=True)
    main()
