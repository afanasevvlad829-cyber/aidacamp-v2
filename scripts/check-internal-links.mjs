/**
 * check-internal-links.mjs — проверка внутренних ссылок ПО СОБРАННОМУ dist/,
 * без единого сетевого запроса.
 *
 * Зачем. Раньше это делал только smoke.sh, дёргая ~243 URL у живого сервера:
 * 53с на dev и столько же на проде (замер 14.08.2026), и всегда ПОСЛЕ выката —
 * то есть битая ссылка успевала доехать до пользователей, а откат стоил ещё
 * одного прогона. Здесь та же проверка идёт на сборке, до деплоя, и занимает
 * доли секунды.
 *
 * Что проверяем и чем это НЕ является. Здесь ловится только «страницы, на которую
 * ведёт ссылка, нет в сборке». Проверку живой отдачи (nginx проксирует SSR-слаг в
 * Node, редиректы отвечают 301) это не заменяет — она остаётся в smoke.sh, но
 * теперь только для SSR-маршрутов и редиректов, где nginx действительно участвует.
 * Prerendered-страница — просто файл на диске: если файл на месте, nginx его отдаст.
 *
 * Запуск: node scripts/check-internal-links.mjs
 * Ненулевой код возврата = найдены битые ссылки.
 */
import fs from 'node:fs';
import path from 'node:path';

const CLIENT_DIR = 'dist/client';
const PAGES_DIR = 'src/pages';

if (!fs.existsSync(CLIENT_DIR)) {
  console.error(`❌ ${CLIENT_DIR} не найден — сначала сборка`);
  process.exit(1);
}

// ── 1. Что отдаётся файлом (prerendered страницы + статика из public/) ──────
const files = new Set();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else files.add('/' + path.relative(CLIENT_DIR, full).split(path.sep).join('/'));
  }
})(CLIENT_DIR);

// ── 2. Что отдаётся Node'ом (prerender = false) ─────────────────────────────
// Файла в dist/client у таких маршрутов нет — сверяем по исходникам.
// [slug]/[...rest] превращаем в regexp: конкретные значения знает только рантайм.
const ssrPatterns = [];
(function walkPages(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walkPages(full); continue; }
    if (!/\.(astro|ts|js)$/.test(e.name)) continue;
    if (!/prerender\s*=\s*false/.test(fs.readFileSync(full, 'utf8'))) continue;

    let route = '/' + path.relative(PAGES_DIR, full).split(path.sep).join('/')
      .replace(/\.(astro|ts|js)$/, '')
      .replace(/\/index$/, '');
    const rx = route
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')       // экранируем всё, включая [ ]
      .replace(/\\\[\\\.\\\.\\\.[^\\]*\\\]/g, '.*')  // [...rest] — любой хвост
      .replace(/\\\[[^\\]*\\\]/g, '[^/]+');          // [slug]  — один сегмент
    ssrPatterns.push(new RegExp(`^${rx}/?$`));
  }
})(PAGES_DIR);

// ── 3. Собираем ссылки со всех собранных страниц ────────────────────────────
// href="/x/" и href=/x/ — второй вариант появляется после минификации
// (removeAttributeQuotes), поэтому ловим оба.
const HREF = /href=(?:"([^"#?]*)"|'([^'#?]*)'|([^\s>"'#?]+))/g;
const links = new Map(); // ссылка → страница, где она встретилась

// Источники, которые не проверяем: /demo/ — черновики-прототипы (исключены и из
// sitemap), /metodichki/ — закрыт auth_request в nginx.
// Ссылки ВНУТРЬ них проверяются как обычно, не проверяются ссылки С них.
//
// /demo/ вернулся под проверку 14.08.2026: при вводе гейта он был исключён, потому
// что demo/blocks.astro ссылался на четыре несуществующие страницы (/smeny/,
// /lager-podmoskovje/, /lager-podrostkov/, /programmirovanie/ — все 404 на проде).
// Ссылки починены, исключать больше нечего: демо-страницы показывают живые
// компоненты, и битые примеры в них так же вводят в заблуждение, как в проде.
const SKIP_SOURCES = [/^\/metodichki\//];

for (const file of files) {
  if (!file.endsWith('.html')) continue;
  if (SKIP_SOURCES.some((re) => re.test(file))) continue;
  const html = fs.readFileSync(path.join(CLIENT_DIR, file.slice(1)), 'utf8');
  for (const m of html.matchAll(HREF)) {
    const href = (m[1] ?? m[2] ?? m[3] ?? '').split('#')[0].split('?')[0];
    if (!href.startsWith('/') || href.startsWith('//')) continue;  // внешние и протокол-относительные
    // JS-шаблоны из inline-скриптов: '/shifts/' + v.shiftId + '/', `${x}` и т.п.
    if (/['"+{}$`\\]/.test(href)) continue;
    if (!links.has(href)) links.set(href, file);
  }
}

// ── 4. Проверка ──────────────────────────────────────────────────────────────
// Пути, которые nginx отдаёт МИМО dist/ — их отсутствие в сборке нормально.
// /docs/ — уставные документы и лицензии из медиа-хранилища (проверено 14.08.2026:
// /docs/licenziya-rosobrnadzor.pdf отдаёт 200 на проде, файла в dist/ нет).
const SERVED_OUTSIDE_DIST = [/^\/docs\//];

const isServed = (href) => {
  const clean = href.replace(/\/$/, '');
  return files.has(href)
    || files.has(`${clean}/index.html`)
    || files.has(clean)
    || ssrPatterns.some((rx) => rx.test(href))
    || SERVED_OUTSIDE_DIST.some((rx) => rx.test(href));
};

const broken = [...links].filter(([href]) => !isServed(href));

for (const [href, from] of broken.sort()) {
  console.error(`  ❌ ${href.padEnd(52)} (со страницы ${from})`);
}

console.log(
  `${broken.length ? '❌' : '✅'} внутренних ссылок: ${links.size}, ` +
  `страниц: ${[...files].filter((f) => f.endsWith('.html')).length}, ` +
  `SSR-маршрутов: ${ssrPatterns.length}, битых: ${broken.length}`
);

process.exit(broken.length ? 1 : 0);
