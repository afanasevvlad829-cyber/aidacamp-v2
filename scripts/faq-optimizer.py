#!/usr/bin/env python3
"""
Подбор состава FAQ под ключи конкретной страницы.

Проблема: компонент FAQ умеет фильтроваться (items={['payment:1', ...]}),
но 66 из 139 страниц выводят всю библиотеку целиком — одинаковые 35
вопросов на десятках страниц. Для Labrika это дубли, для страницы —
размытие собственных ключей.

Идея: библиотека общая и большая, а каждая страница собирает свой набор
блоков — те, что несут нужные ей ключи. Скрипт считает, какие ключи несёт
каждый блок, берёт целевые ключи страницы (из спеки src/data/seo-spec,
иначе из её title/h1/description) и предлагает состав.

Ничего не переписывает: печатает предложение и пишет faq-plan.json.
Правку в страницы вносит человек — состав FAQ влияет на конверсию,
это не механическая замена.

Запуск:
  python3 scripts/faq-optimizer.py                 # все страницы без фильтра
  python3 scripts/faq-optimizer.py lager-7-let     # одна страница
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FAQ_FILE = ROOT / 'src' / 'data' / 'faq.ts'
SPEC_DIR = ROOT / 'src' / 'data' / 'seo-spec'
PAGES = ROOT / 'src' / 'pages'

WORD_RE = re.compile(r'[А-Яа-яЁёA-Za-z]{4,}')
STOP = {
    'это', 'если', 'когда', 'чтобы', 'можно', 'нужно', 'после', 'перед',
    'который', 'которые', 'своего', 'сколько', 'каждый', 'также', 'более',
    'есть', 'быть', 'весь', 'всех', 'наши', 'наше', 'ваше', 'ваши',
}
# Сколько блоков предлагать и на скольких страницах максимум может
# стоять один блок — иначе снова получим одинаковый хвост везде.
TARGET_BLOCKS = 8
MAX_SHARE = 0.35
# Базовые страхи родителя: эти темы должны быть на любой странице,
# даже если ключи страницы про них не говорят. Иначе SEO-оптимизация
# выкинет из FAQ ровно то, ради чего мама его открывает.
CORE_BLOCKS = ['medicine:0', 'safety:0', 'food:0', 'communication:0']


def stem(word: str) -> str:
    """Грубая нормализация: обрезаем типовые окончания."""
    w = word.lower()
    for suffix in ('ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими',
                   'ах', 'ях', 'ов', 'ев', 'ам', 'ям', 'ой', 'ей', 'ые', 'ие',
                   'ый', 'ий', 'ая', 'яя', 'ую', 'юю', 'ом', 'ем', 'ах', 'у',
                   'ы', 'и', 'а', 'я', 'е', 'о', 'ь'):
        if len(w) - len(suffix) >= 4 and w.endswith(suffix):
            return w[:-len(suffix)]
    return w


def parse_faq_blocks() -> dict[str, str]:
    """Возвращает {'documents:0': 'текст вопроса и ответа', ...}."""
    src = FAQ_FILE.read_text(encoding='utf-8')
    blocks: dict[str, str] = {}
    for chunk in re.split(r"\n    id: '", src)[1:]:
        cat = chunk.split("'")[0]
        # каждый вопрос — одна строка вида { q: `...`, a: `...` }
        items = re.findall(r"\{ q: ([\"'`])(.+?)\1, a: ([\"'`])(.+?)\3 \}", chunk)
        for idx, (_, question, _, answer) in enumerate(items):
            blocks[f'{cat}:{idx}'] = f'{question} {answer}'
    return blocks


def page_keywords(page: Path) -> list[str]:
    """Целевые ключи страницы: из спеки, иначе из title/h1/description."""
    slug = page.relative_to(PAGES).with_suffix('').as_posix().replace('/', '__')
    spec_file = SPEC_DIR / f'{slug}.json'
    if spec_file.exists():
        spec = json.loads(spec_file.read_text(encoding='utf-8'))
        keys = [re.sub(r'\s*\((точное|словоформа)\)', '', k['keyword'])
                for k in spec.get('keywords', [])]
        if keys:
            return keys
    src = page.read_text(encoding='utf-8')
    meta = ' '.join(re.findall(r'(?:title|h1|description)=\{?[`"\']([^`"\']{10,200})',
                               src)[:4])
    return [w for w in WORD_RE.findall(meta) if w.lower() not in STOP]


def score_blocks(blocks: dict[str, str], keywords: list[str]) -> list[tuple[str, int]]:
    targets = {stem(w) for kw in keywords for w in WORD_RE.findall(kw)}
    targets -= {stem(s) for s in STOP}
    scored = []
    for block_id, text in blocks.items():
        hits = {stem(w) for w in WORD_RE.findall(text)} & targets
        if hits:
            scored.append((block_id, len(hits)))
    scored.sort(key=lambda x: -x[1])
    return scored


def main() -> int:
    only_page = sys.argv[1] if len(sys.argv) > 1 else None
    blocks = parse_faq_blocks()
    if not blocks:
        print('Не удалось разобрать библиотеку FAQ')
        return 1
    print(f'блоков в библиотеке: {len(blocks)}')

    unfiltered = []
    for page in sorted(PAGES.rglob('*.astro')):
        src = page.read_text(encoding='utf-8')
        if '<FAQ' not in src or 'only=' in src or 'items=' in src:
            continue
        if only_page and only_page not in page.as_posix():
            continue
        unfiltered.append(page)
    print(f'страниц без фильтра FAQ: {len(unfiltered)}\n')

    usage: Counter = Counter()
    plan = {}
    limit = max(1, int(len(unfiltered) * MAX_SHARE))
    for page in unfiltered:
        keywords = page_keywords(page)
        scored = score_blocks(blocks, keywords)
        picked = [b for b in CORE_BLOCKS if b in blocks]
        for block_id, hits in scored:
            if block_id in picked:
                continue
            if len(picked) >= TARGET_BLOCKS:
                break
            if usage[block_id] >= limit:
                continue  # блок уже слишком часто используется
            picked.append(block_id)
            usage[block_id] += 1
        if picked:
            rel = page.relative_to(ROOT).as_posix()
            plan[rel] = picked
            print(f'{rel}\n  items={{{picked}}}')

    (ROOT / 'faq-plan.json').write_text(
        json.dumps(plan, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\nплан: faq-plan.json ({len(plan)} страниц)')
    print('Топ используемых блоков:', dict(usage.most_common(5)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
