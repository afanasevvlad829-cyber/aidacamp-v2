#!/usr/bin/env bash
# Страж сумм налогового вычета. Канон ВЫЧИСЛЯЕТСЯ из shifts.ts:
# round13%(min(цена − 3800×дни, 110000)) в округлениях до 50 и до 100 (и floor до 100 — «от X»).
# Плюс жёсткий бан «5 434» (устаревшая цифра, CLAUDE.md) — везде, включая scripts/.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"
python3 << 'PY'
import re,sys,os
src=open('src/data/shifts.ts',encoding='utf-8').read()
pairs=re.findall(r"duration:\s*'(\d+)[^']*'[\s\S]{0,400}?price:\s*'([^']+)'",src)
allowed=set()
for d,p in pairs:
    price=int(re.sub(r'\D','',p)); days=int(d)
    v=round(min(max(price-3800*days,0),110000)*0.13)
    for r in (round(v/50)*50, round(v/100)*100, v//100*100): allowed.add(str(r))
# EDU_RESID_PER_DAY (3800 ₽/день) — сама ставка формулы, встречается в прозе рядом с «вычет»
# («13% × (цена − 3 800 ₽ × дни)»), не сумма возврата — тоже вычисляется из shifts.ts.
_edu_rate_m=re.search(r'EDU_RESID_PER_DAY\s*=\s*(\d+)',src)
if _edu_rate_m: allowed.add(_edu_rate_m.group(1))
# 2000 ₽ — фиксированная цена трансфера от м. Солнцево (внешняя константа, не из shifts.ts,
# не относится к вычету); встречается на гео-лендингах в одном абзаце со словом «вычет».
allowed.add('2000')
BAN=re.compile(r'(?<!\w)5[   ]?434(?!\d)')
# (?<!\d) — иначе «110 000 ₽» ложно матчится как «10 000 ₽» (см. selftest/отчёт Task 8)
P_SUM=re.compile(r'(?<!\d)(\d{1,2}[   ]?\d{3})\s*₽')
CTX=re.compile(r'вычет|верн[её]|ФНС|НДФЛ|vychet|deduct',re.I)
EXCL=('/_archive','/demo/','node_modules','eval-graders','.test.','lanit','check-vychet','5 434',
      # ниже — доп. находки при первом прогоне (Task 8, 17.07.2026):
      'disk_index.json', 'photo_catalog.json',   # бинарные индексы (md5/размеры) — «5434» внутри хешей
      'articles.json',                            # агрегатор статей блога — рыночные цифры одной строкой
                                                    # с упоминанием «вычет» в той же статье (см. price-drift)
      'rag-golden_qa',                             # golden-датасет эвала ask-бота — реплики про предоплату
                                                    # брони/возврат депозита, не налоговый вычет
      'kak-provesti-leto-s-polzoy', 'kuda-det-rebenka-letom', 'skolko-stoit-detskiy-lager')  # статьи
      # про рынок в целом (см. те же исключения в check-price-drift.sh)
drift={}
for base in ['src','scripts']:
    for root,_,files in os.walk(base):
        if any(x in root for x in ('_archive','node_modules','demo')): continue
        for fn in files:
            if not fn.endswith(('.astro','.ts','.tsx','.md','.js','.mjs','.json')): continue
            p=os.path.join(root,fn)
            if any(x in p for x in EXCL): continue
            for i,line in enumerate(open(p,encoding='utf-8',errors='ignore'),1):
                if BAN.search(line) and (CTX.search(line) or '₽' in line):
                    drift.setdefault(p,[]).append((i,'запрещённая цифра 5 434')); continue
                if not CTX.search(line): continue
                for m in P_SUM.finditer(line):
                    v=re.sub(r'\D','',m.group(1))
                    if 1000<=int(v)<=20000 and v not in allowed:
                        drift.setdefault(p,[]).append((i,m.group(0).strip()))
if drift:
    print('❌ ДРЕЙФ СУММ ВЫЧЕТА (канон вычисляется из shifts.ts: '+', '.join(sorted(allowed,key=int))+'):')
    for p,hits in sorted(drift.items()):
        for ln,tok in hits: print(f'   {p}:{ln}  «{tok}»')
    sys.exit(1)
print('✅ Суммы вычета соответствуют формуле из shifts.ts; «5 434» отсутствует.')
PY
