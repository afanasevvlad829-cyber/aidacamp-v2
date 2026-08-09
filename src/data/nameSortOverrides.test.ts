import { describe, it, expect } from 'vitest';
import { surnameSortKey } from './nameSortOverrides';

describe('surnameSortKey', () => {
  it('shift-1/shift-2 (firstname-first по умолчанию) — переставляет Имя Фамилия в Фамилия Имя', () => {
    expect(surnameSortKey('Михаил Мандрыко', 'shift-1')).toBe('Мандрыко Михаил');
    expect(surnameSortKey('Роман Вивчар', 'shift-2')).toBe('Вивчар Роман');
  });

  it('shift-3 (surname-first по умолчанию) — не переставляет уже верный порядок', () => {
    expect(surnameSortKey('Петренко Роберт', 'shift-3')).toBe('Петренко Роберт');
  });

  it('явные исключения побеждают общий порядок смены', () => {
    expect(surnameSortKey('Александр Сытик', 'shift-3')).toBe('Сытик Александр');
    expect(surnameSortKey('Александр Сытик', 'shift-1')).toBe('Сытик Александр');
    expect(surnameSortKey('Григорьева Людмила', 'shift-1')).toBe('Григорьева Людмила');
    expect(surnameSortKey('Вуколов Петр', 'shift-2')).toBe('Вуколов Петр');
  });

  it('неизвестная смена — по умолчанию surname-first (не трогает имя)', () => {
    expect(surnameSortKey('Иванов Пётр', 'shift-99')).toBe('Иванов Пётр');
  });
});
