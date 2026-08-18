import { describe, it, expect, afterEach } from 'vitest';
import {
  STAFF_COOKIE,
  getStaffSecret,
  safeEqual,
  checkStaffPassword,
  isStaffAuthed,
  staffCookieOptions,
} from './staffAuth';

const SECRET = 'random-prod-secret-value';

afterEach(() => {
  delete process.env.STAFF_AUTH_SECRET;
});

describe('staffAuth', () => {
  it('имя куки — staff_auth_2026 (согласовано с shift-plan и /staff)', () => {
    expect(STAFF_COOKIE).toBe('staff_auth_2026');
  });

  describe('getStaffSecret — fail-closed', () => {
    it('нет переменной → null (фича закрыта)', () => {
      delete process.env.STAFF_AUTH_SECRET;
      expect(getStaffSecret()).toBeNull();
    });
    it('пустая строка → null (не считаем валидным секретом)', () => {
      process.env.STAFF_AUTH_SECRET = '';
      expect(getStaffSecret()).toBeNull();
    });
    it('задан → возвращает значение', () => {
      process.env.STAFF_AUTH_SECRET = SECRET;
      expect(getStaffSecret()).toBe(SECRET);
    });
  });

  describe('safeEqual', () => {
    it('равные строки → true', () => {
      expect(safeEqual('abc', 'abc')).toBe(true);
    });
    it('разные строки той же длины → false', () => {
      expect(safeEqual('abc', 'abd')).toBe(false);
    });
    it('разная длина → false (не бросает)', () => {
      expect(safeEqual('abc', 'abcd')).toBe(false);
    });
  });

  describe('checkStaffPassword', () => {
    it('верный пароль (=== секрет) → true', () => {
      expect(checkStaffPassword(SECRET, SECRET)).toBe(true);
    });
    it('неверный пароль → false', () => {
      expect(checkStaffPassword('2026', SECRET)).toBe(false);
    });
    it('нестроковый / пустой ввод → false', () => {
      expect(checkStaffPassword('', SECRET)).toBe(false);
      expect(checkStaffPassword(undefined, SECRET)).toBe(false);
      expect(checkStaffPassword(123 as unknown, SECRET)).toBe(false);
    });
  });

  describe('isStaffAuthed', () => {
    it('кука === секрет → true', () => {
      expect(isStaffAuthed(SECRET, SECRET)).toBe(true);
    });
    it('старая кука "1" больше НЕ проходит (закрытая дыра)', () => {
      expect(isStaffAuthed('1', SECRET)).toBe(false);
    });
    it('отсутствие куки → false', () => {
      expect(isStaffAuthed(undefined, SECRET)).toBe(false);
      expect(isStaffAuthed(null, SECRET)).toBe(false);
      expect(isStaffAuthed('', SECRET)).toBe(false);
    });
  });

  describe('staffCookieOptions', () => {
    it('httpOnly + secure + sameSite lax + path / — секрет недоступен JS', () => {
      const o = staffCookieOptions(true);
      expect(o.httpOnly).toBe(true);
      expect(o.secure).toBe(true);
      expect(o.sameSite).toBe('lax');
      expect(o.path).toBe('/');
    });
    it('remember → 30 дней, иначе 1 день', () => {
      expect(staffCookieOptions(true).maxAge).toBe(30 * 24 * 60 * 60);
      expect(staffCookieOptions(false).maxAge).toBe(1 * 24 * 60 * 60);
    });
  });
});
