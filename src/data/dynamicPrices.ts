/**
 * Единственный источник правды для динамических цен смен.
 * Используется и на сервере (Astro frontmatter) и на клиенте (через window.__AIDA_PRICES__).
 */

export interface DynamicPriceStep {
  baseDate: string;
  prices: number[]; // цены по дням: index 0 = baseDate, 1 = baseDate+1, ...
}

export interface DynamicPriceLinear {
  baseDate: string;
  base: number;
  increment: number; // ₽ в день
  endDate: string;   // после этой даты цена фиксируется
}

export type DynamicPriceConfig = DynamicPriceStep | DynamicPriceLinear;

export const DYNAMIC_PRICE_CONFIG: Record<string, DynamicPriceConfig> = {
  'shift-1': {
    baseDate: '2026-05-23',
    prices: [85900, 86900, 87900, 89900, 91900, 93900],
  },
  'shift-2': {
    baseDate: '2026-05-23',
    base: 99000,
    increment: 500,
    endDate: '2026-06-10',
  },
};

function daysDiff(fromStr: string, toDate: Date): number {
  const from = new Date(fromStr);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toDate);
  to.setHours(0, 0, 0, 0);
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/** Текущая цена смены. null если дата раньше baseDate. */
export function getCurrentPrice(shiftId: string, today: Date = new Date()): number | null {
  const cfg = DYNAMIC_PRICE_CONFIG[shiftId];
  if (!cfg) return null;
  const elapsed = daysDiff(cfg.baseDate, today);
  if (elapsed < 0) return null;

  if ('prices' in cfg) {
    return cfg.prices[Math.min(elapsed, cfg.prices.length - 1)];
  }
  const maxDays = daysDiff(cfg.baseDate, new Date(cfg.endDate));
  return cfg.base + Math.min(elapsed, maxDays) * cfg.increment;
}

/** Цена следующего дня (для "Завтра будет X"). null если уже максимальная. */
export function getNextPrice(shiftId: string, today: Date = new Date()): number | null {
  const cfg = DYNAMIC_PRICE_CONFIG[shiftId];
  if (!cfg) return null;
  const elapsed = daysDiff(cfg.baseDate, today);
  if (elapsed < 0) return null;

  if ('prices' in cfg) {
    const idx = Math.min(elapsed, cfg.prices.length - 1);
    return elapsed < cfg.prices.length - 1 ? cfg.prices[idx + 1] : null;
  }
  const maxDays = daysDiff(cfg.baseDate, new Date(cfg.endDate));
  return elapsed < maxDays ? cfg.base + (Math.min(elapsed, maxDays) + 1) * cfg.increment : null;
}
