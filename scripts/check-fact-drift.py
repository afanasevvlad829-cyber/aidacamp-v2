#!/usr/bin/env python3
"""Страж фактов в клиентских текстах (рычаг 5, спека 2026-09-30).
Реестр: src/data/contacts.ts (STAT_*), src/data/forbidden-claims.json, src/data/reviews*.ts.
Правила: year, distance, rating, claim:<id>, named-review, scarcity. --selftest — проверка самих правил."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCAN = ['src/pages', 'src/components', 'src/layouts', 'src/data', 'src/lib']
EXTS = ('.astro', '.ts', '.tsx', '.md', '.mdx', '.json')
EXCL_DIR = ('/demo/', '/_archive', '/admin/', '/portal/', '/staff/', '/corp/')
EXCL_FILE = {
    'src/data/articles.json',          # генерируется npm run articles из собранных страниц
    'src/data/contacts.ts', 'src/data/locations.ts', 'src/data/forbidden-claims.json',
    'src/pages/ask-test.astro',        # тестовый стенд бота, не боевая страница
}

def read(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()

def registry():
    c = read('src/data/contacts.ts')
    year = re.search(r"STAT_FOUNDED_YEAR\s*=\s*'(\d{4})'", c).group(1)
    rating = re.search(r"STAT_RATING\s*=\s*'([\d.]+)'", c).group(1)
    names = set()
    for f in os.listdir(os.path.join(ROOT, 'src/data')):
        if f.startswith('reviews') and f.endswith('.ts') and not f.endswith('.test.ts'):
            names |= set(re.findall(r"name:\s*'([^']+)'", read('src/data/' + f)))
    claims = json.loads(read('src/data/forbidden-claims.json'))
    return year, rating, {n.split()[0].lower() for n in names}, claims

SELF = re.compile(r'АйДаКемп|\bработаем\b|\bмы\b|\bнаш[а-яё]*|через лагерь', re.I)
SELF_AFTER = re.compile(r'\bмы\b|\bнаш[а-яё]*|через лагерь', re.I)  # после года бренд не считаем: «…с 2015 года, но до лагеря АйДаКемп»
def rules(year, rating, first_names, claims):
    out = []
    # year: «с 20XX года» рядом с утверждением о себе, год ≠ реестра
    rx_year = re.compile(r'[Сс]\s+(20\d\d)\s+год')
    def year_check(line):
        for m in rx_year.finditer(line):
            before = re.split(r'[.!?]\s', line[:m.start()])[-1]      # начало того же предложения
            after = re.split(r'[.!?]\s', line[m.end(): m.end() + 60])[0]
            if m.group(1) != year and (SELF.search(before) or SELF_AFTER.search(after)):
                yield m.group(0), f'год основания — {year}: использовать ${{STAT_FOUNDED_YEAR}}'
    out.append(('year', year_check))
    # distance: «от Москвы» после 66 км или STAT_DISTANCE
    rx_dist = re.compile(r'(?:66\s*км|STAT_DISTANCE\}?)\s+от\s+Москвы')
    out.append(('distance', lambda l: ((m.group(0), 'летняя база — 66 км от МКАД: ${STAT_DISTANCE_FULL}') for m in rx_dist.finditer(l))))
    # rating: число рядом со звездой/Яндексом ≠ STAT_RATING
    rx_rate = re.compile(r'(?<![\d.,])([1-5][.,]\d)\s*(?:★|на Яндекс)')
    def rate_check(line):
        for m in rx_rate.finditer(line):
            if m.group(1).replace(',', '.') != rating:
                yield m.group(0), f'рейтинг на Яндекс.Картах — {rating}: ${{STAT_RATING}}'
    out.append(('rating', rate_check))
    # запретные утверждения
    for c in claims:
        rx = re.compile(c['pattern'], re.I)
        out.append((f"claim:{c['id']}", (lambda rx, c: lambda l: ((m.group(0), f"{c['reason']} → {c['fix']}") for m in rx.finditer(l)))(rx, c)))
    # именной отзыв вне reviews*.ts
    rx_rev = [re.compile(r'[—–]\s*(?:<[^>]+>\s*)*([А-ЯЁ][а-яё]{2,})(?:\s+[А-ЯЁ]\.?)?\s*,\s*(?:мама|папа|мать|отец|бабушка)\b'),
              re.compile(r'[—–]\s*(?:мама|папа)\s+([А-ЯЁ][а-яё]{2,})')]
    def rev_check(line):
        for rx in rx_rev:
            for m in rx.finditer(line):
                if m.group(1).lower() not in first_names:
                    yield m.group(0), 'именной отзыв только из src/data/reviews*.ts (дословно), иначе удалить'
    out.append(('named-review', rev_check))
    # «последние места» литералом, мимо данных смен
    rx_sc = re.compile(r'последни[ех]\s+мест|мест[а]?\s+почти\s+нет|осталось\s+\d+\s+мест', re.I)
    def sc_check(line):
        if re.match(r'\s*(//|\*|/\*)', line): return
        for m in rx_sc.finditer(line):
            yield m.group(0), 'наличие мест — только из shifts.ts (getAvailabilityLabel / getBookingCta)'
    out.append(('scarcity', sc_check))
    return out

def scan(rs):
    bad = []
    for base in SCAN:
        for r, _, fs in os.walk(os.path.join(ROOT, base)):
            rel_dir = os.path.relpath(r, ROOT) + '/'
            if any(x in '/' + rel_dir for x in EXCL_DIR): continue
            for f in fs:
                p = os.path.join(rel_dir, f).replace('./', '')
                if not f.endswith(EXTS) or f.endswith('.test.ts') or p in EXCL_FILE: continue
                if f.startswith('reviews') or p in ('src/data/shifts.ts', 'src/data/dynamicPrices.ts'): 
                    rs_file = [x for x in rs if x[0] not in ('named-review', 'scarcity')]
                else:
                    rs_file = rs
                for i, line in enumerate(read(p).splitlines(), 1):
                    for name, fn in rs_file:
                        for frag, fix in fn(line):
                            bad.append(f'   {p}:{i}  [{name}] «{frag}» → {fix}')
    return bad

SELFTEST = [  # (правило, строка, должно_сработать)
    ('year', 'АйДаКемп работает с 2019 года', True),
    ('year', 'АйДаКемп работает с 2021 года', False),
    ('year', 'Артек с 1925 года принимает детей', False),
    ('year', 'Железнодорожный с 2015 года входит в округ Балашиха, но маршрут до лагеря АйДаКемп', False),
    ('year', 'С 2024 года работает Pass Colo — субсидия детям', False),
    ('year', 'С 2019 года мы оформляли корпоративные программы', True),
    ('year', '— АйДаКемп работает в этом формате с 2019 года.', True),
    ('year', 'с 2022 года — больше 1200 ребят через лагерь и школу', True),
    ('distance', 'Лагерь в 66 км от Москвы', True),
    ('distance', '`${STAT_DISTANCE} от Москвы`', True),
    ('distance', 'Лагерь в 66 км от МКАД', False),
    ('rating', 'рейтинг 4.9 на Яндекс.Картах', True),
    ('rating', 'рейтинг 5.0 на Яндекс.Картах', False),
    ('claim:rassrochka', 'Можно оплатить в рассрочку', True),
    ('claim:shved-stol', 'Шведский стол в лагере', True),
    ('claim:master-klass', 'вечерние мастер-классы', True),
    ('named-review', '— Светлана, мама Артёма, 11 лет', True),
    ('named-review', '— мама Полины', True),
    ('named-review', '— Надежда Ш., мама', False),
    ('scarcity', 'Срочно: последние места — лето заканчивается', True),
    ('scarcity', '// было захардкожено "Осталось 3 места"', False),
    ('scarcity', 'Хакатон в последние два дня смены', False),
]

def selftest(rs):
    by = dict(rs); fails = 0
    for name, line, expect in SELFTEST:
        got = any(True for _ in by[name](line))
        if got != expect:
            fails += 1; print(f'SELFTEST FAIL [{name}] expect={expect}: {line}')
    print('✅ selftest ok' if not fails else f'❌ selftest: {fails} fail'); return fails == 0

if __name__ == '__main__':
    year, rating, names, claims = registry()
    rs = rules(year, rating, names, claims)
    if '--selftest' in sys.argv:
        sys.exit(0 if selftest(rs) else 1)
    bad = scan(rs)
    if bad:
        print('❌ ДРЕЙФ ФАКТОВ (реестр: src/data/contacts.ts, forbidden-claims.json, reviews*.ts):')
        print('\n'.join(bad)); print(f'\nНарушений: {len(bad)}'); sys.exit(1)
    print(f'✅ Факты сходятся с реестром (год {year}, рейтинг {rating}, 66 км от МКАД).')
