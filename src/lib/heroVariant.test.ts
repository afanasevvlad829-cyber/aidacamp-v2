/**
 * Characterization tests for heroVariant.ts — детерминированная ротация
 * hero-эффектов по slug.
 *
 * hashSlug(slug) = сумма charCodeAt всех символов
 * getSeoEffect: hash % 3 → ['mesh', 'noise', 'grid'][i]
 * getArticleEffect: hash % 3 → ['editorial', 'accent-bar', 'split-stagger'][i]
 * getInfoEffect: hash % 3 → ['ultraminimal', 'minimal-mesh', 'noise-only'][i]
 * getConversionEffect: hash % 3 → ['mesh-urgency', 'terminal', 'fullscreen-cta'][i]
 * getTopicEffect: приоритет override, иначе hash % 3 → TOPIC_EFFECTS[i]
 */
import { describe, it, expect } from 'vitest';
import {
  getSeoEffect,
  getTopicEffect,
  getArticleEffect,
  getInfoEffect,
  getConversionEffect,
} from './heroVariant';

// ── Вспомогательные slug-и с заранее вычисленными hash % 3 ───────────────────
// 'abc': 97+98+99 = 294, 294%3 = 0
// 'cd':  99+100   = 199, 199%3 = 1  (остаток 1)
// 'bc':  98+99    = 197, 197%3 = 2  (остаток 2)

describe('getSeoEffect', () => {
  it("slug 'abc' (hash%3=0) → 'mesh'", () => {
    expect(getSeoEffect('abc')).toBe('mesh');
  });

  it("slug 'cd' (hash%3=1) → 'noise'", () => {
    expect(getSeoEffect('cd')).toBe('noise');
  });

  it("slug 'bc' (hash%3=2) → 'grid'", () => {
    expect(getSeoEffect('bc')).toBe('grid');
  });

  it('один и тот же slug всегда даёт один результат', () => {
    const slug = 'sport-lager-podmoskovye';
    expect(getSeoEffect(slug)).toBe(getSeoEffect(slug));
  });

  it('возвращает одно из допустимых значений', () => {
    const valid = ['mesh', 'noise', 'grid'];
    expect(valid).toContain(getSeoEffect('random-seo-slug'));
  });
});

describe('getTopicEffect', () => {
  it("'python-lager' → 'python-code' (override)", () => {
    expect(getTopicEffect('python-lager')).toBe('python-code');
  });

  it("'minecraft-lager' → 'minecraft-pixels' (override)", () => {
    expect(getTopicEffect('minecraft-lager')).toBe('minecraft-pixels');
  });

  it("'roblox-lager' → 'roblox-arcade' (override)", () => {
    expect(getTopicEffect('roblox-lager')).toBe('roblox-arcade');
  });

  it("'3d-modelirovanie-lager' → '3d-wireframe' (override)", () => {
    expect(getTopicEffect('3d-modelirovanie-lager')).toBe('3d-wireframe');
  });

  it("'ai-lager' → 'mesh-themed' (нет override, hash%3=2)", () => {
    // a=97,i=105,'-'=45,l=108,a=97,g=103,e=101,r=114 = 770; 770%3 = 2
    expect(getTopicEffect('ai-lager')).toBe('mesh-themed');
  });

  it("slug без override 'abc' (hash%3=0) → 'particles'", () => {
    expect(getTopicEffect('abc')).toBe('particles');
  });

  it("slug без override 'cd' (hash%3=1) → 'glitch'", () => {
    expect(getTopicEffect('cd')).toBe('glitch');
  });

  it("slug без override 'bc' (hash%3=2) → 'mesh-themed'", () => {
    expect(getTopicEffect('bc')).toBe('mesh-themed');
  });
});

describe('getArticleEffect', () => {
  it("slug 'abc' (hash%3=0) → 'editorial'", () => {
    expect(getArticleEffect('abc')).toBe('editorial');
  });

  it("slug 'cd' (hash%3=1) → 'accent-bar'", () => {
    expect(getArticleEffect('cd')).toBe('accent-bar');
  });

  it("slug 'bc' (hash%3=2) → 'split-stagger'", () => {
    expect(getArticleEffect('bc')).toBe('split-stagger');
  });

  it('возвращает одно из допустимых значений', () => {
    const valid = ['editorial', 'accent-bar', 'split-stagger'];
    expect(valid).toContain(getArticleEffect('kak-vybrat-lager'));
  });
});

describe('getInfoEffect', () => {
  it("slug 'abc' (hash%3=0) → 'ultraminimal'", () => {
    expect(getInfoEffect('abc')).toBe('ultraminimal');
  });

  it("slug 'cd' (hash%3=1) → 'minimal-mesh'", () => {
    expect(getInfoEffect('cd')).toBe('minimal-mesh');
  });

  it("slug 'bc' (hash%3=2) → 'noise-only'", () => {
    expect(getInfoEffect('bc')).toBe('noise-only');
  });
});

describe('getConversionEffect', () => {
  it("slug 'abc' (hash%3=0) → 'mesh-urgency'", () => {
    expect(getConversionEffect('abc')).toBe('mesh-urgency');
  });

  it("slug 'cd' (hash%3=1) → 'terminal'", () => {
    expect(getConversionEffect('cd')).toBe('terminal');
  });

  it("slug 'bc' (hash%3=2) → 'fullscreen-cta'", () => {
    expect(getConversionEffect('bc')).toBe('fullscreen-cta');
  });

  it('детерминированность: один slug → один эффект всегда', () => {
    const slug = 'zapisatsya-v-lager';
    const first = getConversionEffect(slug);
    expect(getConversionEffect(slug)).toBe(first);
    expect(getConversionEffect(slug)).toBe(first);
  });
});
