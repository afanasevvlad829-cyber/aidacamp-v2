import { describe, it, expect } from 'vitest';
import { ACTIVITIES, getActivity } from './portalActivities';

describe('portalActivities', () => {
  it('ACTIVITIES не пустой и slug-и уникальны', () => {
    // Точное число не фиксируем — методички регулярно добавляются (5 → 11 к июлю 2026).
    expect(ACTIVITIES.length).toBeGreaterThanOrEqual(5);
    const slugs = ACTIVITIES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('getActivity возвращает объект для известного slug', () => {
    const a = getActivity('ohotnik-na-monstrov');
    expect(a).not.toBeNull();
    expect(a!.title).toBe('Охотник на монстров');
    expect(a!.slug).toBe('ohotnik-na-monstrov');
  });

  it('getActivity возвращает null для неизвестного slug', () => {
    expect(getActivity('xxx')).toBeNull();
    expect(getActivity('')).toBeNull();
  });

  it('все элементы имеют непустые slug, title и desc', () => {
    for (const a of ACTIVITIES) {
      expect(a.slug.length).toBeGreaterThan(0);
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.desc.length).toBeGreaterThan(0);
    }
  });
});
