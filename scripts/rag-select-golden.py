#!/usr/bin/env python3
"""
Отбор golden-набора из курированных Q&A.
Вход:  curated.jsonl  (от curate.py: {topic, question, answer, peer, source_kind})
Выход:
  golden_qa.json      — ~80 эталонов, held-out (НЕ в RAG), для eval. Версионируется.
  curated_rag.jsonl   — остальные чистые Q&A для заливки в RAG.
  golden_peers.txt     — peer-id эталонных разговоров (их сырые чанки убираем из RAG).
Дедуп: нормализованный вопрос; в кластере оставляем самый полный ответ.
"""
import json, re, sys
from collections import defaultdict, OrderedDict

SRC = sys.argv[1] if len(sys.argv) > 1 else '/opt/rag-dialogs/curated.jsonl'
GOLDEN_N = 80

def norm(q):
    return re.sub(r'[^а-яё0-9 ]', '', (q or '').lower()).strip()

# Школьный контекст codims (онлайн-уроки/абонементы/расписание дня) — НЕ лагерь.
SCHOOL = re.compile(r'абонемент|пропуск\w* занят|занятий разово|разово.*занят|'
                    r'расписани|онлайн[- ]?занят|пробн\w* урок|'
                    r'с 9[:.]00\s*(до|по|–|-)|до 13[:.]30|до 19[:.]00|9[:.]00\s*(до|–|-)\s*1[394]|'
                    r'групп[ауые]:?\s*\d|групп[ауые]:?\s*1[0-9][:.]|'
                    r'график (посещени|работы|занят)|еженедельн|с понедельника по пятниц|'
                    r'урок[аиов] (демид|матве)', re.I)
# Сильный лагерный признак — перекрывает школьный фильтр.
CAMP_STRONG = re.compile(r'заезд|путёвк|путевк|трансфер|корпус|вожат|бассейн|санатори|изумруд|'
                         r'на смен|в лагер|выездн|на базе|отряд', re.I)

def is_school(r):
    txt = (r.get('question','') + ' ' + r.get('answer',''))
    return bool(SCHOOL.search(txt)) and not CAMP_STRONG.search(txt)

rows = [json.loads(l) for l in open(SRC, encoding='utf-8') if l.strip()]
print(f"Загружено Q&A: {len(rows)}", file=sys.stderr)

# дедуп по нормализованному вопросу — оставляем самый длинный (полный) ответ
best = OrderedDict()
skipped_school = 0
for r in rows:
    k = norm(r.get('question'))
    if not k or len(r.get('answer','')) < 40:
        continue
    if is_school(r):
        skipped_school += 1; continue
    if k not in best or len(r['answer']) > len(best[k]['answer']):
        best[k] = r
uniq = list(best.values())
print(f"После дедупа: {len(uniq)} (отфильтровано школьных: {skipped_school})", file=sys.stderr)

# группировка по темам
by_topic = defaultdict(list)
for r in uniq:
    by_topic[r.get('topic','прочее')].append(r)
# в каждой теме — по убыванию полноты ответа
for t in by_topic:
    by_topic[t].sort(key=lambda r: -len(r['answer']))

# golden: равномерно по темам (round-robin), берём самые полные
golden, used = [], set()
topics = sorted(by_topic, key=lambda t: -len(by_topic[t]))
i = 0
while len(golden) < GOLDEN_N and any(by_topic[t] for t in topics):
    t = topics[i % len(topics)]
    if by_topic[t]:
        r = by_topic[t].pop(0)
        golden.append(r); used.add(id(r))
    i += 1

golden_peers = {r['peer'] for r in golden}
rest = [r for r in uniq if id(r) not in used]

# golden_qa.json — для ревью и eval
gj = [{'topic': r['topic'], 'question': r['question'], 'reference_answer': r['answer'], 'peer': r['peer']} for r in golden]
json.dump(gj, open('/opt/rag-dialogs/golden_qa.json','w'), ensure_ascii=False, indent=2)
# rest — в RAG
with open('/opt/rag-dialogs/curated_rag.jsonl','w',encoding='utf-8') as f:
    for r in rest: f.write(json.dumps(r, ensure_ascii=False)+'\n')
open('/opt/rag-dialogs/golden_peers.txt','w').write('\n'.join(sorted(golden_peers)))

print(f"Golden: {len(golden)} (peers held-out: {len(golden_peers)}) | в RAG: {len(rest)}", file=sys.stderr)
print("Покрытие golden по темам:", file=sys.stderr)
gt = defaultdict(int)
for r in golden: gt[r['topic']] += 1
for t,c in sorted(gt.items(), key=lambda x:-x[1]): print(f"  {t}: {c}", file=sys.stderr)
