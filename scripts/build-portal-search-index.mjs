#!/usr/bin/env node
// Строит поисковый индекс по материалам портала (страницы /docs/*).
// Запускается ВРУЧНУЮ (не в npm run build): скачивает страницы, чистит HTML,
// пишет src/data/portalSearchIndex.json.
//
//   node scripts/build-portal-search-index.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'https://ai.aidacamp.ru';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS = 2000;

/** Каталог материалов — единственный источник правды для индекса. */
const catalog = [
  { group: 'Танковый полигон', roles: ['admin', 'teacher', 'student'], title: 'Танковый бой', path: 'tank-battle.html' },
  { group: 'Танковый полигон', roles: ['admin', 'teacher', 'student'], title: 'Арена', path: 'arena.html' },
  { group: 'Танковый полигон', roles: ['admin', 'teacher', 'student'], title: 'Тренировка', path: 'train.html' },
  { group: 'Танковый полигон', roles: ['admin', 'teacher', 'student'], title: 'Игра', path: 'play.html' },

  { group: 'Учителю', roles: ['admin', 'teacher'], title: 'Онбординг преподавателя', path: 'onboarding-teacher.html' },
  { group: 'Учителю', roles: ['admin', 'teacher'], title: 'Преподавателю', path: 'teacher.html' },
  { group: 'Учителю', roles: ['admin', 'teacher'], title: 'Хендбук', path: 'handbook.html' },
  { group: 'Учителю', roles: ['admin', 'teacher'], title: 'Дашборд', path: 'dashboard.html' },

  { group: 'Ученику', roles: ['admin', 'teacher', 'student'], title: 'Онбординг ученика', path: 'onboarding-student.html' },
  { group: 'Ученику', roles: ['admin', 'teacher', 'student'], title: 'Ученику', path: 'student.html' },
  { group: 'Ученику', roles: ['admin', 'teacher', 'student'], title: 'Квесты', path: 'quests.html' },
  { group: 'Ученику', roles: ['admin', 'teacher', 'student'], title: 'Каталог', path: 'catalog.html' },
  { group: 'Ученику', roles: ['admin', 'teacher', 'student'], title: 'Тур', path: 'tour.html' },
];

/** Превращает HTML в плоский текст: убирает script/style, теги, схлопывает пробелы. */
function htmlToText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const entries = [];
  let failed = 0;

  for (const item of catalog) {
    const url = `${BASE}/docs/${item.path}`;
    try {
      const html = await fetchPage(url);
      const text = htmlToText(html).slice(0, MAX_TEXT_CHARS);
      entries.push({ title: item.title, url, group: item.group, roles: item.roles, text });
      console.log(`✓ ${item.title} — ${text.length} chars (${url})`);
    } catch (err) {
      failed += 1;
      console.warn(`! пропущено: ${item.title} (${url}) — ${err.message}`);
    }
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = join(here, '..', 'src', 'data', 'portalSearchIndex.json');
  writeFileSync(outPath, JSON.stringify(entries, null, 2) + '\n', 'utf8');

  console.log(`\nГотово: ${entries.length}/${catalog.length} страниц в индексе (${failed} пропущено).`);
  console.log(`Файл: ${outPath}`);
}

main().catch((err) => {
  console.error('Ошибка построения индекса:', err);
  process.exit(1);
});
