import { describe, it, expect } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { verifyLoginWidget, verifyInitData } from './telegramAuth';

const TOKEN = '123456:TESTTOKEN';

function signWidget(data: Record<string, string>): Record<string, string> {
  const secret = createHash('sha256').update(TOKEN).digest();
  const checkString = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join('\n');
  const hash = createHmac('sha256', secret).update(checkString).digest('hex');
  return { ...data, hash };
}

function signInitData(data: Record<string, string>): string {
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const checkString = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join('\n');
  const hash = createHmac('sha256', secret).update(checkString).digest('hex');
  const params = new URLSearchParams({ ...data, hash });
  return params.toString();
}

describe('verifyLoginWidget', () => {
  const now = Math.floor(Date.now() / 1000);
  it('принимает валидную подпись', () => {
    const params = signWidget({ id: '777', first_name: 'Даша', username: 'dasha', auth_date: String(now) });
    expect(verifyLoginWidget(params, TOKEN)).toEqual({ telegram_id: 777, username: 'dasha', name: 'Даша' });
  });
  it('отклоняет подделанный hash', () => {
    const params = signWidget({ id: '777', auth_date: String(now) });
    params.hash = params.hash.slice(0, -2) + 'xx';
    expect(verifyLoginWidget(params, TOKEN)).toBeNull();
  });
  it('отклоняет протухший auth_date (>24ч)', () => {
    const old = now - 25 * 3600;
    const params = signWidget({ id: '777', auth_date: String(old) });
    expect(verifyLoginWidget(params, TOKEN)).toBeNull();
  });
});

describe('verifyInitData', () => {
  const now = Math.floor(Date.now() / 1000);
  it('принимает валидный initData', () => {
    const user = JSON.stringify({ id: 888, first_name: 'Вож', username: 'vozh' });
    const init = signInitData({ user, auth_date: String(now) });
    expect(verifyInitData(init, TOKEN)).toEqual({ telegram_id: 888, username: 'vozh', name: 'Вож' });
  });
  it('отклоняет подделку', () => {
    const user = JSON.stringify({ id: 888 });
    const init = signInitData({ user, auth_date: String(now) }).replace(/hash=[^&]+/, 'hash=deadbeef');
    expect(verifyInitData(init, TOKEN)).toBeNull();
  });
});
