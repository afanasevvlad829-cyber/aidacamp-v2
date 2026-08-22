import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

let client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({
  default: {
    Client: vi.fn(() => client),
    Pool: vi.fn(() => ({
      connect: vi.fn(async () => client),
      query: vi.fn((...args: any[]) => (client.query as any)(...args)),
      on: vi.fn(),
    })),
  },
}));

beforeEach(() => {
  process.env.AIDAPLUS_PG_DSN = 'postgres://fake/aidacamp';
  client = makeFakeClient();
});

describe('getOrCreateCollectingDraft', () => {
  it('возвращает существующий collecting-черновик, если есть', async () => {
    client = makeFakeClient({
      handlers: [
        (sql) => {
          if (sql.includes("status='collecting'")) {
            return { rows: [{ id: 5, shift_id: 3, author_telegram_id: 111, status: 'collecting', text: null, reviewer_chat_id: null, reviewer_message_id: null }], rowCount: 1 };
          }
          return null;
        },
      ],
    });
    const { getOrCreateCollectingDraft } = await import('./draftPost');
    const d = await getOrCreateCollectingDraft(111, 3);
    expect(d.id).toBe(5);
    expect(client.calls.some((c) => /INSERT INTO draft_post/.test(c.sql))).toBe(false);
  });

  it('создаёт новый черновик, если collecting нет', async () => {
    client = makeFakeClient({
      handlers: [
        (sql) => {
          if (sql.includes("status='collecting'")) return { rows: [], rowCount: 0 };
          if (sql.includes('INSERT INTO draft_post')) {
            return { rows: [{ id: 9, shift_id: 3, author_telegram_id: 111, status: 'collecting', text: null, reviewer_chat_id: null, reviewer_message_id: null }], rowCount: 1 };
          }
          return null;
        },
      ],
    });
    const { getOrCreateCollectingDraft } = await import('./draftPost');
    const d = await getOrCreateCollectingDraft(111, 3);
    expect(d.id).toBe(9);
  });
});

describe('appendDraftText', () => {
  it('дописывает текст через пробел к уже существующему', async () => {
    client = makeFakeClient({
      handlers: [
        (sql) => {
          if (/SELECT text FROM draft_post/.test(sql)) return { rows: [{ text: 'Первая часть' }], rowCount: 1 };
          return null;
        },
      ],
    });
    const { appendDraftText } = await import('./draftPost');
    await appendDraftText(5, 'вторая часть');
    const update = client.calls.find((c) => /UPDATE draft_post SET text/.test(c.sql));
    expect(update?.params?.[0]).toBe('Первая часть вторая часть');
  });
});

describe('setDraftStatus', () => {
  it('пишет approved + decided_by + decided_at', async () => {
    const { setDraftStatus } = await import('./draftPost');
    await setDraftStatus(5, 'approved', 999);
    const update = client.calls.find((c) => /UPDATE draft_post SET status/.test(c.sql));
    expect(update?.params).toEqual([5, 'approved', 999]);
  });
});
