/**
 * Тесты единого правила роста цены (dynamicPrices.ts).
 * Правило: база → (старт−30д: +5%) → +500/день → фиксация на старте.
 * Данные смен берутся из SHIFT_META (shifts.ts).
 * Используем noon-UTC даты чтобы избежать timezone-edge-cases в daysDiff.
 */
import { describe, it, expect } from 'vitest';
import {
  PRICING,
  getCurrentPrice,
  getNextDayPrice,
  getNextPriceStage,
  getFortunePrice,
  isFortuneActive,
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

  it('каждая смена имеет 3 ступени (база → рост → фиксация)', () => {
    for (const id of Object.keys(PRICING)) {
      expect(PRICING[id].stages).toHaveLength(3);
    }
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

// ── Единое правило роста (на примере shift-3: старт 2026-08-03, база 89 400) ──
// rampFrom = 2026-07-04 (старт − 30 дней); +5% → 93 870; на старте → 108 870.

describe('getCurrentPrice — единое правило', () => {
  it('возвращает null для неизвестного shiftId', () => {
    expect(getCurrentPrice('unknown-shift', d('2026-06-01'))).toBeNull();
  });

  it('возвращает null если дата раньше первой ступени', () => {
    expect(getCurrentPrice('shift-3', d('2025-12-31'))).toBeNull();
  });

  it('до начала роста (за 30+ дней) — базовая цена', () => {
    expect(getCurrentPrice('shift-3', d('2026-06-01'))).toBe(89400);
    expect(getCurrentPrice('shift-3', d('2026-07-03'))).toBe(89400); // день до роста
  });

  it('за 30 дней до старта — разовый шаг +5% к базе', () => {
    // round(89400 * 1.05) = 93870
    expect(getCurrentPrice('shift-3', d('2026-07-04'))).toBe(93870);
  });

  it('далее +500 ₽/день', () => {
    expect(getCurrentPrice('shift-3', d('2026-07-05'))).toBe(94370); // +1 день
    expect(getCurrentPrice('shift-3', d('2026-07-14'))).toBe(98870); // +10 дней
  });

  it('на старте смены цена фиксируется (рост останавливается)', () => {
    // 93870 + 30*500 = 108870
    expect(getCurrentPrice('shift-3', d('2026-08-03'))).toBe(108870);
    expect(getCurrentPrice('shift-3', d('2026-08-20'))).toBe(108870); // держится
  });

  it('shift-4: то же правило (база 74 900, старт 2026-08-17)', () => {
    expect(getCurrentPrice('shift-4', d('2026-06-01'))).toBe(74900);          // база
    expect(getCurrentPrice('shift-4', d('2026-07-18'))).toBe(78645);          // +5% (round(74900*1.05))
    expect(getCurrentPrice('shift-4', d('2026-08-17'))).toBe(78645 + 15000);  // фиксация = 93645
  });
});

// ── getNextDayPrice ──────────────────────────────────────────────────────────

describe('getNextDayPrice', () => {
  it('возвращает null для неизвестного shiftId', () => {
    expect(getNextDayPrice('unknown-shift', d('2026-06-01'))).toBeNull();
  });

  it('в фазе роста — завтра на 500 дороже', () => {
    const today = d('2026-07-05');
    const todayPrice = getCurrentPrice('shift-3', today)!;
    expect(getNextDayPrice('shift-3', today)).toBe(todayPrice + 500);
  });

  it('до начала роста — null (цена ещё не растёт)', () => {
    expect(getNextDayPrice('shift-3', d('2026-06-01'))).toBeNull();
  });

  it('после фиксации на старте — null', () => {
    expect(getNextDayPrice('shift-3', d('2026-08-10'))).toBeNull();
  });
});

// ── getNextPriceStage ────────────────────────────────────────────────────────

describe('getNextPriceStage', () => {
  it('возвращает null для неизвестного shiftId', () => {
    expect(getNextPriceStage('unknown-shift', d('2026-06-01'))).toBeNull();
  });

  it('до роста: следующая ступень — начало роста (+5%)', () => {
    const next = getNextPriceStage('shift-3', d('2026-06-01'));
    expect(next).not.toBeNull();
    expect(next!.from).toBe('2026-07-04');
    expect(next!.price).toBe(93870);
  });

  it('в фазе роста: следующая ступень — фиксация на старте', () => {
    const next = getNextPriceStage('shift-3', d('2026-07-10'));
    expect(next!.from).toBe('2026-08-03');
    expect(next!.price).toBe(108870);
  });

  it('после старта: следующей ступени нет', () => {
    expect(getNextPriceStage('shift-3', d('2026-08-10'))).toBeNull();
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

  it('shift-2 при базовой цене 99 000: 7% скидка + 30% депозит', () => {
    // до роста (rampFrom shift-2 = 2026-05-11): база 99 000
    // final = round(99000 * 0.93) = 92070; deposit = round(92070 * 0.30) = 27621
    const result = getFortunePrice('shift-2', d('2026-05-01'));
    expect(result).not.toBeNull();
    expect(result!.final).toBe(92070);
    expect(result!.deposit).toBe(27621);
  });

  it('final всегда меньше базовой цены', () => {
    const base = getCurrentPrice('shift-1', d('2026-04-01'))!;
    const result = getFortunePrice('shift-1', d('2026-04-01'))!;
    expect(result.final).toBeLessThan(base);
  });

  it('deposit меньше final', () => {
    const result = getFortunePrice('shift-1', d('2026-04-01'))!;
    expect(result.deposit).toBeLessThan(result.final);
  });
});

// ── isFortuneActive (последние 3 дня / 3 места) ──────────────────────────────
// shift-3: старт 2026-08-03.

describe('isFortuneActive', () => {
  it('активна: 3 дня до старта + 3 места', () => {
    expect(isFortuneActive('shift-3', 3, d('2026-07-31'))).toBe(true);
  });

  it('активна: 1 день до старта + 1 место', () => {
    expect(isFortuneActive('shift-3', 1, d('2026-08-02'))).toBe(true);
  });

  it('не активна: 4 дня до старта (вне окна)', () => {
    expect(isFortuneActive('shift-3', 2, d('2026-07-30'))).toBe(false);
  });

  it('не активна: 4 свободных места (не последние 3)', () => {
    expect(isFortuneActive('shift-3', 4, d('2026-07-31'))).toBe(false);
  });

  it('не активна: распродано (0 мест)', () => {
    expect(isFortuneActive('shift-3', 0, d('2026-08-02'))).toBe(false);
  });

  it('не активна: после старта', () => {
    expect(isFortuneActive('shift-3', 2, d('2026-08-05'))).toBe(false);
  });

  it('false для неизвестной смены', () => {
    expect(isFortuneActive('unknown', 1, d('2026-08-02'))).toBe(false);
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

// ── getTaxDeduction (на базовой цене — до роста) ──────────────────────────────

describe('getTaxDeduction', () => {
  it('возвращает 0 для неизвестной смены', () => {
    expect(getTaxDeduction('unknown-shift', d('2026-06-01'))).toBe(0);
  });

  it('shift-3 при базе 89 400 / 13 дней', () => {
    // eduPart = 89400 - 3800*13 = 40000; deduction = round(40000 * 0.13) = 5200
    expect(getTaxDeduction('shift-3', d('2026-06-01'))).toBe(5200);
  });

  it('shift-4 при базе 74 900 / 10 дней', () => {
    // eduPart = 74900 - 38000 = 36900; deduction = round(36900 * 0.13) = 4797
    expect(getTaxDeduction('shift-4', d('2026-06-01'))).toBe(4797);
  });

  it('shift-2-1 при базе 48 000 / 7 дней (до роста)', () => {
    // eduPart = 48000 - 26600 = 21400; deduction = round(21400 * 0.13) = 2782
    expect(getTaxDeduction('shift-2-1', d('2026-05-01'))).toBe(2782);
  });
});

// ── fmtPrice ─────────────────────────────────────────────────────────────────

describe('fmtPrice', () => {
  it('форматирует 93900 с пробелом-разделителем и символом рубля', () => {
    // fmtRub нормализует разделитель тысяч из ICU (U+00A0/U+202F) в обычный пробел
    expect(fmtPrice(93900)).toBe('93 900 ₽');
  });

  it('форматирует 0', () => {
    expect(fmtPrice(0)).toBe('0 ₽');
  });

  it('всегда заканчивается на ₽', () => {
    expect(fmtPrice(74900)).toMatch(/₽$/);
    expect(fmtPrice(48000)).toMatch(/₽$/);
  });
});
