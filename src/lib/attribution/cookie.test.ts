import { describe, it, expect } from 'vitest';
import { readVisitorId } from './cookie';

describe('readVisitorId', () => {
  it('читает aid_visitor из Cookie-заголовка', () => {
    const req = new Request('https://x', { headers: { cookie: 'a=1; aid_visitor=req123; _ym_uid=9' } });
    expect(readVisitorId(req)).toBe('req123');
  });
  it('возвращает null если cookie нет', () => {
    expect(readVisitorId(new Request('https://x'))).toBeNull();
  });
  it('декодирует percent-encoding', () => {
    const req = new Request('https://x', { headers: { cookie: 'aid_visitor=a%2Db' } });
    expect(readVisitorId(req)).toBe('a-b');
  });
});
