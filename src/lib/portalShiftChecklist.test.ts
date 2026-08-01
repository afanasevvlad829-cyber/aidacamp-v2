import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

let client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({
  default: {
    Client: vi.fn(() => client),
    Pool: vi.fn(() => ({ connect: vi.fn(async () => client), on: vi.fn() })),
  },
}));

beforeEach(() => {
  process.env.AIDAPLUS_PG_DSN = 'postgres://fake/aidacamp';
  client = makeFakeClient();
});

describe('проверка пункта чек-листа события', () => {
  it('принимает существующий пункт привязанного чек-листа', async () => {
    client = makeFakeClient({ handlers: [
      (sql) => /FROM event_checklist/.test(sql) ? { rows: [{ valid: true }], rowCount: 1 } : null,
    ] });
    const { isChecklistItemAttached } = await import('./portalShift');

    await expect(isChecklistItemAttached(10, 20, 'arrival')).resolves.toBe(true);
    expect(client.calls[0]?.params).toEqual([10, 20, 'arrival']);
  });

  it('отклоняет посторонний или удалённый пункт', async () => {
    client = makeFakeClient({ handlers: [
      (sql) => /FROM event_checklist/.test(sql) ? { rows: [{ valid: false }], rowCount: 1 } : null,
    ] });
    const { isChecklistItemAttached } = await import('./portalShift');

    await expect(isChecklistItemAttached(10, 20, 'removed')).resolves.toBe(false);
  });
});
