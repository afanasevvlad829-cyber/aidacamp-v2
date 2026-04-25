/**
 * heroVariant.ts — детерминированная ротация hero-эффектов по slug (ТЗ v2.3)
 *
 * Один URL всегда = один эффект. Не меняется при редеплое.
 * hash % 3 → индекс эффекта для каждого типа страниц.
 */

function hashSlug(slug: string): number {
  return [...slug].reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

// T2 — SEO-лендинги
const SEO_EFFECTS = ['mesh', 'noise', 'grid'] as const;
export type SeoEffect = typeof SEO_EFFECTS[number];

export function getSeoEffect(slug: string): SeoEffect {
  return SEO_EFFECTS[hashSlug(slug) % SEO_EFFECTS.length];
}

// T3 — Тематические страницы (python, minecraft, ai, scratch, roblox, 3d)
// Базовый набор эффектов — fallback для топик-страниц без явного override
const TOPIC_EFFECTS = ['particles', 'glitch', 'mesh-themed'] as const;

// Уникальный эффект на каждый топик (приоритет над hashSlug)
const TOPIC_OVERRIDES: Record<string, string> = {
  'python-lager': 'python-code',
  'minecraft-lager': 'minecraft-pixels',
  'roblox-lager': 'roblox-arcade',
  '3d-modelirovanie-lager': '3d-wireframe',
  // ai-lager → mesh-themed (оранжевый mesh — подходит)
  // scratch-lager → glitch (RGB-split — подходит для визуального языка Scratch)
};

export type TopicEffect = string;

export function getTopicEffect(slug: string): TopicEffect {
  if (slug in TOPIC_OVERRIDES) return TOPIC_OVERRIDES[slug];
  return TOPIC_EFFECTS[hashSlug(slug) % TOPIC_EFFECTS.length];
}

// T4 — Статьи
const ARTICLE_EFFECTS = ['editorial', 'accent-bar', 'split-stagger'] as const;
export type ArticleEffect = typeof ARTICLE_EFFECTS[number];

export function getArticleEffect(slug: string): ArticleEffect {
  return ARTICLE_EFFECTS[hashSlug(slug) % ARTICLE_EFFECTS.length];
}

// T5 — Инфо/утиль
const INFO_EFFECTS = ['ultraminimal', 'minimal-mesh', 'noise-only'] as const;
export type InfoEffect = typeof INFO_EFFECTS[number];

export function getInfoEffect(slug: string): InfoEffect {
  return INFO_EFFECTS[hashSlug(slug) % INFO_EFFECTS.length];
}

// T6 — Конверсионные
const CONVERSION_EFFECTS = ['mesh-urgency', 'terminal', 'fullscreen-cta'] as const;
export type ConversionEffect = typeof CONVERSION_EFFECTS[number];

export function getConversionEffect(slug: string): ConversionEffect {
  return CONVERSION_EFFECTS[hashSlug(slug) % CONVERSION_EFFECTS.length];
}
