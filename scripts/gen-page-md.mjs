#!/usr/bin/env node
/**
 * gen-page-md.mjs — ночной генератор per-page Markdown-копий для AI-движков.
 *
 * Сайт на SSR (статических HTML нет), поэтому фетчим готовый HTML с живого
 * сервера, вырезаем тело (<article>/<main>), чистим шапку/подвал/формы/«похожие»,
 * конвертируем в Markdown и кладём в OUT_DIR (его раздаёт nginx как /путь.md).
 *
 * «Потихонечку»: за один запуск обрабатывает не больше BATCH страниц
 * (новые или изменившиеся), прогресс — в manifest.json. За несколько ночей
 * покрывает весь сайт, дальше только обновляет изменённое.
 *
 * Запуск:  node gen-page-md.mjs
 * Зависимости:  node-html-parser, node-html-markdown  (npm i в этой папке)
 *
 * Конфиг через env (значения по умолчанию ниже).
 */
import { parse } from 'node-html-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CFG = {
  BASE: process.env.MD_BASE || 'http://127.0.0.1:3000',       // живой node-сервер сайта
  CANON: process.env.MD_CANON || 'https://aidacamp.ru',        // канонический домен для ссылок/sitemap
  OUT: process.env.MD_OUT || '/var/www/aidacamp-md',           // куда писать .md (раздаёт nginx)
  MANIFEST: process.env.MD_MANIFEST || '/var/www/aidacamp-md/.manifest.json',
  BATCH: parseInt(process.env.MD_BATCH || '40', 10),           // максимум страниц за запуск
  SLEEP_MS: parseInt(process.env.MD_SLEEP_MS || '400', 10),    // пауза между страницами (бережно)
  REFRESH_DAYS: parseInt(process.env.MD_REFRESH_DAYS || '14', 10), // перегенерить страницу не чаще, чем раз в N дней
  // что НЕ генерим (служебное/динамическое/приватное)
  SKIP: /\/(api|portal|staff|dashboard|admin|p|smena2?-editor|ask|reports-hub)\b|\.(xml|txt|json|js|css|png|jpg|avif|webp|svg|ico|pdf)$|\/(fortune|demo)\b/i,
  // опциональный фильтр (регэксп пути) — для теста/таргетинга, напр. MD_ONLY='/stati/'
  ONLY: process.env.MD_ONLY ? new RegExp(process.env.MD_ONLY) : null,
  // тело берём ТОЛЬКО из <article> (проза статей). Лендинги без <article> авто-пропускаются —
  // их <main> содержит бронь-виджет/CTA, чистого текста нет; их индекс уже есть в llms-full.txt.
  CONTENT: ['article', '[data-article-body]'],
  // что вырезать из тела перед конвертацией
  STRIP: ['header', 'nav', 'footer', 'form', 'script', 'style', 'noscript', 'svg',
          '[data-related]', '#lead-form', '#shifts', '.related', 'aside',
          'button[data-faq-toggle] i', 'astro-island'],
};

const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'aidacamp-md-bot/1.0' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

/** Собрать все URL из sitemap (поддержка sitemap-index). */
async function collectUrls() {
  const seen = new Set();
  const out = [];
  async function walk(sm) {
    let xml;
    try { xml = await fetchText(sm); } catch (e) { log('sitemap fail', sm, e.message); return; }
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    if (/<sitemapindex/i.test(xml)) {
      for (const child of locs) await walk(child.replace(CFG.CANON, CFG.BASE));
    } else {
      for (const u of locs) {
        const path = u.replace(CFG.CANON, '').replace(CFG.BASE, '') || '/';
        if (CFG.SKIP.test(path) || seen.has(path)) continue;
        if (CFG.ONLY && !CFG.ONLY.test(path)) continue;
        seen.add(path); out.push(path);
      }
    }
  }
  await walk(`${CFG.BASE}/sitemap-index.xml`);
  if (!out.length) await walk(`${CFG.BASE}/sitemap.xml`);
  return out;
}

const nhm = new NodeHtmlMarkdown({ bulletMarker: '-', codeBlockStyle: 'fenced' });

function htmlToMd(html) {
  const root = parse(html);
  const title = (root.querySelector('h1')?.text || root.querySelector('title')?.text || '').trim();
  let body = null;
  for (const sel of CFG.CONTENT) { body = root.querySelector(sel); if (body) break; }
  if (!body) return null;
  for (const sel of CFG.STRIP) body.querySelectorAll(sel).forEach((n) => n.remove());
  const md = nhm.translate(body.toString()).replace(/\n{3,}/g, '\n\n').trim();
  if (md.length < 200) return null; // слишком пусто — пропускаем
  return { title, md };
}

async function main() {
  await mkdir(CFG.OUT, { recursive: true });
  let manifest = {};
  if (existsSync(CFG.MANIFEST)) { try { manifest = JSON.parse(await readFile(CFG.MANIFEST, 'utf8')); } catch {} }

  const urls = await collectUrls();
  log(`sitemap: ${urls.length} страниц-кандидатов`);

  const now = Date.now();
  const stale = now - CFG.REFRESH_DAYS * 86400_000;
  const todo = urls.filter((p) => !manifest[p] || manifest[p].ts < stale).slice(0, CFG.BATCH);
  log(`к обработке за этот запуск: ${todo.length} (BATCH=${CFG.BATCH})`);

  let ok = 0, skip = 0, err = 0;
  for (const path of todo) {
    try {
      const html = await fetchText(`${CFG.BASE}${path}`);
      const res = htmlToMd(html);
      if (!res) { manifest[path] = { ts: now, skip: true }; skip++; await sleep(CFG.SLEEP_MS); continue; }
      const file = join(CFG.OUT, path.replace(/\/$/, '') + '.md').replace(/\/\.md$/, '/index.md');
      await mkdir(dirname(file), { recursive: true });
      const front = `---\ntitle: ${JSON.stringify(res.title)}\nurl: ${CFG.CANON}${path}\ngenerated: ${new Date().toISOString().slice(0, 10)}\n---\n\n`;
      await writeFile(file, front + res.md + '\n', 'utf8');
      manifest[path] = { ts: now };
      ok++;
    } catch (e) { log('ERR', path, e.message); err++; }
    await sleep(CFG.SLEEP_MS);
  }
  await writeFile(CFG.MANIFEST, JSON.stringify(manifest), 'utf8');
  const done = urls.filter((p) => manifest[p]).length;
  log(`готово: +${ok} обновлено, ${skip} пропущено, ${err} ошибок. Покрытие: ${done}/${urls.length}`);
}

main().catch((e) => { log('FATAL', e); process.exit(1); });
