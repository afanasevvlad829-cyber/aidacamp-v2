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
  client = makeFakeClient({
    handlers: [
      (sql, params) => {
        if (sql.includes('FROM shift WHERE id=$1') && (params as any)?.[0] === 3) {
          return { rows: [{ id: 3, name: 'Смена 10–23 июня', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    ],
  });
});

describe('getShiftById', () => {
  it('возвращает смену по id', async () => {
    const { getShiftById } = await import('./portalShift');
    const s = await getShiftById(3);
    expect(s?.id).toBe(3);
    expect(s?.status).toBe('active');
  });

  it('возвращает null, если не найдена', async () => {
    const { getShiftById } = await import('./portalShift');
    const s = await getShiftById(999);
    expect(s).toBeNull();
  });
});
