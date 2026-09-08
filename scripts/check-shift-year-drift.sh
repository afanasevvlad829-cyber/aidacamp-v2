#!/usr/bin/env bash
# check-shift-year-drift.sh — глобальный год рядом с данными КОНКРЕТНОЙ смены.
#
# Зачем (08.09.2026). SEASON_YEAR — год ТЕКУЩЕГО сезона, одна константа на весь
# сайт. Пока в mainShifts было только лето, подставлять её к любой смене было
# безобидно. 27.08.2026 туда добавили осенние и зимнюю смены — и допущение
# сломалось сразу в трёх местах:
#
#   shifts/[id].astro   «Зимняя смена: летняя смена ... 30 декабря — 8 января 2026»
#                       (смена идёт 2026-12-30 — 2027-01-08, «8 января 2026» не бывает)
#   SchemaOrg.astro     событие «Зимняя смена — АйДаКемп 2026» при endDate 2027-01-08 —
#                       имя противоречило датам в тех же данных, и это читает поисковик
#   AgeBar.astro        блок был зашит на смены 3/4 и предлагал завершённую смену
#
# Правило простое: если в одной строке рендерятся поля конкретной смены
# (shift.dates, shift.name, s.startDate и т.п.) И тут же стоит SEASON_YEAR —
# это почти наверняка ошибка. Год смены надо брать из неё самой:
# shiftYearLabel(shift) вернёт «2026» или «2026/2027» для смены через Новый год.
#
# Проверка намеренно узкая — по совпадению в ОДНОЙ строке. Файл, где SEASON_YEAR
# и смены просто соседствуют в разных местах, не ловится: там это законно
# (например, общий заголовок сезона рядом со списком смен).

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"

python3 << 'PY'
import os, re, sys

SHIFT_FIELD = re.compile(r'\b(?:shift|s|sh)\.(?:name|dates|duration|price|startDate|endDate|id)\b')
SEASON = re.compile(r'\bSEASON_YEAR\b')
SKIP_DIR = ('/demo/', '/_archive', '/prototype/', 'node_modules')

hits = []
for base in ('src/pages', 'src/components', 'src/layouts', 'src/data'):
    for root, _, files in os.walk(base):
        if any(sd in root for sd in SKIP_DIR):
            continue
        for fn in files:
            if not fn.endswith(('.astro', '.ts', '.tsx')):
                continue
            path = os.path.join(root, fn)
            try:
                lines = open(path, encoding='utf-8').read().splitlines()
            except Exception:
                continue
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                # комментарии не считаем — там SEASON_YEAR законно упоминают в объяснениях
                if stripped.startswith(('//', '*', '/*', '#', '<!--')):
                    continue
                if SEASON.search(line) and SHIFT_FIELD.search(line):
                    hits.append((path, i, stripped[:110]))

if hits:
    print('❌ ГОД СМЕНЫ ИЗ ГЛОБАЛЬНОЙ КОНСТАНТЫ (бери shiftYearLabel(shift), а не SEASON_YEAR):')
    for p, i, txt in hits:
        print(f'   {p}:{i}  {txt}')
    print(f'\nМест: {len(hits)}. У смены есть свои startDate/endDate — год берётся из них.')
    print('Смена через Новый год (2026-12-30 — 2027-01-08) даёт «2026/2027», SEASON_YEAR даст «2026».')
    sys.exit(1)

print('✅ Глобального года рядом с данными смены нет.')
PY
