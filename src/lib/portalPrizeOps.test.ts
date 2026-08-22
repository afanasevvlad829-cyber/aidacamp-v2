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

describe('атомарная выдача приза', () => {
  it('уменьшает остаток и создаёт выдачу в одной транзакции', async () => {
    client = makeFakeClient({
      handlers: [
        (sql) => /UPDATE portal_prize_custom/.test(sql) ? { rows: [{ qty: 3 }], rowCount: 1 } : null,
        (sql) => /INSERT INTO portal_prize_issuance/.test(sql) ? { rows: [{ id: 77 }], rowCount: 1 } : null,
      ],
    });
    const { issuePrize } = await import('./portalPrizeOps');

    await expect(issuePrize({ prize_id: 'prize-test', kid_id: 5 })).resolves.toEqual({ id: 77, remaining: 3 });
    expect(client.calls.map((call) => call.sql.trim())).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT']));
    expect(client.calls.some((call) => call.sql.trim() === 'ROLLBACK')).toBe(false);
  });

  it('не создаёт выдачу при нулевом остатке и откатывает транзакцию', async () => {
    client = makeFakeClient({
      handlers: [
        (sql) => /UPDATE portal_prize_custom/.test(sql) ? { rows: [], rowCount: 0 } : null,
      ],
    });
    const { issuePrize } = await import('./portalPrizeOps');

    await expect(issuePrize({ prize_id: 'sold-out' })).rejects.toThrow('out of stock');
    expect(client.calls.some((call) => /INSERT INTO portal_prize_issuance/.test(call.sql))).toBe(false);
    expect(client.calls.some((call) => call.sql.trim() === 'ROLLBACK')).toBe(true);
  });

  it('откатывает уменьшение остатка, если запись выдачи не создалась', async () => {
    client = makeFakeClient({
      handlers: [
        (sql) => /UPDATE portal_prize_custom/.test(sql) ? { rows: [{ qty: 2 }], rowCount: 1 } : null,
        (sql) => {
          if (/INSERT INTO portal_prize_issuance/.test(sql)) throw new Error('insert failed');
          return null;
        },
      ],
    });
    const { issuePrize } = await import('./portalPrizeOps');

    await expect(issuePrize({ prize_id: 'prize-test' })).rejects.toThrow('insert failed');
    expect(client.calls.some((call) => call.sql.trim() === 'ROLLBACK')).toBe(true);
    expect(client.calls.some((call) => call.sql.trim() === 'COMMIT')).toBe(false);
  });
});
