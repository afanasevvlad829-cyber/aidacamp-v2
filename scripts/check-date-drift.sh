#!/usr/bin/env bash
# Страж дрейфа дат смен. Источник — startDate/endDate в src/data/shifts.ts.
# Любой диапазон дат «D[месяц]—D месяц» на боевых страницах, не совпадающий
# с канон-вариантами смен, роняет билд. npm run check:dates.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"
python3 << 'PY'
import re,sys,os
src=open('src/data/shifts.ts',encoding='utf-8').read()
MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
iso=re.findall(r"startDate:\s*'(\d{4})-(\d{2})-(\d{2})'[\s\S]{0,80}?endDate:\s*'(\d{4})-(\d{2})-(\d{2})'",src)
canon=set()
for y1,m1,d1,y2,m2,d2 in iso:
    a_d,a_m,b_d,b_m=int(d1),int(m1),int(d2),int(m2)
    full=f"{a_d} {MON[a_m-1]} — {b_d} {MON[b_m-1]}"
    canon.add((a_d,a_m,b_d,b_m))
if not canon: print('❌ не нашёл смен в shifts.ts'); sys.exit(2)
ALLOW={(27,8,28,8),(26,8,27,8),(30,5,31,8)}  # репетитор-контекст, сезон работы
canon|=ALLOW
mon_idx={m:i+1 for i,m in enumerate(MON)}
DASH=r'[–—-]'
# формы: "D1 mon1 [-] D2 mon2"  и  "D1[-]D2 mon"
P_FULL=re.compile(r'(\d{1,2})\s+([а-яё]+)\s*'+DASH+r'\s*(\d{1,2})\s+([а-яё]+)')
P_SHORT=re.compile(r'(\d{1,2})\s*'+DASH+r'\s*(\d{1,2})\s+([а-яё]+)')
EXCL=('/demo/','/_archive','/corp/','/admin/','lanit','glass-','hyperui','design-','lager-na-osenie-kanikuly','lager-na-zimnie-kanikuly')
drift={}
def chk(p,line,i,m,a_d,a_m,b_d,b_m,tok):
    if a_m is None or b_m is None: return
    if (a_d,a_m,b_d,b_m) not in canon:
        drift.setdefault(p,[]).append((i,tok.strip()))
for base in ['src/pages','src/components','src/data/landings']:
    for root,_,files in os.walk(base):
        if any(x in root for x in EXCL): continue
        for fn in files:
            if not fn.endswith(('.astro','.ts','.md')): continue
            p=os.path.join(root,fn)
            if any(x in p for x in EXCL): continue
            for i,line in enumerate(open(p,encoding='utf-8'),1):
                for m in P_FULL.finditer(line):
                    a_m=mon_idx.get(m.group(2)); b_m=mon_idx.get(m.group(4))
                    chk(p,line,i,m,int(m.group(1)),a_m,int(m.group(3)),b_m,m.group(0))
                l2=P_FULL.sub(' ',line)  # убрать полные, чтобы short не дублировал
                for m in P_SHORT.finditer(l2):
                    mm=mon_idx.get(m.group(3))
                    chk(p,l2,i,m,int(m.group(1)),mm,int(m.group(2)),mm,m.group(0))
if drift:
    print('❌ ДРЕЙФ ДАТ СМЕН (нет такой смены в shifts.ts):')
    for p,hits in sorted(drift.items()):
        for ln,tok in hits[:4]: print(f'   {p}:{ln}  «{tok}»')
    print(f'\nФайлов с дрейфом: {len(drift)}. Канон-смены: см. startDate/endDate в shifts.ts.')
    sys.exit(1)
print('✅ Дрейфа дат смен нет.')
PY
