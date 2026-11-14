import { describe, it, expect, vi } from 'vitest';
import {
  normalizePhone, normalizeUsername, resolveTarget, buildLinkMessage,
  deliverStaffLink, deliverBatch, greenApiSend, safeError, type DeliveryDeps,
} from './portalLinkDelivery';

function makeDeps(over: Partial<DeliveryDeps> = {}) {
  const log: string[] = [];
  const deps: DeliveryDeps = {
    loadStaff: vi.fn(async (id) => ({ id, full_name: 'Анна', roles: ['teacher'], phone: '8 (916) 123-45-67', tg_username: null, telegram_id: null })),
    revokePrevious: vi.fn(async () => { log.push('revoke'); }),
    createInvite: vi.fn(async () => { log.push('invite'); return { id: 5, token: 'abcd1234' }; }),
    insertDelivery: vi.fn(async (p) => { log.push(`ins:${p.status}`); return 11; }),
    updateDelivery: vi.fn(async (_id, p) => { log.push(`upd:${p.status}`); }),
    send: vi.fn(async () => { log.push('send'); return { idMessage: 'MSG1' }; }),
    ...over,
  };
  return { deps, log };
}

describe('нормализация контактов', () => {
  it('телефон: 8…, 10 цифр, +7 со скобками', () => {
    expect(normalizePhone('8 (916) 123-45-67')).toBe('79161234567');
    expect(normalizePhone('9161234567')).toBe('79161234567');
    expect(normalizePhone('+7 916 123 45 67')).toBe('79161234567');
  });
  it('телефон: мусор и короткие отклоняются', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
  it('username: @, t.me, без @; плохие отклоняются', () => {
    expect(normalizeUsername('@anna_t')).toBe('anna_t');
    expect(normalizeUsername('https://t.me/anna_t')).toBe('anna_t');
    expect(normalizeUsername('anna_t')).toBe('anna_t');
    expect(normalizeUsername('ab')).toBeNull();
    expect(normalizeUsername('1anna')).toBeNull();
    expect(normalizeUsername('анна')).toBeNull();
  });
  it('resolveTarget: телефон приоритетнее ника, затем tg_id, иначе null', () => {
    expect(resolveTarget({ phone: '89161234567', tg_username: '@anna_t' })).toEqual({ kind: 'phone', chatId: '79161234567@c.us' });
    expect(resolveTarget({ tg_username: '@anna_t' })).toEqual({ kind: 'username', chatId: '@anna_t' });
    expect(resolveTarget({ telegram_id: 777 })).toEqual({ kind: 'tg_id', chatId: '777' });
    expect(resolveTarget({ phone: 'xx', tg_username: 'a' })).toBeNull();
  });
  it('сообщение содержит ссылку и не содержит 6-значного кода', () => {
    const m = buildLinkMessage('Анна', 'https://aidacamp.ru/i/abcd1234');
    expect(m).toContain('https://aidacamp.ru/i/abcd1234');
    expect(m).not.toMatch(/\b\d{6}\b/);
  });
});

describe('deliverStaffLink', () => {
  it('успех: invite → queued → send → sent', async () => {
    const { deps, log } = makeDeps();
    const r = await deliverStaffLink(1, { baseUrl: 'https://aidacamp.ru/' }, deps);
    expect(r).toEqual({ ok: true, status: 'sent', deliveryId: 11 });
    expect(log).toEqual(['revoke', 'invite', 'ins:queued', 'send', 'upd:sent']);
    const [chatId, text] = (deps.send as any).mock.calls[0];
    expect(chatId).toBe('79161234567@c.us');
    expect(text).toContain('https://aidacamp.ru/i/abcd1234');
    expect((deps.updateDelivery as any).mock.calls[0][1].message_id).toBe('MSG1');
  });

  it('невалидный контакт: ничего не отправляем и invite не создаём', async () => {
    const { deps, log } = makeDeps({
      loadStaff: vi.fn(async (id) => ({ id, full_name: 'Б', roles: ['teacher'], phone: '123', tg_username: null, telegram_id: null })),
    });
    const r = await deliverStaffLink(1, { baseUrl: 'https://x' }, deps);
    expect(r.ok).toBe(false);
    expect(log).toEqual(['ins:failed']);
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.createInvite).not.toHaveBeenCalled();
  });

  it('ошибка Green API: статус failed, ошибка записана, повтора нет', async () => {
    const { deps, log } = makeDeps({ send: vi.fn(async () => { throw new Error('Green API HTTP 466'); }) });
    const r = await deliverStaffLink(1, { baseUrl: 'https://x' }, deps);
    expect(r).toMatchObject({ ok: false, status: 'failed', error: 'Green API HTTP 466' });
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(log.at(-1)).toBe('upd:failed');
  });

  it('сотрудник не найден / нет ролей', async () => {
    const a = makeDeps({ loadStaff: vi.fn(async () => null) });
    expect((await deliverStaffLink(9, { baseUrl: 'x' }, a.deps)).ok).toBe(false);
    const b = makeDeps({ loadStaff: vi.fn(async (id) => ({ id, full_name: 'В', roles: [], phone: '89161234567' })) });
    expect((await deliverStaffLink(1, { baseUrl: 'x' }, b.deps)).ok).toBe(false);
    expect(b.deps.createInvite).not.toHaveBeenCalled();
  });

  it('invite не создался → failed без отправки', async () => {
    const { deps } = makeDeps({ createInvite: vi.fn(async () => null) });
    const r = await deliverStaffLink(1, { baseUrl: 'x' }, deps);
    expect(r.ok).toBe(false);
    expect(deps.send).not.toHaveBeenCalled();
  });
});

describe('deliverBatch', () => {
  it('пауза между отправками, но не перед первой', async () => {
    const { deps } = makeDeps();
    const sleep = vi.fn(async () => {});
    const res = await deliverBatch([1, 2, 3], { baseUrl: 'x', pauseMs: 1234, sleep }, deps);
    expect(res).toHaveLength(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1234);
  });
});

describe('greenApiSend', () => {
  const env = { GREENAPI_SCHOOL_INSTANCE_ID: '4100613561', GREENAPI_SCHOOL_TOKEN: 'tok_test_value_1234567890abc' };
  it('формирует запрос sendMessage школьного инстанса', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ idMessage: 'ID9' }), { status: 200 }));
    const r = await greenApiSend(env, f as any)('@anna_t', 'hi');
    expect(r.idMessage).toBe('ID9');
    const [url, init] = (f as any).mock.calls[0];
    expect(url).toBe('https://api.greenapi.com/waInstance4100613561/sendMessage/tok_test_value_1234567890abc');
    expect(JSON.parse(init.body)).toEqual({ chatId: '@anna_t', message: 'hi' });
  });
  it('нет ключей → ошибка; HTTP не-2xx → ошибка', async () => {
    await expect(greenApiSend({}, vi.fn() as any)('a', 'b')).rejects.toThrow(/не настроен/);
    const f = vi.fn(async () => new Response('', { status: 429 }));
    await expect(greenApiSend(env, f as any)('a', 'b')).rejects.toThrow('HTTP 429');
  });
  it('safeError не раскрывает токен', () => {
    expect(safeError(new Error('fail https://x/waInstance1/sendMessage/tok_test_value_1234567890abc'))).not.toContain('tok_test');
  });
});
