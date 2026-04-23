#!/usr/bin/env python3
"""Budget Pace Monitor v2 — API-first, без ETL.

Расходы Direct и VK берём напрямую из API (не из БД-таблиц ETL).
Бюджеты читаем из ai_user_preferences (PostgreSQL).
Тихий режим 21:00–08:00 МСК.

Cron: 0 */6 * * *
Деплой: /opt/aidacamp-tools/budget_pace.py
"""
import json, os, re, sys, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timedelta

import psycopg2

try:
    from zoneinfo import ZoneInfo
    MSK = ZoneInfo("Europe/Moscow")
except Exception:
    MSK = None

# ── Загрузка токенов ──────────────────────────────────────────────────────────
def load_env():
    for path in ["/opt/aidacamp-tools/etl/.env",
                 "/etc/systemd/system/crm-panel-api.service.d/env.conf"]:
        try:
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"): continue
                    if line.startswith("Environment="):
                        for kv in line[len("Environment="):].strip('"').split():
                            if "=" in kv:
                                k, v = kv.split("=", 1)
                                os.environ.setdefault(k, v)
                    elif "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k, v)
        except Exception:
            pass

load_env()

DIRECT_TOKEN  = os.environ.get("DIRECT_TOKEN", "")
DIRECT_LOGIN  = os.environ.get("DIRECT_LOGIN", "kv145")
VK_TOKEN      = os.environ.get("VK_TOKEN", "")
VK_ACCOUNT_ID = os.environ.get("VK_ACCOUNT_ID", "")
BOT_TOKEN     = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
CHAT_ID       = os.environ.get("DAILY_DIGEST_CHAT_ID", "244314247").strip()

FORCE = "--force" in sys.argv
DRY   = "--dry"   in sys.argv
QUIET_START, QUIET_END = 21, 8

def msk_now():
    if MSK: return datetime.now(MSK)
    return datetime.utcnow() + timedelta(hours=3)

def is_quiet(h):
    return h >= QUIET_START or h < QUIET_END

def date_str(d): return d.strftime("%Y-%m-%d")

# ── Определение границ недели (пн–сегодня МСК) ────────────────────────────────
def week_bounds():
    now  = msk_now()
    dow  = now.weekday()          # Mon=0
    monday = (now - timedelta(days=dow)).date()
    today  = now.date()
    days_elapsed = dow + 1        # включая сегодня
    return date_str(monday), date_str(today), days_elapsed

# ── Яндекс.Директ Reports API ─────────────────────────────────────────────────
def get_direct_spend(date_from, date_to):
    body = {"params": {
        "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
        "FieldNames": ["Clicks", "Cost"],
        "ReportName": f"pace_{date_from}_{date_to}",
        "ReportType": "ACCOUNT_PERFORMANCE_REPORT",
        "DateRangeType": "CUSTOM_DATE",
        "Format": "TSV",
        "IncludeVAT": "NO",
        "IncludeDiscount": "NO",
    }}
    req = urllib.request.Request(
        "https://api.direct.yandex.com/json/v5/reports",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {DIRECT_TOKEN}",
            "Client-Login": DIRECT_LOGIN,
            "Content-Type": "application/json",
            "processingMode": "auto",
            "skipReportHeader": "true",
            "skipColumnHeader": "false",
            "skipReportSummary": "true",
        }
    )
    cost = 0
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            lines = r.read().decode("utf-8").strip().split("\n")
        for line in lines[1:]:
            parts = line.split("\t")
            if len(parts) >= 2:
                try: cost += int(parts[1]) // 1_000_000
                except Exception: pass
    except urllib.error.HTTPError as e:
        if e.code in (201, 202): return 0
    return cost

# ── VK Ads API ────────────────────────────────────────────────────────────────
def get_vk_spend(date_from, date_to):
    """Суммируем расходы по дням (VK API не поддерживает произвольный диапазон в одном запросе)."""
    if not VK_TOKEN or not VK_ACCOUNT_ID:
        return 0
    total = 0
    d = datetime.strptime(date_from, "%Y-%m-%d").date()
    end = datetime.strptime(date_to, "%Y-%m-%d").date()
    while d <= end:
        ds = date_str(d)
        params = urllib.parse.urlencode({
            "access_token": VK_TOKEN,
            "account_id": VK_ACCOUNT_ID,
            "ids_type": "account", "ids": VK_ACCOUNT_ID,
            "period": "day", "date_from": ds, "date_to": ds, "v": "5.131",
        })
        try:
            with urllib.request.urlopen(
                f"https://api.vk.com/method/ads.getStatistics?{params}", timeout=15
            ) as r:
                data = json.loads(r.read())
            stats = data.get("response", [{}])[0].get("stats", [{}])
            total += int(float((stats[0] if stats else {}).get("spent", 0)))
        except Exception:
            pass
        d += timedelta(days=1)
    return total

# ── Бюджеты из БД ─────────────────────────────────────────────────────────────
def get_budgets():
    b_direct, b_vk = 30000, 15000
    try:
        conn = psycopg2.connect(dbname="aidacamp", user="postgres")
        cur  = conn.cursor()
        for key, default in [("weekly_budget_direct", 30000), ("weekly_budget_vk", 15000)]:
            cur.execute("SELECT value FROM ai_user_preferences WHERE key=%s LIMIT 1", (key,))
            row = cur.fetchone()
            if row:
                m = re.search(r"(\d+)", row[0])
                val = int(m.group(1)) if m else default
                if key == "weekly_budget_direct": b_direct = val
                else: b_vk = val
        cur.close(); conn.close()
    except Exception as e:
        print(f"db prefs err: {e}")
    return b_direct, b_vk

# ── Расчёт темпа ──────────────────────────────────────────────────────────────
def calc_pace(spent, budget, days_elapsed, days_total=7):
    pct       = round(spent / budget * 100, 1) if budget else 0
    expected  = round(days_elapsed / days_total * 100, 1)
    projected = round(spent / days_elapsed * days_total) if days_elapsed else 0
    dev = abs(pct - expected)
    status = "✅" if dev <= 15 else ("⚠️" if dev <= 30 else "🔴")
    return pct, expected, projected, status

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    h = msk_now().hour
    if is_quiet(h) and not FORCE:
        print(f"quiet MSK {h:02d}, skip"); return

    date_from, date_to, days_elapsed = week_bounds()
    print(f"Budget Pace v2: {date_from} → {date_to} (день {days_elapsed}/7)")

    direct_spent = get_direct_spend(date_from, date_to)
    vk_spent     = get_vk_spend(date_from, date_to)
    b_direct, b_vk = get_budgets()

    print(f"Direct: {direct_spent}₽ / {b_direct}₽  |  VK: {vk_spent}₽ / {b_vk}₽")

    d_pct, d_exp, d_proj, d_st = calc_pace(direct_spent, b_direct, days_elapsed)
    v_pct, v_exp, v_proj, v_st = calc_pace(vk_spent,     b_vk,     days_elapsed)

    total_spent  = direct_spent + vk_spent
    total_budget = b_direct + b_vk
    total_pct    = round(total_spent / total_budget * 100, 1) if total_budget else 0

    def fmt(n): return f"{int(n):,}".replace(",", " ")

    msg = "\n".join([
        f"📊 *Budget Pace*  день {days_elapsed}/7  (план {d_exp}%)",
        "",
        f"{d_st} *Яндекс.Директ*",
        f"  {fmt(direct_spent)} / {fmt(b_direct)}₽  ({d_pct}%)",
        f"  прогноз к вс: {fmt(d_proj)}₽",
        "",
        f"{v_st} *VK Ads*",
        f"  {fmt(vk_spent)} / {fmt(b_vk)}₽  ({v_pct}%)",
        f"  прогноз к вс: {fmt(v_proj)}₽",
        "",
        "———————",
        f"*Итого:* {fmt(total_spent)} / {fmt(total_budget)}₽  ({total_pct}%)",
    ])

    if DRY:
        print(msg); return

    if not BOT_TOKEN:
        print("no BOT_TOKEN"); return

    req = urllib.request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        data=json.dumps({"chat_id": CHAT_ID, "text": msg, "parse_mode": "Markdown"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read())
        if not resp.get("ok"):
            print(f"tg err: {resp}")
        else:
            print(f"✅ sent: total {total_pct}%")

if __name__ == "__main__":
    main()
