#!/usr/bin/env python3
"""
Курация диалогов: Claude вытаскивает из сырых переписок чистые камп-Q&A в голосе Дарьи.

Вход: ai_dialogs (реконструируем диалог по peer). Выход: чистые {topic, question, answer}.
- --dry-run [--limit N]  печатает извлечённые Q&A, НЕ пишет в БД
- --out FILE             пишет все Q&A в JSONL (для отбора golden + заливки в RAG)
Заливку в RAG и отбор golden делает отдельный шаг (ingest-curated), не этот скрипт.
"""
import os, re, sys, json, time, urllib.request, urllib.error
import psycopg2
from collections import defaultdict

DSN = os.environ['DATABASE_URL']
ANTHROPIC_KEY = os.environ['ANTHROPIC_API_KEY']
MODEL = 'claude-haiku-4-5-20251001'

DRY = '--dry-run' in sys.argv
LIMIT = int(sys.argv[sys.argv.index('--limit')+1]) if '--limit' in sys.argv else None
OUT = sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else None

INTERNAL_TITLE = re.compile(r'коллег|алгоритмик|python pro|java|scratch \(|\(сб|\(вс|\(пн|\(вт|\(ср|\(чт|\(пт', re.I)
CAMP_HINT = re.compile(r'смен|лагер|путёвк|путевк|заезд|вожат|бассейн|трансфер|вычет|сертификат|документ|безопасн|питани|возраст', re.I)

PROMPT = """Это реальный диалог родителя с менеджером (Дарья) детского IT-лагеря «АйДаКемп».
Извлеки чистые пары «вопрос родителя → ответ Дарьи» ТОЛЬКО про ЛАГЕРЬ: смены, цены, скидки,
безопасность, питание, документы, возраст, программа/занятия в лагере, трансфер, оплата путёвки, заезд.

ПРОПУСТИ полностью: школьные онлайн-уроки (codims, «занятия по Python онлайн»), подтверждения оплат,
ссылки, чистую логистику и болтовню. Если про лагерь ничего полезного — верни [].

Требования к ответу:
- Сохрани реальные формулировки и тон Дарьи (тёплый, мама-маме), не пересказывай сухо.
- Вопрос — обобщи до самодостаточного (без «а что там ещё»), чтобы был понятен без контекста.
- Анонимизируй: имена детей/родителей → [имя], телефоны → [номер], убери ссылки.
- topic из списка: цена, скидки, безопасность, питание, документы, возраст, программа, трансфер, оплата, прочее.

Верни СТРОГО JSON-массив без пояснений:
[{"topic":"...","question":"...","answer":"..."}]

ДИАЛОГ:
"""

def claude(transcript):
    body = json.dumps({
        'model': MODEL, 'max_tokens': 1500,
        'messages': [{'role':'user','content': PROMPT + transcript}],
    }).encode()
    req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=body,
        headers={'x-api-key': ANTHROPIC_KEY, 'anthropic-version':'2023-06-01','content-type':'application/json'})
    for attempt in range(4):
        try:
            r = urllib.request.urlopen(req, timeout=90)
            txt = json.loads(r.read())['content'][0]['text']
            m = re.search(r'\[.*\]', txt, re.S)
            return json.loads(m.group(0)) if m else []
        except urllib.error.HTTPError as e:
            if e.code in (429,529) and attempt < 3: time.sleep(2**attempt); continue
            print(f"  Claude HTTP {e.code}: {e.read().decode()[:120]}", file=sys.stderr); return []
        except Exception as e:
            if attempt < 3: time.sleep(1); continue
            print(f"  parse err: {str(e)[:80]}", file=sys.stderr); return []
    return []

# ── Загрузка и реконструкция диалогов ───────────────────────────────────────
conn = psycopg2.connect(DSN); cur = conn.cursor()
cur.execute("""
    SELECT account_label, peer_id, chat_title, direction, text, ts
    FROM ai_dialogs
    WHERE text IS NOT NULL AND length(trim(text))>0
      AND (peer_id IS NULL OR peer_id NOT LIKE '-%')
    ORDER BY account_label, peer_id, ts
""")
convos = defaultdict(list)
for acct, peer, title, d, t, ts in cur.fetchall():
    convos[(acct, peer, title)].append((d, re.sub(r'\s+',' ',t.strip())))

out_f = open(OUT, 'w', encoding='utf-8') if OUT else None
total_qa = 0; done = 0
for (acct, peer, title), msgs in convos.items():
    if title and INTERNAL_TITLE.search(title): continue
    blob = ' '.join(t for _, t in msgs)
    if not CAMP_HINT.search(blob): continue          # в разговоре нет камп-темы — мимо
    done += 1
    if LIMIT and done > LIMIT: break
    # транскрипт (ограничиваем длину)
    lines = [f"[{'родитель' if d=='in' else 'Дарья'}]: {t}" for d, t in msgs]
    transcript = '\n'.join(lines)[:7000]
    qas = claude(transcript)
    for qa in qas:
        if not isinstance(qa, dict) or not qa.get('answer') or len(qa.get('answer',''))<40: continue
        qa['peer'] = peer; qa['source_kind'] = 'wa' if ('wa' in (acct or '').lower() or 'whatsapp' in (acct or '').lower()) else 'tg'
        total_qa += 1
        if DRY:
            print(f"\n[{qa.get('topic')}] peer={peer}")
            print("  Q:", qa.get('question'))
            print("  A:", qa.get('answer')[:200])
        if out_f: out_f.write(json.dumps(qa, ensure_ascii=False)+'\n')
    if done % 25 == 0: print(f"  обработано разговоров: {done}, Q&A: {total_qa}", file=sys.stderr)

if out_f: out_f.close()
print(f"\nИтого: разговоров {done}, извлечено Q&A {total_qa}", file=sys.stderr)
cur.close(); conn.close()
