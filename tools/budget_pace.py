#!/usr/bin/env python3
"""Budget Pace Monitor v3 — common/ edition.

Cron: 0 */6 * * *
Деплой: /opt/aidacamp-tools/budget_pace.py
"""
import sys

# ── bootstrap: добавляем /opt/aidacamp-tools в путь если запускаем на сервере
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common.env import load_env, msk_now, week_bounds, is_quiet
from common.direct import direct_spend
from common.vk import vk_ensure_token, vk_spend
from common.db import get_preference
from common.telegram import tg_send, fmt

load_env()

FORCE = "--force" in sys.argv
DRY   = "--dry"   in sys.argv


def calc_pace(spent: int, budget: int, days_elapsed: int, days_total: int = 7):
    pct      = round(spent / budget * 100, 1) if budget else 0
    expected = round(days_elapsed / days_total * 100, 1)
    projected = round(spent / days_elapsed * days_total) if days_elapsed else 0
    dev = abs(pct - expected)
    status = "✅" if dev <= 15 else ("⚠️" if dev <= 30 else "🔴")
    return pct, expected, projected, status


def main():
    h = msk_now().hour
    if is_quiet(h) and not FORCE:
        print(f"quiet MSK {h:02d}, skip")
        return

    date_from, date_to, days_elapsed = week_bounds()
    print(f"Budget Pace v3: {date_from} → {date_to} (день {days_elapsed}/7)")

    # VK токен
    vk_ensure_token()

    # Данные
    d_spent = direct_spend(date_from, date_to)
    v_spent = vk_spend(date_from, date_to)
    b_direct = get_preference("weekly_budget_direct", default=30000)
    b_vk     = get_preference("weekly_budget_vk",     default=15000)

    print(f"Direct: {d_spent}₽ / {b_direct}₽  |  VK: {v_spent}₽ / {b_vk}₽")

    d_pct, d_exp, d_proj, d_st = calc_pace(d_spent, b_direct, days_elapsed)
    v_pct, v_exp, v_proj, v_st = calc_pace(v_spent, b_vk,     days_elapsed)

    total_spent  = d_spent + v_spent
    total_budget = b_direct + b_vk
    total_pct    = round(total_spent / total_budget * 100, 1) if total_budget else 0

    msg = "\n".join([
        f"📊 *Budget Pace*  день {days_elapsed}/7  (план {d_exp}%)",
        "",
        f"{d_st} *Яндекс.Директ*",
        f"  {fmt(d_spent)} / {fmt(b_direct)}₽  ({d_pct}%)",
        f"  прогноз к вс: {fmt(d_proj)}₽",
        "",
        f"{v_st} *VK Ads*",
        f"  {fmt(v_spent)} / {fmt(b_vk)}₽  ({v_pct}%)",
        f"  прогноз к вс: {fmt(v_proj)}₽",
        "",
        "———————",
        f"*Итого:* {fmt(total_spent)} / {fmt(total_budget)}₽  ({total_pct}%)",
    ])

    if DRY:
        print(msg)
        return

    if tg_send(msg):
        print(f"✅ sent: total {total_pct}%")


if __name__ == "__main__":
    main()
