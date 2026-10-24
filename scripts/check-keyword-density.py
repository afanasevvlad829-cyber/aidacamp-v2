#!/usr/bin/env python3
"""
Локальная проверка плотности ключевых слов ДО деплоя — по тем же правилам, что Лабрика.

По умолчанию читает страницу с локального dev-сервера (astro dev) — рендер
на лету, без пересборки всех страниц сайта. Самый быстрый цикл:
правка файла -> сразу проверка -> правка -> проверка... без ожидания CI/деплоя.

Использует pymorphy3 (лемматизация) — задаёшь ключ ОДИН раз в начальной форме
("летний", "лагерь"), скрипт сам находит все словоформы ("летним", "летних",
"летнего"...). Для "точное" (Лабрика: буквальная строка) передай --exact.

Считает по всему <body> — шапка, меню, футер, виджеты и формы включительно.
Так считает Лабрика (проверено на её собственной разметке подсветки 03.08.2026,
разбор — ~/.claude/agent-results/labrika-parser/CALIBRATION.md). Счёт по одному
<main> систематически занижает: на /lager-na-avgust-podmoskove/ «лагерь» дал
24 против 39 по body. Старое поведение осталось под флагом --main.

«Словоформа» тоже считается как у Лабрики — БЕЗ вхождений, буквально равных
ключу: они относятся к «точному». Сумма двух режимов = все формы леммы.

Запуск (венв со словарями уже настроен в scripts/.venv):
  scripts/.venv/bin/python3 scripts/check-keyword-density.py <страница> <ключ>:<min>:<max> [...]

Примеры:
  scripts/.venv/bin/python3 scripts/check-keyword-density.py lager-jeleznodarozhnyj \
      лагерь:4:6 детский:1:1 летний:2:3 --port 4323

  # "точное" вхождение (как в Лабрике "точное") — без лемматизации, буквальная строка:
  scripts/.venv/bin/python3 scripts/check-keyword-density.py lager-jeleznodarozhnyj \
      железнодорожный:1:1:exact --port 4323

  # прод-сборка (dist/client) вместо dev-сервера:
  scripts/.venv/bin/python3 scripts/check-keyword-density.py lager-jeleznodarozhnyj лагерь:4:6 --dist
"""
import re
import html
import sys
import urllib.request
import urllib.error
from collections import Counter
from pathlib import Path

try:
    import pymorphy3
except ImportError:
    pymorphy3 = None

DIST = Path(__file__).resolve().parent.parent / "dist" / "client"
DEFAULT_PORT = 4321


def extract_text(content: str, zone: str = "body") -> str:
    tag = "main" if zone == "main" else "body"
    m = re.search(rf"<{tag}[^>]*>(.*)</{tag}>", content, re.S)
    scoped = m.group(1) if m else content
    text = re.sub(r"<script.*?</script>", " ", scoped, flags=re.S)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return html.unescape(text).lower()


def load_from_dev_server(page_path: str, port: int, zone: str) -> str:
    url = f"http://localhost:{port}/{page_path.strip('/')}/"
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            content = resp.read().decode("utf-8")
    except urllib.error.URLError as e:
        print(f"Не удалось достучаться до dev-сервера на {url}: {e}")
        print("Подними его: npm run dev -- --port <N>  (или укажи правильный --port)")
        sys.exit(1)
    return extract_text(content, zone)


def load_from_dist(page_path: str, zone: str) -> str:
    page_path = page_path.strip("/")
    candidates = [DIST / page_path / "index.html", DIST / f"{page_path}.html"]
    html_file = next((p for p in candidates if p.exists()), None)
    if html_file is None:
        print(f"Не найден файл сборки для '{page_path}'. Проверенные пути:")
        for c in candidates:
            print(f"  {c}")
        print("Убедись, что запущен `npm run build`.")
        sys.exit(1)
    return extract_text(html_file.read_text(encoding="utf-8"), zone)


def build_lemma_counts(words):
    """Считает и точные словоформы, и леммы (для сопоставления по нормальной форме)."""
    exact = Counter(words)
    if pymorphy3 is None:
        return exact, Counter()
    morph = pymorphy3.MorphAnalyzer()
    lemma_counter = Counter()
    for w in words:
        if re.fullmatch(r"[а-яё]+", w) and len(w) > 2:
            # Берём леммы ВСЕХ разборов, а не только первого: у pymorphy3
            # «лагере» — ничья между «лагер» и «лагерь» (score 0.5/0.5), и при
            # выборе parse(w)[0] самая частая форма на сайте терялась целиком.
            for lemma in {p.normal_form for p in morph.parse(w)}:
                lemma_counter[lemma] += 1
    return exact, lemma_counter


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)

    use_dist = "--dist" in args
    if use_dist:
        args.remove("--dist")

    zone = "body"
    if "--main" in args:
        args.remove("--main")
        zone = "main"

    port = DEFAULT_PORT
    if "--port" in args:
        i = args.index("--port")
        port = int(args[i + 1])
        del args[i : i + 2]

    page_path, specs = args[0], args[1:]

    if pymorphy3 is None:
        print("ВНИМАНИЕ: pymorphy3 не найден — работаю только в режиме --exact (без лемматизации).")
        print("Запусти через venv: scripts/.venv/bin/python3 scripts/check-keyword-density.py ...\n")

    text = load_from_dist(page_path, zone) if use_dist else load_from_dev_server(page_path, port, zone)
    words = re.findall(r"[а-яё0-9\-]+", text)
    exact_counts, lemma_counts = build_lemma_counts(words)
    total = len(words)

    morph = pymorphy3.MorphAnalyzer() if pymorphy3 else None

    source = "dist/client (prod build)" if use_dist else f"dev-server :{port}"
    print(f"Страница: {page_path}  [{source}]")
    print(f"Всего слов в <{zone}> (rus tokens, грубая оценка): {total}\n")

    all_ok = True
    for spec in specs:
        exact_mode = spec.endswith(":exact")
        if exact_mode:
            spec = spec[: -len(":exact")]
        try:
            key, lo, hi = spec.rsplit(":", 2)
            lo, hi = int(lo), int(hi)
        except ValueError:
            print(f"Пропускаю некорректный спецификатор: {spec}")
            continue

        key = key.lower()
        if exact_mode or morph is None:
            n = exact_counts.get(key, 0)
            mode_label = "точное"
        else:
            # как в Лабрике: словоформы без буквальных совпадений с ключом —
            # те живут в отдельной строке «точное»
            lemma = morph.parse(key)[0].normal_form
            n = lemma_counts.get(lemma, 0) - exact_counts.get(key, 0)
            mode_label = f"словоформа (лемма «{lemma}»)"

        ok = lo <= n <= hi
        all_ok = all_ok and ok
        mark = "OK " if ok else ("НИЗКО" if n < lo else "ВЫСОКО")
        print(f"  [{mark:6s}] {key:25s} {mode_label:32s} в тексте: {n:3d}  (цель {lo}-{hi})")

    print()
    print("ИТОГ: всё в диапазоне" if all_ok else "ИТОГ: есть расхождения — правь файл и проверяй снова (dev-сервер подхватит мгновенно)")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
