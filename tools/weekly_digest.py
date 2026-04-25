#!/usr/bin/env python3
"""Weekly Digest v3 — common/ edition.

Cron: 0 20 * * 0  (воскресенье 23:00 МСК = 20:00 UTC)
Деплой: /opt/aidacamp-tools/weekly_digest.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import timedelta

from common.env import load_env, msk_now, date_str
from common.direct import direct_spend_and_clicks
from common.vk import vk_ensure_token, vk_spend_and_clicks
from common.metrika import metrika_visits_and_leads
from common.telegram import tg_send, fmt
from common.db import pg_connect

load_env()

DRY = "--dry" in sys.argv


def get_crm_week():
    try:
        conn = pg_connect()
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


def main():
    today     = msk_now().date()
    date_to   = date_str(today - timedelta(days=1))
    date_from = date_str(today - timedelta(days=7))

    print(f"Weekly Digest v3: {date_from} → {date_to}")

    vk_ensure_token()

    d_cost, d_clicks = direct_spend_and_clicks(date_from, date_to)
    v_cost, v_clicks = vk_spend_and_clicks(date_from, date_to)
    visits, leads    = metrika_visits_and_leads(date_from, date_to)
    dec_n, dec_txt, fb_ok, fb_nok, fb_total = get_crm_week()

    print(f"Direct: {d_cost}₽ ({d_clicks} кл) | VK: {v_cost}₽ ({v_clicks} кл)")
    print(f"Metrika: {visits} визитов, {leads} заявок")

    total_spend = d_cost + v_cost
    cpa = int(total_spend / leads) if leads else None

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
        print(msg)
        return

    if tg_send(msg):
        print(f"✅ weekly sent: spend={total_spend} leads={leads}")


if __name__ == "__main__":
    main()
