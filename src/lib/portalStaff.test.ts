import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pg.Client — full in-memory simulation for mergePendingIntoPlaceholder
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function makeClient(rows: { pending?: Row; target?: Row } = {}) {
  const queries: string[] = [];
  let committed = false;
  let rolledBack = false;

  const client = {
    _queries: queries,
    _committed: () => committed,
    _rolledBack: () => rolledBack,
    connect: vi.fn(),
    end: vi.fn(),
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      queries.push(sql.trim());
      const s = sql.trim().toUpperCase();

      if (s === 'BEGIN') return { rows: [] };
      if (s === 'COMMIT') { committed = true; return { rows: [] }; }
      if (s === 'ROLLBACK') { rolledBack = true; return { rows: [] }; }

      // SELECT for pending (first SELECT)
      if (s.startsWith('SELECT') && s.includes('PORTAL_STAFF WHERE ID=$1') && !client._targetSelected) {
        client._targetSelected = false;
        const id = params?.[0] as number;
        if (rows.pending && rows.pending['id'] === id) return { rows: [rows.pending] };
        if (rows.target && rows.target['id'] === id) {
          client._targetSelected = true;
          return { rows: [rows.target] };
        }
        return { rows: [] };
      }

      if (s.startsWith('UPDATE')) return { rows: [] };
      if (s.startsWith('DELETE')) return { rows: [] };

      return { rows: [] };
    }),
    _targetSelected: false,
  };

  return client;
}

// We need a smarter query mock that tracks call order
function makeSmartClient(rows: { pending?: Row; target?: Row } = {}, throwOnUpdate = false) {
  let selectCallCount = 0;
  let rolledBack = false;
  let committed = false;
  const client = {
    _rolledBack: () => rolledBack,
    _committed: () => committed,
    connect: vi.fn(),
    end: vi.fn(),
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      const s = sql.trim().toUpperCase();
      if (s === 'BEGIN') return { rows: [] };
      if (s === 'COMMIT') { committed = true; return { rows: [] }; }
      if (s === 'ROLLBACK') { rolledBack = true; return { rows: [] }; }

      if (s.startsWith('SELECT') && s.includes('WHERE ID=$1')) {
        selectCallCount++;
        const id = params?.[0] as number;
        if (selectCallCount === 1) {
          // pending lookup
          if (rows.pending && rows.pending['id'] === id) return { rows: [rows.pending] };
          return { rows: [] };
        } else {
          // target lookup
          if (rows.target && rows.target['id'] === id) return { rows: [rows.target] };
          return { rows: [] };
        }
      }
      if (s.startsWith('UPDATE')) {
        if (throwOnUpdate) throw new Error('db error');
        return { rows: [] };
      }
      if (s.startsWith('DELETE')) return { rows: [] };
      return { rows: [] };
    }),
  };
  return client;
}

// Patch withClient to use our fake client
async function withMockedClient<T>(
  client: ReturnType<typeof makeSmartClient>,
  fn: () => Promise<T>,
): Promise<T> {
  const pg = await import('pg');
  const origClient = pg.default.Client;
  (pg.default as unknown as Record<string, unknown>).Client = vi.fn(() => client);
  try {
    return await fn();
  } finally {
    (pg.default as unknown as Record<string, unknown>).Client = origClient;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mergePendingIntoPlaceholder', () => {
  beforeEach(() => {
    process.env.AIDAPLUS_PG_DSN = 'postgresql://test/test';
  });

  const validPending: Row = {
    id: 1,
    telegram_id: 123456,
    tg_username: 'newuser',
    full_name: 'Новый Пользователь',
    role: null,
    staff_key: null,
  };

  const validTarget: Row = {
    id: 2,
    telegram_id: null,
    full_name: 'Варвара',
    tg_username: null,
    staff_key: 'director',
    role: 'rukovoditel',
  };

  it('успешно объединяет pending с placeholder', async () => {
    const client = makeSmartClient({ pending: validPending, target: validTarget });
    const result = await withMockedClient(client, async () => {
      const { mergePendingIntoPlaceholder } = await import('./portalStaff');
      return mergePendingIntoPlaceholder(1, 2, 999);
    });

    expect(result).toEqual({ ok: true });
    expect(client._committed()).toBe(true);
    expect(client._rolledBack()).toBe(false);
  });

  it('отказывает если pending уже имеет role', async () => {
    const pendingWithRole: Row = { ...validPending, role: 'teacher' };
    const client = makeSmartClient({ pending: pendingWithRole, target: validTarget });
    const result = await withMockedClient(client, async () => {
      const { mergePendingIntoPlaceholder } = await import('./portalStaff');
      return mergePendingIntoPlaceholder(1, 2, 999);
    });

    expect(result).toMatchObject({ ok: false });
    expect((result as { ok: false; error: string }).error).toMatch(/роль/i);
    expect(client._rolledBack()).toBe(true);
    expect(client._committed()).toBe(false);
  });

  it('отказывает если pending имеет staff_key', async () => {
    const pendingWithKey: Row = { ...validPending, staff_key: 'somekey' };
    const client = makeSmartClient({ pending: pendingWithKey, target: validTarget });
    const result = await withMockedClient(client, async () => {
      const { mergePendingIntoPlaceholder } = await import('./portalStaff');
      return mergePendingIntoPlaceholder(1, 2, 999);
    });

    expect(result).toMatchObject({ ok: false });
    expect((result as { ok: false; error: string }).error).toMatch(/staff_key/i);
    expect(client._rolledBack()).toBe(true);
  });

  it('отказывает если target уже имеет telegram_id', async () => {
    const targetWithTg: Row = { ...validTarget, telegram_id: 777 };
    const client = makeSmartClient({ pending: validPending, target: targetWithTg });
    const result = await withMockedClient(client, async () => {
      const { mergePendingIntoPlaceholder } = await import('./portalStaff');
      return mergePendingIntoPlaceholder(1, 2, 999);
    });

    expect(result).toMatchObject({ ok: false });
    expect((result as { ok: false; error: string }).error).toMatch(/telegram_id/i);
    expect(client._rolledBack()).toBe(true);
  });

  it('ROLLBACK при ошибке UPDATE', async () => {
    const client = makeSmartClient({ pending: validPending, target: validTarget }, true);
    await expect(
      withMockedClient(client, async () => {
        const { mergePendingIntoPlaceholder } = await import('./portalStaff');
        return mergePendingIntoPlaceholder(1, 2, 999);
      }),
    ).rejects.toThrow('db error');
    expect(client._rolledBack()).toBe(true);
    expect(client._committed()).toBe(false);
  });

  it('отказывает если pending не найден', async () => {
    const client = makeSmartClient({ target: validTarget });
    const result = await withMockedClient(client, async () => {
      const { mergePendingIntoPlaceholder } = await import('./portalStaff');
      return mergePendingIntoPlaceholder(999, 2, 1);
    });

    expect(result).toMatchObject({ ok: false });
    expect((result as { ok: false; error: string }).error).toMatch(/не найден/i);
    expect(client._rolledBack()).toBe(true);
  });
});
