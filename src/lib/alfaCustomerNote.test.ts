// Регрессия на инцидент 01.08.2026: примечание карточки AlfaCRM затиралось,
// когда чтение текущего примечания молча возвращало пустую строку.
// Главное утверждение всех «плохих» кейсов: customer/update НЕ вызывается.

import { describe, it, expect, vi } from 'vitest';
import { appendCustomerNote, fetchCustomer, readNote, type FetchLike } from './alfaCustomerNote';

const HOST = 'crm.example';
const TOKEN = 'tkn';
const LID = 445;
const LINE = '\n[2026-08-01 12:00] ymCid:123 | Mobile/iOS';

/** Ответ-заглушка AlfaCRM. */
function res(json: unknown): Response {
  return { json: async () => json } as Response;
}

/** Мок fetch: отдаёт ответы по очереди, запоминает вызовы. */
function mockFetch(handler: (url: string, body: Record<string, unknown>) => Response | Promise<Response>) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fn = vi.fn(async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    calls.push({ url: u, body });
    return handler(u, body);
  }) as unknown as FetchLike;
  return {
    fn,
    calls,
    updates: () => calls.filter(c => c.url.includes('customer/update')),
    reads: () => calls.filter(c => c.url.includes('customer/index')),
  };
}

describe('appendCustomerNote — fail-safe при неудачном чтении', () => {
  it('НЕ вызывает customer/update, если чтение бросило исключение (тайм-аут CRM)', async () => {
    const m = mockFetch(url => {
      if (url.includes('customer/index')) throw new Error('fetch timeout after 8000ms');
      return res({});
    });

    const result = await appendCustomerNote(HOST, TOKEN, LID, LINE, m.fn);

    expect(result).toBe('read_failed');
    expect(m.updates()).toHaveLength(0);
  });

  it('НЕ вызывает customer/update, если карточка не найдена ни одним фильтром', async () => {
    const m = mockFetch(() => res({ total: 0, items: [] }));

    const result = await appendCustomerNote(HOST, TOKEN, LID, LINE, m.fn);

    expect(result).toBe('read_failed');
    expect(m.updates()).toHaveLength(0);
  });

  it('НЕ вызывает customer/update, если ответ CRM битый (items не массив)', async () => {
    const m = mockFetch(() => res({ error: 'gateway' }));

    const result = await appendCustomerNote(HOST, TOKEN, LID, LINE, m.fn);

    expect(result).toBe('read_failed');
    expect(m.updates()).toHaveLength(0);
  });

  it('НЕ вызывает customer/update, если тело ответа не парсится как JSON', async () => {
    const m = mockFetch(() => ({
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    } as unknown as Response));

    const result = await appendCustomerNote(HOST, TOKEN, LID, LINE, m.fn);

    expect(result).toBe('read_failed');
    expect(m.updates()).toHaveLength(0);
  });
});

describe('appendCustomerNote — запись поверх прочитанного', () => {
  it('дописывает строку, сохраняя существующее примечание целиком', async () => {
    const existing = 'tg_peer_id: 777\nидентификатор: A-12\nhttps://aidacamp.ru/p/445';
    const m = mockFetch(url =>
      url.includes('customer/index')
        ? res({ total: 1, items: [{ id: LID, note: existing }] })
        : res({ id: LID }));

    const result = await appendCustomerNote(HOST, TOKEN, LID, LINE, m.fn);

    expect(result).toBe('ok');
    expect(m.updates()).toHaveLength(1);
    expect(m.updates()[0].body.note).toBe(existing + LINE);
  });

  it('пишет одну строку, если примечание реально пустое (пустота ≠ сбой чтения)', async () => {
    const m = mockFetch(url =>
      url.includes('customer/index')
        ? res({ total: 1, items: [{ id: LID, note: '' }] })
        : res({ id: LID }));

    const result = await appendCustomerNote(HOST, TOKEN, LID, LINE, m.fn);

    expect(result).toBe('ok');
    expect(m.updates()[0].body.note).toBe(LINE);
  });

  it('трактует note: null как пустое примечание и пишет строку', async () => {
    const m = mockFetch(url =>
      url.includes('customer/index')
        ? res({ total: 1, items: [{ id: LID, note: null }] })
        : res({ id: LID }));

    expect(await appendCustomerNote(HOST, TOKEN, LID, LINE, m.fn)).toBe('ok');
    expect(m.updates()[0].body.note).toBe(LINE);
  });

  it('возвращает write_failed, если CRM ответила ошибкой на запись', async () => {
    const m = mockFetch(url =>
      url.includes('customer/index')
        ? res({ total: 1, items: [{ id: LID, note: 'было' }] })
        : res({ errors: { note: 'too long' } }));

    expect(await appendCustomerNote(HOST, TOKEN, LID, LINE, m.fn)).toBe('write_failed');
  });
});

describe('fetchCustomer — фолбэк на дефект фильтра {id} для архивных карточек', () => {
  it('находит карточку ретраем с removed:1, когда обычный фильтр вернул 0 записей', async () => {
    // Поведение прода 01.08.2026: {id:445} → 0 записей, {id:445, removed:1} → 1.
    const m = mockFetch((_url, body) =>
      body.removed === 1
        ? res({ total: 1, items: [{ id: LID, note: 'архивная' }] })
        : res({ total: 0, items: [] }));

    const cust = await fetchCustomer(HOST, TOKEN, LID, m.fn);

    expect(readNote(cust)).toBe('архивная');
    expect(m.reads()).toHaveLength(2);
    expect(m.reads()[0].body).toEqual({ id: LID });
    expect(m.reads()[1].body).toEqual({ id: LID, removed: 1 });
  });

  it('не делает лишнего запроса, если карточка нашлась сразу', async () => {
    const m = mockFetch(() => res({ total: 1, items: [{ id: 5045, note: 'обычная' }] }));

    await fetchCustomer(HOST, TOKEN, 5045, m.fn);

    expect(m.reads()).toHaveLength(1);
  });

  it('append по архивной карточке сохраняет её примечание (сквозной кейс #445)', async () => {
    const existing = 'tg_peer_id: 777 | идентификатор: A-12 | https://aidacamp.ru/p/445';
    const m = mockFetch((url, body) => {
      if (url.includes('customer/update')) return res({ id: LID });
      return body.removed === 1
        ? res({ total: 1, items: [{ id: LID, note: existing }] })
        : res({ total: 0, items: [] });
    });

    expect(await appendCustomerNote(HOST, TOKEN, LID, LINE, m.fn)).toBe('ok');
    expect(m.updates()[0].body.note).toBe(existing + LINE);
  });
});

describe('readNote', () => {
  it('различает «не прочитали» (null) и «пусто» (пустая строка)', () => {
    expect(readNote(null)).toBeNull();
    expect(readNote({ id: 1 })).toBe('');
    expect(readNote({ id: 1, note: '' })).toBe('');
    expect(readNote({ id: 1, note: 'текст' })).toBe('текст');
  });
});
