import { readFileSync } from 'node:fs';
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
  DATES_S3, DATES_S4,
  DAYS_S1, DAYS_S2, DAYS_S3, DAYS_S4, DAYS_S21, DAYS_S22, DAYS_MIN, DAYS_MAX,
  VYCHET_MAX, VYCHET_MAX_DAYS,
  allShiftsIncludingArchived,
  shiftLine,
  daysAdj,
  daysNum,
  taxDeduction,
  shiftDeduction,
  shiftDatesFull,
  shiftDatesShort,
  fmtRub,
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

  // До 15.08.2026 держали строгую версию («ни одна смена не завершилась») — упала
  // 16.08.2026: Смена 3 закончилась накануне (endDate 08-15), Смена 4 ещё не началась
  // (startDate 08-17) — однодневный зазор между сменами, не забытые протухшие данные.
  // Смягчили инвариант: хотя бы одна смена в mainShifts должна быть ещё не завершена —
  // это ловит реально забытую ротацию (весь массив в прошлом), но не однодневный зазор.
  it('хотя бы одна смена не завершилась (endDate >= сегодня)', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(mainShifts.some(s => s.endDate >= today)).toBe(true);
  });

  it('endDate после startDate для всех активных смен', () => {
    for (const s of mainShifts) {
      expect(s.endDate > s.startDate).toBe(true);
    }
  });

  // occupied > 0 требуем только у смен, которые уже начались: у смены с открытыми
  // продажами, но не стартовавшей, ноль записавшихся — нормальное состояние, а не
  // забытые данные (поймано 27.08.2026 при открытии осенних продаж). Для будущих
  // смен проверяем лишь неотрицательность — забытый мусор это по-прежнему ловит.
  it('free >= 0; occupied > 0 у начавшихся смен', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const s of mainShifts) {
      expect(s.free).toBeGreaterThanOrEqual(0);
      expect(s.occupied).toBeGreaterThanOrEqual(0);
      if (s.startDate <= today) expect(s.occupied).toBeGreaterThan(0);
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
  // Было «DATES_SHORT_S3 содержит августа» — проверка проходила бы и после того,
  // как экспорт молча переехал бы на любую другую августовскую смену. Привязка
  // по id ниже, в describe('привязка экспортов по id').

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

// ── Привязка экспортов ПО ID, а не по позиции в mainShifts ──────────────────
// Инцидент 07.09.2026: PRICE_S3/S4, DATES_S3/S4, DATES_SHORT_S3/S4, VYCHET_S3/S4
// и SEASON_RANGE выводились как mainShifts[0]/mainShifts[1]. Имя говорило
// «Смена 3», смысл был «первая смена в массиве»: попытка вынести завершённые
// летние смены в архив увела бы экспорты на осенние, и страницы напечатали бы
// «Смена 3: 25–31 октября, 13 дней — 49 900 ₽».

describe('привязка экспортов по id', () => {
  const byId = (id: string): Shift => {
    const s = allShiftsIncludingArchived.find(x => x.id === id);
    if (!s) throw new Error(`нет смены ${id}`);
    return s;
  };

  it('PRICE_S3/PRICE_S4 — цены смен shift-3/shift-4', () => {
    expect(PRICE_S3).toBe(byId('shift-3').price);
    expect(PRICE_S4).toBe(byId('shift-4').price);
  });

  it('DAYS_S* — длительности своих смен', () => {
    expect(DAYS_S1).toBe(byId('shift-1').duration);
    expect(DAYS_S2).toBe(byId('shift-2').duration);
    expect(DAYS_S3).toBe(byId('shift-3').duration);
    expect(DAYS_S4).toBe(byId('shift-4').duration);
    expect(DAYS_S21).toBe(byId('shift-2-1').duration);
    expect(DAYS_S22).toBe(byId('shift-2-2').duration);
  });

  it('DATES_S3/S4 и DATES_SHORT_S3/S4 — даты своих смен', () => {
    expect(DATES_S3).toBe(shiftDatesFull(byId('shift-3')));
    expect(DATES_S4).toBe(shiftDatesFull(byId('shift-4')));
    expect(DATES_SHORT_S3).toBe(shiftDatesShort(byId('shift-3')));
    expect(DATES_SHORT_S4).toBe(shiftDatesShort(byId('shift-4')));
  });

  it('VYCHET_S3/S4 — вычеты своих смен', () => {
    expect(VYCHET_S3).toBe(fmtRub(shiftDeduction(byId('shift-3'))));
    expect(VYCHET_S4).toBe(fmtRub(shiftDeduction(byId('shift-4'))));
  });

});

// ── Границы диапазона несут СВОЮ длительность ──────────────────────────────
// Инцидент 27.08.2026 (найден 07.09.2026): осенние смены вошли в mainShifts,
// PRICE_MIN упал с 74 900 ₽ (10 дней) на 49 900 ₽ (7 дней), а зашитая текстом
// «10 дней» осталась — «от 49 900 ₽ за 10 дней» уехало в прод на 93 строках.

describe('DAYS_MIN / DAYS_MAX / VYCHET_MAX_DAYS', () => {
  const toNum = (p: string) => parseInt(p.replace(/\D/g, ''), 10);

  it('DAYS_MIN — длительность смены, задающей PRICE_MIN', () => {
    const cheapest = [...mainShifts].sort((a, b) => toNum(a.price) - toNum(b.price))[0];
    expect(PRICE_MIN).toBe(cheapest.price);
    expect(DAYS_MIN).toBe(cheapest.duration);
  });

  it('DAYS_MAX — длительность смены, задающей PRICE_MAX', () => {
    const priciest = [...mainShifts].sort((a, b) => toNum(b.price) - toNum(a.price))[0];
    expect(PRICE_MAX).toBe(priciest.price);
    expect(DAYS_MAX).toBe(priciest.duration);
  });

  it('VYCHET_MAX и VYCHET_MAX_DAYS — от ОДНОЙ и той же смены', () => {
    const best = mainShifts.reduce((a, b) => (shiftDeduction(b) > shiftDeduction(a) ? b : a));
    expect(VYCHET_MAX).toBe(fmtRub(shiftDeduction(best)));
    expect(VYCHET_MAX_DAYS).toBe(best.duration);
  });

  it('VYCHET_MAX — максимум по ВСЕМ открытым сменам, не по двум первым', () => {
    const max = Math.max(...mainShifts.map(shiftDeduction));
    expect(VYCHET_MAX).toBe(fmtRub(max));
  });
});

// ── Статическая проверка: позиционной привязки в shifts.ts больше нет ────────
// Значения совпадают, пока смены лежат на «своих» позициях, поэтому одних
// сверок значений мало — регресс вернётся незамеченным. Читаем исходник.

describe('shifts.ts не адресует смены по позиции', () => {
  const src = readFileSync(new URL('./shifts.ts', import.meta.url), 'utf-8');

  it('никакой экспорт не адресует смену по индексу mainShifts[...]', () => {
    const bad = src
      .split('\n')
      .map((line, i) => [i + 1, line] as const)
      .filter(([, l]) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
      .filter(([, l]) => /mainShifts\[[^\]]+\]/.test(l));
    expect(bad.map(([n, l]) => `${n}: ${l.trim()}`)).toEqual([]);
  });
});

// ── shiftLine: канон для новых страниц ─────────────────────────────────────

describe('shiftLine', () => {
  it('склеивает имя, даты, длительность и цену из самой смены', () => {
    const s = allShiftsIncludingArchived.find(x => x.id === 'shift-3')!;
    const line = shiftLine(s);
    expect(line).toContain(s.name);
    expect(line).toContain(s.duration);
    expect(line).toContain(s.price);
    expect(line).toContain(shiftDatesShort(s));
  });

  it('с opts.vychet добавляет вычет той же смены', () => {
    const s = allShiftsIncludingArchived.find(x => x.id === 'shift-4')!;
    expect(shiftLine(s, { vychet: true })).toContain(fmtRub(shiftDeduction(s)));
  });

  it('не содержит ни одной зашитой цифры длительности мимо duration', () => {
    for (const s of allShiftsIncludingArchived) {
      const line = shiftLine(s);
      const days = (line.match(/\d+\s+(?:дней|дня|день)/g) ?? []);
      expect(days).toEqual([s.duration]);
    }
  });
});

// ── daysAdj: косвенные падежи длительности ─────────────────────────────────
// «за 13-дневную смену» — подстановка ${DAYS_S3} дала бы «за 13 дней смену».

describe('daysAdj', () => {
  const s3 = allShiftsIncludingArchived.find(x => x.id === 'shift-3')!;

  it('склоняет по падежам, беря число из самой смены', () => {
    expect(daysAdj(s3)).toBe('13-дневная');
    expect(daysAdj(s3, 'nom')).toBe('13-дневная');
    expect(daysAdj(s3, 'acc')).toBe('13-дневную');
    expect(daysAdj(s3, 'gen')).toBe('13-дневной');
  });

  it('принимает строку длительности — для VYCHET_MAX_DAYS', () => {
    expect(daysAdj(VYCHET_MAX_DAYS, 'acc')).toBe(`${parseInt(VYCHET_MAX_DAYS, 10)}-дневную`);
  });

  it('число всегда совпадает с duration смены', () => {
    for (const s of allShiftsIncludingArchived) {
      expect(daysAdj(s)).toBe(`${parseInt(s.duration, 10)}-дневная`);
    }
  });

  it('бросает на неразбираемой длительности', () => {
    expect(() => daysAdj('без цифр')).toThrow();
  });
});

// ── daysNum: число без слова, для перечислений ─────────────────────────────
// «смены 10 и 13 дней»: ${DAYS_S4} дал бы «10 дней и 13 дней».

describe('daysNum', () => {
  it('возвращает число из смены и из строки длительности', () => {
    const s3 = allShiftsIncludingArchived.find(x => x.id === 'shift-3')!;
    expect(daysNum(s3)).toBe(13);
    expect(daysNum(DAYS_S4)).toBe(10);
  });

  it('совпадает с числом в duration для всех смен', () => {
    for (const s of allShiftsIncludingArchived) {
      expect(daysNum(s)).toBe(parseInt(s.duration, 10));
    }
  });

  it('бросает на неразбираемой длительности', () => {
    expect(() => daysNum('без цифр')).toThrow();
  });
});
