/**
 * check-articles.mjs — страж синхронности реестра статей.
 * Роняет билд, если в src/pages/stati/ появилась статья, которой нет в src/data/articles.json
 * (значит, забыли прогнать `node scripts/gen-articles.mjs`).
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

if (missing.length || orphan.length) {
  console.error('✗ Реестр статей рассинхронизирован с src/pages/stati/');
  if (missing.length) console.error('  Нет в articles.json:', missing.join(', '));
  if (orphan.length) console.error('  Лишние в articles.json (файл удалён?):', orphan.join(', '));
  console.error('  Почини: node scripts/gen-articles.mjs');
  process.exit(1);
}

console.log(`✓ Реестр статей синхронен (${fileSlugs.length} статей)`);
