import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

let client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({ default: { Client: vi.fn(() => client), Pool: vi.fn(() => ({ connect: vi.fn(async () => client), query: vi.fn((...a: any[]) => (client.query as any)(...a)), on: vi.fn() })) } }));

beforeEach(() => {
  process.env.AIDAPLUS_PG_DSN = 'postgres://fake/aidacamp';
  client = makeFakeClient();
});

describe('постоянный токен ссылки сотрудника', () => {
  it('существующий токен возвращается без перевыпуска', async () => {
    client = makeFakeClient({ handlers: [(sql) => sql.startsWith('SELECT link_token') ? { rows: [{ link_token: 'EXISTING_TOKEN_0123456789' }], rowCount: 1 } : null] });
    const { getOrCreateLinkToken } = await import('./portalStaff');
    expect(await getOrCreateLinkToken(7)).toBe('EXISTING_TOKEN_0123456789');
    expect(client.calls.some((c) => /^UPDATE/.test(c.sql))).toBe(false);
  });
  it('нет токена → выпускается длинный токен', async () => {
    client = makeFakeClient({ handlers: [
      (sql) => sql.startsWith('SELECT link_token') ? { rows: [{ link_token: null }], rowCount: 1 } : null,
      (sql, p) => sql.startsWith('UPDATE portal_staff SET link_token') ? { rows: [{ link_token: (p as any)[1] }], rowCount: 1 } : null,
    ] });
    const { getOrCreateLinkToken } = await import('./portalStaff');
    const t = await getOrCreateLinkToken(7);
    expect(t).toMatch(/^[A-Za-z0-9_-]{24}$/);
  });
  it('rotate выпускает новый токен, не читая старый', async () => {
    client = makeFakeClient({ handlers: [(sql, p) => sql.startsWith('UPDATE portal_staff SET link_token') ? { rows: [{ link_token: (p as any)[1] }], rowCount: 1 } : null] });
    const { getOrCreateLinkToken } = await import('./portalStaff');
    await getOrCreateLinkToken(7, true);
    expect(client.calls.some((c) => c.sql.startsWith('SELECT link_token'))).toBe(false);
  });
  it('findStaffByLinkToken отсекает мусорный токен без запроса к БД', async () => {
    const { findStaffByLinkToken } = await import('./portalStaff');
    expect(await findStaffByLinkToken('short')).toBeNull();
    expect(await findStaffByLinkToken("x' OR 1=1 --")).toBeNull();
    expect(client.calls.length).toBe(0);
  });
  it('findStaffByLinkToken ищет только активных', async () => {
    client = makeFakeClient({ handlers: [(sql) => sql.includes('link_token=$1') ? { rows: [{ id: 3, roles: ['teacher'], active: true }], rowCount: 1 } : null] });
    const { findStaffByLinkToken } = await import('./portalStaff');
    const r = await findStaffByLinkToken('A'.repeat(24));
    expect(r?.id).toBe(3);
    expect(client.calls[0].sql).toMatch(/active=TRUE/);
  });
});
