#!/usr/bin/env bash
# Страж дрейфа телефонов. Единственный источник — src/data/contacts.ts.
#
# Ловит две разные беды, и обе реальные:
#   1. ЧУЖОЙ номер на боевой странице. Так на живой /lanit-v6/ висел выдуманный
#      «+7 999 000-12-34»: позвонившему попадал в никуда.
#   2. КАНОНИЧЕСКИЙ номер, написанный литералом мимо contacts.ts. При смене
#      номера такие места молча останутся со старым — ровно то, ради чего
#      единый источник и заводился.
#
# Образец — scripts/check-price-drift.sh (страж цен).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"
python3 << 'PY'
import re, sys, os

src = open('src/data/contacts.ts', encoding='utf-8').read()
# Канон: все последовательности цифр длиной 11, начинающиеся с 7/8.
canon = {re.sub(r'\D', '', m) for m in re.findall(r'\+?[78][\d\s()\-]{9,20}', src)}
canon = {c for c in canon if len(c) == 11}
if not canon:
    print('❌ в src/data/contacts.ts не найдено ни одного номера'); sys.exit(2)

SCAN = ['src/pages', 'src/components', 'src/layouts', 'src/lib', 'src/data']
EXTS = ('.astro', '.ts', '.tsx', '.md', '.mjs')

# Демо и архив — площадки для экспериментов, номера там не показываются клиенту.
EXCL = ('/demo/', '/_archive', '/prototype/', '.test.ts')

# Осознанные исключения. Тексты AI-бота и FAQ содержат номер внутри готовых
# фраз («напишите в WhatsApp +7 (968) …»): вынести его туда переменной без
# переписывания всех формулировок нельзя, а менеджерский номер меняется реже
# всего. Список закрытый: новые файлы сюда не добавляются молча.
ALLOW_FILES = {
    'src/lib/ai/escalation_templates.ts',
    'src/lib/ai/campData.ts',
    'src/data/faq.ts',
    'src/pages/api/ask.ts',
}

# Строгая форма телефона. Свободный поиск «11 цифр подряд» ловил обрывки URL
# (photo-1576610616656 у Unsplash, ok.ru/group/64689601773621) — отсюда
# требование границ и разделителей на своих местах.
PHONE = re.compile(
    r'(?<![\d\-/])'                       # слева не цифра, не дефис, не слэш URL
    r'\+?[78]'
    r'[\s(\-]{0,2}\d{3}[\s)\-]{0,2}'     # код
    r'\d{3}[\s\-]?\d{2}[\s\-]?\d{2}'    # номер
    r'(?![\d\-])'                         # справа не цифра и не дефис
)
foreign, hardcoded = [], []

for base in SCAN:
    for root, dirs, files in os.walk(base):
        if any(x in root for x in EXCL):
            continue
        for fn in files:
            if not fn.endswith(EXTS):
                continue
            path = os.path.join(root, fn)
            if path == 'src/data/contacts.ts' or any(x in path for x in EXCL):
                continue
            for i, line in enumerate(open(path, encoding='utf-8', errors='replace'), 1):
                # placeholder="+7 (999) 000-00-00" — маска ввода, а не контакт
                if 'placeholder=' in line:
                    continue
                # Комментарий — не контакт: в JSDoc номер документирует формат
                # поля («/** Телефон: "+7 (495) …" */»), менять его не нужно.
                stripped = line.lstrip()
                if stripped.startswith(('//', '*', '/*', '#', '<!--')):
                    continue
                for m in PHONE.finditer(line):
                    digits = re.sub(r'\D', '', m.group(0))
                    if len(digits) != 11:
                        continue
                    if digits not in canon:
                        foreign.append((path, i, m.group(0).strip()))
                    elif path not in ALLOW_FILES:
                        hardcoded.append((path, i, m.group(0).strip()))

if foreign:
    print('❌ ЧУЖОЙ ИЛИ ВЫДУМАННЫЙ НОМЕР (его нет в contacts.ts):')
    for p, i, t in foreign:
        print(f'   {p}:{i}  {t}')
if hardcoded:
    print('❌ НОМЕР ЗАХАРДКОЖЕН мимо contacts.ts (при смене номера здесь останется старый):')
    for p, i, t in hardcoded:
        print(f'   {p}:{i}  {t}')

if foreign or hardcoded:
    print()
    print('Как чинить: импортировать из src/data/contacts.ts')
    print('  PHONE_MAIN / PHONE_MAIN_RAW / PHONE_MAIN_HREF — основной')
    print('  PHONE_MOBILE / PHONE_MOBILE_RAW / PHONE_MOBILE_HREF — мобильный')
    sys.exit(1)

print(f'✅ телефоны: нарушений нет (канон: {len(canon)} номера)')
PY
