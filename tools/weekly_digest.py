#!/usr/bin/env python3
"""Weekly Digest v2 — API-first, без ETL.

Данные рекламы берём напрямую из API:
  - Яндекс.Директ Reports API → расходы + клики за 7 дней
  - VK Ads API                → расходы + клики за 7 дней
  - Яндекс.Метрика API        → визиты + заявки за 7 дней

Из БД читаем только CRM: ai_decisions, ai_feedback_log.

Cron: 0 20 * * 0  (воскресенье 23:00 МСК = 20:00 UTC)
Деплой: /opt/aidacamp-tools/weekly_digest.py
"""
import json, os, re, sys, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timedelta, date

import psycopg2

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

DIRECT_TOKEN    = os.environ.get("DIRECT_TOKEN", "")
DIRECT_LOGIN    = os.environ.get("DIRECT_LOGIN", "kv145")
METRIKA_TOKEN   = os.environ.get("METRIKA_TOKEN", "")
METRIKA_COUNTER = os.environ.get("METRIKA_COUNTER", "96499295")
VK_TOKEN        = os.environ.get("VK_TOKEN", "")
VK_ACCOUNT_ID   = os.environ.get("VK_ACCOUNT_ID", "")
BOT_TOKEN       = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
CHAT_ID         = os.environ.get("DAILY_DIGEST_CHAT_ID", "244314247").strip()

DRY = "--dry" in sys.argv

LEAD_GOAL_ID = 541048197  # «Отправка заявки-new» для счётчика 96499295

# ── Даты ─────────────────────────────────────────────────────────────────────
def msk_today():
    return (datetime.utcnow() + timedelta(hours=3)).date()

def date_str(d): return d.strftime("%Y-%m-%d")

# ── Яндекс.Директ Reports API ─────────────────────────────────────────────────
def get_direct_week(date_from, date_to):
    """Расходы + клики за период."""
    body = {"params": {
        "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
        "FieldNames": ["Clicks", "Cost"],
        "ReportName": f"weekly_{date_from}",
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
    clicks, cost = 0, 0
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            lines = r.read().decode("utf-8").strip().split("\n")
        for line in lines[1:]:
            parts = line.split("\t")
            if len(parts) >= 2:
                try:
                    clicks += int(parts[0])
                    cost   += int(parts[1]) // 1_000_000
                except Exception:
                    pass
    except urllib.error.HTTPError as e:
        if e.code in (201, 202):
            return 0, 0
    return cost, clicks

# ── VK Ads API ────────────────────────────────────────────────────────────────
def get_vk_week(date_from, date_to):
    """Расходы + клики за период (суммируем по дням)."""
    if not VK_TOKEN or not VK_ACCOUNT_ID:
        return 0, 0
    total_spend, total_clicks = 0, 0
    # VK period=day, итерируем по датам
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
            s = stats[0] if stats else {}
            total_spend  += int(float(s.get("spent", 0)))
            total_clicks += int(s.get("clicks", 0))
        except Exception:
            pass
        d += timedelta(days=1)
    return total_spend, total_clicks

# ── Яндекс.Метрика API ────────────────────────────────────────────────────────
def get_metrika_week(date_from, date_to):
    """Визиты + заявки за период одним запросом."""
    params = urllib.parse.urlencode({
        "ids": METRIKA_COUNTER,
        "metrics": f"ym:s:visits,ym:s:goal{LEAD_GOAL_ID}reaches",
        "date1": date_from, "date2": date_to,
        "limit": 1,
    })
    req = urllib.request.Request(
        f"https://api-metrika.yandex.net/stat/v1/data?{params}",
        headers={"Authorization": f"OAuth {METRIKA_TOKEN}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        totals = data.get("totals", [0, 0])
        visits = int(totals[0]) if len(totals) > 0 else 0
        leads  = int(totals[1]) if len(totals) > 1 else 0
        return visits, leads
    except Exception as e:
        print(f"metrika week err: {e}")
        return 0, 0

# ── CRM из БД ─────────────────────────────────────────────────────────────────
def get_crm_week():
    try:
        conn = psycopg2.connect(dbname="aidacamp", user="postgres")
        cur  = conn.cursor()
        cur.execute("""
            SELECT COUNT(*)::int, STRING_AGG(title, E'\\n• ' ORDER BY made_at DESC)
            FROM ai_decisions WHERE made_at >= NOW() - INTERVAL '7 days'
        """)
        dec_n, dec_txt = cur.fetchone()

        cur.execute("""
            SELECT
              COUNT(*) FILTER (WHERE verdict='accept')::int,
              COUNT(*) FILTER (WHERE verdict='reject')::int,
              COUNT(*)::int
            FROM ai_feedback_log WHERE received_at >= NOW() - INTERVAL '7 days'
        """)
        fb_ok, fb_nok, fb_total = cur.fetchone()

        cur.close(); conn.close()
        return dec_n or 0, dec_txt or "", fb_ok or 0, fb_nok or 0, fb_total or 0
    except Exception as e:
        print(f"crm db err: {e}")
        return 0, "", 0, 0, 0

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    today = msk_today()
    date_to   = date_str(today - timedelta(days=1))  # вчера
    date_from = date_str(today - timedelta(days=7))  # 7 дней назад

    print(f"Weekly Digest v2: {date_from} → {date_to}")

    d_cost, d_clicks = get_direct_week(date_from, date_to)
    v_cost, v_clicks = get_vk_week(date_from, date_to)
    visits, leads    = get_metrika_week(date_from, date_to)
    dec_n, dec_txt, fb_ok, fb_nok, fb_total = get_crm_week()

    print(f"Direct: {d_cost}₽ ({d_clicks} кл) | VK: {v_cost}₽ ({v_clicks} кл)")
    print(f"Metrika: {visits} визитов, {leads} заявок")

    total_spend = d_cost + v_cost
    cpa = int(total_spend / leads) if leads else None

    def fmt(n): return f"{int(n):,}".replace(",", " ")

    since = (today - timedelta(days=7)).strftime("%d.%m")
    until = (today - timedelta(days=1)).strftime("%d.%m")

    msg = (
        f"📅 *Неделя {since}—{until}*\n\n"
        f"📊 Расход: *{fmt(total_spend)}₽*\n"
        f"  Директ: {fmt(d_cost)}₽ ({fmt(d_clicks)} кл)\n"
        f"  VK:     {fmt(v_cost)}₽ ({fmt(v_clicks)} кл)\n\n"
        f"🎯 Заявки: *{leads}*  |  CPA: *{fmt(cpa) + '₽' if cpa else '—'}*\n"
        f"🌐 Визиты: {fmt(visits)}\n"
    )
    if dec_n:
        msg += f"\n💡 Решений за неделю: {dec_n}\n"
        if dec_txt:
            msg += f"• {dec_txt}\n"
    if fb_total:
        acc = round(fb_ok / fb_total * 100)
        msg += f"\n👍 Feedback: {fb_ok} ✅ / {fb_nok} ❌  ({acc}% accept)"

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
            print(f"✅ weekly sent: spend={total_spend} leads={leads}")

if __name__ == "__main__":
    main()
