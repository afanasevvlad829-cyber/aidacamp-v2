import { describe, it, expect } from 'vitest';
import { HERO_VARIANTS } from './heroVariants';
import raw from './hero-variants.json';

describe('heroVariants: источник правды вместо хардкода', () => {
  const rawStrings = Object.values(raw as Record<string, { title: string; subtitle?: string }>)
    .flatMap(v => [v.title, v.subtitle ?? '']);
  const resolved = Object.values(HERO_VARIANTS).flatMap(v => [v.title, v.subtitle ?? '']);

  it('в JSON нет литеральных цен и «июнь–август»', () => {
    for (const s of rawStrings) {
      expect(s).not.toMatch(/\d{2}\s?\d{3}\s?₽/);
      expect(s).not.toMatch(/июнь–август/);
    }
  });
  it('в резолвнутых вариантах не осталось {ТОКЕНОВ}', () => {
    for (const s of resolved) expect(s).not.toMatch(/\{[A-Z_]+\}/);
  });
});
