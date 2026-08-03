/**
 * Регрессия: listAssignments не должен слепо кастовать SUBSTRING(kid_id FROM 7) в INTEGER
 * для НЕ-staff kid_id. Реальный инцидент прод: kid_id='kid-mscw5y1w-d0wg' (обычный ребёнок
 * из CRM) давал SUBSTRING → 'cw5y1w-d0wg', CAST в INTEGER падал с 'invalid input syntax
 * for type integer' и ронял /portal/rooms/ (HTTP 500) для всей смены.
 * CAST обязан выполняться ТОЛЬКО когда kid_id ~ '^staff-[0-9]+$'.
 */
import { describe, expect, it, vi } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

let client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({
  default: {
    Client: vi.fn(() => client),
    Pool: vi.fn(() => ({ connect: vi.fn(async () => client), on: vi.fn() })),
  },
}));

describe('listAssignments — guard для staff-CAST', () => {
  it('обычный kid-<random> рядом со staff-записями не роняет запрос', async () => {
    process.env.AIDAPLUS_PG_DSN = 'postgres://fake/aidacamp';
    client = makeFakeClient({
      handlers: [
        (sql) =>
          sql.includes('FROM room_assignment ra')
            ? {
                rows: [
                  { id: 1, shift_id: 5, kid_id: 'kid-mscw5y1w-d0wg', kid_name: 'Обычный ребёнок' },
                  { id: 2, shift_id: 5, kid_id: 'staff-13', kid_name: 'Варвара Мухортова' },
                ],
                rowCount: 2,
              }
            : null,
      ],
    });
    const { listAssignments } = await import('./portalRasselenie');
    const rows = await listAssignments(5);
    expect(rows.map((r) => r.kid_id)).toEqual(['kid-mscw5y1w-d0wg', 'staff-13']);

    // CAST в SUBSTRING обязан быть под guard-регексом '^staff-[0-9]+$',
    // а не голым в ON — иначе Postgres может выполнить его для не-staff kid_id.
    const sql = client.calls.find((c) => c.sql.includes('FROM room_assignment ra'))!.sql;
    expect(sql).toMatch(/\^staff-\[0-9\]\+\$/);
    // Нет незащищённого CAST сразу после сравнения ps.id (без CASE-guard).
    expect(sql).not.toMatch(/ps\.id\s*=\s*CAST\s*\(\s*SUBSTRING/i);
  });
});
