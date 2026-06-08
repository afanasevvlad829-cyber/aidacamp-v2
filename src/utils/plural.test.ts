/**
 * Characterization tests for plural.ts — русское склонение.
 * Фиксируют все три формы для каждого шортката по правилам:
 *   mod100 ∈ [11..14] → forms[2]   (дней, мест, детей...)
 *   mod10 == 1        → forms[0]   (день, место, ребёнок...)
 *   mod10 ∈ [2..4]    → forms[1]   (дня, места, ребёнка...)
 *   иначе             → forms[2]
 */
import { describe, it, expect } from 'vitest';
import {
  plural,
  pluralDays,
  pluralPlaces,
  pluralKids,
  pluralYears,
  pluralHours,
  pluralMinutes,
} from './plural';

describe('plural — core function', () => {
  const forms: [string, string, string] = ['день', 'дня', 'дней'];

  it('0 → форма "много" (дней)', () => {
    expect(plural(0, forms)).toBe('дней');
  });

  it('1 → форма "один" (день)', () => {
    expect(plural(1, forms)).toBe('день');
  });

  it('2 → форма "несколько" (дня)', () => {
    expect(plural(2, forms)).toBe('дня');
  });

  it('3 → форма "несколько"', () => {
    expect(plural(3, forms)).toBe('дня');
  });

  it('4 → форма "несколько"', () => {
    expect(plural(4, forms)).toBe('дня');
  });

  it('5 → форма "много" (дней)', () => {
    expect(plural(5, forms)).toBe('дней');
  });

  it('10 → форма "много"', () => {
    expect(plural(10, forms)).toBe('дней');
  });

  it('11 → форма "много" (исключение mod100)', () => {
    expect(plural(11, forms)).toBe('дней');
  });

  it('12 → форма "много" (исключение mod100)', () => {
    expect(plural(12, forms)).toBe('дней');
  });

  it('13 → форма "много" (исключение mod100)', () => {
    expect(plural(13, forms)).toBe('дней');
  });

  it('14 → форма "много" (исключение mod100)', () => {
    expect(plural(14, forms)).toBe('дней');
  });

  it('21 → форма "один" (mod10==1, mod100!=11)', () => {
    expect(plural(21, forms)).toBe('день');
  });

  it('22 → форма "несколько"', () => {
    expect(plural(22, forms)).toBe('дня');
  });

  it('100 → форма "много"', () => {
    expect(plural(100, forms)).toBe('дней');
  });

  it('111 → форма "много" (mod100=11, исключение)', () => {
    expect(plural(111, forms)).toBe('дней');
  });

  it('121 → форма "один"', () => {
    expect(plural(121, forms)).toBe('день');
  });
});

describe('pluralDays', () => {
  it('1 день', () => { expect(pluralDays(1)).toBe('день'); });
  it('2 дня', () => { expect(pluralDays(2)).toBe('дня'); });
  it('5 дней', () => { expect(pluralDays(5)).toBe('дней'); });
  it('10 дней', () => { expect(pluralDays(10)).toBe('дней'); });
  it('11 дней (исключение)', () => { expect(pluralDays(11)).toBe('дней'); });
  it('21 день', () => { expect(pluralDays(21)).toBe('день'); });
  it('14 дней (исключение)', () => { expect(pluralDays(14)).toBe('дней'); });
});

describe('pluralPlaces', () => {
  it('1 место', () => { expect(pluralPlaces(1)).toBe('место'); });
  it('2 места', () => { expect(pluralPlaces(2)).toBe('места'); });
  it('5 мест', () => { expect(pluralPlaces(5)).toBe('мест'); });
  it('11 мест (исключение)', () => { expect(pluralPlaces(11)).toBe('мест'); });
});

describe('pluralKids', () => {
  it('1 ребёнок', () => { expect(pluralKids(1)).toBe('ребёнок'); });
  it('2 ребёнка', () => { expect(pluralKids(2)).toBe('ребёнка'); });
  it('5 детей', () => { expect(pluralKids(5)).toBe('детей'); });
  it('12 детей (исключение)', () => { expect(pluralKids(12)).toBe('детей'); });
});

describe('pluralYears', () => {
  it('1 год', () => { expect(pluralYears(1)).toBe('год'); });
  it('2 года', () => { expect(pluralYears(2)).toBe('года'); });
  it('5 лет', () => { expect(pluralYears(5)).toBe('лет'); });
  it('11 лет (исключение)', () => { expect(pluralYears(11)).toBe('лет'); });
  it('21 год', () => { expect(pluralYears(21)).toBe('год'); });
});

describe('pluralHours', () => {
  it('1 час', () => { expect(pluralHours(1)).toBe('час'); });
  it('2 часа', () => { expect(pluralHours(2)).toBe('часа'); });
  it('5 часов', () => { expect(pluralHours(5)).toBe('часов'); });
});

describe('pluralMinutes', () => {
  it('1 минута', () => { expect(pluralMinutes(1)).toBe('минута'); });
  it('2 минуты', () => { expect(pluralMinutes(2)).toBe('минуты'); });
  it('5 минут', () => { expect(pluralMinutes(5)).toBe('минут'); });
});
