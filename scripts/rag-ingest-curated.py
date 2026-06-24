#!/usr/bin/env python3
"""
Заливка курированных Q&A в RAG (source darya_qa:*), рядом с сырыми tg_/wa_dialog.
+ Held-out: удаляем ВСЕ чанки (сырые tg_/wa_dialog И чистые) golden-разговоров,
  чтобы eval честно мерил генерацию, а не извлечение эталона.

Вход: /opt/rag-dialogs/curated_rag.jsonl, /opt/rag-dialogs/golden_peers.txt
Идемпотентно: дедуп по тексту против уже залитых darya_qa.
"""
import os, sys, json, time, urllib.request, urllib.error
import psycopg2

DSN = os.environ['DATABASE_URL']; OPENAI_KEY = os.environ['OPENAI_API_KEY']
EMBED_MODEL = 'text-embedding-3-small'

golden_peers = set(l.strip() for l in open('/opt/rag-dialogs/golden_peers.txt') if l.strip())
rows = [json.loads(l) for l in open('/opt/rag-dialogs/curated_rag.jsonl', encoding='utf-8') if l.strip()]

conn = psycopg2.connect(DSN); cur = conn.cursor()

# 1) HELD-OUT: убрать сырые диалоговые чанки golden-разговоров из RAG
removed = 0
for peer in golden_peers:
    cur.execute("DELETE FROM knowledge_chunks WHERE source IN (%s,%s)",
                (f'tg_dialog:{peer}', f'wa_dialog:{peer}'))
    removed += cur.rowcount
conn.commit()
print(f"Held-out: удалено сырых чанков golden-разговоров: {removed}", file=sys.stderr)

# 2) Собираем чистые чанки (исключая golden-разговоры целиком)
chunks = []
for r in rows:
    if r.get('peer') in golden_peers:        # held-out — не заливаем
        continue
    q = (r.get('question') or '').strip(); a = (r.get('answer') or '').strip()
    if len(a) < 40: continue
    text = f"Вопрос родителя: {q}\nОтвет Дарьи: {a}"[:1400]
    src = ('wa_dialog' if r.get('source_kind') == 'wa' else 'tg_dialog')  # darya_qa подтир, но префикс tg_/wa_ для rag.ts
    chunks.append((f"darya_qa:{r.get('peer')}", text))

# дедуп против уже залитых darya_qa
cur.execute("SELECT text FROM knowledge_chunks WHERE source LIKE 'darya_qa:%'")
existing = {x[0] for x in cur.fetchall()}
chunks = [c for c in chunks if c[1] not in existing]
print(f"Чистых чанков к заливке: {len(chunks)}", file=sys.stderr)

def embed_batch(texts):
    body = json.dumps({'input': texts, 'model': EMBED_MODEL}).encode()
    req = urllib.request.Request('https://api.openai.com/v1/embeddings', data=body,
        headers={'Authorization': f'Bearer {OPENAI_KEY}', 'Content-Type': 'application/json'})
    for a in range(4):
        try: return [d['embedding'] for d in json.loads(urllib.request.urlopen(req, timeout=60).read())['data']]
        except urllib.error.HTTPError as e:
            if e.code == 429 and a < 3: time.sleep(2**a); continue
            raise

written = 0
for i in range(0, len(chunks), 100):
    batch = chunks[i:i+100]
    embs = embed_batch([c[1] for c in batch])
    for (source, text), emb in zip(batch, embs):
        cur.execute("INSERT INTO knowledge_chunks (source,text,embedding,created_at) VALUES (%s,%s,%s::vector,now())",
                    (source, text, '['+','.join(map(str,emb))+']'))
    conn.commit(); written += len(batch)
    print(f"  залито {written}/{len(chunks)}", file=sys.stderr)

print(f"Готово. darya_qa чанков залито: {written}", file=sys.stderr)
cur.close(); conn.close()
