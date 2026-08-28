#!/usr/bin/env bash
# Страж дрейфа цен смен. Единственный источник — src/data/shifts.ts.
# Любая сумма-цена смены (40 000–100 000 ₽) на боевых страницах, которой
# НЕТ в shifts.ts и НЕТ в allowlist (суммы налог. вычета), роняет билд.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"
python3 << 'PY'
import re,sys,os
src=open('src/data/shifts.ts',encoding='utf-8').read()
canon={re.sub(r'\D','',m.group(1)) for m in re.finditer(r"price:\s*'([^']*)'",src)}
canon={c for c in canon if c}
if not canon: print('❌ нет цен в shifts.ts'); sys.exit(2)
# allowlist: суммы налогового вычета (база/лимиты/нетто), НЕ цены смен
# 45800 = образоват. часть Смены 2 (99000−53200); 47900 = образоват. часть Смены 1 (85900−38000)
ALLOW={'40000','41800','44600','45800','47900','49400','50000','53200','89600','110000'}
# исключаемые пути: demo/архив/корп/эксперименты (не боевые SEO-страницы)
EXCL=('/demo/','/_archive','/corp/','dlya-kompaniy','lanit-v5','design-v2','glass-','hyperui','CorpHero','CorpShifts','it-lager-vs-kruzhok','kak-provesti-leto-s-polzoy','skolko-stoit-detskiy-lager','kuda-det-rebenka-letom','kuda-otdat-rebenka-na-leto','strakhovka-v-lager','tarif-trevozhniy-roditel','nedorogoy-lager','putyovki-v-lager')
PRICE=re.compile(r'(\d{2,3}[   ]?\d{3})\s*₽')
drift={}
# src/lib добавлен 17.07.2026: промпты AI-бота (src/lib/ai) называли клиентам захардкоженные цены
for base in ['src/pages','src/components','src/lib']:
    for root,_,files in os.walk(base):
        if '_archive' in root or '/demo' in root or '/corp' in root: continue
        for fn in files:
            if not fn.endswith(('.astro','.md','.ts','.tsx')): continue
            p=os.path.join(root,fn)
            if any(x in p for x in EXCL): continue
            for i,line in enumerate(open(p,encoding='utf-8'),1):
                for m in PRICE.finditer(line):
                    v=re.sub(r'\D','',m.group(1))
                    if not (40000<=int(v)<=110000): continue
                    if v in canon or v in ALLOW: continue
                    drift.setdefault(p,[]).append((i,m.group(0).strip()))
if drift:
    print('❌ ДРЕЙФ ЦЕН СМЕН (нет в shifts.ts; каноны: '+', '.join(sorted(canon))+'):')
    for p,hits in sorted(drift.items()):
        for ln,tok in hits: print(f'   {p}:{ln}  «{tok}»')
    print(f'\nФайлов с дрейфом: {len(drift)}. Привести к канону shifts.ts.')
    sys.exit(1)
print(f'✅ Дрейфа цен смен нет. Каноны: {", ".join(str(c) for c in sorted(int(x) for x in canon))} ₽')
PY
