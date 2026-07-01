// DEPRECATED — заменён на scripts/gen-articles.mjs (единый генератор src/data/articles.ts).
// Причина: этот скрипт и gen-articles.mjs писали в один файл с разными схемами полей,
// взаимно затирая друг друга (инцидент 2026-07-01: RSS/Zen упал на runtime-ошибке,
// т.к. gen-articles.mjs стёр ogImageJpg/contentHtml, добавленные этим скриптом).
// Используй: node scripts/gen-articles.mjs
console.error('DEPRECATED: используй node scripts/gen-articles.mjs');
process.exit(1);
