/**
 * Сценарные тесты portalStaff — мерж pending-TG в placeholder.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

let client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({ default: { Client: vi.fn(() => client), Pool: vi.fn(() => ({ connect: vi.fn(async () => client), query: vi.fn((...args: any[]) => (client.query as any)(...args)), on: vi.fn() })) } }));

beforeEach(() => {
  process.env.AIDAPLUS_PG_DSN = 'postgres://fake/aidacamp';
  client = makeFakeClient();
});

describe('mergePendingIntoPlaceholder', () => {
  it('успешно мержит pending (только telegram_id) в placeholder (только staff_key)', async () => {
    client = makeFakeClient({
      handlers: [
        (sql, p) => {
          if (sql.includes('FROM portal_staff') && sql.includes('WHERE id=$1') && (p as any)[0] === 1) {
            return { rows: [{ id: 1, telegram_id: 999, tg_username: 'ivan', full_name: 'Ivan', role: null, staff_key: null }], rowCount: 1 };
          }
          if (sql.includes('FROM portal_staff') && sql.includes('WHERE id=$1') && (p as any)[0] === 2) {
            return { rows: [{ id: 2, telegram_id: null, full_name: 'Варвара', tg_username: null, staff_key: 'director', role: 'rukovoditel' }], rowCount: 1 };
          }
          return { rows: [], rowCount: 1 };
        },
      ],
    });
    const { mergePendingIntoPlaceholder } = await import('./portalStaff');
    const r = await mergePendingIntoPlaceholder(1, 2, 100);
    expect(r).toEqual({ ok: true });
    expect(client.calls.some((c) => c.sql.startsWith('BEGIN'))).toBe(true);
    expect(client.calls.some((c) => c.sql.startsWith('COMMIT'))).toBe(true);
    expect(client.calls.some((c) => /UPDATE portal_staff/.test(c.sql))).toBe(true);
    expect(client.calls.some((c) => /DELETE FROM portal_staff WHERE id=\$1/.test(c.sql))).toBe(true);
  });

  it('отказ если pending уже имеет роль', async () => {
    client = makeFakeClient({
      handlers: [
        (sql, p) => {
          if (sql.includes('WHERE id=$1') && (p as any)[0] === 1) {
            return { rows: [{ id: 1, telegram_id: 999, role: 'teacher', staff_key: null, full_name: 'X', tg_username: null }], rowCount: 1 };
          }
          return null;
        },
      ],
    });
    const { mergePendingIntoPlaceholder } = await import('./portalStaff');
    const r = await mergePendingIntoPlaceholder(1, 2, 100);
    expect(r).toEqual({ ok: false, error: expect.stringContaining('роль') });
    expect(client.calls.some((c) => c.sql.startsWith('ROLLBACK'))).toBe(true);
  });

  it('отказ если target уже имеет telegram_id', async () => {
    client = makeFakeClient({
      handlers: [
        (sql, p) => {
          if (sql.includes('WHERE id=$1') && (p as any)[0] === 1) {
            return { rows: [{ id: 1, telegram_id: 999, role: null, staff_key: null, full_name: 'A', tg_username: null }], rowCount: 1 };
          }
          if (sql.includes('WHERE id=$1') && (p as any)[0] === 2) {
            return { rows: [{ id: 2, telegram_id: 500, staff_key: 'director', role: 'rukovoditel', full_name: 'B', tg_username: null }], rowCount: 1 };
          }
          return null;
        },
      ],
    });
    const { mergePendingIntoPlaceholder } = await import('./portalStaff');
    const r = await mergePendingIntoPlaceholder(1, 2, 100);
    expect(r).toEqual({ ok: false, error: expect.stringContaining('telegram_id') });
  });
});

describe('setRoles — мульти-роль', () => {
  it('сохраняет массив ролей + активная роль = первая', async () => {
    const { setRoles } = await import('./portalStaff');
    await setRoles(999, ['rukovoditel', 'vozhaty'] as any, 100);
    const update = client.calls.find((c) => /UPDATE portal_staff SET roles/.test(c.sql));
    expect(update).toBeTruthy();
    expect(update!.params).toEqual([999, ['rukovoditel', 'vozhaty'], 'rukovoditel', 100]);
  });
});
