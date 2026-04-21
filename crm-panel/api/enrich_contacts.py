#!/usr/bin/env python3
"""
Batch contact enrichment via Anthropic Claude.
For each contact with conversation history — generate a structured summary
and upsert into crm_contact_contexts.

Usage:
  ANTHROPIC_KEY=sk-... python3 enrich_contacts.py [--force] [--limit N] [--id CID]
"""

import os, sys, json, time, argparse, psycopg2
from datetime import datetime
import urllib.request as _ureq

DB_DSN   = "dbname=aidacamp user=postgres"
API_KEY  = os.environ.get("ANTHROPIC_KEY", "")
MODEL    = "claude-sonnet-4-5"
MAX_MSGS = 80   # messages per contact sent to Claude
DELAY    = 0.5  # seconds between API calls

# ── Fetch all contacts ────────────────────────────────────────────────────────
def get_contacts(conn, only_id=None):
    cur = conn.cursor()
    q = """
        SELECT customer_id, name, phone, last_comment,
               f_hot, f_killer, f_price, f_dist, f_sched, f_camp,
               f_sick, f_competitor, f_lost, n_events, contact_safety
        FROM crm_contacts
    """
    if only_id:
        cur.execute(q + " WHERE customer_id = %s", (str(only_id),))
    else:
        cur.execute(q)
    cols = ['customer_id','name','phone','last_comment',
            'f_hot','f_killer','f_price','f_dist','f_sched','f_camp',
            'f_sick','f_competitor','f_lost','n_events','contact_safety']
    return [{c: (str(v) if v is not None else '') for c,v in zip(cols, row)}
            for row in cur.fetchall()]

# ── Fetch conversation for a contact ─────────────────────────────────────────
def get_conversation(conn, phone_raw):
    phone = ''.join(c for c in phone_raw if c.isdigit())
    if phone.startswith('8'): phone = '7' + phone[1:]
    if len(phone) == 10:      phone = '7' + phone
    phone10 = phone[-10:] if len(phone) >= 10 else ''

    msgs = []
    cur = conn.cursor()

    # WA
    if phone and '111' not in phone:
        cur.execute("""
            SELECT direction, text, ts FROM ai_dialogs
            WHERE peer_id = %s AND source NOT LIKE 'tg%%'
              AND text IS NOT NULL AND text != ''
            ORDER BY ts ASC LIMIT 500
        """, (phone + '@c.us',))
        for d, t, ts in cur.fetchall():
            msgs.append(('wa', d, t, ts))

    # TG
    if phone10:
        cur.execute("""
            SELECT DISTINCT peer_id FROM ai_tg_users
            WHERE phone IN (%s,%s,%s) AND peer_id ~ '^[0-9]+$' LIMIT 1
        """, (phone10, '7'+phone10, phone))
        row = cur.fetchone()
        if row:
            cur.execute("""
                SELECT direction, text, ts FROM ai_dialogs
                WHERE peer_id = %s AND source LIKE 'tg%%'
                  AND text IS NOT NULL AND text != ''
                ORDER BY ts ASC LIMIT 500
            """, (row[0],))
            for d, t, ts in cur.fetchall():
                msgs.append(('tg', d, t, ts))

    msgs.sort(key=lambda x: str(x[3]) if x[3] else '')
    return msgs

# ── Format messages for Claude ────────────────────────────────────────────────
def format_msgs(msgs):
    lines = []
    for ch, direction, text, ts in msgs[-MAX_MSGS:]:
        who  = 'Клиент' if direction == 'in' else 'Менеджер'
        date = str(ts)[:16] if ts else '?'
        txt  = (text or '')[:400].replace('\n', ' ')
        lines.append(f'[{date}] {who} ({ch.upper()}): {txt}')
    return '\n'.join(lines)

# ── Call Claude API ───────────────────────────────────────────────────────────
def call_claude(contact, conv_text):
    flags = []
    for k,label in [('f_hot','горячий'),('f_killer','невосстановимая причина'),
                    ('f_price','ценовой барьер'),('f_lost','явный отказ'),
                    ('f_competitor','конкурент'),('f_sick','болел'),
                    ('f_dist','расстояние'),('f_sched','расписание')]:
        if str(contact.get(k,'')).lower() in ('true','1','t'):
            flags.append(label)

    prompt = f"""Ты аналитик CRM детского лагеря АйДаКемп.
Проанализируй клиента и верни ТОЛЬКО валидный JSON (без markdown, без пояснений).

КЛИЕНТ:
- ID: {contact['customer_id']}
- Имя: {contact['name']}
- Комментарий в CRM: {contact['last_comment'] or 'нет'}
- CRM-флаги: {', '.join(flags) if flags else 'нет'}
- Событий в CRM: {contact['n_events']}
- Статус контакта: {contact['contact_safety']}

ПЕРЕПИСКА (последние {MAX_MSGS} сообщений):
{conv_text if conv_text else 'Переписка не найдена.'}

Верни JSON строго в этом формате:
{{
  "status": "active|pause|rejected|aggressive|lost|no_data",
  "summary": "2-3 предложения — что за клиент, где находится в воронке",
  "child_info": "что известно о ребёнке: возраст, интересы, имя",
  "key_signals": ["список", "важных", "сигналов из переписки"],
  "objections": ["возражения", "которые", "поднимал клиент"],
  "red_flags": ["тревожные сигналы если есть, иначе пустой список"],
  "next_step": "конкретная рекомендация менеджеру: что делать, когда, что сказать",
  "reactivation_timing": "сейчас|через 2 недели|через 1 месяц|через 3 месяца|через 6 месяцев|не возвращаться",
  "best_channel": "wa|tg|call|unknown",
  "tone": "warm|neutral|cold|silent|hostile",
  "sentiment": {{
    "trend": "positive|hesitant|negative|cancelled|neutral",
    "last_client_mood": "одна фраза описывающая последнее настроение клиента"
  }}
}}"""

    payload = json.dumps({
        "model": MODEL,
        "max_tokens": 800,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = _ureq.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
    )
    with _ureq.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read())
    text = resp["content"][0]["text"].strip()
    # Strip markdown code blocks if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"): text = text[4:]
    return json.loads(text)

# ── Upsert to crm_contact_contexts ───────────────────────────────────────────
def upsert_context(conn, cid, raw):
    cur = conn.cursor()
    tone      = raw.get("tone", "neutral")
    sentiment = raw.get("sentiment", {})
    channels  = []
    if raw.get("best_channel") in ("wa","tg"):
        channels.append(raw["best_channel"])
    quotes = {
        "cancel":    raw.get("objections", []),
        "interest":  raw.get("key_signals", []),
    }
    cur.execute("""
        INSERT INTO crm_contact_contexts
          (customer_id, tone, msg_count, channels, quotes, sentiment, raw_context)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (customer_id) DO UPDATE SET
          tone        = EXCLUDED.tone,
          channels    = EXCLUDED.channels,
          quotes      = EXCLUDED.quotes,
          sentiment   = EXCLUDED.sentiment,
          raw_context = EXCLUDED.raw_context
    """, (
        str(cid), tone, 0,
        channels,
        json.dumps(quotes, ensure_ascii=False),
        json.dumps(sentiment, ensure_ascii=False),
        json.dumps(raw, ensure_ascii=False),
    ))
    conn.commit()

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--force',  action='store_true', help='Re-process already enriched contacts')
    parser.add_argument('--limit',  type=int, default=0, help='Process at most N contacts')
    parser.add_argument('--id',     type=str, default='', help='Process single contact ID')
    args = parser.parse_args()

    if not API_KEY:
        print("❌ Set ANTHROPIC_KEY env variable")
        sys.exit(1)

    conn = psycopg2.connect(DB_DSN)
    contacts = get_contacts(conn, only_id=args.id if args.id else None)

    # If not --force, skip contacts that already have a non-trivial raw_context with summary field
    if not args.force and not args.id:
        cur = conn.cursor()
        cur.execute("SELECT customer_id FROM crm_contact_contexts WHERE raw_context ? 'summary'")
        already = {str(r[0]) for r in cur.fetchall()}
        contacts = [c for c in contacts if str(c['customer_id']) not in already]
        print(f"⏭  Skipping {len(already)} already enriched. Processing {len(contacts)} remaining.")

    if args.limit:
        contacts = contacts[:args.limit]

    total   = len(contacts)
    ok      = 0
    skipped = 0
    errors  = 0

    print(f"🚀 Starting enrichment: {total} contacts | model: {MODEL}")

    for i, c in enumerate(contacts, 1):
        cid  = c['customer_id']
        name = c['name'][:40]
        msgs = get_conversation(conn, c['phone'])

        if not msgs and not c['last_comment']:
            skipped += 1
            print(f"  [{i}/{total}] {cid} {name} — пропуск (нет переписки)")
            continue

        conv_text = format_msgs(msgs)
        try:
            result = call_claude(c, conv_text)
            upsert_context(conn, cid, result)
            ok += 1
            status = result.get('status','?')
            next_s = result.get('next_step','')[:60]
            print(f"  [{i}/{total}] ✓ {cid} {name} [{status}] → {next_s}")
        except Exception as e:
            errors += 1
            print(f"  [{i}/{total}] ✗ {cid} {name} — {e}")

        time.sleep(DELAY)

    conn.close()
    print(f"\n✅ Done: {ok} enriched, {skipped} skipped, {errors} errors")

if __name__ == "__main__":
    main()
