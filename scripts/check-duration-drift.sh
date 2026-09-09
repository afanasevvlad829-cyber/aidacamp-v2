#!/usr/bin/env bash
# Страж зашитой длительности смены. Источник — duration в src/data/shifts.ts.
#
# Правило: если в строке боевой страницы есть интерполяция, привязанная к смене
# (${PRICE_S3}, ${DATES_SHORT_S4}, ${VYCHET_MAX}, ${PRICE_MIN} и т.п.), то
# длительность в этой же строке обязана приходить из ${DAYS_*}, а не быть
# написанной цифрами. Иначе цена и дата едут за сменой, а «13 дней» остаётся.
#
# Инциденты:
#  · 07.09.2026 — PRICE_S3/DATES_S3 выводились из mainShifts[0]; вынос летних
#    смен в архив дал бы «Смена 3: 25–31 октября, 13 дней — 49 900 ₽».
#  · 27.08.2026 — осенние смены вошли в mainShifts, PRICE_MIN упал с 74 900 ₽
#    (10 дней) на 49 900 ₽ (7 дней), зашитая «10 дней» осталась на 93 строках.
#
# npm run check:durations
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"
python3 << 'PY'
import re, os, sys

# Интерполяции, привязанные к конкретной смене или к границе диапазона смен.
# Формы: ${X} в шаблонных строках .ts и {X} в разметке .astro.
MARKER = re.compile(
    r'\$?\{\s*(?:'
    r'PRICE_S\d+|DATES_S\d+|DATES_SHORT_S\d+|VYCHET_S\d+'
    r'|PRICE_MIN|PRICE_MAX|PRICE_RANGE|VYCHET_MAX'
    r'|PRICE_OSEN|PRICE_ZIMA|PRICE_VESNA|VYCHET_OSEN|VYCHET_ZIMA|VYCHET_VESNA'
    r')\s*[}\s]'
)
# Зашитая длительность: «13 дней», «10 дня», «7 день», «13-дневная», «10 дневную».
DURATION = re.compile(r'\d{1,2}\s*-?\s*(?:дней|дня|день|дневн\w*)')

EXCL = ('/demo/', '/_archive', '/corp/', '/admin/', 'src/data/shifts.ts',
        'src/data/shifts.test.ts', 'lanit', 'glass-', 'hyperui', 'design-')

# Законные исключения: цифра рядом с маркером смены означает НЕ длительность
# нашей смены. Формат: (путь, подстрока строки). Каждая — с объяснением;
# список держать коротким, иначе страж перестаёт что-либо значить.
ALLOW = {
    # «лагерь на 21 день» — поисковый запрос и название страницы, а не смена
    ('src/pages/chto-vzyat-v-lager-na-21.astro', 'лагерь на 21 день'),
    # диапазон цен по РЫНКУ, «за длинную (14 дней)» — про чужие лагеря, не про нас
    ('src/pages/stati/kuda-otdat-rebenka-na-leto.astro', 'до 90 000–100 000 ₽ за длинную'),
    # общее рассуждение, какая длительность подходит подростку, — не конкретная смена
    ('src/pages/lager-dlya-podrostkov.astro', 'подходят смены от 10 дней'),
    # «за 5–7 дней до старта» — срок отправки писем, не длительность смены
    ('src/pages/stati/lager-v-avguste.astro', 'за 5–7 дней до старта'),
}

def is_comment(line: str) -> bool:
    t = line.lstrip()
    return t.startswith(('//', '/*', '*', '{/*', '#'))

hits = {}
for base in ['src/pages', 'src/components', 'src/data', 'src/lib', 'src/scripts']:
    if not os.path.isdir(base):
        continue
    for root, _, files in os.walk(base):
        if any(x in root for x in EXCL):
            continue
        for fn in files:
            if not fn.endswith(('.astro', '.ts', '.md', '.json')):
                continue
            p = os.path.join(root, fn)
            if any(x in p for x in EXCL):
                continue
            for i, line in enumerate(open(p, encoding='utf-8'), 1):
                if is_comment(line):
                    continue
                if not MARKER.search(line):
                    continue
                m = DURATION.search(line)
                if not m:
                    continue
                if any(p == ap and sub in line for ap, sub in ALLOW):
                    continue
                hits.setdefault(p, []).append((i, m.group(0), line.strip()[:150]))

if hits:
    total = sum(len(v) for v in hits.values())
    print('❌ ЗАШИТАЯ ДЛИТЕЛЬНОСТЬ РЯДОМ С ДАННЫМИ СМЕНЫ:')
    for p, rows in sorted(hits.items()):
        for ln, tok, text in rows[:3]:
            print(f'   {p}:{ln}  «{tok}»')
            print(f'      {text}')
        if len(rows) > 3:
            print(f'   … и ещё {len(rows) - 3} в этом файле')
    print(f'\nВсего: {total} в {len(hits)} файлах.')
    print('Длительность берётся из shifts.ts: ${DAYS_S3}, ${DAYS_S4}, ${DAYS_MIN},')
    print('${DAYS_MAX}, ${VYCHET_MAX_DAYS} — не пишется цифрами рядом с ценой/датой.')
    sys.exit(1)
print('✅ Зашитой длительности рядом с данными смены нет.')
PY
