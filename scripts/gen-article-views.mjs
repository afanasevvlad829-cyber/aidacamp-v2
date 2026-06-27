/**
 * gen-article-views.mjs — снимок просмотров статей из Яндекс.Метрики → src/data/articleViews.ts.
 *
 * Источник: scripts/metrika-stati-raw.json (сырые пары URL→pageviews из Метрики, counter 96499295).
 * Нормализует пути (убирает trailing slash / query / #anchor, мёржит варианты), оставляет только
 * реальные статьи из src/pages/stati/, суммирует. Это и базовая витрина каталога, и сид для счётчика.
 *
 * Обновить: run(service=metrika, action=stat, dimensions=["ym:pv:URLPathFull"], metrics=["ym:pv:pageviews"],
 *           filters="ym:pv:URLPathFull=~'/stati/'") → переписать data в metrika-stati-raw.json → node scripts/gen-article-views.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'scripts/metrika-stati-raw.json');
const STATI_DIR = path.join(ROOT, 'src/pages/stati');
const OUT = path.join(ROOT, 'src/data/articleViews.ts');

const validSlugs = new Set(
  fs.readdirSync(STATI_DIR)
    .filter(f => f.endsWith('.astro') && f !== 'index.astro')
    .map(f => f.replace(/\.astro$/, '')),
);

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8')).data;

const views = {};
let skipped = 0;
for (const [url, count] of Object.entries(raw)) {
  // /stati/<slug>/... → slug; срезаем query, anchor, trailing slash
  const m = url.match(/^\/stati\/([^/?#]+)/);
  if (!m) { skipped++; continue; }
  const slug = m[1];
  if (!validSlugs.has(slug)) { skipped++; continue; }  // /tpost/ legacy, опечатки, удалённые
  views[slug] = (views[slug] || 0) + Number(count);
}

// Сортировка по убыванию — стабильный детерминированный вывод
const sorted = Object.fromEntries(
  Object.entries(views).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);

const fetched = JSON.parse(fs.readFileSync(RAW, 'utf8'))._fetched || '';
const out = `// АВТОГЕНЕРАЦИЯ — не редактировать вручную.
// Снимок просмотров статей из Яндекс.Метрики (counter 96499295) на ${fetched}.
// Источник: scripts/metrika-stati-raw.json. Регенерация: node scripts/gen-article-views.mjs.
// Базовая витрина каталога (популярное + порог) и сид для живого счётчика article_views.

/** Порог показа «N просмотров» на карточке. Ниже — показываем время чтения. */
export const VIEWS_THRESHOLD = 50;

/** slug → суммарные просмотры из Метрики (снимок). */
export const ARTICLE_VIEWS: Record<string, number> = ${JSON.stringify(sorted, null, 2)};

export const VIEWS_SNAPSHOT_DATE = ${JSON.stringify(fetched)};

export function getViews(slug: string): number {
  return ARTICLE_VIEWS[slug] ?? 0;
}
`;

fs.writeFileSync(OUT, out);
const vals = Object.values(sorted);
console.log(`✓ ${OUT}`);
console.log(`  статей с просмотрами: ${vals.length}, пропущено URL: ${skipped}`);
console.log(`  ≥50: ${vals.filter(v => v >= 50).length}, ≥20: ${vals.filter(v => v >= 20).length}, всего просмотров: ${vals.reduce((a, b) => a + b, 0)}`);
