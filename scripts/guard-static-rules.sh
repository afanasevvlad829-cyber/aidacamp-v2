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
#   4. цель Astro.redirect() без слеша      — инцидент 17.07.2026 (13 файлов → 2 хопа вместо одного)
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
# 4. Цель Astro.redirect() без завершающего слеша.
#
# Тот же класс, что и №1, но с другой стороны. Сайт отдаётся в dir-формате, и
# бесслешевый URL ловит директорный редирект nginx. Значит редирект на цель без
# слеша даёт ДВА хопа вместо одного:
#   /lager-elochki-domodedovo → 301 → /lager-na-leto-2026 → 301 → /lager-na-leto-2026/
#
# 17.07.2026: так было в 13 файлах (10 на /lager-na-leto-2026, 3 на
# /spravka-079u-dlya-lagerya-obrazets), замерено живьём — 13 слагов шли в 2 хопа
# против 15 в один. Все финально 200, то есть глазами не видно: цепочка молча
# разбавляет вес. Ровно тот случай, где нужен греп, а не внимательность.
#
# Проверяем ТОЛЬКО строковые литералы. Шаблонные строки и переменные
# (Astro.redirect(`/x/${slug}`), Astro.redirect(target)) сознательно пропускаем:
# что построит рантайм, греп знать не может, а врущий гейт хуже отсутствующего.
#
# И главное — лишний хоп возникает НЕ у всякой бесслешевой цели, а только если
# цель пререндерена в файл: тогда её отдаёт nginx (root client/, try_files $uri $uri/)
# и сам дописывает слеш редиректом. У страниц с `prerender = false` (portal/*, admin/*)
# свой location с proxy_pass на ноду — try_files к ним не применяется, и /portal/login
# отдаёт 200 без всякого редиректа (проверено curl'ом 17.07.2026). Флагать их —
# значит врать. Поэтому резолвим цель в исходник и смотрим на её режим; если цель
# в исходник не резолвится (динамика, nginx-редирект) — молчим, а не гадаем.
REDIRECT = re.compile(r'Astro\.redirect\(\s*(["\'])(/[^"\']*)\1')

def served_by_node(url_path):
    """True, если цель — страница на запрос: её отдаёт нода, директорного редиректа нет.
    None, если цель не резолвится в исходник — тогда судить не о чем."""
    rel = url_path.strip('/')
    if not rel:
        return False
    for cand in (f'src/pages/{rel}.astro', f'src/pages/{rel}/index.astro'):
        if os.path.isfile(cand):
            with open(cand, encoding='utf-8') as f:
                return 'prerender = false' in f.read()
    return None

for root, dirs, files in os.walk('src'):
    if 'demo' in root:
        continue
    for fn in files:
        if not fn.endswith('.astro'):
            continue
        path = os.path.join(root, fn)
        with open(path, encoding='utf-8') as fp:
            for i, line in enumerate(fp, 1):
                m = REDIRECT.search(line)
                if not m:
                    continue
                target = m.group(2)
                path_part = target.split('?')[0].split('#')[0]
                if path_part == '/':          # корень — слеш уже есть
                    continue
                last = path_part.rstrip('/').split('/')[-1]
                if '.' in last and not path_part.endswith('/'):
                    continue                   # реальный файл (.xml/.txt), не директория
                mode = served_by_node(path_part)
                if mode is not False:
                    continue                   # нода (лишнего хопа нет) либо не резолвится — молчим
                if not path_part.endswith('/'):
                    errors.append(
                        f'❌ {path}:{i} — цель Astro.redirect() без слеша: «{target}»\n'
                        f'     Бесслешевый URL сам 301-редиректит → выйдет два хопа вместо одного.\n'
                        f'     Поставь слеш: Astro.redirect("{path_part}/", 301).'
                    )

# ─────────────────────────────────────────────────────────────────────────────
# 5. Хардкод-фолбэк секрета: process.env.<...SECRET|TOKEN|KEY|PWD|PASSWORD> || 'литерал'.
#
# Публичный репозиторий делает такой фолбэк общеизвестным → подпись/пароль
# предсказуемы, дыра открыта даже когда переменная окружения задана в одном месте
# и забыта в другом. Инцидент (перепроверен 01/07.08.2026):
#   - shift-plan.ts:  STAFF_AUTH_SECRET || '2026'          → пароль вожатых лежал в коде;
#   - leadLink.ts:    LEAD_LINK_SECRET  || 'aidacamp-...'   → токен памятки подделывался.
# Правило: секрета нет → fail-closed (503/бросок), а не фолбэк на литерал.
#
# Флагаем только НЕПУСТОЙ строковый литерал (реально пригодный секрет). Пустой
# `|| ''` / `?? ''` — это сентинел «нет значения», обычно в паре с проверкой-гейтом
# выше по коду (portal/*), его трогать не надо. Ловим и `||`, и `??`.
SECRET_FALLBACK = re.compile(
    r"""process\.env\.[A-Za-z0-9_]*(?:SECRET|TOKEN|KEY|PWD|PASSWORD)[A-Za-z0-9_]*"""
    r"""\s*(?:\|\||\?\?)\s*(['"])(.+?)\1"""
)

for root, dirs, files in os.walk('src'):
    for fn in files:
        if not fn.endswith(('.astro', '.ts', '.tsx', '.mjs', '.js')):
            continue
        path = os.path.join(root, fn)
        with open(path, encoding='utf-8') as fp:
            for i, line in enumerate(fp, 1):
                m = SECRET_FALLBACK.search(line)
                if not m:
                    continue
                errors.append(
                    f'❌ {path}:{i} — хардкод-фолбэк секрета.\n'
                    f'     {line.strip()[:110]}\n'
                    f'     Репозиторий публичный → фолбэк-литерал общеизвестен. Секрета нет —\n'
                    f'     fail-closed (503/бросок), не «|| \'литерал\'». Образец: src/lib/staffAuth.ts.'
                )

# ─────────────────────────────────────────────────────────────────────────────
if errors:
    print('\n'.join(errors))
    print(f'\n❌ guard-static-rules: {len(errors)} нарушений.')
    sys.exit(1)

print('✅ guard-static-rules: canonical и цели redirect со слешем, тестов в src/pages нет, мёртвых сумм вычета нет, хардкод-фолбэков секретов нет.')
PY
