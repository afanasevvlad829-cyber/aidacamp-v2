#!/usr/bin/env node
/**
 * Страж BreadcrumbList. Запускается ПОСЛЕ сборки (нужен dist/client) — из scripts/build.sh.
 *
 * Зачем отдельный страж, если несколько BreadcrumbList на странице Google ДОПУСКАЕТ:
 * несколько цепочек легальны, когда это РАЗНЫЕ пути до страницы (каталог → товар и
 * бренд → товар). Здесь же ловим другое — ОДИН И ТОТ ЖЕ путь, размеченный дважды:
 * компонент кладёт цепочку по видимым крошкам, а страница дописывает свою почти такую
 * же руками. Это не нарушение, а избыточность: два одинаковых пути, которые расходятся
 * при любой правке (инцидент 01.08.2026 — 231 страница, у 140 статей названия последнего
 * звена уже разошлись: hero «Куда деть ребёнка летом», страница «Куда деть ребёнка
 * летом: варианты глазами работающей мамы»).
 *
 * Правило дубля (узкое, чтобы не ронять билд на легальных альтернативных путях):
 * две цепочки одинаковой длины, у которых совпадают ВСЕ звенья кроме последнего, —
 * это один и тот же путь. Разные пути отличаются промежуточными звеньями.
 *
 * Кто отдаёт разметку: та сущность, что рисует видимые крошки, — как принято для FAQ
 * (PR #1183).
 *   · /stati/*        → ArticleHero (рисует nav Главная → Статьи → …)
 *   · лендинги        → LandingLayout (единственный на все 110 страниц, знает canonical)
 *   · главная         → SchemaOrg
 * Страница свою вторую цепочку не пишет.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'dist/client';

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

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').replace(/[«»"']/g, '"').trim();
const chainOf = (bc) =>
  (bc.itemListElement ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((li) => norm(li.name));

// Один и тот же путь: одинаковая длина, все звенья кроме последнего совпадают.
const sameTrail = (a, b) =>
  a.length === b.length && a.length > 0 && a.slice(0, -1).every((v, i) => v === b[i]);

const dupes = [];
const multi = [];
let withSchema = 0;
let total = 0;

for (const file of walk(ROOT)) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('BreadcrumbList')) continue;
  withSchema++;

  const url = '/' + relative(ROOT, file).replace(/index\.html$/, '');
  const lists = [];
  LD_RE.lastIndex = 0;
  let m;
  while ((m = LD_RE.exec(html))) {
    let parsed;
    try { parsed = JSON.parse(m[1]); } catch { continue; }
    collectBreadcrumbs(parsed, lists);
  }
  total += lists.length;
  if (lists.length < 2) continue;

  const chains = lists.map(chainOf);
  const dup = chains.some((c, i) => chains.slice(i + 1).some((o) => sameTrail(c, o)));
  const line = `${url} — цепочек: ${lists.length}\n      ${chains.map((c) => c.join(' > ')).join('\n      ')}`;
  (dup ? dupes : multi).push(line);
}

if (multi.length) {
  console.warn(`\nВНИМАНИЕ: на ${multi.length} страницах больше одной BreadcrumbList, но пути разные — Google это допускает:`);
  for (const w of multi.slice(0, 10)) console.warn(`  · ${w}`);
  if (multi.length > 10) console.warn(`  … ещё ${multi.length - 10}`);
}

if (dupes.length) {
  console.error(`\nFATAL: на ${dupes.length} страницах один и тот же путь размечен дважды:`);
  for (const d of dupes.slice(0, 20)) console.error(`  ✗ ${d}`);
  if (dupes.length > 20) console.error(`  … ещё ${dupes.length - 20}`);
  console.error('\nЦепочку отдаёт одна сущность — та, что рисует видимые крошки:');
  console.error('  · /stati/*  → ArticleHero, страница свой <script ld+json> с BreadcrumbList не пишет');
  console.error('  · лендинги  → LandingLayout, LandingHero свою цепочку не дублирует');
  console.error('  · главная   → SchemaOrg\n');
  process.exit(1);
}

console.log(`BreadcrumbList OK: ${withSchema} страниц со схемой, ${total} цепочек, дублей пути нет`);
