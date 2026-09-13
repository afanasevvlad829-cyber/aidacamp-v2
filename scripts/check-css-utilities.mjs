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
 *   - smoke проверяет коды ответов и наличие страниц, а не содержимое CSS;
 *   - локальные сборки брали CSS из кэша Astro и показывали рабочий сайт —
 *     поломка всплывала только на чистой сборке.
 *
 * Почему проверяем «подключён к странице», а не «есть хоть один файл с утилитами»:
 * в тот раз Tailwind остался в PortalLayout.css (у портала свой layout со своим
 * импортом), то есть файл с утилитами в dist/ БЫЛ. Проверка «есть где-то» прошла бы
 * зелёной на полностью сломанном сайте.
 *
 * Скрипт общий для всех четырёх сайтов и подстраивается сам:
 *   - корень сборки: dist/client (SSR: aidacamp, codims) или dist (статика:
 *     icepartners, vlad-a);
 *   - стили: внешние <link> и/или инлайн <style> (icepartners вкладывает CSS
 *     прямо в страницу, внешних файлов там нет вовсе);
 *   - страницы: главная + пара внутренних, найденных автоматически, — списка
 *     под каждый сайт держать не нужно.
 *
 * Порога по размеру CSS намеренно нет: у сайтов он разный (220 КБ у aidacamp,
 * 41 КБ у vlad-a), и любой единый порог давал бы ложные срабатывания. Наличие
 * самих утилит — признак надёжнее: у сломанной сборки их не было вовсе.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Корень собранного клиента: SSR-сайты кладут в dist/client, статика — в dist. */
const DIST = existsSync('dist/client') ? 'dist/client' : 'dist';

/**
 * Утилиты, которые Tailwind обязан сгенерировать для любой страницы любого сайта.
 * Намеренно самые ходовые: если нет их — нет ничего.
 */
const REQUIRED = ['.flex{', '.hidden{', '.relative{'];

/** Сколько внутренних страниц проверять помимо главной. */
const INNER_PAGES = 2;

function stylesheetsOf(html) {
  // <link rel=stylesheet href=/_astro/x.css> — после сжатия Astro пишет без кавычек
  return [...html.matchAll(/href=["']?(\/_astro\/[A-Za-z0-9._-]+\.css)["']?/g)].map((m) => m[1]);
}

function inlineStylesOf(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('');
}

/**
 * Главная + несколько внутренних страниц, найденных в сборке.
 * Поддерживает оба паттерна маршрутов Astro: /slug/index.html (trailingSlash)
 * и плоские /slug.html (icepartners.ru собран именно так — без под-каталогов).
 */
function pagesToCheck() {
  const pages = [];
  if (existsSync(join(DIST, 'index.html'))) pages.push('index.html');

  let entries = [];
  try {
    entries = readdirSync(DIST, { withFileTypes: true });
  } catch {
    /* нет каталога — обработается ниже как «нечего проверять» */
  }

  const dirs = entries
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && d.name !== 'assets')
    .map((d) => d.name)
    .sort();
  for (const dir of dirs) {
    if (pages.length > INNER_PAGES) break;
    const candidate = join(dir, 'index.html');
    if (existsSync(join(DIST, candidate))) pages.push(candidate);
  }

  if (pages.length <= 1) {
    // Каталогов с index.html не нашлось (или только сама главная) —
    // сайт плоский, ищем *.html файлы верхнего уровня.
    const flatFiles = entries
      .filter((d) => d.isFile() && d.name.endsWith('.html') && d.name !== 'index.html' && d.name !== '404.html')
      .map((d) => d.name)
      .sort();
    for (const file of flatFiles) {
      if (pages.length > INNER_PAGES) break;
      pages.push(file);
    }
  }
  return pages;
}

const problems = [];
const pages = pagesToCheck();

for (const page of pages) {
  const html = readFileSync(join(DIST, page), 'utf8');

  // Страницы-редиректы (meta refresh) стилей не имеют и иметь не должны:
  // vlad-a.ru/about/ — 293 байта с http-equiv=refresh на якорь главной.
  // Без этого исключения страж кричал бы на здоровом сайте.
  if (/http-equiv=["']?refresh/i.test(html)) continue;

  const sheets = stylesheetsOf(html);
  const inline = inlineStylesOf(html);

  if (sheets.length === 0 && inline.length === 0) {
    problems.push(`${page}: нет ни <link rel="stylesheet">, ни инлайн-<style> — стилей нет вообще`);
    continue;
  }

  // CSS именно ЭТОЙ страницы: инлайн-блоки + все подключённые к ней файлы.
  let combined = inline;
  for (const href of sheets) {
    const cssPath = join(DIST, href.replace(/^\//, ''));
    if (!existsSync(cssPath)) {
      problems.push(`${page}: подключён ${href}, но файла нет в сборке`);
      continue;
    }
    combined += readFileSync(cssPath, 'utf8');
  }

  const missing = REQUIRED.filter((u) => !combined.includes(u));
  if (missing.length) {
    problems.push(
      `${page}: в стилях страницы нет утилит Tailwind (${missing.join(', ')}). ` +
        `Проверь, что главный CSS начинается с @import "tailwindcss";`,
    );
  }
}

if (pages.length === 0) {
  console.error(`❌ CSS-страж: в ${DIST}/ не найдено ни одной страницы — сборка прошла?`);
  process.exit(1);
}

if (problems.length) {
  console.error('❌ CSS-страж: публичные страницы остались без Tailwind\n');
  for (const p of problems) console.error(`   ${p}`);
  console.error('\n   Именно так выглядел инцидент 08.09.2026: сайт отдавался голым HTML,');
  console.error('   при этом сборка была зелёной, а файлы CSS — на месте.');
  process.exit(1);
}

console.log(`CSS utilities OK: Tailwind на месте (${pages.length} стр.: ${pages.join(', ')})`);
