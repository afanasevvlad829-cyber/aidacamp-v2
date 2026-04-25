#!/usr/bin/env python3
"""
review-reminder.py — Скрипт отправки напоминаний об отзывах после смен АйДаКемп.

Логика:
  День +1 после окончания смены: WhatsApp (через Telegram менеджеру)
  День +3: WhatsApp ссылка на Яндекс.Карты
  День +7: Напоминание если отзыва нет

Запуск: python3 review-reminder.py --shift-end 2026-06-08 --dry-run

Автоматический запуск через cron:
  0 10 * * * python3 /opt/etl/review-reminder.py >> /opt/etl/logs/review-reminders.log 2>&1
"""

import os, sys, json, datetime, argparse, urllib.request, urllib.parse

# ---- Config ----
TG_TOKEN = os.environ.get("TG_TOKEN", "")
TG_CHAT = os.environ.get("TG_CHAT", "")
REVIEW_URL = "https://yandex.ru/maps/org/aydakemp/35558479035/reviews/?add-review=true"
REVIEW_PAGE = "https://aidacamp.ru/ostavit-otzyv"

# Даты окончания смен 2026
SHIFT_ENDS = {
    "smena1":  "2026-06-08",   # Смена 1: 30 мая — 8 июня
    "smena2":  "2026-06-23",   # Смена 2: 10 — 23 июня
    "smena21": "2026-06-16",   # Смена 2.1: 10 — 16 июня
    "smena22": "2026-06-23",   # Смена 2.2: 16 — 23 июня
    "smena3":  "2026-08-15",   # Смена 3: 3 — 15 августа
    "smena4":  "2026-08-26",   # Смена 4: 17 — 26 августа
}

# ---- Шаблоны сообщений ----
TEMPLATES = {
    "day1": """📬 *Напоминание менеджеру — День 1 после смены*

Смена закончилась вчера. Напишите каждому родителю в WhatsApp:

---
Привет, [Имя]! 👋 Как добрались? [Имя ребёнка] уже рассказал о лагере?

Мы очень рады, что [он/она] был с нами — и будем счастливы услышать ваши впечатления.

— Дарья и команда АйДаКемп
---

📋 Список родителей смены — в общем чате или CRM.
""",

    "day3": """⭐ *Напоминание менеджеру — День 3 после смены*

Время для просьбы оставить отзыв. Шаблон WhatsApp:

---
[Имя], добрый день! Надеемся, [Имя ребёнка] уже поделился всем, что делал на смене 😊

Будем очень благодарны, если найдёте 2 минуты написать отзыв на Яндекс.Картах — это очень помогает другим родителям и нам:
👉 {review_url}

Спасибо заранее! 🙏
---

Ссылка на все площадки: {review_page}
""".format(review_url=REVIEW_URL, review_page=REVIEW_PAGE),

    "day7": """🔔 *Напоминание менеджеру — День 7 после смены*

Финальный запрос тем, кто ещё не оставил отзыв. Шаблон:

---
[Имя], привет! Просто хотели напомнить — если будет 2 минутки, отзыв на Яндекс.Картах для нас очень важен.
Ваш опыт помогает другим родителям принять решение:
👉 {review_url}

Если были какие-то пожелания по смене — тоже напишите, очень ценим обратную связь!
---
""".format(review_url=REVIEW_URL),
}


def send_telegram(token, chat, text, dry_run=False):
    if dry_run:
        print(f"[DRY-RUN] Telegram → {chat}:")
        print(text)
        print("---")
        return True
    data = urllib.parse.urlencode({
        "chat_id": chat,
        "text": text,
        "parse_mode": "Markdown",
    }).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(req) as r:
            resp = json.loads(r.read())
            return resp.get("ok", False)
    except Exception as e:
        print(f"Telegram error: {e}")
        return False


def check_reminders(shift_end_str: str, dry_run: bool):
    try:
        shift_end = datetime.date.fromisoformat(shift_end_str)
    except ValueError:
        print(f"Invalid date: {shift_end_str}")
        return

    today = datetime.date.today()
    delta = (today - shift_end).days

    if delta == 1:
        msg = TEMPLATES["day1"]
        send_telegram(TG_TOKEN, TG_CHAT, msg, dry_run)
        print(f"[{today}] Sent day1 reminder for shift ending {shift_end_str}")
    elif delta == 3:
        msg = TEMPLATES["day3"]
        send_telegram(TG_TOKEN, TG_CHAT, msg, dry_run)
        print(f"[{today}] Sent day3 reminder for shift ending {shift_end_str}")
    elif delta == 7:
        msg = TEMPLATES["day7"]
        send_telegram(TG_TOKEN, TG_CHAT, msg, dry_run)
        print(f"[{today}] Sent day7 reminder for shift ending {shift_end_str}")
    else:
        if delta > 0:
            print(f"[{today}] Shift {shift_end_str}: day +{delta}, no action needed")


def main():
    parser = argparse.ArgumentParser(description="Review reminder sender for АйДаКемп")
    parser.add_argument("--shift-end", help="Дата окончания смены (YYYY-MM-DD) или 'all'", default="all")
    parser.add_argument("--dry-run", action="store_true", help="Не отправлять, только вывести шаблоны")
    args = parser.parse_args()

    # Загружаем .env если есть
    env_path = os.path.join(os.path.dirname(__file__), "../.env")
    if not os.path.exists(env_path):
        env_path = "/opt/etl/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    if k in ("TG_TOKEN", "TG_CHAT"):
                        os.environ[k] = v

    global TG_TOKEN, TG_CHAT
    TG_TOKEN = os.environ.get("TG_TOKEN", "")
    TG_CHAT = os.environ.get("TG_CHAT", "")

    if not TG_TOKEN and not args.dry_run:
        print("ERROR: TG_TOKEN not set. Use --dry-run to preview messages.")
        sys.exit(1)

    if args.shift_end == "all":
        for name, end_date in SHIFT_ENDS.items():
            print(f"\n=== Checking {name} (end: {end_date}) ===")
            check_reminders(end_date, args.dry_run)
    else:
        check_reminders(args.shift_end, args.dry_run)


if __name__ == "__main__":
    main()
