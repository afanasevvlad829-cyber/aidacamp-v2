#!/usr/bin/env bash
# Страж эвергрина. Ловит захардкоженные СЕЗОННЫЕ фразы в прозе, которые должны
# браться из src/data/evergreen.ts (иначе устареют сами). npm run check:evergreen.
#
# Ловит:
#   1) диапазон месяцев сезона: «май–август», «июнь–август» (тире между летними месяцами)
#   2) «с <месяц> по <месяц>» (сезонный оборот)
#   3) счётчик смен прописью: «две смены», «шесть смен» и т.п.
#
# Источник правды — evergreen.ts. Комментарии, отзывы, тесты, промпт бота,
# межсезонные лендинги и осознанные идиомы — в ALLOW.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"
python3 << 'PY'
import re, os, sys

MON = r'(?:май|мая|июн[ья]|июл[ья]|август[а]?)'
DASH = r'[–—-]'
# 1) месяц–месяц через тире
P_RANGE = re.compile(rf'{MON}\s*{DASH}\s*{MON}', re.I)
# 2) с <месяц> по <месяц>
P_FROMTO = re.compile(rf'\bс\s+(?:конца\s+)?{MON}\s+по\s+{MON}', re.I)
# 3) N смен прописью
P_COUNT = re.compile(r'\b(одн[ау]|две|дву[хм]|три|четыр[её]|пять|шесть|семь|восемь)\s+смен(?:а|ы|)\b', re.I)

BASES = ['src/pages', 'src/components', 'src/data/landings']
# файлы/пути-исключения
EXCL_PATH = ('/admin/', 'staff-plan', 'gbp-posts', 'lanit',
             'lager-na-osennie-kanikuly', 'lager-na-zimnie-kanikuly',
             'lager-na-vesennie-kanikuly', '.test.')
# осознанные идиомы и не-сезонные вхождения (подстрока в контексте совпадения — пропускаем)
ALLOW_SUBSTR = (
    'одна смена',            # «одна смена ≈ 3–4 месяца онлайн-курса» — идиома, не счётчик
    'смены подряд',          # «две/три смены подряд» — сравнение пользы, не счётчик открытых
    'за две смены',          # то же
    'смены мая',             # «четыре смены мая–июля уже прошли» — историческое число прошедших
    'уже прошли',            # исторический счётчик прошедших смен (не открытые)
    'evergreen',             # импорт/использование константы
)

# Точечный allow: (подстрока-имени-файла, фрагмент в н.р.) — законные НЕ-сезонные вхождения,
# проверенные вручную. Каждая пара — осознанное решение, не глушим файл целиком.
ALLOW_PAIRS = {
    ('seotextblock.astro', 'май–июнь'),                 # фаза-метка «Май–июнь {год}» (усталость к концу учёбы)
    ('lager-dlya-shkolnikov.astro', 'май — июнь'),      # та же фаза-метка усталости
    ('lager-dlya-podrostkov.astro', 'четыре смены'),    # 4 ОСНОВНЫЕ смены (каталог), не открытые/сезон
    ('lager-na-iyun.astro', 'четыре смены'),            # историческое «в июне работали четыре смены»
    ('lager-na-kanikuly.astro', 'три смены'),           # цитата мамы в отзыве
    ('lager-na-kanikuly.astro', 'две смены'),           # цитата мамы в отзыве
    ('dokumenty-dlya-rebenka-v-lager.astro', 'май–июнь'),  # «в пик сезона (май–июнь) педиатры загружены»
    ('kak-provesti-leto-s-polzoy.astro', 'июль–август'),   # «июль–август — дача или море» (жизненный совет)
    ('lager-v-avguste.astro', 'двух смен'),             # «расписание отточено после двух смен»
    ('periody-smeny-v-lagere.astro', 'две смены'),      # FAQ-вопрос «сразу на две смены» (совет о брони)
    ('skolko-stoit-detskiy-lager.astro', 'май–июнь'),   # метка дат смены-1 (30 мая–8 июня)
}

def is_comment(line):
    s = line.strip()
    return s.startswith(('//', '/*', '*', '{/*'))

drift = {}
for base in BASES:
    for root, _, files in os.walk(base):
        if any(x in root for x in EXCL_PATH): continue
        for fn in files:
            if not fn.endswith(('.astro', '.ts', '.json')): continue
            p = os.path.join(root, fn)
            if any(x in p for x in EXCL_PATH): continue
            for i, line in enumerate(open(p, encoding='utf-8'), 1):
                if is_comment(line): continue
                low = line.lower()
                if any(a in low for a in ALLOW_SUBSTR):
                    # не глушим всю строку слепо: гасим только если совпадение ВНУТРИ allow-идиомы
                    pass
                bn = os.path.basename(p).lower()
                for rx, tag in ((P_RANGE,'месяц–месяц'),(P_FROMTO,'с..по..'),(P_COUNT,'N смен')):
                    for m in rx.finditer(line):
                        frag = m.group(0)
                        ctx = low[max(0,m.start()-16):m.end()+16]
                        if any(a in ctx for a in ALLOW_SUBSTR): continue
                        if (bn, frag.strip().lower()) in ALLOW_PAIRS: continue
                        drift.setdefault(p, []).append((i, tag, frag.strip()))

if drift:
    print('❌ ЭВЕРГРИН-ДРЕЙФ (сезонная фраза захардкожена — брать из evergreen.ts):')
    for p, hits in sorted(drift.items()):
        for ln, tag, frag in hits[:5]:
            print(f'   {p}:{ln}  [{tag}]  «{frag}»')
    print(f'\nФайлов: {len(drift)}. Замени литерал на константу из src/data/evergreen.ts')
    sys.exit(1)
print('✅ Эвергрин-дрейфа нет.')
PY
