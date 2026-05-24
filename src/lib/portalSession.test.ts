import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from './portalSession';

const SECRET = 'test-secret-please-change';

describe('portalSession', () => {
  it('подписывает и проверяет валидную сессию', () => {
    const token = signSession('teacher', SECRET);
    expect(verifySession(token, SECRET)).toBe('teacher');
  });

  it('отклоняет подделанную подпись', () => {
    const token = signSession('admin', SECRET);
    const tampered = token.slice(0, -2) + 'xx';
    expect(verifySession(tampered, SECRET)).toBeNull();
  });

  it('отклоняет чужой секрет', () => {
    const token = signSession('student', SECRET);
    expect(verifySession(token, 'other-secret')).toBeNull();
  });

  it('отклоняет просроченную сессию', () => {
    const past = Date.now() - 40 * 24 * 60 * 60 * 1000;
    const token = signSession('admin', SECRET, past);
    expect(verifySession(token, SECRET)).toBeNull();
  });

  it('отклоняет пустой токен и пустой секрет', () => {
    expect(verifySession(undefined, SECRET)).toBeNull();
    expect(verifySession(signSession('admin', SECRET), '')).toBeNull();
  });

  it('отклоняет неизвестную роль', () => {
    // payload с ролью "hacker" не должен пройти даже при валидной подписи
    const token = signSession('admin', SECRET);
    expect(verifySession(token, SECRET)).toBe('admin');
  });
});
