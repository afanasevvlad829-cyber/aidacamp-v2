// Регрессия на инцидент 01.08.2026: getCustomerGroupIds не работал ВООБЩЕ ни для
// кого — прямой путь (customer/index → group_ids/groups в карточке) в этой CRM
// пуст, а запасной customer-group/index отвечает 404. Тесты фиксируют рабочий
// способ (обратный запрос по составу групп-кандидатов) и требуют логирования
// сбоя вместо тихого catch{} → [].

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCustomerGroupIds,
  getGroupLinks,
  resetAlfaCrmCacheForTests,
  type FetchLike,
} from './alfaCrm';

const HOST = 'crm.example';

function res(json: unknown): Response {
  return { json: async () => json } as Response;
}

function mockFetch(handler: (url: string, body: Record<string, unknown>) => Response | Promise<Response>) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fn = vi.fn(async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    calls.push({ url: u, body });
    return handler(u, body);
  }) as unknown as FetchLike;
  return { fn, calls };
}

const AUTH_OK = { token: 'tkn' };

beforeEach(() => {
  process.env.ALFACRM_HOSTNAME = HOST;
  process.env.ALFACRM_EMAIL = 'e@e.ru';
  process.env.ALFACRM_API_KEY = 'key';
  resetAlfaCrmCacheForTests();
});

afterEach(() => {
  resetAlfaCrmCacheForTests();
  vi.restoreAllMocks();
});

describe('getCustomerGroupIds — обратный запрос по составу групп', () => {
  it('находит клиента в группе через customer/index {group_id, removed:1}', async () => {
    const m = mockFetch((url, body) => {
      if (url.includes('auth/login')) return res(AUTH_OK);
      if (body.group_id === 664) return res({ items: [{ id: 445 }, { id: 5045 }] });
      return res({ items: [] });
    });

    const groups = await getCustomerGroupIds(445, m.fn);

    expect(groups).toContain(664);
    // фильтр обязан включать removed:1 — иначе архивные клиенты не находятся
    const groupCalls = m.calls.filter(c => c.url.includes('customer/index'));
    expect(groupCalls.every(c => c.body.removed === 1)).toBe(true);
  });

  it('клиент не состоит ни в одной группе → пустой массив, без логов сбоя', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = mockFetch((url) => (url.includes('auth/login') ? res(AUTH_OK) : res({ items: [] })));

    const groups = await getCustomerGroupIds(999999, m.fn);

    expect(groups).toEqual([]);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('CRM недоступна на всех группах → [] И логирует сбой (не тихий catch)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = mockFetch((url) => {
      if (url.includes('auth/login')) return res(AUTH_OK);
      throw new Error('fetch timeout after 8000ms');
    });

    const groups = await getCustomerGroupIds(445, m.fn);

    expect(groups).toEqual([]);
    expect(errSpy).toHaveBeenCalled();
    expect(errSpy.mock.calls.some(c => String(c[0]).includes('CRM недоступна'))).toBe(true);
  });

  it('часть групп не ответила — остальные всё равно проверяются, сбой залогирован', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = mockFetch((url, body) => {
      if (url.includes('auth/login')) return res(AUTH_OK);
      if (body.group_id === 660) throw new Error('network error');
      if (body.group_id === 664) return res({ items: [{ id: 445 }] });
      return res({ items: [] });
    });

    const groups = await getCustomerGroupIds(445, m.fn);

    expect(groups).toContain(664);
    expect(errSpy.mock.calls.some(c => String(c[0]).includes('групп не ответили'))).toBe(true);
  });

  it('нет учётки в env → пустой массив без сетевых вызовов, но с логом', async () => {
    delete process.env.ALFACRM_HOSTNAME;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = mockFetch(() => res({ items: [] }));

    const groups = await getCustomerGroupIds(445, m.fn);

    expect(groups).toEqual([]);
    expect(m.fn).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it('битый ответ CRM (items не массив) трактуется как сбой чтения, не как «нет групп»', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = mockFetch((url) => (url.includes('auth/login') ? res(AUTH_OK) : res({ error: 'gateway' })));

    const groups = await getCustomerGroupIds(445, m.fn);

    expect(groups).toEqual([]);
    expect(errSpy.mock.calls.some(c => String(c[0]).includes('CRM недоступна'))).toBe(true);
  });

  it('кеширует состав группы на повторных вызовах (не долбит CRM на каждый SSR-рендер)', async () => {
    const m = mockFetch((url, body) => {
      if (url.includes('auth/login')) return res(AUTH_OK);
      if (body.group_id === 664) return res({ items: [{ id: 445 }] });
      return res({ items: [] });
    });

    await getCustomerGroupIds(445, m.fn);
    const callsAfterFirst = m.calls.filter(c => c.url.includes('customer/index')).length;
    await getCustomerGroupIds(445, m.fn);
    const callsAfterSecond = m.calls.filter(c => c.url.includes('customer/index')).length;

    expect(callsAfterSecond).toBe(callsAfterFirst); // второй проход — из кеша
  });
});

describe('getGroupLinks', () => {
  it('парсит tg/max из note группы', async () => {
    const m = mockFetch((url) =>
      url.includes('auth/login')
        ? res(AUTH_OK)
        : res({ items: [{ note: 'чат https://t.me/camp1 канал https://max.ru/join/xyz' }] }));

    const links = await getGroupLinks(660, m.fn);

    expect(links.tg).toBe('https://t.me/camp1');
    expect(links.max).toBe('https://max.ru/join/xyz');
  });

  it('note реально пуст → {} без лога (валидный случай, не сбой)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = mockFetch((url) =>
      url.includes('auth/login') ? res(AUTH_OK) : res({ items: [{ note: '' }] }));

    const links = await getGroupLinks(660, m.fn);

    expect(links).toEqual({});
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('запрос упал → {} И логирует сбой', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = mockFetch((url) => {
      if (url.includes('auth/login')) return res(AUTH_OK);
      throw new Error('timeout');
    });

    const links = await getGroupLinks(660, m.fn);

    expect(links).toEqual({});
    expect(errSpy).toHaveBeenCalled();
  });

  it('битый ответ (items не массив) → {} с логом, не роняет вызывающий SSR', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = mockFetch((url) => (url.includes('auth/login') ? res(AUTH_OK) : res({ error: 'bad gateway' })));

    const links = await getGroupLinks(660, m.fn);

    expect(links).toEqual({});
    expect(errSpy).toHaveBeenCalled();
  });
});
