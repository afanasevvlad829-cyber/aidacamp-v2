/**
 * check-articles.mjs — страж синхронности реестра статей.
 * 1. Роняет билд, если в src/pages/stati/ появилась статья, которой нет в src/data/articles.json
 *    (значит, забыли прогнать `node scripts/gen-articles.mjs`).
 * 2. Роняет билд, если в title/description/contentHtml остался нерезолвленный Astro-токен
 *    ({PRICE_MIN}, ${SEASON_YEAR}, {item.question} и т.п.) — признак того, что gen-articles.mjs
 *    прогнали до `astro build` или по сырому исходнику, а не по собранному dist/ (инцидент:
 *    100/150 статей несли такие токены прямо в RSS/VK-репост).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATI_DIR = path.join(ROOT, 'src/pages/stati');
const REGISTRY = path.join(ROOT, 'src/data/articles.json');

const isRedirectStub = (file) =>
  fs.readFileSync(path.join(STATI_DIR, file), 'utf8').includes('Astro.redirect');

const fileSlugs = fs.readdirSync(STATI_DIR)
  .filter(f => f.endsWith('.astro') && f !== 'index.astro' && !isRedirectStub(f))
  .map(f => f.replace(/\.astro$/, ''));

const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const regSlugs = new Set(reg.map(a => a.id));

const missing = fileSlugs.filter(s => !regSlugs.has(s));
const orphan = [...regSlugs].filter(s => !fileSlugs.includes(s));

let failed = false;

if (missing.length || orphan.length) {
  console.error('✗ Реестр статей рассинхронизирован с src/pages/stati/');
  if (missing.length) console.error('  Нет в articles.json:', missing.join(', '));
  if (orphan.length) console.error('  Лишние в articles.json (файл удалён?):', orphan.join(', '));
  console.error('  Почини: astro build && node scripts/gen-articles.mjs');
  failed = true;
}

// {TOKEN} — JSX-выражение в прозе (item.question, PRICE_MIN); ${TOKEN} — из template-литерала
// пропа (title={`... ${SEASON_YEAR} ...`}). Оба — след regex-извлечения по сырому исходнику
// вместо собранного HTML.
const TOKEN_RE = /\$?\{[A-Za-z_][A-Za-z0-9_.]*\}/;
const tokenHits = [];
for (const a of reg) {
  for (const field of ['title', 'description', 'contentHtml']) {
    if (TOKEN_RE.test(a[field] ?? '')) tokenHits.push(`${a.id} (${field})`);
  }
}
if (tokenHits.length) {
  console.error('✗ Нерезолвленные Astro-токены в articles.json:');
  console.error('  ' + tokenHits.join(', '));
  console.error('  Почини: astro build && node scripts/gen-articles.mjs (gen-articles.mjs должен читать dist/, не src/pages/stati/ напрямую)');
  failed = true;
}

if (failed) process.exit(1);

console.log(`✓ Реестр статей синхронен (${fileSlugs.length} статей), нерезолвленных токенов нет`);
