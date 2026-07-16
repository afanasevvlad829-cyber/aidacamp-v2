import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGraders } from './eval-graders.mjs';

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

test('honest_about_shift_limits: падает если текст утверждает конкретную смену', () => {
  const r = runGraders(
    { graders: ['honest_about_shift_limits'] },
    { text: 'Вот фото именно с последней смены!' }
  );
  assert.equal(r.passed, false);
});

test('honest_about_shift_limits: проходит на честной формулировке', () => {
  const r = runGraders(
    { graders: ['honest_about_shift_limits'] },
    { text: 'Точно сортировать фото по смене пока не можем — вот живые фото с наших смен.' }
  );
  assert.equal(r.passed, true);
});
