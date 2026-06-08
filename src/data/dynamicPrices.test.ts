/**
 * Characterization tests for dynamicPrices.ts.
 * Фиксируют ТЕКУЩЕЕ поведение как есть — не исправляют логику.
 * Используем noon-UTC даты чтобы избежать timezone-edge-cases в daysDiff.
 */
import { describe, it, expect } from 'vitest';
import {
  PRICING,
  getCurrentPrice,
  getNextDayPrice,
  getNextPriceStage,
  getFortunePrice,
  getDays,
  getTaxDeduction,
  fmtPrice,
} from './dynamicPrices';

/** Строит Date из YYYY-MM-DD в полдень UTC — безопасно для daysDiff в любой TZ. */
const d = (s: string) => new Date(s + 'T12:00:00Z');

// ── PRICING shape ────────────────────────────────────────────────────────────

describe('PRICING config', () => {
  it('содержит 6 смен', () => {
    expect(Object.keys(PRICING)).toHaveLength(6);
  });

  it('shift-2 длиннее shift-1', () => {
    expect(PRICING['shift-2'].days).toBeGreaterThan(PRICING['shift-1'].days);
  });

  it('shift-1 и shift-2 имеют fortune-конфиг', () => {
    expect(PRICING['shift-1'].fortune).toBeDefined();
    expect(PRICING['shift-2'].fortune).toBeDefined();
  });

  it('shift-3 не имеет fortune-конфига', () => {
    expect(PRICING['shift-3'].fortune).toBeUndefined();
  });
});

// ── getCurrentPrice ──────────────────────────────────────────────────────────

describe('getCurrentPrice', () => {
  it('возвращает null для неизвестного shiftId', () => {
    expect(getCurrentPrice('unknown-shift', d('2026-06-01'))).toBeNull();
  });

  it('возвращает null если дата раньше первой ступени', () => {
    expect(getCurrentPrice('shift-1', d('2025-12-31'))).toBeNull();
  });

  it('shift-1: ступень 1 (2026-01-01) = 74 900', () => {
    expect(getCurrentPrice('shift-1', d('2026-01-01'))).toBe(74900);
  });

  it('shift-1: ступень 2 (2026-04-01) = 79 900', () => {
    expect(getCurrentPrice('shift-1', d('2026-04-01'))).toBe(79900);
  });

  it('shift-1: ступень 3 (2026-05-01) = 85 900', () => {
    expect(getCurrentPrice('shift-1', d('2026-05-01'))).toBe(85900);
  });

  it('shift-1: инкремент-ступень — день 0 (2026-05-23) = базовая 85 900', () => {
    // Первый день инкремента: elapsed=0, прирост отсутствует
    expect(getCurrentPrice('shift-1', d('2026-05-23'))).toBe(85900);
  });

  it('shift-1: инкремент +1 000/день — день 1 (2026-05-24) = 86 900', () => {
    expect(getCurrentPrice('shift-1', d('2026-05-24'))).toBe(86900);
  });

  it('shift-1: инкремент — день 4 (2026-05-27) = 89 900', () => {
    expect(getCurrentPrice('shift-1', d('2026-05-27'))).toBe(89900);
  });

  it('shift-1: фиксированный максимум (2026-05-28) = 93 900', () => {
    // Следующая ступень фиксирует цену, инкремент прекращается
    expect(getCurrentPrice('shift-1', d('2026-05-28'))).toBe(93900);
  });

  it('shift-1: максимум держится после 2026-05-28', () => {
    expect(getCurrentPrice('shift-1', d('2026-06-01'))).toBe(93900);
  });

  it('shift-2: инкремент-ступень — день 0 (2026-05-23) = 99 000', () => {
    expect(getCurrentPrice('shift-2', d('2026-05-23'))).toBe(99000);
  });

  it('shift-2: инкремент +500/день — день 1 (2026-05-24) = 99 500', () => {
    expect(getCurrentPrice('shift-2', d('2026-05-24'))).toBe(99500);
  });

  it('shift-3: одна фиксированная ступень', () => {
    expect(getCurrentPrice('shift-3', d('2026-06-01'))).toBe(89400);
  });

  it('shift-4: одна фиксированная ступень', () => {
    expect(getCurrentPrice('shift-4', d('2026-06-01'))).toBe(74900);
  });

  it('shift-2-1: цена 48 000', () => {
    expect(getCurrentPrice('shift-2-1', d('2026-06-01'))).toBe(48000);
  });

  it('shift-2-2: цена 75 000', () => {
    expect(getCurrentPrice('shift-2-2', d('2026-06-01'))).toBe(75000);
  });
});

// ── getNextDayPrice ──────────────────────────────────────────────────────────

describe('getNextDayPrice', () => {
  it('возвращает null для неизвестного shiftId', () => {
    expect(getNextDayPrice('unknown-shift', d('2026-06-01'))).toBeNull();
  });

  it('shift-2: растущая цена — завтра на 500 дороже', () => {
    const today = d('2026-05-24');
    const todayPrice = getCurrentPrice('shift-2', today)!;
    const tomorrow = getNextDayPrice('shift-2', today);
    expect(tomorrow).not.toBeNull();
    expect(tomorrow).toBe(todayPrice + 500);
  });

  it('shift-1: на максимальной цене — возвращает null', () => {
    expect(getNextDayPrice('shift-1', d('2026-06-01'))).toBeNull();
  });

  it('shift-3: нет инкремента — всегда null', () => {
    expect(getNextDayPrice('shift-3', d('2026-06-01'))).toBeNull();
  });
});

// ── getNextPriceStage ────────────────────────────────────────────────────────

describe('getNextPriceStage', () => {
  it('возвращает null для неизвестного shiftId', () => {
    expect(getNextPriceStage('unknown-shift', d('2026-06-01'))).toBeNull();
  });

  it('shift-1 на 2026-01-01: следующая ступень — 2026-04-01, 79 900', () => {
    const next = getNextPriceStage('shift-1', d('2026-01-01'));
    expect(next).not.toBeNull();
    expect(next!.from).toBe('2026-04-01');
    expect(next!.price).toBe(79900);
  });

  it('shift-1 после последней ступени: следующей ступени нет', () => {
    expect(getNextPriceStage('shift-1', d('2026-06-01'))).toBeNull();
  });

  it('shift-3 с одной ступенью: нет следующей ступени', () => {
    expect(getNextPriceStage('shift-3', d('2026-06-01'))).toBeNull();
  });
});

// ── getFortunePrice ──────────────────────────────────────────────────────────

describe('getFortunePrice', () => {
  it('возвращает null для неизвестного shiftId', () => {
    expect(getFortunePrice('unknown-shift', d('2026-06-01'))).toBeNull();
  });

  it('возвращает null для смены без fortune-конфига', () => {
    expect(getFortunePrice('shift-3', d('2026-06-01'))).toBeNull();
  });

  it('shift-1 при цене 93 900: 7% скидка + 30% депозит', () => {
    // final = round(93900 * 0.93) = 87327
    // deposit = round(87327 * 0.30) = 26198
    const result = getFortunePrice('shift-1', d('2026-06-01'));
    expect(result).not.toBeNull();
    expect(result!.final).toBe(87327);
    expect(result!.deposit).toBe(26198);
  });

  it('shift-2 при базовой цене 99 000: 7% скидка + 30% депозит', () => {
    // final = round(99000 * 0.93) = 92070
    // deposit = round(92070 * 0.30) = 27621
    const result = getFortunePrice('shift-2', d('2026-05-23'));
    expect(result).not.toBeNull();
    expect(result!.final).toBe(92070);
    expect(result!.deposit).toBe(27621);
  });

  it('final всегда меньше базовой цены', () => {
    const base = getCurrentPrice('shift-1', d('2026-06-01'))!;
    const result = getFortunePrice('shift-1', d('2026-06-01'))!;
    expect(result.final).toBeLessThan(base);
  });

  it('deposit меньше final', () => {
    const result = getFortunePrice('shift-1', d('2026-06-01'))!;
    expect(result.deposit).toBeLessThan(result.final);
  });
});

// ── getDays ──────────────────────────────────────────────────────────────────

describe('getDays', () => {
  it('shift-1 = 10 дней', () => { expect(getDays('shift-1')).toBe(10); });
  it('shift-2 = 14 дней', () => { expect(getDays('shift-2')).toBe(14); });
  it('shift-3 = 13 дней', () => { expect(getDays('shift-3')).toBe(13); });
  it('shift-4 = 10 дней', () => { expect(getDays('shift-4')).toBe(10); });
  it('shift-2-1 = 7 дней', () => { expect(getDays('shift-2-1')).toBe(7); });
  it('shift-2-2 = 8 дней', () => { expect(getDays('shift-2-2')).toBe(8); });
  it('неизвестная смена = 0', () => { expect(getDays('unknown')).toBe(0); });
});

// ── getTaxDeduction ──────────────────────────────────────────────────────────

describe('getTaxDeduction', () => {
  it('возвращает 0 для неизвестной смены', () => {
    expect(getTaxDeduction('unknown-shift', d('2026-06-01'))).toBe(0);
  });

  it('shift-1 при 93 900 / 10 дней: 13% от образовательной части', () => {
    // eduPart = 93900 - 3800*10 = 55900; deduction = round(55900 * 0.13) = 7267
    expect(getTaxDeduction('shift-1', d('2026-06-01'))).toBe(7267);
  });

  it('shift-2-1 при 48 000 / 7 дней', () => {
    // eduPart = 48000 - 26600 = 21400; deduction = round(21400 * 0.13) = 2782
    expect(getTaxDeduction('shift-2-1', d('2026-06-01'))).toBe(2782);
  });

  it('shift-2-2 при 75 000 / 8 дней', () => {
    // eduPart = 75000 - 30400 = 44600; deduction = round(44600 * 0.13) = 5798
    expect(getTaxDeduction('shift-2-2', d('2026-06-01'))).toBe(5798);
  });

  it('shift-3 при 89 400 / 13 дней', () => {
    // eduPart = 89400 - 49400 = 40000; deduction = round(40000 * 0.13) = 5200
    expect(getTaxDeduction('shift-3', d('2026-06-01'))).toBe(5200);
  });

  it('shift-4 при 74 900 / 10 дней', () => {
    // eduPart = 74900 - 38000 = 36900; deduction = round(36900 * 0.13) = 4797
    expect(getTaxDeduction('shift-4', d('2026-06-01'))).toBe(4797);
  });
});

// ── fmtPrice ─────────────────────────────────────────────────────────────────

describe('fmtPrice', () => {
  it('форматирует 93900 с неразрывным пробелом и символом рубля', () => {
    // toLocaleString('ru-RU') разделяет тысячи через U+00A0 (non-breaking space)
    expect(fmtPrice(93900)).toBe('93 900 ₽');
  });

  it('форматирует 0', () => {
    expect(fmtPrice(0)).toBe('0 ₽');
  });

  it('форматирует 1000', () => {
    expect(fmtPrice(1000)).toBe('1 000 ₽');
  });

  it('всегда заканчивается на ₽', () => {
    expect(fmtPrice(74900)).toMatch(/₽$/);
    expect(fmtPrice(48000)).toMatch(/₽$/);
  });
});
