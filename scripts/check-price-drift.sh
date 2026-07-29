#!/usr/bin/env bash
# Страж дрейфа цен смен. Единственный источник — src/data/shifts.ts.
# Любая сумма-цена смены (40 000–200 000 ₽) на боевых страницах, которой
# НЕТ в shifts.ts и НЕТ в allowlist (суммы налог. вычета), роняет билд.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"
python3 << 'PY'
import re,sys,os
src=open('src/data/shifts.ts',encoding='utf-8').read()
canon={re.sub(r'\D','',m.group(1)) for m in re.finditer(r"price:\s*'([^']*)'",src)}
canon={c for c in canon if c}
if not canon: print('❌ нет цен в shifts.ts'); sys.exit(2)
# Пары (цена, дни) каждой смены — из блоков Shift (duration идёт раньше price)
pairs=re.findall(r"duration:\s*'(\d+)[^']*'[\s\S]{0,400}?price:\s*'([^']+)'",src)
edu_parts={str(max(int(re.sub(r'\D','',p))-3800*int(d),0)) for d,p in pairs}
# Бытовые части (3800₽/день × дни) — та же математика вычета в обратную сторону,
# встречается в прозе про вычет («бытовая часть — 49 400 ₽») наравне с edu_parts.
resid_parts={str(int(d)*3800) for d,p in pairs}
# ALLOW = образовательные+бытовые части (вычисляются, не хардкодятся) + лимиты НК РФ
ALLOW=edu_parts|resid_parts|{'110000','40000'}
EXCL=('/demo/','/_archive','dlya-kompaniy','lanit-v5','lanit-v6','design-v2','glass-','hyperui',
      'it-lager-vs-kruzhok','kak-provesti-leto-s-polzoy','skolko-stoit-detskiy-lager',
      'kuda-det-rebenka-letom','kuda-otdat-rebenka-na-leto','strakhovka-v-lager',
      'tarif-trevozhniy-roditel','nedorogoy-lager','putyovki-v-lager',
      '.test.','timeline/','staff-','heroVariants.test',
      # ниже — доп. находки при первом прогоне после расширения на src/data/src/scripts (Task 8):
      # рыночные/конкурентные цифры, НЕ цены АйДаКемп, случайно попадающие в диапазон 40k-110k ₽
      'luchshieCamps',       # /luchshie-detskie-lagerya — цены КОНКУРЕНТОВ (рейтинг), не наши
      'articles.json',       # агрегатор HTML статей блога — рыночные цифры в прозе (примеры
                              # других лагерей/расходов); реальные цены АйДаКемп в статьях уже
                              # заведены через getCurrentPrice() в JSON-LD (Task 3), не в тексте
      'kak-vybrat-lager',    # статья-гайд «как выбрать лагерь» — гипотетический пример скрытых
                              # доплат у ДРУГИХ лагерей («от 30 000 ₽» → «50 000 ₽»), не наша цена
      # ниже — доп. находки после подъёма верхней границы 110k→200k (страж лимита вычета 120 000):
      'TrevoznyjRoditel',    # сатирический тариф «Тревожный родитель» на главной — 150 000 ₽
                              # часть намеренной сатиры (см. память проекта), не цена путёвки
      'detskie-lagerya-v-mire',  # статья про лагеря в мире — цены Британии/др. стран (161 000 ₽ и т.д.)
      'gde-v-rossii-net-lagerey')  # статья-разбор — рыночный диапазон цен по РФ в целом (150 000 ₽)
P_RUB=re.compile(r'(\d{2,3}[   ]?\d{3})\s*₽')
# Naked-числа только в ценовом контексте — JSON-LD "price", basePrice, price:/price=
P_NAKED=re.compile(r'(?:"price"|\bprice\b|basePrice)\s*[:=]\s*["\']?(\d{5,6})\b')
drift={}
def check(p,i,v,tok):
    if not (40000<=int(v)<=200000): return
    if v in canon or v in ALLOW: return
    drift.setdefault(p,[]).append((i,tok.strip()))
for base in ['src/pages','src/components','src/lib','src/scripts','src/data']:
    for root,_,files in os.walk(base):
        if '_archive' in root or '/demo' in root: continue
        for fn in files:
            if not fn.endswith(('.astro','.md','.ts','.tsx','.json')): continue
            p=os.path.join(root,fn)
            if p.endswith(('shifts.ts','dynamicPrices.ts')): continue
            if any(x in p for x in EXCL): continue
            for i,line in enumerate(open(p,encoding='utf-8'),1):
                for m in P_RUB.finditer(line): check(p,i,re.sub(r'\D','',m.group(1)),m.group(0))
                for m in P_NAKED.finditer(line): check(p,i,m.group(1),m.group(0))
if drift:
    print('❌ ДРЕЙФ ЦЕН СМЕН (нет в shifts.ts; каноны: '+', '.join(sorted(canon))+'):')
    for p,hits in sorted(drift.items()):
        for ln,tok in hits: print(f'   {p}:{ln}  «{tok}»')
    print(f'\nФайлов с дрейфом: {len(drift)}. Привести к канону shifts.ts.')
    sys.exit(1)
print(f'✅ Дрейфа цен смен нет. Каноны: {", ".join(str(c) for c in sorted(int(x) for x in canon))} ₽')
PY
