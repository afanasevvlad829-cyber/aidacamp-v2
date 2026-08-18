import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runGraders } from './eval-graders.mjs';
import { lastCompletedShift } from '../src/data/shifts.ts';

// см. комментарий в eval-graders.mjs — обходим ESM JSON-import-атрибут, читаем напрямую.
function hasShiftPhotos(shiftId) {
  const index = JSON.parse(readFileSync(new URL('../src/data/photo-index.json', import.meta.url)));
  return index.photos.some(p => p.shift === shiftId);
}

test('has_gallery: проходит когда есть фото', () => {
  const r = runGraders(
    { graders: ['has_gallery'] },
    { block_type: 'gallery', block_data: { photos: [{ url: '/a.avif' }] } }
  );
  assert.equal(r.passed, true);
});

test('has_gallery: падает без фото', () => {
  const r = runGraders(
    { graders: ['has_gallery'] },
    { block_type: null, block_data: null }
  );
  assert.equal(r.passed, false);
  assert.match(r.failures[0], /has_gallery/);
});

test('offers_photo_chip: проходит если есть чип с "фото" даже без галереи', () => {
  const r = runGraders(
    { graders: ['offers_photo_chip'] },
    { block_type: null, chips: [{ label: 'Фото столовой', query: 'покажи фото столовой' }] }
  );
  assert.equal(r.passed, true);
});

test('offers_photo_chip: падает если нет ни галереи, ни чипа', () => {
  const r = runGraders(
    { graders: ['offers_photo_chip'] },
    { block_type: null, chips: [{ label: 'Смены и цены', query: 'смены' }] }
  );
  assert.equal(r.passed, false);
});

// С Task 5 "утверждает конкретную смену" честно только если у актуальной последней смены
// реально есть размеченные фото (hasShiftPhotos) — тесты сверяются с этим состоянием на лету,
// а не хардкодят ответ, чтобы не сломаться при появлении новых альбомов/новых прошедших смен.
test('honest_about_shift_limits: утверждение о конкретной смене — правда, только если для неё есть реальные фото', () => {
  const lastShift = lastCompletedShift(new Date().toISOString().slice(0, 10));
  const reallyHasPhotos = !!lastShift && hasShiftPhotos(lastShift.id);
  const r = runGraders(
    { graders: ['honest_about_shift_limits'] },
    { text: 'Вот фото именно с последней смены!' }
  );
  assert.equal(r.passed, reallyHasPhotos);
});

test('honest_about_shift_limits: проходит на честной формулировке, независимо от реальных данных', () => {
  const r = runGraders(
    { graders: ['honest_about_shift_limits'] },
    { text: 'Точно сортировать фото по смене пока не можем — вот живые фото с наших смен.' }
  );
  assert.equal(r.passed, true);
});
