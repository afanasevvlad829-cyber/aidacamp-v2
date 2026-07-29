import { describe, it, expect } from 'vitest';
import { SEASON_START_ISO, SEASON_END_ISO, OPEN_DAYS_PHRASE } from './evergreen';
import { allShiftsIncludingArchived } from './shifts';

describe('evergreen: производные ISO-границы и длительности', () => {
  it('SEASON_START_ISO = минимальный startDate из shifts.ts', () => {
    const min = allShiftsIncludingArchived.map(s => s.startDate).sort()[0];
    expect(SEASON_START_ISO).toBe(min);
  });
  it('SEASON_END_ISO = максимальный endDate из shifts.ts', () => {
    const max = allShiftsIncludingArchived.map(s => s.endDate).sort().at(-1);
    expect(SEASON_END_ISO).toBe(max);
  });
  it('OPEN_DAYS_PHRASE — «N и M дней» из длительностей открытых смен', () => {
    // на 29.07.2026 открыты 13 и 10 дней → «10 и 13 дней»; формат проверяем шаблоном
    expect(OPEN_DAYS_PHRASE).toMatch(/^\d+((, \d+)* и \d+)? дней$/);
  });
});
