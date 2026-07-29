import { describe, it, expect } from 'vitest';
import { PAMYATKA_SHIFTS } from './pamyatkaShifts';
import { allShiftsIncludingArchived, shiftDatesFull, SEASON_YEAR } from './shifts';

const byId = Object.fromEntries(allShiftsIncludingArchived.map((s) => [s.id, s]));

describe('pamyatkaShifts: даты выводятся из shifts.ts', () => {
  it('группа 660 (1 смена CRM) = сайтовая Смена 1', () => {
    expect(PAMYATKA_SHIFTS[660].dates).toBe(`${shiftDatesFull(byId['shift-1'])} ${SEASON_YEAR}`);
  });
  it('группа 663 (4 смена CRM) = сайтовая Смена 2 (14 дней)', () => {
    expect(PAMYATKA_SHIFTS[663].dates).toBe(`${shiftDatesFull(byId['shift-2'])} ${SEASON_YEAR}`);
  });
  it('группы 664/665 (5/6 смена CRM) = сайтовые Смены 3 и 4 (подтверждено в CRM 2026-07-29)', () => {
    const dates = Object.values(PAMYATKA_SHIFTS).map((p) => p.dates);
    expect(dates).toContain(`${shiftDatesFull(byId['shift-3'])} ${SEASON_YEAR}`);
    expect(dates).toContain(`${shiftDatesFull(byId['shift-4'])} ${SEASON_YEAR}`);
  });
});
