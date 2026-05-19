#!/usr/bin/env python3
"""
SEO Kaizen Weekly Report — каждую пятницу в 17:00.
Показывает компаундный эффект: что улучшили за неделю,
как изменились позиции по страницам которые улучшали 2+ недели назад.
"""

import os, json, psycopg2, urllib.request
from datetime import date, timedelta, datetime

TG_BOT  = "8619240142:AAEZluPyzdCTDNEiRFSLt7I8Ka4dC8ntfHc"
TG_CHAT = "244314247"
DB      = "postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp"

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
        print(f"TG error: {e}")

def check_and_update_positions(conn):
    """Обновляем pos_after для улучшений 14+ дней назад."""
    cur = conn.cursor()
    cur.execute("""
        SELECT k.id, k.url, k.keyword, k.pos_before
        FROM seo_kaizen_log k
        WHERE k.pos_after IS NULL
          AND k.date <= CURRENT_DATE - 14
          AND k.status = 'deployed_prod'
    """)
    rows = cur.fetchall()
    updated = []

    last_date = None
    cur.execute("SELECT MAX(date) FROM seo_positions")
    row = cur.fetchone()
    if row:
        last_date = row[0]

    for kaizen_id, url, keyword, pos_before in rows:
        if not last_date:
            continue
        cur.execute("""
            SELECT position FROM seo_positions
            WHERE url = %s AND keyword = %s AND date = %s
        """, (url, keyword, last_date))
        r = cur.fetchone()
        if r:
            pos_after = r[0]
            delta = pos_before - pos_after  # положительное = улучшение
            cur.execute("""
                UPDATE seo_kaizen_log
                SET pos_after = %s, checked_at = NOW()
                WHERE id = %s
            """, (pos_after, kaizen_id))
            updated.append({
                "url": url, "keyword": keyword,
                "before": pos_before, "after": pos_after,
                "delta": delta
            })

    conn.commit()
    return updated

def main():
    conn = psycopg2.connect(DB)
    cur  = conn.cursor()

    # Обновить позиции по старым улучшениям
    pos_updates = check_and_update_positions(conn)

    # Улучшения за эту неделю
    cur.execute("""
        SELECT url, keyword, action_type, words_before, words_after,
               pos_before, status, date
        FROM seo_kaizen_log
        WHERE date >= CURRENT_DATE - 7
        ORDER BY date DESC
    """)
    week_items = cur.fetchall()

    # Суммарная статистика за всё время
    cur.execute("""
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status='deployed_prod') as in_prod,
          SUM(words_after - words_before) FILTER (WHERE words_after > words_before) as words_added,
          COUNT(*) FILTER (WHERE pos_after < pos_before) as improved,
          AVG(pos_before - pos_after) FILTER (WHERE pos_after < pos_before) as avg_gain
        FROM seo_kaizen_log
    """)
    stats = cur.fetchone()
    conn.close()

    total, in_prod, words_added, improved_count, avg_gain = stats
    total      = total or 0
    in_prod    = in_prod or 0
    words_added= int(words_added or 0)
    improved_c = improved_count or 0
    avg_g      = round(avg_gain or 0, 1)

    week_num = date.today().isocalendar()[1]
    today_str = date.today().strftime("%d.%m.%Y")

    lines = [
        f"📊 <b>SEO Кайдзен — итоги недели {week_num} ({today_str})</b>",
        "",
    ]

    # Улучшения за неделю
    action_ru = {
        "title_fix":      "✏️ title/meta",
        "h1_fix":         "📌 H1 + введение",
        "faq_add":        "❓ FAQ-блок",
        "content_expand": "📝 расширен контент",
        "schema_add":     "🗂 добавлена schema",
        "internal_link":  "🔗 внутренние ссылки",
    }
    if week_items:
        lines.append("<b>Улучшено за неделю:</b>")
        for url, kw, atype, wb, wa, pb, status, dt in week_items:
            a = action_ru.get(atype, atype)
            delta_w = (wa or 0) - (wb or 0)
            delta_str = f" +{delta_w} слов" if delta_w > 0 else ""
            prod_mark = " ✅" if status == "deployed_prod" else " (dev)"
            lines.append(f"  • <code>{url}</code> — {a}{delta_str}{prod_mark}")
    else:
        lines.append("На этой неделе улучшений не было")

    lines.append("")

    # Результаты старых улучшений (через 2 нед)
    if pos_updates:
        lines.append("<b>Позиции через 2 нед после улучшений:</b>")
        for u in pos_updates:
            arrow = "▲" if u["delta"] > 0 else ("▼" if u["delta"] < 0 else "→")
            lines.append(
                f"  {arrow} <code>{u['url']}</code> «{u['keyword']}»: "
                f"{u['before']} → {u['after']} "
                f"({'+'if u['delta']>0 else ''}{u['delta']})"
            )
        lines.append("")

    # Общая статистика кайдзен
    lines += [
        "<b>Всего за всё время:</b>",
        f"  🔄 Улучшений: <b>{total}</b> (в проде: {in_prod})",
        f"  📝 Слов добавлено: <b>{words_added:,}</b>",
        f"  📈 Позиций улучшено: <b>{improved_c}</b> страниц",
    ]
    if avg_g > 0:
        lines.append(f"  ⚡ Средний рост: <b>+{avg_g} позиций</b>")

    lines += [
        "",
        f"<a href='https://dev.aidacamp.ru/seo/'>→ SEO дашборд</a>",
    ]

    tg("\n".join(lines))
    print("Отчёт отправлен")


if __name__ == "__main__":
    main()
