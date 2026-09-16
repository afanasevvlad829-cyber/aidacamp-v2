// Code-based грейдеры для eval-ask-bot.mjs — детерминированные, без LLM.
// Каждый грейдер: (botResponse) => { passed: boolean, reason?: string }

import { readFileSync } from 'node:fs';
import { getCurrentPrice } from '../src/data/dynamicPrices.ts';
import { lastCompletedShift } from '../src/data/shifts.ts';

// Читаем photo-index.json напрямую (не через photoSearch.ts) — нативный Node ESM требует
// import-атрибут `with { type: 'json' }` для JSON-модулей, которого нет в продакшен-коде
// (Vite/Astro его не требует); дублировать логику дешевле, чем менять прод-импорт ради теста.
function hasShiftPhotos(shiftId) {
  const index = JSON.parse(readFileSync(new URL('../src/data/photo-index.json', import.meta.url)));
  return index.photos.some(p => p.shift === shiftId);
}

const BANNED_WORDS = ['единиц', 'единицы', 'единицами', 'баллов', 'баллы', 'балла', 'балл'];

export function no_banned_words(resp) {
  const text = (resp.text || '').toLowerCase();
  const hit = BANNED_WORDS.find(w => text.includes(w));
  return hit
    ? { passed: false, reason: `запрещённое слово "${hit}" в тексте` }
    : { passed: true };
}

export function has_gallery(resp) {
  const ok = resp.block_type === 'gallery' && Array.isArray(resp.block_data?.photos) && resp.block_data.photos.length > 0;
  return ok ? { passed: true } : { passed: false, reason: `block_type=${resp.block_type}, photos=${resp.block_data?.photos?.length ?? 0}` };
}

export function offers_photo_chip(resp) {
  const hasGallery = resp.block_type === 'gallery';
  const chipOffersPhoto = (resp.chips || []).some(c => /фото/i.test(c.label || '') || /фото/i.test(c.query || ''));
  return (hasGallery || chipOffersPhoto)
    ? { passed: true }
    : { passed: false, reason: 'ни галереи, ни чипа с "фото" в ответе на визуальную тему' };
}

export function honest_about_shift_limits(resp) {
  const text = (resp.text || '').toLowerCase();
  const claimsSpecificShift = /именно с (последней|прошлой|\d)|фото с \d-?й? смены/.test(text);
  if (!claimsSpecificShift) return { passed: true };
  // Заявление о конкретной смене — не автоматически ложь: с Task 5 часть смен реально
  // размечена в photo-index.json (hasShiftPhotos). Фейлим, только если для актуальной
  // последней смены реальных фото на самом деле нет — тогда это правда была бы ложью.
  const lastShift = lastCompletedShift(new Date().toISOString().slice(0, 10));
  if (lastShift && hasShiftPhotos(lastShift.id)) return { passed: true };
  return { passed: false, reason: `текст утверждает конкретную смену без реальной привязки фото: "${resp.text}"` };
}

// toLocaleString('ru-RU') вставляет NBSP (U+00A0) как разделитель тысяч, а текст бота —
// обычный пробел (U+0020). Нормализуем оба к обычному пробелу перед сравнением.
const normalizeSpaces = (s) => s.replace(/[  ]/g, ' ');

export function mentions_correct_price_s3(resp) {
  // Бот обязан называть ТЕКУЩУЮ (растущую) цену через getCurrentPrice(), а не базовую
  // из SHIFT_META — см. CLAUDE.md, «Единое правило роста цены».
  const price = getCurrentPrice('shift-3');
  if (price == null) return { passed: false, reason: 'getCurrentPrice("shift-3") вернул null — нет актуальной цены' };
  const priceStr = normalizeSpaces(price.toLocaleString('ru-RU'));
  const text = normalizeSpaces(resp.text || '');
  return text.includes(priceStr)
    ? { passed: true }
    : { passed: false, reason: `ожидали текущую цену смены 3 (${priceStr}) в тексте, не нашли` };
}

export function no_hardcoded_stale_deduction(resp) {
  // Известные устаревшие цифры вычета, которые запрещено упоминать (см. CLAUDE.md).
  const STALE = ['5 434', '5434', '5 200 ₽ (максимум'];
  const hit = STALE.find(s => (resp.text || '').includes(s));
  return hit ? { passed: false, reason: `устаревшая цифра вычета "${hit}"` } : { passed: true };
}

export const GRADERS = {
  no_banned_words, has_gallery, offers_photo_chip,
  honest_about_shift_limits, mentions_correct_price_s3, no_hardcoded_stale_deduction,
};

export function runGraders(caseDef, botResponse) {
  const failures = [];
  for (const name of caseDef.graders) {
    const fn = GRADERS[name];
    if (!fn) { failures.push(`неизвестный грейдер "${name}"`); continue; }
    const r = fn(botResponse);
    if (!r.passed) failures.push(`${name}: ${r.reason}`);
  }
  return { passed: failures.length === 0, failures };
}
