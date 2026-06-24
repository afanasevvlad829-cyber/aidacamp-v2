#!/usr/bin/env python3
"""
ai_dialogs → knowledge_chunks: наполнение диалогового тира RAG (источники tg_/wa_).

Берёт собранные переписки (TG+WhatsApp) из ai_dialogs, строит пары «вопрос родителя →
ответ Дарьи/менеджера», анонимизирует PII, эмбеддит (text-embedding-3-small, 1536) и
пишет в knowledge_chunks с source tg_dialog:* / wa_dialog:* — чтобы rag.ts Tier-2 их нашёл.

Фильтры: только 1:1 клиентские диалоги (исключаем группы peer_id<0 и внутренний чат),
содержательные ответы, без боилерплейта.

Режимы:
  --dry-run [--limit N]   построить чанки, напечатать примеры, НЕ писать в БД и НЕ эмбеддить
  --limit N               обработать только N разговоров (для пробного прогона записи)
  (без флагов)            полный бэкфилл всех необработанных
"""
import os, re, sys, json, time, urllib.request, urllib.error
import psycopg2
from collections import defaultdict

DSN = os.environ['DATABASE_URL']
OPENAI_KEY = os.environ['OPENAI_API_KEY']
EMBED_MODEL = 'text-embedding-3-small'

DRY = '--dry-run' in sys.argv
LIMIT = None
if '--limit' in sys.argv:
    LIMIT = int(sys.argv[sys.argv.index('--limit') + 1])

# ── Фильтры шума ────────────────────────────────────────────────────────────
INTERNAL_TITLE = re.compile(r'коллег|алгоритмик|python pro|java|scratch \(|\(сб|\(вс|\(пн|\(вт|\(ср|\(чт|\(пт', re.I)
BOILERPLATE = re.compile(r'^(спасибо|ок|хорошо|да|нет|\+|ага|угу|понятно|принят|здравствуйте|добрый)\W*$', re.I)
OPS_NOISE = re.compile(r'заел|кнопк|выключател|коллеги,|перешлите|переслал|тех\W?поддержк', re.I)
RE_URL = re.compile(r'https?://\S+')
# Камп-релевантность: ответ Дарьи должен быть про ЛАГЕРЬ (а не школьные онлайн-уроки/оплату)
CAMP_KW = re.compile(r'смен[ауые]|лагер|путёвк|путевк|заезд|вожат|отряд|корпус|бассейн|трансфер|'
                     r'вычет|сертификат|безопасн|питани|кормят|меню|возраст|программ|проект|'
                     r'хакатон|брони|предоплат|скидк[аи]', re.I)
# Школьно-платёжная операционка (онлайн-уроки codims, счета) — выкидываем
SCHOOL_OPS = re.compile(r'занятиях?|занятий|урок[аиов]|пробн\w* урок|расписани|онлайн[- ]?занят', re.I)

# ── Анонимизация PII ────────────────────────────────────────────────────────
RE_PHONE = re.compile(r'(?<!\d)(\+?\d[\d\-\s\(\)]{8,}\d)(?!\d)')
RE_EMAIL = re.compile(r'\S+@\S+\.\w+')
RE_URL_PHONE = re.compile(r'(wa\.me/|t\.me/)\S+', re.I)

def anonymize(text, client_name=None):
    text = RE_URL.sub('', text)          # вырезаем ссылки (платёжные/codims — шум)
    text = RE_EMAIL.sub('[email]', text)
    text = RE_PHONE.sub('[номер]', text)
    text = RE_URL_PHONE.sub(r'\1[…]', text)
    if client_name:
        for tok in re.split(r'\s+', client_name.strip()):
            if len(tok) >= 3 and tok.isalpha():
                text = re.sub(r'\b' + re.escape(tok) + r'\b', '[имя]', text, flags=re.I)
    return text.strip()

def is_wa(source, acct):
    s = (source or '') + ' ' + (acct or '')
    return 'wa' in s.lower() or 'whatsapp' in s.lower()

def clean(t):
    return re.sub(r'\s+', ' ', (t or '').strip())

# ── Загрузка диалогов ───────────────────────────────────────────────────────
conn = psycopg2.connect(DSN)
cur = conn.cursor()
cur.execute("""
    SELECT id, source, account_label, peer_id, chat_title, direction, text, ts
    FROM ai_dialogs
    WHERE processed = false
      AND text IS NOT NULL AND length(trim(text)) > 0
      AND (peer_id IS NULL OR peer_id NOT LIKE '-%')   -- исключаем группы
    ORDER BY account_label, peer_id, ts
""")
rows = cur.fetchall()
print(f"Загружено сообщений (1:1, необработанных): {len(rows)}", file=sys.stderr)

# ── Группировка по разговорам ───────────────────────────────────────────────
convos = defaultdict(list)
for r in rows:
    convos[(r[2], r[3])].append(r)   # (account_label, peer_id)

# ── Построение Q&A чанков ───────────────────────────────────────────────────
chunks = []   # (source, text, processed_ids[])
conv_count = 0
for (acct, peer), msgs in convos.items():
    title = msgs[0][4]
    if title and INTERNAL_TITLE.search(title):
        continue
    conv_count += 1
    if LIMIT and conv_count > LIMIT:
        break
    src_prefix = 'wa_dialog' if is_wa(msgs[0][1], acct) else 'tg_dialog'
    # склейка подряд идущих сообщений одного направления
    turns = []  # (direction, text, [ids])
    for m in msgs:
        d, t, mid = m[5], clean(m[6]), m[0]
        if turns and turns[-1][0] == d:
            turns[-1] = (d, turns[-1][1] + ' ' + t, turns[-1][2] + [mid])
        else:
            turns.append((d, t, [mid]))
    # пары: вопрос(in) → ответ(out)
    for i in range(1, len(turns)):
        d, ans, ids = turns[i]
        if d != 'out':
            continue
        q_dir, q_text, q_ids = turns[i-1]
        if q_dir != 'in':
            continue
        ans_a = anonymize(ans, title)
        if len(ans_a) < 60:                 # содержательный ответ (после вырезки ссылок)
            continue
        if BOILERPLATE.match(ans_a) or OPS_NOISE.search(ans_a):
            continue
        if not CAMP_KW.search(ans_a):       # только про лагерь — голос Дарьи в камп-контексте
            continue
        if SCHOOL_OPS.search(ans_a) and not re.search(r'лагер|смен|путёвк|путевк', ans_a, re.I):
            continue                        # школьные онлайн-уроки/оплата — мимо
        q_a = anonymize(q_text, title)[:400]
        text = f"Вопрос родителя: {q_a}\nОтвет (Дарья/менеджер): {ans_a}"[:1400]
        chunks.append((f"{src_prefix}:{peer}", text, q_ids + ids))

print(f"Разговоров: {conv_count} | Q&A-чанков: {len(chunks)}", file=sys.stderr)

if DRY:
    import random
    for c in chunks[:15]:
        print("\n--- source:", c[0], "---")
        print(c[1])
    print(f"\n[DRY] всего чанков: {len(chunks)} (запись отключена)", file=sys.stderr)
    sys.exit(0)

# ── Эмбеддинг батчами ───────────────────────────────────────────────────────
def embed_batch(texts):
    body = json.dumps({'input': texts, 'model': EMBED_MODEL}).encode()
    req = urllib.request.Request('https://api.openai.com/v1/embeddings', data=body,
        headers={'Authorization': f'Bearer {OPENAI_KEY}', 'Content-Type': 'application/json'})
    for attempt in range(4):
        try:
            r = urllib.request.urlopen(req, timeout=60)
            return [d['embedding'] for d in json.loads(r.read())['data']]
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(2 ** attempt); continue
            raise

# Дедуп: какие диалоговые чанки уже в RAG (по тексту) — чтобы cron не плодил дубли.
# (ai_dialogs.processed не используем — нет прав на UPDATE этой таблицы.)
cur.execute("SELECT text FROM knowledge_chunks WHERE source LIKE 'tg_dialog:%' OR source LIKE 'wa_dialog:%'")
existing = {r[0] for r in cur.fetchall()}
new_chunks = [c for c in chunks if c[1] not in existing]
print(f"Новых чанков после дедупа: {len(new_chunks)} из {len(chunks)}", file=sys.stderr)

written = 0
BATCH = 100
for i in range(0, len(new_chunks), BATCH):
    batch = new_chunks[i:i+BATCH]
    embs = embed_batch([c[1] for c in batch])
    for (source, text, ids), emb in zip(batch, embs):
        vec = '[' + ','.join(map(str, emb)) + ']'
        cur.execute(
            "INSERT INTO knowledge_chunks (source, text, embedding, created_at) VALUES (%s,%s,%s::vector, now())",
            (source, text, vec))
    conn.commit()
    written += len(batch)
    print(f"  записано {written}/{len(new_chunks)}", file=sys.stderr)
print(f"Готово. Чанков записано: {written}", file=sys.stderr)
cur.close(); conn.close()
