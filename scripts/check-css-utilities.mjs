#!/usr/bin/env node
/**
 * check-css-utilities.mjs — страж: у публичных страниц реально подключён Tailwind.
 *
 * Инцидент 08.09.2026, ради которого написан. Коммит 8697c01e (перевод шрифтов на
 * Fonts API) удалил из global.css первую строку `@import "tailwindcss";` заодно с
 * блоками @font-face. Tailwind 4 перестал генерировать утилиты: главный CSS похудел
 * с 220 КБ до 25 КБ, и прод ~12 часов отдавался голым HTML — всем посетителям.
 *
 * Почему это не поймал НИ ОДИН существующий страж:
 *   - сборка зелёная: отсутствие @import — не ошибка, просто нет правил;
 *   - HTML валиден, все <link> на месте, файлы отдаются с кодом 200;
 *   - smoke.sh проверяет коды ответов и наличие страниц, а не содержимое CSS;
 *   - локальные сборки брали CSS из кэша Astro и показывали рабочий сайт —
 *     поломка всплывала только на чистой сборке.
 *
 * Почему проверяем именно «подключён к странице», а не «есть хоть один файл с
 * утилитами»: в тот раз Tailwind остался в PortalLayout.css (у портала свой layout
 * со своим импортом), то есть файл с утилитами в dist/ БЫЛ. Проверка «есть где-то»
 * прошла бы зелёной на полностью сломанном сайте.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const DIST = 'dist/client';

/** Страницы-представители: главная, страница смены, лендинг. Ломается — ломается везде. */
const PAGES = [
  'index.html',
  'shifts/shift-autumn-1/index.html',
  'ceny/index.html',
];

/**
 * Утилиты, которые Tailwind обязан сгенерировать для любой страницы сайта.
 * Намеренно самые ходовые: если нет их — нет ничего.
 */
const REQUIRED = ['.flex{', '.hidden{', '.relative{'];

/** Ниже этого размера главный CSS публичной части быть не может (в норме ~220 КБ). */
const MIN_CSS_BYTES = 50_000;

function stylesheetsOf(html) {
  // <link rel=stylesheet href=/_astro/x.css> — Astro пишет без кавычек после сжатия
  return [...html.matchAll(/href=["']?(\/_astro\/[A-Za-z0-9._-]+\.css)["']?/g)].map((m) => m[1]);
}

const problems = [];
let checked = 0;

for (const page of PAGES) {
  const path = join(DIST, page);
  if (!existsSync(path)) continue; // страницы могут переименовываться — не повод падать
  checked++;

  const html = readFileSync(path, 'utf8');
  const sheets = stylesheetsOf(html);

  if (sheets.length === 0) {
    problems.push(`${page}: нет ни одного <link rel="stylesheet"> на /_astro/*.css`);
    continue;
  }

  // Собираем CSS всех подключённых к ЭТОЙ странице файлов и ищем утилиты в них.
  let combined = '';
  let biggest = 0;
  for (const href of sheets) {
    const cssPath = join(DIST, href.replace(/^\//, ''));
    if (!existsSync(cssPath)) {
      problems.push(`${page}: подключён ${href}, но файла нет в dist/`);
      continue;
    }
    const css = readFileSync(cssPath, 'utf8');
    combined += css;
    biggest = Math.max(biggest, Buffer.byteLength(css));
  }

  const missing = REQUIRED.filter((u) => !combined.includes(u));
  if (missing.length) {
    problems.push(
      `${page}: в подключённых CSS нет утилит Tailwind (${missing.join(', ')}). ` +
        `Проверь, что src/styles/global.css начинается с @import "tailwindcss";`,
    );
  } else if (biggest < MIN_CSS_BYTES) {
    problems.push(
      `${page}: самый большой подключённый CSS — ${biggest} байт, ожидалось от ${MIN_CSS_BYTES}. ` +
        `Похоже, Tailwind сгенерировал не весь набор утилит.`,
    );
  }
}

if (checked === 0) {
  console.error('❌ check:css — не найдено ни одной страницы для проверки, dist/ собран?');
  process.exit(1);
}

if (problems.length) {
  console.error('❌ CSS-страж: публичные страницы остались без Tailwind\n');
  for (const p of problems) console.error(`   ${p}`);
  console.error('\n   Именно так выглядел инцидент 08.09.2026: сайт отдавался голым HTML,');
  console.error('   при этом сборка была зелёной, а файлы CSS — на месте.');
  process.exit(1);
}

console.log(`CSS utilities OK: Tailwind подключён на ${checked} страницах-представителях`);
