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
ALLOW={(27,8,28,8),(26,8,27,8),(30,5,31,8),
       (28,12,30,12),(8,1,10,1)}  # репетитор-контекст, сезон работы, хедж «ориентировочно» зимней смены (seasons.ts)
canon|=ALLOW
mon_idx={m:i+1 for i,m in enumerate(MON)}
DASH=r'[–—-]'
# формы: "D1 mon1 [-] D2 mon2"  и  "D1[-]D2 mon"
P_FULL=re.compile(r'(\d{1,2})\s+([а-яё]+)\s*'+DASH+r'\s*(\d{1,2})\s+([а-яё]+)')
P_SHORT=re.compile(r'(\d{1,2})\s*'+DASH+r'\s*(\d{1,2})\s+([а-яё]+)')
# ISO-литералы в диапазоне сезона, не совпадающие с канон-датами смен.
# Только ЛЕТНИЕ смены (до блока «Осень 2026» в файле) — иначе lo/hi утекают в
# межсезонные предзаписи (АВГ→АПР следующего года) и ломают season_bounds ниже:
# те блоки — предварительные (allShiftsIncludingArchived их не включает, см. shifts.ts).
_summer_src=src.split('Осень 2026')[0]
iso_canon=set(re.findall(r"(?:startDate|endDate):\s*'(\d{4}-\d{2}-\d{2})'",_summer_src))
lo,hi=min(iso_canon),max(iso_canon)
P_ISO=re.compile(r"['\"](\d{4}-\d{2}-\d{2})['\"]")
CTX_OK=re.compile(r'datePublished|dateModified|validFrom|validThrough|uploadDate|TODAY|Сборк')
# Форма «с 30 мая по 26 августа» — сверяем с канон-диапазонами и границами сезона
P_S_PO=re.compile(r'с\s+(\d{1,2})\s+([а-яё]+)\s+по\s+(\d{1,2})\s+([а-яё]+)')
season_bounds=(int(lo[8:10]),int(lo[5:7]),int(hi[8:10]),int(hi[5:7]))
EXCL=('/demo/','/_archive','/corp/','/admin/','lanit','glass-','hyperui','design-',
      'lager-na-osennie-kanikuly','lager-na-zimnie-kanikuly','lager-na-vesennie-kanikuly',
      'timeline/','staff-','reviews','kak-proshla','.test.','seasons.ts','pamyatkaShifts',
      # ниже — доп. находки при первом прогоне после расширения на src/data/src/scripts (Task 8):
      # реестры дат ПУБЛИКАЦИИ статей / снепшотов просмотров — не даты смен, ISO-литералы
      # случайно попадают в летний диапазон
      'articleDates.ts', 'articleViews.ts',
      # доп. находка после расширения стража на .json (Task 9): articles.json — тот же
      # реестр дат публикации статей (поле "date"), просто в JSON, а не в .ts
      'articles.json')
drift={}
def is_comment(line):
    s=line.strip()
    return s.startswith(('//','/*','*','{/*'))
def chk(p,line,i,m,a_d,a_m,b_d,b_m,tok):
    if a_m is None or b_m is None: return
    if (a_d,a_m,b_d,b_m) not in canon:
        drift.setdefault(p,[]).append((i,tok.strip()))
# src/lib добавлен 17.07.2026: промпты AI-бота (src/lib/ai) содержали захардкоженные даты смен
# src/data, src/scripts добавлены Task 8 (17.07.2026 → расширение стража на новые каталоги)
# .json добавлен 29.07.2026: hero-variants.json — канон hero-текстов с сезонными
# плейсхолдерами — не сканировался ни одним стражем
for base in ['src/pages','src/components','src/data','src/scripts','src/lib']:
    for root,_,files in os.walk(base):
        if any(x in root for x in EXCL): continue
        for fn in files:
            if not fn.endswith(('.astro','.ts','.md','.json')): continue
            p=os.path.join(root,fn)
            if any(x in p for x in EXCL): continue
            for i,line in enumerate(open(p,encoding='utf-8'),1):
                if is_comment(line): continue
                for m in P_FULL.finditer(line):
                    a_m=mon_idx.get(m.group(2)); b_m=mon_idx.get(m.group(4))
                    chk(p,line,i,m,int(m.group(1)),a_m,int(m.group(3)),b_m,m.group(0))
                l2=P_FULL.sub(' ',line)  # убрать полные, чтобы short не дублировал
                for m in P_SHORT.finditer(l2):
                    mm=mon_idx.get(m.group(3))
                    chk(p,l2,i,m,int(m.group(1)),mm,int(m.group(2)),mm,m.group(0))
                if not CTX_OK.search(line):
                    for m in P_ISO.finditer(line):
                        v=m.group(1)
                        if lo<=v<=hi and v not in iso_canon:
                            drift.setdefault(p,[]).append((i,m.group(0)))
                for m in P_S_PO.finditer(line):
                    a_m=mon_idx.get(m.group(2)); b_m=mon_idx.get(m.group(4))
                    if a_m and b_m:
                        t=(int(m.group(1)),a_m,int(m.group(3)),b_m)
                        if t not in canon and t!=season_bounds:
                            drift.setdefault(p,[]).append((i,m.group(0)))
if drift:
    print('❌ ДРЕЙФ ДАТ СМЕН (нет такой смены в shifts.ts):')
    for p,hits in sorted(drift.items()):
        for ln,tok in hits[:4]: print(f'   {p}:{ln}  «{tok}»')
    print(f'\nФайлов с дрейфом: {len(drift)}. Канон-смены: см. startDate/endDate в shifts.ts.')
    sys.exit(1)
print('✅ Дрейфа дат смен нет.')
PY
