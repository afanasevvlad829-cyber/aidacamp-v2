#!/usr/bin/env python3
"""
Сигнатура эвергрин-состояния: что на сегодня влияет на сезонную ПРОЗУ.
Меняется РОВНО тогда, когда смена пересекла границу (началась/закончилась),
т.е. когда рендер «две смены»/«майские прошли» стал бы другим.

Плановый workflow (.github/workflows/evergreen-refresh.yml) сравнивает вывод
с .github/evergreen-state; при отличии коммитит марк-файл в dev → это триггерит
обычный деплой, и статический сайт пересобирается со свежей датой.

Источник дат — startDate/endDate в src/data/shifts.ts (единый источник смен).
Чистый stdlib, без TS/node — чтобы работать в любом CI-раннере.
"""
import re, sys, datetime, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'src/data/shifts.ts').read_text(encoding='utf-8')

# все пары startDate/endDate (включая под-смены — как в allShiftsIncludingArchived)
pairs = re.findall(
    r"startDate:\s*'(\d{4}-\d{2}-\d{2})'[\s\S]{0,120}?endDate:\s*'(\d{4}-\d{2}-\d{2})'",
    src,
)
if not pairs:
    print("ERROR: смены не найдены в shifts.ts", file=sys.stderr); sys.exit(2)

today = (sys.argv[1] if len(sys.argv) > 1
         else datetime.date.today().isoformat())

# Только ЛЕТНИЙ сезон (месяцы 5–9): evergreen.ts выводит константы из
# allShiftsIncludingArchived — это летние смены. Межсезонные (окт/дек/март)
# живут в отдельных константах и на летнюю прозу не влияют.
summer = [(s, e) for s, e in pairs if 5 <= int(s[5:7]) <= 9]
if not summer:
    print("ERROR: летние смены не найдены", file=sys.stderr); sys.exit(2)

open_cnt = 0
open_months, past_months = set(), set()
for start, end in summer:
    sm, em = int(start[5:7]), int(end[5:7])
    if start >= today:                      # ещё не началась → открыта
        open_cnt += 1; open_months.add(sm); open_months.add(em)
    elif end < today:                       # закончилась → прошла
        past_months.add(sm); past_months.add(em)

# сигнатура: всё, от чего зависит сезонная проза
sig = f"open={open_cnt};openM={sorted(open_months)};pastM={sorted(past_months)};total={len(summer)}"
print(sig)
