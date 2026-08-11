#!/usr/bin/env python3
"""
Контролер соответствия Labrika: сверяет собранные страницы (dist/client)
со спеками src/data/seo-spec/*.json.

Спека генерится сборщиком Labrika (labrika-content-collector, режим полного
сбора) и содержит требования по вхождениям ключей: «точное» — буквальная
строка, «словоформа» — любая грамматическая форма (лемматизация pymorphy3,
как считает Лабрика). Контролер НИЧЕГО не переписывает — только считает и
показывает расхождения. Подгонка контента — отдельный ручной/полуручной шаг
(сборный FAQ, правки текста).

Запуск (после npm run build):
  scripts/.venv/bin/python3 scripts/check-seo-spec.py            # все спеки
  scripts/.venv/bin/python3 scripts/check-seo-spec.py ceny       # одна страница
  scripts/.venv/bin/python3 scripts/check-seo-spec.py --strict   # exit 1 при расхождениях

Выход: 0 — всё в диапазонах (или нет спек), 1 — есть расхождения при --strict.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

# Переиспользуем разбор HTML из проверки плотности — единая логика подсчёта.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module
_density = import_module("check-keyword-density".replace("-", "_")) if False else None

# check-keyword-density.py содержит дефисы в имени — импортируем функции копией пути
import importlib.util
_spec_path = Path(__file__).resolve().parent / "check-keyword-density.py"
_mod_spec = importlib.util.spec_from_file_location("density", _spec_path)
density = importlib.util.module_from_spec(_mod_spec)
_mod_spec.loader.exec_module(density)

try:
    import pymorphy3
except ImportError:
    pymorphy3 = None

ROOT = Path(__file__).resolve().parent.parent
SPEC_DIR = ROOT / "src" / "data" / "seo-spec"
DIST = ROOT / "dist" / "client"


def page_path_from_spec(spec: dict, spec_file: Path) -> str:
    url = spec.get("url", "")
    m = re.search(r"aidacamp\.ru(/.*)$", url)
    if m:
        return m.group(1).strip("/") or ""
    return spec_file.stem.replace("__", "/")


def parse_range(range_str: str):
    nums = [int(x) for x in re.findall(r"\d+", range_str or "")]
    if not nums:
        return None, None
    return nums[0], (nums[1] if len(nums) > 1 else nums[0])


def count_keyword(keyword: str, exact_counts, lemma_counts, morph, text: str) -> int:
    """Считает вхождения фразы. Однословные — по счётчикам, фразы — по тексту."""
    name = re.sub(r"\s*\((точное|словоформа)\)\s*$", "", keyword).strip().lower()
    exact_mode = "(точное)" in keyword
    words = name.split()
    if len(words) == 1:
        if exact_mode or morph is None:
            return exact_counts.get(name, 0)
        lemma = morph.parse(name)[0].normal_form
        return lemma_counts.get(lemma, 0)
    if exact_mode or morph is None:
        return len(re.findall(re.escape(name), text))
    # Фраза-словоформа: ищем последовательность лемм в тексте
    target = [morph.parse(w)[0].normal_form for w in words]
    tokens = re.findall(r"[а-яё\-]+", text)
    lemmas = [morph.parse(t)[0].normal_form for t in tokens]
    n = 0
    for i in range(len(lemmas) - len(target) + 1):
        if lemmas[i:i + len(target)] == target:
            n += 1
    return n


def main() -> int:
    args = [a for a in sys.argv[1:]]
    strict = "--strict" in args
    if strict:
        args.remove("--strict")
    page_filter = args[0] if args else None

    if not SPEC_DIR.exists():
        print("Нет каталога спек src/data/seo-spec/ — нечего проверять.")
        return 0

    morph = pymorphy3.MorphAnalyzer() if pymorphy3 else None
    if morph is None:
        print("ВНИМАНИЕ: pymorphy3 не найден — словоформы считаются как точные.")
        print("Запусти через venv: scripts/.venv/bin/python3 scripts/check-seo-spec.py\n")

    total_specs = checked = skipped_empty = skipped_nodist = violations = 0
    for spec_file in sorted(SPEC_DIR.glob("*.json")):
        spec = json.loads(spec_file.read_text(encoding="utf-8"))
        page = page_path_from_spec(spec, spec_file)
        if page_filter and page_filter.strip("/") not in (page, spec_file.stem):
            continue
        total_specs += 1
        keywords = spec.get("keywords", [])
        if not keywords:
            skipped_empty += 1
            continue
        candidates = [DIST / page / "index.html", DIST / f"{page}.html"]
        html_file = next((p for p in candidates if p.exists()), None)
        if html_file is None:
            skipped_nodist += 1
            print(f"⚠ {page or '/'} — нет файла сборки (npm run build?)")
            continue
        checked += 1
        text = density.extract_main_text(html_file.read_text(encoding="utf-8"))
        tokens = re.findall(r"[а-яё\-]+", text)
        exact_counts, lemma_counts = density.build_lemma_counts(tokens)

        page_violations = []
        for kw in keywords:
            lo, hi = parse_range(kw.get("range", ""))
            if lo is None:
                continue
            n = count_keyword(kw["keyword"], exact_counts, lemma_counts, morph, text)
            if n < lo or n > hi:
                need = f"добавить {lo - n}" if n < lo else f"убрать {n - hi}"
                page_violations.append(f"  ✗ {kw['keyword']}: {n} (норма {lo}–{hi}) → {need}")
        if page_violations:
            violations += len(page_violations)
            print(f"— /{page}/")
            print("\n".join(page_violations))

    print(f"\nСпек: {total_specs}; проверено: {checked}; пустых: {skipped_empty}; "
          f"без сборки: {skipped_nodist}; расхождений: {violations}")
    if violations == 0 and checked:
        print("✅ Все проверенные страницы соответствуют спеке Labrika.")
    return 1 if (strict and violations) else 0


if __name__ == "__main__":
    sys.exit(main())
