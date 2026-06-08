import { describe, it, expect } from 'vitest';
import {
  MS_PER_DAY,
  DEPOSIT_RATE,
  TIMER_SECONDS,
  computeFortunePrice,
  computeDeposit,
  formatRub,
  daysUntil,
  formatDaysLabel,
  formatTimerTick,
} from './fortune';

// ── constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('MS_PER_DAY = 864e5', () => expect(MS_PER_DAY).toBe(864e5));
  it('DEPOSIT_RATE = 0.5', () => expect(DEPOSIT_RATE).toBe(0.5));
  it('TIMER_SECONDS = 1800 (30 мин)', () => expect(TIMER_SECONDS).toBe(1800));
});

// ── computeFortunePrice ──────────────────────────────────────────────────────

describe('computeFortunePrice', () => {
  it('0% — цена не меняется', () => {
    expect(computeFortunePrice(100000, 0)).toBe(100000);
  });
  it('10% скидка', () => {
    expect(computeFortunePrice(100000, 10)).toBe(90000);
  });
  it('20% скидка', () => {
    expect(computeFortunePrice(100000, 20)).toBe(80000);
  });
  it('50% скидка', () => {
    expect(computeFortunePrice(100000, 50)).toBe(50000);
  });
  it('70% скидка', () => {
    expect(computeFortunePrice(100000, 70)).toBe(30000);
  });
  it('100% — цена 0', () => {
    expect(computeFortunePrice(100000, 100)).toBe(0);
  });
  it('округляет до целых (не дробное)', () => {
    const result = computeFortunePrice(74900, 30);
    expect(result).toBe(Math.round(74900 * 0.7));
    expect(Number.isInteger(result)).toBe(true);
  });
  it('реальный кейс: 93900 × 10%', () => {
    expect(computeFortunePrice(93900, 10)).toBe(Math.round(93900 * 0.9));
  });
  it('реальный кейс: 95000 × 20% = 76000', () => {
    expect(computeFortunePrice(95000, 20)).toBe(76000);
  });
  it('реальный кейс: 74900 × 70%', () => {
    expect(computeFortunePrice(74900, 70)).toBe(Math.round(74900 * 0.3));
  });
});

// ── computeDeposit ───────────────────────────────────────────────────────────

describe('computeDeposit', () => {
  it('50% от чётной суммы', () => {
    expect(computeDeposit(100000)).toBe(50000);
  });
  it('50% от 76000 = 38000', () => {
    expect(computeDeposit(76000)).toBe(38000);
  });
  it('округляет нечётные значения', () => {
    // Math.round(1 * 0.5) = Math.round(0.5) = 1
    expect(computeDeposit(1)).toBe(1);
  });
  it('цепочка: 20% скидка с базы 95000, депозит = 38000', () => {
    expect(computeDeposit(computeFortunePrice(95000, 20))).toBe(38000);
  });
  it('результат — целое число', () => {
    expect(Number.isInteger(computeDeposit(93900))).toBe(true);
  });
});

// ── formatRub ────────────────────────────────────────────────────────────────

describe('formatRub', () => {
  it('всегда заканчивается на ₽', () => {
    expect(formatRub(0)).toMatch(/₽$/);
    expect(formatRub(74900)).toMatch(/₽$/);
  });
  it('совпадает с toLocaleString("ru-RU") + " ₽"', () => {
    expect(formatRub(93900)).toBe((93900).toLocaleString('ru-RU') + ' ₽');
    expect(formatRub(0)).toBe('0 ₽');
  });
  it('содержит число', () => {
    expect(formatRub(1000)).toContain('1');
  });
});

// ── daysUntil ────────────────────────────────────────────────────────────────

describe('daysUntil', () => {
  it('тот же момент → 0', () => {
    const t = 1_700_000_000_000;
    expect(daysUntil(t, t)).toBe(0);
  });
  it('прошедшая дата → 0 (не отрицательное)', () => {
    const now = 1_700_000_000_000;
    expect(daysUntil(now - MS_PER_DAY, now)).toBe(0);
  });
  it('ровно 1 день вперёд', () => {
    const now = 1_700_000_000_000;
    expect(daysUntil(now + MS_PER_DAY, now)).toBe(1);
  });
  it('7 дней вперёд', () => {
    const now = 1_700_000_000_000;
    expect(daysUntil(now + 7 * MS_PER_DAY, now)).toBe(7);
  });
  it('неполный день округляется вверх (ceil)', () => {
    const now = 1_700_000_000_000;
    expect(daysUntil(now + MS_PER_DAY / 2, now)).toBe(1);
  });
  it('чуть больше одного дня → 2', () => {
    const now = 1_700_000_000_000;
    expect(daysUntil(now + MS_PER_DAY + 1, now)).toBe(2);
  });
});

// ── formatDaysLabel ──────────────────────────────────────────────────────────

describe('formatDaysLabel', () => {
  it('0 → "сегодня"', () => expect(formatDaysLabel(0)).toBe('сегодня'));
  it('1 → "через 1 день"', () => expect(formatDaysLabel(1)).toBe('через 1 день'));
  it('2 → "через 2 дн"', () => expect(formatDaysLabel(2)).toBe('через 2 дн'));
  it('30 → "через 30 дн"', () => expect(formatDaysLabel(30)).toBe('через 30 дн'));
  it('содержит число для любого N > 1', () => {
    expect(formatDaysLabel(15)).toContain('15');
  });
});

// ── formatTimerTick ──────────────────────────────────────────────────────────

describe('formatTimerTick', () => {
  it('1800 (30 мин) → "30:00"', () => expect(formatTimerTick(1800)).toBe('30:00'));
  it('0 → "00:00"', () => expect(formatTimerTick(0)).toBe('00:00'));
  it('59 → "00:59"', () => expect(formatTimerTick(59)).toBe('00:59'));
  it('60 → "01:00"', () => expect(formatTimerTick(60)).toBe('01:00'));
  it('1799 → "29:59"', () => expect(formatTimerTick(1799)).toBe('29:59'));
  it('65 → "01:05" (дополняет нули)', () => expect(formatTimerTick(65)).toBe('01:05'));
  it('формат всегда MM:SS', () => {
    expect(formatTimerTick(TIMER_SECONDS)).toMatch(/^\d{2}:\d{2}$/);
  });
});
