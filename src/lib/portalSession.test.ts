import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { signSession, verifySession, verifySessionPayload } from './portalSession';

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

  it('отклоняет валидно подписанный токен с неизвестной ролью', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'hacker', exp: Date.now() + 1000 })).toString('base64url');
    const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
    const forged = `${payload}.${sig}`;
    expect(verifySession(forged, SECRET)).toBeNull();
  });

  it('отклоняет подменённый payload со старой подписью', () => {
    const token = signSession('student', SECRET);
    const oldSig = token.slice(token.indexOf('.') + 1);
    const newPayload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 1_000_000 })).toString('base64url');
    expect(verifySession(`${newPayload}.${oldSig}`, SECRET)).toBeNull();
  });

  it('хранит и возвращает sub (telegram_id) для сотрудника', () => {
    const token = signSession('vozhaty', SECRET, Date.now(), 777);
    expect(verifySession(token, SECRET)).toBe('vozhaty');
    expect(verifySessionPayload(token, SECRET)).toEqual({ role: 'vozhaty', sub: 777 });
  });

  it('payload без sub для парольных ролей', () => {
    const token = signSession('student', SECRET);
    expect(verifySessionPayload(token, SECRET)).toEqual({ role: 'student', sub: undefined });
  });
});
