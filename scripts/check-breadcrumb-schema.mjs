#!/usr/bin/env node
/**
 * Страж BreadcrumbList. Запускается ПОСЛЕ сборки (нужен dist/client) — из scripts/build.sh.
 *
 * Ловит дубль хлебных крошек в разметке (найдено 01.08.2026, 229 страниц). Причина —
 * та же, что была у FAQPage: крошки отдавала И сущность, которая их рисует
 * (ArticleHero / LandingHero), И страница/обёртка сверху — своим блоком. Две почти
 * одинаковые цепочки на один URL.
 *
 * Формально несколько BreadcrumbList на странице Google допускает — это заявка на
 * несколько путей до страницы. Но у нас ни одна страница не лежит в двух разделах:
 * каждый второй блок был копией первого с чуть другой формулировкой последнего звена.
 * Поэтому инвариант жёсткий: ровно один BreadcrumbList на URL. Если когда-нибудь
 * появится страница с ДВУМЯ реальными путями — добавь её URL в ALLOW_MULTIPLE ниже
 * с комментарием, почему пути разные.
 *
 * Как чинить: разметку отдаёт та же сущность, что рисует видимые крошки:
 *   · /stati/* → <ArticleHero> (сам кладёт BreadcrumbList), у страницы своего блока нет
 *   · лендинг с <LandingHero> → крошки отдаёт LandingHero
 *   · страница на LandingLayout без hero → передай ей breadcrumb="..." (иначе слой молчит)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'dist/client';

/** URL (со слешем, как в отчёте) → почему на нём законно больше одной цепочки. */
const ALLOW_MULTIPLE = new Map([]);

if (!existsSync(ROOT)) {
  console.error(`FATAL: ${ROOT} не найден — страж BreadcrumbList запускается после astro build`);
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (e.endsWith('.html')) acc.push(p);
  }
  return acc;
}

// html-minifier-terser снимает кавычки с атрибутов → type=application/ld+json
const LD_RE = /<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;

function collectBreadcrumbs(node, out = []) {
  if (Array.isArray(node)) { node.forEach((n) => collectBreadcrumbs(n, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  if (node['@type'] === 'BreadcrumbList') out.push(node);
  if (Array.isArray(node['@graph'])) collectBreadcrumbs(node['@graph'], out);
  return out;
}

const chain = (b) => (b.itemListElement ?? []).map((i) => i?.name ?? '?').join(' › ');

const dupes = [];
let checked = 0;

for (const file of walk(ROOT)) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('BreadcrumbList')) continue;
  checked++;

  const url = '/' + relative(ROOT, file).replace(/index\.html$/, '');
  const crumbs = [];
  let m;
  LD_RE.lastIndex = 0;
  while ((m = LD_RE.exec(html))) {
    let parsed;
    try { parsed = JSON.parse(m[1]); } catch { continue; }
    collectBreadcrumbs(parsed, crumbs);
  }

  if (crumbs.length > 1 && !ALLOW_MULTIPLE.has(url)) {
    dupes.push(`${url} — цепочек: ${crumbs.length}\n      · ${crumbs.map(chain).join('\n      · ')}`);
  }
}

if (dupes.length) {
  console.error(`\nFATAL: на ${dupes.length} страницах больше одной цепочки BreadcrumbList:`);
  for (const d of dupes.slice(0, 20)) console.error(`  ✗ ${d}`);
  if (dupes.length > 20) console.error(`  … ещё ${dupes.length - 20}`);
  console.error('\nКрошки отдаёт та сущность, которая их рисует:');
  console.error('  · /stati/* → <ArticleHero>, свой блок на странице не нужен');
  console.error('  · лендинг с <LandingHero> → крошки от него, LandingLayout молчит');
  console.error('  · LandingLayout без hero → передай странице breadcrumb="Название раздела"');
  console.error('  · страница реально лежит в двух разделах → ALLOW_MULTIPLE в этом скрипте\n');
  process.exit(1);
}

console.log(`BreadcrumbList OK: ${checked} страниц с крошками, по одной цепочке на URL`);
