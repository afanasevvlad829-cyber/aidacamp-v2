import { describe, it, expect } from 'vitest';
import {
  mainShifts,
  shortShifts,
  SHIFT_META,
  PRICE_MIN,
  PRICE_MAX,
  PRICE_S1, PRICE_S2, PRICE_S3, PRICE_S4, PRICE_S21, PRICE_S22,
  VYCHET_S1, VYCHET_S2, VYCHET_S3, VYCHET_S4, VYCHET_S21, VYCHET_S22,
  DATES_SHORT_S1, DATES_SHORT_S2, DATES_SHORT_S3, DATES_SHORT_S4,
  taxDeduction,
  shiftDeduction,
  shiftDatesFull,
  shiftDatesShort,
  lastCompletedShift,
  displayShifts,
  type Shift,
} from './shifts';
import { getCurrentPrice, getTaxDeduction } from './dynamicPrices';

// ── Целостность mainShifts ─────────────────────────────────────────────────

describe('mainShifts', () => {
  it('не пуст', () => {
    expect(mainShifts.length).toBeGreaterThan(0);
  });

  it('все смены имеют startDate в будущем относительно сегодня', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const s of mainShifts) {
      expect(s.startDate > today).toBe(true);
    }
  });

  it('endDate после startDate для всех активных смен', () => {
    for (const s of mainShifts) {
      expect(s.endDate > s.startDate).toBe(true);
    }
  });

  it('free >= 0 и occupied > 0', () => {
    for (const s of mainShifts) {
      expect(s.free).toBeGreaterThanOrEqual(0);
      expect(s.occupied).toBeGreaterThan(0);
    }
  });
});

// ── PRICE_MIN / PRICE_MAX выводятся из mainShifts ─────────────────────────

describe('PRICE_MIN / PRICE_MAX', () => {
  const toNum = (p: string) => parseInt(p.replace(/\D/g, ''), 10);

  it('PRICE_MIN — минимальная цена из mainShifts', () => {
    const min = [...mainShifts].sort((a, b) => toNum(a.price) - toNum(b.price))[0].price;
    expect(PRICE_MIN).toBe(min);
  });

  it('PRICE_MAX — максимальная цена из mainShifts', () => {
    const max = [...mainShifts].sort((a, b) => toNum(b.price) - toNum(a.price))[0].price;
    expect(PRICE_MAX).toBe(max);
  });

  it('PRICE_MIN <= PRICE_MAX (числово)', () => {
    expect(toNum(PRICE_MIN)).toBeLessThanOrEqual(toNum(PRICE_MAX));
  });
});

// ── SHIFT_META охватывает все смены ───────────────────────────────────────

describe('SHIFT_META', () => {
  const expectedIds = ['shift-1', 'shift-2', 'shift-2-1', 'shift-2-2', 'shift-3', 'shift-4'];

  it('содержит все 6 смен', () => {
    for (const id of expectedIds) {
      expect(SHIFT_META[id]).toBeDefined();
    }
  });

  it('basePrice > 0 для каждой смены', () => {
    for (const [, m] of Object.entries(SHIFT_META)) {
      expect(m.basePrice).toBeGreaterThan(0);
    }
  });

  it('даты в формате YYYY-MM-DD', () => {
    const isoRe = /^\d{4}-\d{2}-\d{2}$/;
    for (const [, m] of Object.entries(SHIFT_META)) {
      expect(m.startDate).toMatch(isoRe);
      expect(m.endDate).toMatch(isoRe);
      expect(m.endDate > m.startDate).toBe(true);
    }
  });

  it('days > 0', () => {
    for (const [, m] of Object.entries(SHIFT_META)) {
      expect(m.days).toBeGreaterThan(0);
    }
  });
});

// ── dynamicPrices: getCurrentPrice работает для всех смен ─────────────────

describe('getCurrentPrice', () => {
  it('возвращает число для всех mainShifts', () => {
    for (const s of mainShifts) {
      const price = getCurrentPrice(s.id);
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
    }
  });

  it('возвращает число для исторических смен (завершённых)', () => {
    for (const id of ['shift-1', 'shift-2', 'shift-2-1', 'shift-2-2']) {
      const price = getCurrentPrice(id);
      expect(price).not.toBeNull();
    }
  });

  it('null для несуществующей смены', () => {
    expect(getCurrentPrice('shift-99')).toBeNull();
  });
});

// ── Налоговый вычет ────────────────────────────────────────────────────────

describe('taxDeduction', () => {
  it('возвращает 0 для нулевой цены', () => {
    expect(taxDeduction(0, 10)).toBe(0);
  });

  it('возвращает 0 когда цена <= проживания', () => {
    expect(taxDeduction(3800 * 10, 10)).toBe(0); // edu=0
  });

  it('не превышает 13% от годового лимита 110 000 ₽', () => {
    expect(taxDeduction(999999, 1)).toBe(Math.round(110000 * 0.13));
  });

  it('Смена 2 (99000 ₽, 14 дн.) — вычет положительный', () => {
    const d = taxDeduction(99000, 14);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(99000 * 0.13);
  });
});

describe('shiftDeduction', () => {
  it('кратен 50 для всех смен', () => {
    const shifts: Shift[] = [...mainShifts];
    for (const s of shifts) {
      expect(shiftDeduction(s) % 50).toBe(0);
    }
  });
});

// ── VYCHET_* и PRICE_* экспортируются корректно ───────────────────────────

describe('price / vychet exports', () => {
  it('PRICE_S1..S4 не пустые строки', () => {
    expect(PRICE_S1).toBeTruthy();
    expect(PRICE_S2).toBeTruthy();
    expect(PRICE_S3).toBeTruthy();
    expect(PRICE_S4).toBeTruthy();
  });

  it('PRICE_S21 / PRICE_S22 не пустые', () => {
    expect(PRICE_S21).toBeTruthy();
    expect(PRICE_S22).toBeTruthy();
  });

  it('VYCHET_* содержат ₽', () => {
    for (const v of [VYCHET_S1, VYCHET_S2, VYCHET_S3, VYCHET_S4, VYCHET_S21, VYCHET_S22]) {
      expect(v).toContain('₽');
    }
  });
});

// ── Форматирование дат ─────────────────────────────────────────────────────

describe('date exports', () => {
  it('DATES_SHORT_S3 содержит августа', () => {
    expect(DATES_SHORT_S3).toContain('августа');
  });

  it('DATES_SHORT_S4 содержит августа', () => {
    expect(DATES_SHORT_S4).toContain('августа');
  });

  it('DATES_SHORT_S1 — кросс-месяц (содержит —)', () => {
    expect(DATES_SHORT_S1).toContain('—');
  });

  it('DATES_SHORT_S2 — одномесячный диапазон (содержит –)', () => {
    expect(DATES_SHORT_S2).toContain('–');
  });
});

// ── lastCompletedShift: честное определение последней завершённой смены ──────

describe('lastCompletedShift', () => {
  it('находит самую позднюю смену с endDate < today', () => {
    const s = lastCompletedShift('2026-07-14');
    expect(s?.id).toBe('shift-2'); // endDate 2026-06-23, позже чем у shift-1 (2026-06-08)
  });

  it('возвращает null, если ни одна смена ещё не завершилась', () => {
    const s = lastCompletedShift('2026-01-01');
    expect(s).toBeNull();
  });

  it('смена, которая идёт прямо сейчас (today внутри диапазона) — не считается завершённой', () => {
    const s = lastCompletedShift('2026-06-15'); // внутри shift-2 (10-23 июня)
    expect(s?.id).not.toBe('shift-2');
  });

  it('рассматривает все смены из displayShifts, не только mainShifts', () => {
    // displayShifts включает завершённые _shift1/_shift2 — эта проверка ловит регресс,
    // если кто-то случайно перепишет функцию на mainShifts (там завершённых уже нет).
    expect(displayShifts.some(s => s.id === 'shift-2')).toBe(true);
  });
});
