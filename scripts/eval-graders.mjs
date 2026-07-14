// Code-based грейдеры для eval-ask-bot.mjs — детерминированные, без LLM.
// Каждый грейдер: (botResponse) => { passed: boolean, reason?: string }

import { SHIFT_META } from '../src/data/shifts.ts';

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
  // Бот не имеет права заявлять "именно с последней смены" / "с прошлой смены" в тексте,
  // пока фото не размечены по сменам (см. Task 4/5) — иначе это фактическая ложь пользователю.
  const claimsSpecificShift = /именно с (последней|прошлой|\d)|фото с \d-?й? смены/.test(text);
  return claimsSpecificShift
    ? { passed: false, reason: `текст утверждает конкретную смену без реальной привязки фото: "${resp.text}"` }
    : { passed: true };
}

export function mentions_correct_price_s3(resp) {
  const price = SHIFT_META['shift-3'].basePrice;
  const priceStr = price.toLocaleString('ru-RU');
  return (resp.text || '').includes(priceStr)
    ? { passed: true }
    : { passed: false, reason: `ожидали цену смены 3 (${priceStr}) в тексте, не нашли` };
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
