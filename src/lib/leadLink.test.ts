import { describe, it, expect, afterEach } from 'vitest';
import { signLid, verifyLid, buildPamyatkaUrl } from './leadLink';

afterEach(() => {
  delete process.env.LEAD_LINK_SECRET;
});

describe('leadLink', () => {
  describe('с заданным LEAD_LINK_SECRET', () => {
    it('signLid → verifyLid: валидный токен проходит', () => {
      process.env.LEAD_LINK_SECRET = 'prod-secret-A';
      const token = signLid(12345);
      expect(token).toHaveLength(10);
      expect(verifyLid(12345, token)).toBe(true);
    });

    it('токен, подписанный другим секретом, не проходит', () => {
      process.env.LEAD_LINK_SECRET = 'prod-secret-A';
      const token = signLid(12345);
      process.env.LEAD_LINK_SECRET = 'prod-secret-B';
      expect(verifyLid(12345, token)).toBe(false);
    });

    it('buildPamyatkaUrl вставляет подпись', () => {
      process.env.LEAD_LINK_SECRET = 'prod-secret-A';
      const url = buildPamyatkaUrl(777, 'https://aidacamp.ru');
      expect(url).toBe(`https://aidacamp.ru/p/777?t=${signLid(777)}`);
    });
  });

  describe('fail-closed без LEAD_LINK_SECRET', () => {
    it('signLid бросает (ссылка не сгенерируется, нет предсказуемого фолбэка)', () => {
      delete process.env.LEAD_LINK_SECRET;
      expect(() => signLid(12345)).toThrow(/LEAD_LINK_SECRET/);
    });

    it('verifyLid отдаёт false (доступ закрыт, а не открыт по дефолт-секрету)', () => {
      delete process.env.LEAD_LINK_SECRET;
      expect(verifyLid(12345, 'a'.repeat(10))).toBe(false);
    });

    it('токен, подписанный старым дефолт-секретом, больше НЕ валиден', () => {
      // Значение старого хардкод-фолбэка, который был удалён.
      process.env.LEAD_LINK_SECRET = 'aidacamp-dev-only-change-me';
      const legacyToken = signLid(42);
      delete process.env.LEAD_LINK_SECRET;
      expect(verifyLid(42, legacyToken)).toBe(false);
    });
  });
});
