#!/usr/bin/env node
/**
 * Страж FAQPage. Запускается ПОСЛЕ сборки (нужен dist/client) — из scripts/build.sh.
 *
 * Ловит две вещи, которые правилом-прозой не удержались (инцидент 31.07.2026,
 * 123 страницы с дублем):
 *
 *  1. Больше одного FAQPage на URL. Google: несколько FAQPage на странице —
 *     нарушение, краулер может проигнорировать обе разметки и снять сниппет.
 *     Причина была в LandingLayout: <FAQSchema /> без пропов подмешивал
 *     общесайтовые вопросы поверх локальных.
 *
 *  2. Размеченный вопрос, которого нет в видимом тексте страницы. Google требует,
 *     чтобы вопрос и ответ были видны пользователю. Вопросы жили в slot="head"
 *     и не рендерились нигде.
 *
 * Как чинить: разметку отдаёт та же сущность, что рисует вопросы — <FAQ /> (сам
 * кладёт FAQPage по отрисованному) или <FAQSchema items={...}> у страниц со своим
 * accordion. Обе на одной странице — не подключать.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'dist/client';

if (!existsSync(ROOT)) {
  console.error(`FATAL: ${ROOT} не найден — страж FAQPage запускается после astro build`);
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

const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');

const norm = (s) => s.replace(/\s+/g, ' ').replace(/[«»"']/g, '"').trim();

function collectFaqPages(node, out = []) {
  if (Array.isArray(node)) { node.forEach((n) => collectFaqPages(n, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  if (node['@type'] === 'FAQPage') out.push(node);
  if (Array.isArray(node['@graph'])) collectFaqPages(node['@graph'], out);
  return out;
}

const dupes = [];
const invisible = [];
let checked = 0;

for (const file of walk(ROOT)) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('FAQPage')) continue;
  checked++;

  const url = '/' + relative(ROOT, file).replace(/index\.html$/, '');
  const faqPages = [];
  let m;
  LD_RE.lastIndex = 0;
  while ((m = LD_RE.exec(html))) {
    let parsed;
    try { parsed = JSON.parse(m[1]); } catch { continue; }
    collectFaqPages(parsed, faqPages);
  }

  if (faqPages.length > 1) {
    dupes.push(`${url} — FAQPage-блоков: ${faqPages.length} [${faqPages.map((p) => (p.mainEntity ?? []).length).join(' + ')}]`);
  }

  const vis = norm(visibleText(html));
  const missing = faqPages
    .flatMap((p) => (p.mainEntity ?? []).map((q) => q.name))
    .filter((q) => !vis.includes(norm(q)));
  if (missing.length) invisible.push(`${url} — вопросов вне видимого текста: ${missing.length}\n      · ${missing.slice(0, 3).join('\n      · ')}`);
}

if (dupes.length || invisible.length) {
  if (dupes.length) {
    console.error(`\nFATAL: на ${dupes.length} страницах больше одного FAQPage:`);
    for (const d of dupes.slice(0, 20)) console.error(`  ✗ ${d}`);
    if (dupes.length > 20) console.error(`  … ещё ${dupes.length - 20}`);
  }
  if (invisible.length) {
    console.error(`\nFATAL: на ${invisible.length} страницах размечены вопросы, которых нет в видимом тексте:`);
    for (const i of invisible.slice(0, 20)) console.error(`  ✗ ${i}`);
    if (invisible.length > 20) console.error(`  … ещё ${invisible.length - 20}`);
  }
  console.error('\nРазметку FAQ должна отдавать та же сущность, что рисует вопросы:');
  console.error('  · страница рендерит <FAQ /> → схему кладёт он сам, FAQSchema не подключать');
  console.error('  · у страницы свой accordion → <FAQSchema items={те же вопросы, что видны} />\n');
  process.exit(1);
}

console.log(`FAQPage OK: ${checked} страниц со схемой, дублей нет, все размеченные вопросы видны`);
