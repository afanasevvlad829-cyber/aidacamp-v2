"""ads_snapshot.py — Ежедневный справочник текущих объявлений Директ + VK.

Cron: 30 6 * * *  (06:30 UTC = 09:30 МСК, перед рабочим днём)

Что делает:
  - Забирает все активные объявления из Директа (заголовки, тексты, URL, кампания)
  - Забирает активные объявления из VK (название, статус, бюджет)
  - Сохраняет в PostgreSQL (таблица ads_snapshot) с датой
  - Записывает DIFF: что появилось/исчезло по сравнению со вчера
  - Сохраняет human-readable дайджест в _notes/АйДаКемп/Маркетинг/Кампании/snapshot_ДАТА.md
  - TG-уведомление: только если есть изменения
"""
import json
import os
import sys
import datetime

sys.path.insert(0, os.path.dirname(__file__))
from common.env import load_env, msk_now
from common.direct import direct
from common.telegram import tg_send
from common.db import pg_connect

load_env()

TODAY = msk_now().date().isoformat()
NOTES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "_notes")


# ── PostgreSQL — инициализация таблицы ────────────────────────────────────────

INIT_SQL = """
CREATE TABLE IF NOT EXISTS ads_snapshot (
    id          SERIAL PRIMARY KEY,
    snap_date   DATE NOT NULL,
    source      VARCHAR(20) NOT NULL,   -- 'direct' | 'vk'
    ad_id       VARCHAR(50) NOT NULL,
    campaign    TEXT,
    title       TEXT,
    body        TEXT,
    url         TEXT,
    status      VARCHAR(30),
    spend_today INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(snap_date, source, ad_id)
);
"""


def ensure_table(conn):
    cur = conn.cursor()
    cur.execute(INIT_SQL)
    conn.commit()
    cur.close()


# ── Директ — получение объявлений ─────────────────────────────────────────────

def fetch_direct_ads() -> list[dict]:
    """Все активные объявления Директа с заголовками и текстами."""
    try:
        # Шаг 1: ID активных кампаний (Direct API требует CampaignIds для ads.get)
        camps_resp = direct("campaigns", "get", {
            "SelectionCriteria": {"States": ["ON"]},
            "FieldNames": ["Id"],
        })
        active_ids = [c["Id"] for c in camps_resp.get("result", {}).get("Campaigns", [])]
        if not active_ids:
            return []

        # Шаг 2: Объявления по кампаниям (батчи по 10)
        result = []
        for i in range(0, len(active_ids), 10):
            batch = active_ids[i:i+10]
            resp = direct("ads", "get", {
                "SelectionCriteria": {"CampaignIds": batch, "States": ["ON"]},
                "FieldNames": ["Id", "CampaignId", "Status", "State"],
                "TextAdFieldNames": ["Title", "Title2", "Text", "Href"],
            })
            for ad in resp.get("result", {}).get("Ads", []):
                ta = ad.get("TextAd", {})
                result.append({
                    "ad_id": str(ad.get("Id", "")),
                    "campaign": str(ad.get("CampaignId", "")),
                    "title": (ta.get("Title", "") + " | " + ta.get("Title2", "")).strip(" |"),
                    "body": ta.get("Text", ""),
                    "url": ta.get("Href", ""),
                    "status": ad.get("Status", ""),
                })
        return result
    except Exception as e:
        print(f"fetch_direct_ads err: {e}")
        return []


# ── VK — получение объявлений ──────────────────────────────────────────────────

def fetch_vk_ads() -> list[dict]:
    """Активные объявления VK через myTarget API."""
    try:
        import urllib.request, urllib.parse
        token = os.environ.get("VK_TOKEN", "")
        req = urllib.request.Request(
            "https://target.my.com/api/v2/banners.json?status=active&limit=100",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
        items = data.get("items", [])
        result = []
        for item in items:
            result.append({
                "ad_id": str(item.get("id", "")),
                "campaign": str(item.get("campaign", {}).get("id", "")),
                "title": item.get("content", {}).get("title", ""),
                "body": item.get("content", {}).get("text", ""),
                "url": item.get("urls", {}).get("primary", {}).get("url", ""),
                "status": item.get("status", ""),
            })
        return result
    except Exception as e:
        print(f"fetch_vk_ads err: {e}")
        return []


# ── Сохранение в PG + DIFF ────────────────────────────────────────────────────

def save_and_diff(conn, source: str, ads: list[dict]) -> dict:
    """Сохраняет снэпшот и возвращает diff с предыдущим днём."""
    cur = conn.cursor()
    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()

    # Вчерашние ID
    cur.execute("SELECT ad_id FROM ads_snapshot WHERE snap_date=%s AND source=%s", (yesterday, source))
    prev_ids = {row[0] for row in cur.fetchall()}

    # Сегодняшние ID
    today_ids = {ad["ad_id"] for ad in ads}

    new_ads  = [a for a in ads if a["ad_id"] not in prev_ids]
    gone_ids = prev_ids - today_ids

    # Вставка
    for ad in ads:
        cur.execute("""
            INSERT INTO ads_snapshot (snap_date, source, ad_id, campaign, title, body, url, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (snap_date, source, ad_id) DO UPDATE
              SET title=EXCLUDED.title, body=EXCLUDED.body, status=EXCLUDED.status
        """, (TODAY, source, ad["ad_id"], ad["campaign"], ad["title"], ad["body"], ad["url"], ad["status"]))

    conn.commit()
    cur.close()
    return {"new": new_ads, "gone": list(gone_ids), "total": len(ads)}


# ── Markdown снэпшот ──────────────────────────────────────────────────────────

def write_markdown(direct_ads: list[dict], vk_ads: list[dict]):
    """Записывает human-readable справочник в Obsidian (если _notes доступен)."""
    if not os.path.isdir(NOTES_DIR):
        print(f"  → _notes not found, skipping markdown write")
        return

    lines = [
        f"# Справочник объявлений — {TODAY}",
        "",
        f"> Автоматически сгенерировано ads_snapshot.py · {TODAY}",
        "",
        f"## Яндекс.Директ ({len(direct_ads)} активных объявлений)",
        "",
    ]
    for ad in direct_ads:
        lines += [
            f"### [{ad['ad_id']}] Кампания {ad['campaign']}",
            f"**Заголовок:** {ad['title']}",
            f"**Текст:** {ad['body']}",
            f"**URL:** {ad['url']}",
            f"**Статус:** {ad['status']}",
            "",
        ]

    lines += [
        f"## VK Реклама ({len(vk_ads)} активных объявлений)",
        "",
    ]
    for ad in vk_ads:
        lines += [
            f"### [{ad['ad_id']}] Кампания {ad['campaign']}",
            f"**Заголовок:** {ad['title']}",
            f"**Текст:** {ad['body']}",
            f"**URL:** {ad['url']}",
            "",
        ]

    path = os.path.join(NOTES_DIR, "АйДаКемп", "Маркетинг", "Кампании", f"snapshot_{TODAY}.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  → snapshot saved: {path}")


# ── TG отчёт ─────────────────────────────────────────────────────────────────

def send_report(direct_diff: dict, vk_diff: dict):
    has_changes = any([
        direct_diff["new"], direct_diff["gone"],
        vk_diff["new"], vk_diff["gone"],
    ])

    if not has_changes:
        print("  → no changes, skipping TG")
        return

    lines = [f"📋 *Изменения в объявлениях — {TODAY}*\n"]

    if direct_diff["new"]:
        lines.append(f"*Директ: +{len(direct_diff['new'])} новых*")
        for ad in direct_diff["new"][:3]:
            lines.append(f"  + [{ad['ad_id']}] {ad['title'][:50]}")
        if len(direct_diff["new"]) > 3:
            lines.append(f"  ... и ещё {len(direct_diff['new'])-3}")
    if direct_diff["gone"]:
        lines.append(f"*Директ: -{len(direct_diff['gone'])} отключено*")

    if vk_diff["new"]:
        lines.append(f"*VK: +{len(vk_diff['new'])} новых*")
    if vk_diff["gone"]:
        lines.append(f"*VK: -{len(vk_diff['gone'])} отключено*")

    lines.append(f"\nВсего активных: Директ {direct_diff['total']}, VK {vk_diff['total']}")

    tg_send("\n".join(lines))


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print(f"[{TODAY}] ads_snapshot.py start")

    conn = pg_connect()
    ensure_table(conn)

    print("  → fetching Direct ads...")
    direct_ads = fetch_direct_ads()

    print("  → fetching VK ads...")
    vk_ads = fetch_vk_ads()

    print(f"  → Direct: {len(direct_ads)}, VK: {len(vk_ads)}")

    direct_diff = save_and_diff(conn, "direct", direct_ads)
    vk_diff     = save_and_diff(conn, "vk", vk_ads)

    conn.close()

    write_markdown(direct_ads, vk_ads)
    send_report(direct_diff, vk_diff)

    print(f"[{TODAY}] ads_snapshot.py done")


if __name__ == "__main__":
    main()
