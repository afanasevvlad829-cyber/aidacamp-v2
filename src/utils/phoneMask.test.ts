/**
 * Characterization tests for phoneMask.ts — форматирование и валидация
 * российских номеров телефона.
 */
import { describe, it, expect } from 'vitest';
import { formatPhone, isPhoneValid } from './phoneMask';

describe('formatPhone', () => {
  it('пустая строка → пустая строка', () => {
    expect(formatPhone('')).toBe('');
  });

  it('строка без цифр → пустая строка', () => {
    expect(formatPhone('abc-xyz')).toBe('');
  });

  it('нормальный номер 8-xxx-xxx-xx-xx → +7 (xxx) xxx-xx-xx', () => {
    expect(formatPhone('89161234567')).toBe('+7 (916) 123-45-67');
  });

  it('нормальный номер 7-xxx → +7 (xxx) xxx-xx-xx', () => {
    expect(formatPhone('79161234567')).toBe('+7 (916) 123-45-67');
  });

  it('уже отформатированный номер → тот же формат', () => {
    expect(formatPhone('+7 (916) 123-45-67')).toBe('+7 (916) 123-45-67');
  });

  it('номер с пробелами и тире', () => {
    expect(formatPhone('7 916 123-45-67')).toBe('+7 (916) 123-45-67');
  });

  it('номер с кодом страны +7', () => {
    expect(formatPhone('+79161234567')).toBe('+7 (916) 123-45-67');
  });

  it('номер начинающийся с 9 (без кода) → добавляется 7', () => {
    expect(formatPhone('9161234567')).toBe('+7 (916) 123-45-67');
  });

  it('частичный ввод — только +7', () => {
    expect(formatPhone('7')).toBe('+7');
  });

  it('частичный ввод — +7 (9', () => {
    expect(formatPhone('79')).toBe('+7 (9');
  });

  it('частичный ввод — +7 (91)', () => {
    expect(formatPhone('791')).toBe('+7 (91');
  });

  it('частичный ввод — 4 цифры: добавляет ") " даже без следующих цифр', () => {
    // TODO: trailing space — поведение реализации; возможно стоит обрезать в #5
    expect(formatPhone('7916')).toBe('+7 (916) ');
  });

  it('частичный ввод — +7 (916) 1', () => {
    expect(formatPhone('79161')).toBe('+7 (916) 1');
  });

  it('обрезает больше 11 цифр', () => {
    // Берёт только первые 11 цифр
    expect(formatPhone('799999999999999')).toBe('+7 (999) 999-99-99');
  });
});

describe('isPhoneValid', () => {
  it('полный номер +7 (916) 123-45-67 → true', () => {
    expect(isPhoneValid('+7 (916) 123-45-67')).toBe(true);
  });

  it('79161234567 → true', () => {
    expect(isPhoneValid('79161234567')).toBe(true);
  });

  it('89161234567 → true (8 → 7 при проверке)', () => {
    // Функция проверяет: digits.length === 11 && digits.startsWith('7')
    // '89161234567' → digits = '89161234567', startsWith('7') → false
    // TODO: 8xxx номера не считаются валидными по isPhoneValid (в отличие от formatPhone)
    expect(isPhoneValid('89161234567')).toBe(false);
  });

  it('слишком короткий номер → false', () => {
    expect(isPhoneValid('7916123')).toBe(false);
  });

  it('пустая строка → false', () => {
    expect(isPhoneValid('')).toBe(false);
  });

  it('не телефон → false', () => {
    expect(isPhoneValid('hello world')).toBe(false);
  });
});
