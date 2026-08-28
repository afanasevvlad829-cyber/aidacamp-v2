#!/usr/bin/env bash
# Страж дрейфа цены трансфера. Единственный источник — TRANSFER_PRICE в src/data/shifts.ts.
# Инцидент: на 5 гео-лендингах (balashiha, lubertsy, krasnogorsk, zelenograd,
# zagorodnyj-lager) цена трансфера от м. Солнцево была захардкожена отдельной
# строкой в каждом файле — часть копий разошлась и стала утверждать «бесплатно»,
# пока остальные говорили «2000₽». Любое хардкоженное «2 000 ₽» на боевых
# страницах — дрейф: использовать TRANSFER_PRICE_FMT / TRANSFER_INFO из shifts.ts.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"
python3 << 'PY'
import re, sys, os

EXCL_FILE = {
    'src/data/shifts.ts',
    # "2000 ₽" здесь — не трансфер: игровая валюта (приз за конкурс "лучшая комната")
    'src/lib/portalActivities.ts',
    # "2000 ₽" здесь — не трансфер: строки таблицы структуры себестоимости путёвки
    'src/pages/stati/nedorogoy-lager.astro',
}
# исключаемые пути: demo/архив/корп/эксперименты (не боевые SEO-страницы) — как в check-price-drift.sh
EXCL_DIR = ('/demo/', '/_archive', '/corp/', 'dlya-kompaniy', 'lanit-v5', 'design-v2')
# "2 000 ₽" / "2000 ₽" / "2000₽", но не "12 000 ₽" / "20 000 ₽" (нет цифры перед и после)
PRICE = re.compile(r'(?<!\d)2[\s  ]?000\s*₽(?!\d)')

drift = {}
for base in ['src/pages', 'src/data', 'src/components', 'src/lib']:
    for root, _, files in os.walk(base):
        if any(x.strip('/') in root for x in EXCL_DIR):
            continue
        for fn in files:
            if not fn.endswith(('.astro', '.md', '.ts', '.tsx')):
                continue
            p = os.path.join(root, fn)
            if p in EXCL_FILE or any(x in p for x in EXCL_DIR):
                continue
            for i, line in enumerate(open(p, encoding='utf-8'), 1):
                for m in PRICE.finditer(line):
                    drift.setdefault(p, []).append((i, m.group(0).strip()))
if drift:
    print('❌ ДРЕЙФ ЦЕНЫ ТРАНСФЕРА (хардкод вместо TRANSFER_PRICE_FMT/TRANSFER_INFO из src/data/shifts.ts):')
    for p, hits in sorted(drift.items()):
        for ln, tok in hits:
            print(f'   {p}:{ln}  «{tok}»')
    print(f'\nФайлов с дрейфом: {len(drift)}. Использовать ${{TRANSFER_PRICE_FMT}} / ${{TRANSFER_INFO}} из src/data/shifts.ts.')
    sys.exit(1)
print('✅ Дрейфа цены трансфера нет. Канон: 2 000 ₽ (TRANSFER_PRICE, src/data/shifts.ts).')
PY
