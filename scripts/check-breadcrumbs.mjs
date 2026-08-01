#!/usr/bin/env node
/**
 * Страж BreadcrumbList. Запускается ПОСЛЕ сборки (нужен dist/client) — из scripts/build.sh.
 *
 * Ловит две вещи, которые правилом-прозой не удержались (замер 01.08.2026:
 * 247 страниц из 339 отдавали крошки дважды):
 *
 *  1. Больше одного BreadcrumbList на URL. Формально Google это допускает, но
 *     копии со временем расходятся, и в выдачу уходит не та формулировка.
 *     Источников дубля было три: LandingLayout + LandingHero, ArticleHero +
 *     ArticleSchema, компонент + блок, вписанный руками в саму страницу.
 *
 *  2. Невалидный JSON внутри ld+json. Так уже терялась разметка: блок писали
 *     дочерним выражением тега вместо set:html={JSON.stringify(...)}, и в HTML
 *     уходил исходный текст выражения — краулер такой блок отбрасывает целиком.
 *
 * Как чинить дубль: крошки отдаёт ОДНА сущность на страницу — обычно компонент
 * (ArticleHero у статей, LandingLayout у лендингов, там короткий ярлык задаётся
 * пропом breadcrumbLabel). Свой блок в странице заводить только там, где
 * компонентного источника нет вовсе (например shifts/[id].astro на голом Base).
 *
 * Отсутствие крошек НЕ проверяется: у /demo/*, /video/*, /ask/ и юридических
 * страниц их и не было — это нормально.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'dist/client';

if (!existsSync(ROOT)) {
  console.error(`FATAL: ${ROOT} не найден — страж крошек запускается после astro build`);
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

function collectCrumbs(node, out = []) {
  if (Array.isArray(node)) { node.forEach((n) => collectCrumbs(n, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  if (node['@type'] === 'BreadcrumbList') out.push(node);
  if (Array.isArray(node['@graph'])) collectCrumbs(node['@graph'], out);
  return out;
}

const pathOf = (b) =>
  (b.itemListElement || []).map((li) => li?.name ?? '').join(' → ');

const dupes = [];
const broken = [];
let checked = 0;

for (const file of walk(ROOT)) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('application/ld+json')) continue;
  checked++;

  const url = '/' + relative(ROOT, file).replace(/index\.html$/, '');
  const crumbs = [];
  let m;
  LD_RE.lastIndex = 0;
  while ((m = LD_RE.exec(html))) {
    const raw = m[1].trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      broken.push({ url, reason: e.message, head: raw.slice(0, 100) });
      continue;
    }
    collectCrumbs(parsed, crumbs);
  }

  if (crumbs.length > 1) dupes.push({ url, paths: crumbs.map(pathOf) });
}

if (broken.length) {
  console.error(`\n[check-breadcrumbs] ERROR: невалидный JSON-LD — ${broken.length} шт.`);
  console.error('  Обычно причина: блок написан как {JSON.stringify(...)} вместо set:html={JSON.stringify(...)}');
  for (const b of broken.slice(0, 10)) {
    console.error(`  ${b.url}\n    ${b.reason}\n    ${b.head}`);
  }
}

if (dupes.length) {
  console.error(`\n[check-breadcrumbs] ERROR: больше одного BreadcrumbList — ${dupes.length} стр.`);
  console.error('  Крошки должен отдавать один источник: компонент ИЛИ страница, не оба.');
  for (const d of dupes.slice(0, 10)) {
    console.error(`  ${d.url}`);
    d.paths.forEach((p, i) => console.error(`    [${i + 1}] ${p}`));
  }
}

if (broken.length || dupes.length) process.exit(1);

console.log(`[check-breadcrumbs] OK — ${checked} страниц со схемой, дублей и битого JSON-LD нет`);
