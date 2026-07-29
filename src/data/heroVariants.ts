/**
 * Резолвер hero-вариантов: подставляет живые значения источника правды
 * в тексты hero-variants.json. В JSON цифры и сезоны руками не писать —
 * только плейсхолдеры {PRICE_MIN}, {OPEN_DAYS}, {OPEN_MONTHS_NOM},
 * {OPEN_MONTHS_PREP}, {SEASON_FROM_TO}.
 */
import raw from './hero-variants.json';
import { PRICE_MIN } from './shifts';
import { OPEN_DAYS_PHRASE, OPEN_MONTHS_NOM, OPEN_MONTHS_PREP, SEASON_FROM_TO } from './evergreen';

const TOKENS: Record<string, string> = {
  '{PRICE_MIN}': PRICE_MIN,
  '{OPEN_DAYS}': OPEN_DAYS_PHRASE,
  '{OPEN_MONTHS_NOM}': OPEN_MONTHS_NOM,
  '{OPEN_MONTHS_PREP}': OPEN_MONTHS_PREP,
  '{SEASON_FROM_TO}': SEASON_FROM_TO,
};
const subst = (s: string) => Object.entries(TOKENS).reduce((acc, [t, v]) => acc.split(t).join(v), s);

// title/subtitle подставляются токенами; остальные поля (badge и т.п.) передаются как есть.
export type HeroVariant = { title: string; subtitle?: string; [key: string]: unknown };
export const HERO_VARIANTS: Record<string, HeroVariant> = Object.fromEntries(
  Object.entries(raw as Record<string, HeroVariant>).map(([k, v]) => [
    k,
    { ...v, title: subst(v.title), ...(v.subtitle !== undefined ? { subtitle: subst(v.subtitle) } : {}) },
  ]),
);
