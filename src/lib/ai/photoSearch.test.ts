/**
 * photoSearch.test.ts — тест фильтра по shiftId (Task 5).
 * Мокает photo-index.json локальной фикстурой — реальный файл (63 фото после синка
 * с Immich) не трогаем, чтобы тест не зависел от будущих ре-синков.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../data/photo-index.json', () => ({
  default: {
    base: '/images/gallery/',
    photos: [
      { file: 'a.avif', tags: ['еда'], caption: 'A', shift: 'shift-2' },
      { file: 'b.avif', tags: ['еда'], caption: 'B' },
    ],
  },
}));

import { findPhotos } from './photoSearch';

describe('findPhotos с shiftId', () => {
  it('возвращает только фото нужной смены, если они есть', () => {
    const r = findPhotos('еда', 4, 'shift-2');
    expect(r).toHaveLength(1);
    expect(r[0].caption).toBe('A');
  });

  it('падает на общий поиск, если для смены нет фото', () => {
    const r = findPhotos('еда', 4, 'shift-99');
    expect(r.length).toBeGreaterThan(0); // не пусто — общий поиск сработал
  });

  it('без shiftId работает как раньше — обычный поиск по тегам', () => {
    const r = findPhotos('еда', 4);
    expect(r.length).toBeGreaterThan(0);
  });
});
