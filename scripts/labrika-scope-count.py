#!/usr/bin/env python3
"""Approximate Labrika Body keyword counts across an Astro import scope."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "src" / "pages"
SPECS = ROOT / "src" / "data" / "seo-spec"
MAX_IMPORT_DEPTH = 3

ASTRO_IMPORT_RE = re.compile(
    r"\bimport\s+(?:[\s\S]*?\s+from\s+)?[\"']([^\"']+\.astro)[\"']\s*;?",
    re.MULTILINE,
)
JSON_LD_RE = re.compile(
    r"<script\b(?=[^>]*\btype\s*=\s*[\"']application/ld\+json[\"'])"
    r"[\s\S]*?(?:</script\s*>|/>)",
    re.IGNORECASE,
)
HTML_COMMENT_RE = re.compile(r"<!--[\s\S]*?-->")
EXCLUDED_ATTR_RE = re.compile(
    r"\b(?:title|description|imageAlt|canonical)\s*=\s*"
    r'(?:"[^"\n]*"|\'[^\'\n]*\'|`[^`]*`|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})',
    re.IGNORECASE | re.DOTALL,
)
KEYWORD_KIND_RE = re.compile(r"\s*\((точное|словоформа)\)\s*$", re.IGNORECASE)


def resolve_inputs(page_arg: str, spec_arg: str | None) -> tuple[Path, Path, str]:
    raw = Path(page_arg)
    if raw.suffix == ".astro":
        page = raw if raw.is_absolute() else ROOT / raw
        try:
            relative = page.resolve().relative_to(PAGES.resolve())
        except ValueError as exc:
            raise ValueError(f"страница должна находиться в {PAGES}") from exc
        slug = relative.with_suffix("").as_posix()
    else:
        slug = page_arg.strip("/")
        page = PAGES / f"{slug}.astro"

    spec_slug = slug.replace("/", "__")
    spec = Path(spec_arg) if spec_arg else SPECS / f"{spec_slug}.json"
    if not spec.is_absolute():
        spec = ROOT / spec
    return page.resolve(), spec.resolve(), slug


def collect_astro_scope(page: Path) -> list[Path]:
    """Return the page and unique relative .astro imports, at most 3 edges deep."""
    collected: list[Path] = []
    visited: set[Path] = set()

    def visit(path: Path, depth: int) -> None:
        path = path.resolve()
        if path in visited or depth > MAX_IMPORT_DEPTH:
            return
        if not path.is_file():
            print(f"Предупреждение: импорт не найден: {path}", file=sys.stderr)
            return
        visited.add(path)
        collected.append(path)
        if depth == MAX_IMPORT_DEPTH:
            return
        source = path.read_text(encoding="utf-8")
        for imported in ASTRO_IMPORT_RE.findall(source):
            if imported.startswith("."):
                visit(path.parent / imported, depth + 1)

    visit(page, 0)
    return collected


def body_scope_text(files: list[Path]) -> str:
    text = "\n".join(path.read_text(encoding="utf-8") for path in files)
    text = JSON_LD_RE.sub(" ", text)
    text = HTML_COMMENT_RE.sub(" ", text)
    return EXCLUDED_ATTR_RE.sub(" ", text)


def keyword_count(text: str, label: str) -> tuple[str, str, int, int]:
    match = KEYWORD_KIND_RE.search(label)
    kind = match.group(1).lower() if match else "точное"
    base = KEYWORD_KIND_RE.sub("", label).strip()
    if not base:
        return base, kind, 0, 0

    exact_re = re.compile(rf"(?<!\w){re.escape(base)}(?!\w)", re.IGNORECASE)
    total_re = re.compile(rf"(?<!\w){re.escape(base)}\w*", re.IGNORECASE)
    exact = len(exact_re.findall(text))
    total = len(total_re.findall(text))
    count = exact if kind == "точное" else total - exact
    return base, kind, count, exact


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Посчитать ключи Labrika в странице и рекурсивно импортированных Astro-компонентах."
    )
    parser.add_argument("page", help="slug страницы либо путь src/pages/...astro")
    parser.add_argument("spec", nargs="?", help="необязательный путь к JSON-спеке")
    args = parser.parse_args()

    try:
        page, spec_path, slug = resolve_inputs(args.page, args.spec)
        if not page.is_file():
            raise FileNotFoundError(f"страница не найдена: {page}")
        if not spec_path.is_file():
            raise FileNotFoundError(f"спека не найдена: {spec_path}")
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        parser.error(str(exc))

    files = collect_astro_scope(page)
    text = body_scope_text(files)
    keywords = spec.get("keywords", [])

    print(f"Страница: {slug}")
    print(f"Scope: {len(files)} Astro-файлов (макс. глубина импортов: {MAX_IMPORT_DEPTH})")
    print("keyword | было | норма | сейчас в scope | вывод")
    print("--- | ---: | --- | ---: | ---")

    validated = 0
    for item in keywords:
        label = str(item.get("keyword", ""))
        current = item.get("current")
        normal_range = item.get("range", "—")
        _, kind, count, exact = keyword_count(text, label)
        matches = count == current
        validated += int(matches)
        verdict = "совпало" if matches else "не совпало"
        if kind == "словоформа":
            verdict += f" (total={count + exact}, exact={exact}, формы={count})"
        print(f"{label} | {current} | {normal_range} | {count} | {verdict}")

    print(f"Validated scope: {validated}/{len(keywords)} ключей совпали с current")
    print("Файлы scope:")
    for path in files:
        print(f"- {path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
