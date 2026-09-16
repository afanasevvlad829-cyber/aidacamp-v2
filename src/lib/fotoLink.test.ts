import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signShiftFoto, verifyShiftFoto, buildFotoUrl, fotoCookieName } from './fotoLink';
import { signLid } from './leadLink';

const SECRET = 'test-foto-secret';
let prev: string | undefined;
beforeAll(() => { prev = process.env.LEAD_LINK_SECRET; process.env.LEAD_LINK_SECRET = SECRET; });
afterAll(() => { if (prev === undefined) delete process.env.LEAD_LINK_SECRET; else process.env.LEAD_LINK_SECRET = prev; });

describe('подпись ссылок на альбом смены', () => {
  it('signShiftFoto → verifyShiftFoto: валидный токен проходит', () => {
    expect(verifyShiftFoto('smena-1', signShiftFoto('smena-1'))).toBe(true);
  });

  it('токен одной смены не открывает другую', () => {
    expect(verifyShiftFoto('smena-2', signShiftFoto('smena-1'))).toBe(false);
  });

  it('чужой/пустой/обрезанный токен → false', () => {
    expect(verifyShiftFoto('smena-1', 'a'.repeat(10))).toBe(false);
    expect(verifyShiftFoto('smena-1', '')).toBe(false);
    expect(verifyShiftFoto('smena-1', signShiftFoto('smena-1').slice(0, 9))).toBe(false);
    expect(verifyShiftFoto('smena-1', undefined)).toBe(false);
  });

  it('без shiftId → false (не открываем по пустому идентификатору)', () => {
    expect(verifyShiftFoto('', signShiftFoto(''))).toBe(false);
  });

  it('неймспейс отделён от памятка-ссылок: подпись другая', () => {
    expect(signShiftFoto('42')).not.toBe(signLid('42'));
  });

  it('buildFotoUrl собирает ссылку с токеном', () => {
    expect(buildFotoUrl('smena-3', 'https://aidacamp.ru'))
      .toBe(`https://aidacamp.ru/foto/smena-3?s=${signShiftFoto('smena-3')}`);
  });

  it('имя куки безопасно для спецсимволов в id', () => {
    expect(fotoCookieName('smena-1')).toBe('foto_s_smena-1');
    expect(fotoCookieName('../evil')).toBe('foto_s_evil');
  });

  it('нет секрета → verify закрыт, sign бросает (fail-closed)', () => {
    const token = signShiftFoto('smena-1');
    delete process.env.LEAD_LINK_SECRET;
    expect(verifyShiftFoto('smena-1', token)).toBe(false);
    expect(() => signShiftFoto('smena-1')).toThrow();
    process.env.LEAD_LINK_SECRET = SECRET;
  });
});
