#!/bin/bash
# Guard: правила из CLAUDE.md, которые выразимы механически.
#
# Принцип: правило, живущее только прозой в CLAUDE.md, — это правило, которое нарушат.
# Здесь только то, что греп проверяет ТОЧНО. Где греп может соврать — правило остаётся
# прозой, и это осознанный выбор: врущий гейт хуже отсутствующего (его выключат вместе
# с доверием к остальным стражам).
#
# Проверки (все hard-fail, exit 1):
#   1. canonical без завершающего слеша     — инцидент 03.07.2026 (98 страниц → 301 → выпадение из Яндекса)
#   2. .test.ts под src/pages               — ломает билд Astro (Astro считает файл страницей)
#   3. мёртвые суммы вычета 5 434 / 9 737   — инцидент апреля 2026 (28 страниц)
#
# СОЗНАТЕЛЬНО НЕ ПРОВЕРЯЕТСЯ здесь — «медиа не копировать в client/» (CLAUDE.md, 02.07.2026).
# Правило уже вшито в scripts/deploy.sh (--exclude images/ videos/ в rsync до client/), и
# статически в репо ловить нечего. Проверка «строка --exclude есть в deploy.sh» была написана
# и выброшена: вхождений три, удаление одного она не замечала и рапортовала ✅ — то есть давала
# ложную уверенность. Сделать её точной можно только разбором rsync-блоков, а это хрупко.
#
# Запускается из `npm run guard` (а он — первым шагом `npm run build`).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

python3 << 'PY'
import os, re, sys

errors = []

# ─────────────────────────────────────────────────────────────────────────────
# 1. canonical без завершающего слеша.
#
# Сайт отдаётся в dir-формате: /ceny/ — 200, /ceny — 301 на /ceny/. Значит canonical,
# указывающий на бесслешевую версию, — это «canonical → 301», противоречивый сигнал.
# Инцидент 03.07.2026: так было на 98 страницах, aidacamp выпал из Яндекса.
#
# Правильный путь — ensureTrailingSlash() в src/utils/canonical.ts (Base.astro его зовёт).
# Но страница может нарисовать <link rel="canonical"> руками в обход лейаута — так уже
# сделано в src/pages/ask.astro (у неё свой <html>, и это легально).
#
# Поэтому проверяем не «есть ли хардкод», а «ведёт ли хардкод на бесслешевый URL» —
# механически точно и не трогает легальный ask.astro (у него слеш на месте).
CANONICAL = re.compile(r'rel=["\']canonical["\'][^>]*href=["\']([^"\'{}]+)["\']', re.IGNORECASE)

for root, dirs, files in os.walk('src'):
    if 'demo' in root:  # src/pages/demo/design-system.astro — витрина дизайн-системы, не страница
        continue
    for fn in files:
        if not fn.endswith('.astro'):
            continue
        path = os.path.join(root, fn)
        with open(path, encoding='utf-8') as fp:
            for i, line in enumerate(fp, 1):
                m = CANONICAL.search(line)
                if not m:
                    continue
                href = m.group(1)
                # Отрезаем query/hash — слеш нужен в конце пути, а не строки
                path_part = href.split('?')[0].split('#')[0]
                last = path_part.rstrip('/').split('/')[-1]
                # Реальный файл (.html/.xml) — это не директория, слеш не нужен
                if '.' in last and not path_part.endswith('/'):
                    continue
                if not path_part.endswith('/'):
                    errors.append(
                        f'❌ {path}:{i} — canonical без слеша: «{href}»\n'
                        f'     Бесслешевый URL 301-редиректит → canonical указывает на редирект.\n'
                        f'     Поставь слеш или зови ensureTrailingSlash() (src/utils/canonical.ts).'
                    )

# ─────────────────────────────────────────────────────────────────────────────
# 2. Тесты под src/pages.
#
# Astro считает КАЖДЫЙ файл в src/pages маршрутом. .test.ts там роняет билд.
# Тесты живут рядом с исходником в src/lib или в tests/.
for root, dirs, files in os.walk('src/pages'):
    for fn in files:
        if re.search(r'\.(test|spec)\.(ts|tsx|mjs|js)$', fn):
            path = os.path.join(root, fn)
            errors.append(
                f'❌ {path} — тест внутри src/pages ломает билд Astro.\n'
                f'     Astro считает любой файл в src/pages маршрутом. Перенеси в src/lib/ или tests/.'
            )

# ─────────────────────────────────────────────────────────────────────────────
# 3. Мёртвые суммы налогового вычета.
#
# CLAUDE.md → «Налоговый вычет» называет эти цифры устаревшими поимённо. Инцидент
# апреля 2026: неправильная сумма разъехалась по 28 страницам + грубая ошибка
# 9 737 ₽ в ask.astro. У обоих литералов нет легального применения — греп точен.
#
# ⚠️ ПОЧЕМУ ЗДЕСЬ НЕТ «5 200» — не забыли, а НЕЛЬЗЯ:
# CLAUDE.md сам утверждает «Смена 3 (13 дн., 89 400 ₽) → ~5 200 ₽». Запрещена не сама
# цифра, а её подача как заголовочного максимума («до 5 200 ₽»), потому что максимум —
# 6 200 ₽ (Смена 1). Отличить посменную сумму от заголовочной может только смысл:
# сейчас 5 200 стоит в src/scripts/pages/ask.ts и src/lib/ai/campData.ts именно как
# посменная — то есть корректно. Добавишь «5 200» сюда — страж начнёт врать на верном
# коде, его выключат, а вместе с ним и доверие к остальным. Это семантика, не греп.
STALE_DEDUCTION = re.compile(r'\b5[\s ]?434\b|\b9[\s ]?737\b')

for root, dirs, files in os.walk('src'):
    for fn in files:
        if not fn.endswith(('.astro', '.ts', '.tsx', '.md')):
            continue
        path = os.path.join(root, fn)
        with open(path, encoding='utf-8') as fp:
            for i, line in enumerate(fp, 1):
                if STALE_DEDUCTION.search(line) and re.search(r'вычет|₽|руб', line, re.IGNORECASE):
                    errors.append(
                        f'❌ {path}:{i} — мёртвая сумма вычета.\n'
                        f'     {line.strip()[:110]}\n'
                        f'     CLAUDE.md называет 5 434 / 9 737 устаревшими. Максимум — 6 200 ₽ (Смена 1),\n'
                        f'     посменные суммы считать от getCurrentPrice(), не хардкодить.'
                    )

# ─────────────────────────────────────────────────────────────────────────────
if errors:
    print('\n'.join(errors))
    print(f'\n❌ guard-static-rules: {len(errors)} нарушений.')
    sys.exit(1)

print('✅ guard-static-rules: canonical со слешем, тестов в src/pages нет, мёртвых сумм вычета нет.')
PY
