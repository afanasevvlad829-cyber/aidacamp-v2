#!/bin/bash
# Guard: проверка запрещённых слов в текстах сайта.
# См. CLAUDE.md → BANNED WORDS.
#
# Hard-fail (exit 1):
#   единиц / баллов / игровая валюта / игровые рубли
# Soft warning:
#   > 20 упоминаний «дети» / «ребёнок» в одном файле
#
# Использует python3 (есть на macOS и Linux). Запускается из npm run build
# через guard. Может вызываться вручную.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

python3 << 'PY'
import os, re, sys

SCAN = ['src/pages', 'src/components']
EXTS = ('.astro', '.ts', '.tsx', '.md')

# Hard ban — billing fail
HARD = re.compile(r'\bединиц\w*\b|\bбалл(?:ов|ы|ами|ах|ам|а|у|е|ом)?\b|игровая\s+валюта|игровых?\s+рубл(?:ей|ями|ях|и|ем|ё?м)', re.IGNORECASE)
# Skip patterns — JSON-LD, HTML comments, code fences
SKIP_LINE = re.compile(r'^\s*(<!--|//|"@|"name":\s|"description":\s|"text":\s)')

# Soft ban — overuse
SOFT = re.compile(r'\b(?:дет(?:и|ей|ям|ях|ьми)|ребён(?:ок|ка|ку|ком|ке)|ребенок)\b', re.IGNORECASE)
SOFT_THRESHOLD = 20

errors = 0
warnings = 0

for base in SCAN:
    if not os.path.isdir(base): continue
    for root, dirs, files in os.walk(base):
        # Skip admin, _notes
        if '/admin' in root or '_notes' in root: continue
        for fn in files:
            if not fn.endswith(EXTS): continue
            path = os.path.join(root, fn)
            try:
                with open(path, encoding='utf-8') as fp:
                    lines = fp.readlines()
            except Exception:
                continue

            # Hard scan
            file_hits = []
            for i, line in enumerate(lines, 1):
                if SKIP_LINE.match(line): continue
                m = HARD.search(line)
                if m:
                    file_hits.append((i, m.group(0), line.strip()[:120]))
            if file_hits:
                print(f'❌ BANNED в {path}:')
                for ln, word, text in file_hits:
                    print(f'   {ln:>4}: «{word}» — {text}')
                errors += 1

            # Soft scan
            soft_count = len(SOFT.findall(''.join(lines)))
            if soft_count > SOFT_THRESHOLD:
                warnings += 1
                if warnings == 1: print()
                print(f'⚠  {path}: {soft_count} упоминаний «дети»/«ребёнок» (>20) — разнообразь синонимами')

print()
if errors > 0:
    print(f'❌ Найдено {errors} файлов с запрещёнными словами. См. CLAUDE.md → BANNED WORDS.')
    sys.exit(1)
print(f'✅ Запрещённых слов нет. ({warnings} файлов с soft-warning по «дети»/«ребёнок»)')
PY
