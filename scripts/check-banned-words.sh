#!/bin/bash
# Guard: проверка запрещённых слов в текстах сайта.
# См. CLAUDE.md → BANNED WORDS.
#
# Hard-fail (exit 1):
#   единиц / баллов
# Разрешены (для игровой механики лагеря с дисклеймером):
#   игровая валюта, игровые рубли, рубли (как название внутренней валюты)
# Soft warning:
#   > 20 упоминаний «дети» / «ребёнок» в одном файле
#
# Использует node (fallback с python3, если python3 недоступен).
# Запускается из npm run build через guard. Может вызываться вручную.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

node << 'JS'
const fs = require('fs');
const path = require('path');

const SCAN = ['src/pages', 'src/components'];
const EXTS = ['.astro', '.ts', '.tsx', '.md'];

// Hard ban
const HARD = /\bединиц\w*\b|\bбалл(?:ов|ы|ами|ах|ам|а|у|е|ом)?\b/gi;
// Skip lines (JSON-LD, comments)
const SKIP_LINE = /^\s*(<!--|\/\/|"@|"name":\s|"description":\s|"text":\s)/;
// Soft ban
const SOFT = /\b(?:дет(?:и|ей|ям|ях|ьми)|ребён(?:ок|ка|ку|ком|ке)|ребенок)\b/gi;
const SOFT_THRESHOLD = 20;

let errors = 0;
let warnings = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'admin' || entry.name === '_notes') continue;
      walk(full);
    } else if (EXTS.includes(path.extname(entry.name))) {
      checkFile(full);
    }
  }
}

function checkFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return;
  }
  const lines = content.split('\n');

  // Hard scan
  const fileHits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SKIP_LINE.test(line)) continue;
    HARD.lastIndex = 0;
    const m = HARD.exec(line);
    if (m) {
      fileHits.push({ ln: i + 1, word: m[0], text: line.trim().slice(0, 120) });
    }
  }
  if (fileHits.length > 0) {
    console.log(`❌ BANNED в ${filePath}:`);
    for (const { ln, word, text } of fileHits) {
      console.log(`   ${String(ln).padStart(4)}: «${word}» — ${text}`);
    }
    errors++;
  }

  // Soft scan
  SOFT.lastIndex = 0;
  const softMatches = content.match(SOFT) || [];
  if (softMatches.length > SOFT_THRESHOLD) {
    warnings++;
    if (warnings === 1) console.log();
    console.log(`⚠  ${filePath}: ${softMatches.length} упоминаний «дети»/«ребёнок» (>20) — разнообразь синонимами`);
  }
}

for (const base of SCAN) {
  walk(base);
}

console.log();
if (errors > 0) {
  console.log(`❌ Найдено ${errors} файлов с запрещёнными словами. См. CLAUDE.md → BANNED WORDS.`);
  process.exit(1);
}
console.log(`✅ Запрещённых слов нет. (${warnings} файлов с soft-warning по «дети»/«ребёнок»)`);
JS
