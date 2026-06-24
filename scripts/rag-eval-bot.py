#!/usr/bin/env python3
"""
Eval-харнесс: прогон бота по golden-набору, сравнение с эталонами Дарьи (Claude-судья).

Для каждого эталонного вопроса:
  1. спрашиваем боевой бот /api/ask (полный пайплайн RAG+Claude) — ответ «с нуля»
  2. Claude-судья сравнивает ответ бота с эталоном Дарьи (факты/тон/полнота, 1–5)
Выход: отчёт (общий балл, по темам, худшие ответы) → /opt/rag-dialogs/eval_report.json

Запуск: python3 eval.py [golden_qa.json]   (нужны ANTHROPIC_API_KEY)
"""
import os, re, sys, json, time, urllib.request, urllib.error

ANTHROPIC_KEY = os.environ['ANTHROPIC_API_KEY']
JUDGE_MODEL = 'claude-sonnet-4-5-20250929'   # судья — посильнее
ASK_URL = 'https://aidacamp.ru/api/ask'
GOLDEN = sys.argv[1] if len(sys.argv) > 1 else '/opt/rag-dialogs/golden_qa.json'

def strip_html(s):
    return re.sub(r'<[^>]+>', ' ', s or '').replace('&nbsp;',' ').strip()

def ask_bot(q):
    body = json.dumps({'message': q, 'history': []}).encode()
    req = urllib.request.Request(ASK_URL, data=body, headers={'Content-Type':'application/json'})
    try:
        r = urllib.request.urlopen(req, timeout=90)
        return strip_html(json.loads(r.read()).get('text',''))
    except Exception as e:
        return f"[ERROR: {str(e)[:60]}]"

JUDGE = """Ты — строгий оценщик ответов чат-бота детского IT-лагеря «АйДаКемп».
Эталон — реальный ответ менеджера Дарьи. Оцени ответ БОТА относительно эталона.

ВОПРОС РОДИТЕЛЯ:
{q}

ЭТАЛОН (как ответила Дарья):
{ref}

ОТВЕТ БОТА:
{bot}

ВАЖНО: цены, даты и акции со временем меняются — эталон может быть устаревшим.
НЕ штрафуй бота за ДРУГИЕ (актуальные) цифры/даты. Оценивай ПОДХОД и СУТЬ, а не точное совпадение чисел.

Оцени по шкале 1–5:
- accuracy: правильно ли бот трактует суть вопроса и не противоречит логике эталона (числа могут отличаться — это ок)
- voice: тёплый тон «мама-маме», как у Дарьи (не сухо, не казённо)
- completeness: покрывает ли суть/ключевые пункты эталона
Верни СТРОГО JSON: {{"accuracy":N,"voice":N,"completeness":N,"verdict":"<1 фраза>"}}"""

def judge(q, ref, bot):
    body = json.dumps({'model': JUDGE_MODEL, 'max_tokens': 300,
        'messages':[{'role':'user','content': JUDGE.format(q=q, ref=ref, bot=bot)}]}).encode()
    req = urllib.request.Request('https://api.anthropic.com/v1/messages', data=body,
        headers={'x-api-key': ANTHROPIC_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'})
    for a in range(4):
        try:
            t = json.loads(urllib.request.urlopen(req, timeout=60).read())['content'][0]['text']
            m = re.search(r'\{.*\}', t, re.S); return json.loads(m.group(0))
        except urllib.error.HTTPError as e:
            if e.code in (429,529) and a<3: time.sleep(2**a); continue
            return {'accuracy':0,'voice':0,'completeness':0,'verdict':f'judge HTTP {e.code}'}
        except Exception:
            if a<3: time.sleep(1); continue
            return {'accuracy':0,'voice':0,'completeness':0,'verdict':'judge parse err'}

golden = json.load(open(GOLDEN, encoding='utf-8'))
print(f"Golden вопросов: {len(golden)}", file=sys.stderr)
results = []
for i, g in enumerate(golden, 1):
    bot = ask_bot(g['question'])
    sc = judge(g['question'], g['reference_answer'], bot)
    results.append({**g, 'bot_answer': bot, 'scores': sc})
    if i % 10 == 0: print(f"  {i}/{len(golden)}", file=sys.stderr)

def avg(key):
    vals=[r['scores'].get(key,0) for r in results if r['scores'].get(key,0)];
    return round(sum(vals)/len(vals),2) if vals else 0
from collections import defaultdict
by_topic = defaultdict(list)
for r in results: by_topic[r['topic']].append(r)

report = {
    'n': len(results),
    'overall': {'accuracy': avg('accuracy'), 'voice': avg('voice'), 'completeness': avg('completeness')},
    'by_topic': {t: {'n':len(rs),
                     'accuracy': round(sum(x['scores'].get('accuracy',0) for x in rs)/len(rs),2),
                     'voice': round(sum(x['scores'].get('voice',0) for x in rs)/len(rs),2),
                     'completeness': round(sum(x['scores'].get('completeness',0) for x in rs)/len(rs),2)}
                 for t,rs in by_topic.items()},
    'worst': sorted(results, key=lambda r: sum(r['scores'].get(k,0) for k in ('accuracy','voice','completeness')))[:10],
    'results': results,
}
json.dump(report, open('/opt/rag-dialogs/eval_report.json','w'), ensure_ascii=False, indent=2)
print("\n=== ИТОГ ===", file=sys.stderr)
print(f"Overall: {report['overall']}", file=sys.stderr)
for t,s in sorted(report['by_topic'].items(), key=lambda x:-x[1]['n']):
    print(f"  {t}: acc {s['accuracy']} voice {s['voice']} compl {s['completeness']} (n={s['n']})", file=sys.stderr)
print("\nХудшие 3:", file=sys.stderr)
for r in report['worst'][:3]:
    print(f"  [{r['topic']}] {r['question'][:60]} → {r['scores'].get('verdict','')}", file=sys.stderr)
