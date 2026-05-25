import type { PortalRole } from './portalSession';

export interface StaffRow {
  telegram_id: number;
  full_name: string | null;
  tg_username: string | null;
  role: PortalRole | null;
  active: boolean;
}

function dsn(): string {
  return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
}

async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn();
  if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Запись сотрудника по telegram_id (или null). */
export async function getStaff(telegramId: number): Promise<StaffRow | null> {
  return (await withClient(async (c) => {
    const r = await c.query(
      'SELECT telegram_id, full_name, tg_username, role, active FROM portal_staff WHERE telegram_id=$1',
      [telegramId],
    );
    return (r.rows[0] as StaffRow) ?? null;
  })) ?? null;
}

/** Создаёт заявку (pending, role=NULL), если сотрудника ещё нет. Возвращает запись. */
export async function ensurePending(
  telegramId: number,
  fullName: string | null,
  username: string | null,
): Promise<StaffRow | null> {
  return await withClient(async (c) => {
    await c.query(
      `INSERT INTO portal_staff (telegram_id, full_name, tg_username)
       VALUES ($1,$2,$3)
       ON CONFLICT (telegram_id) DO UPDATE SET
         full_name = COALESCE(portal_staff.full_name, EXCLUDED.full_name),
         tg_username = EXCLUDED.tg_username`,
      [telegramId, fullName, username],
    );
    const r = await c.query(
      'SELECT telegram_id, full_name, tg_username, role, active FROM portal_staff WHERE telegram_id=$1',
      [telegramId],
    );
    return r.rows[0] as StaffRow;
  });
}

export async function listStaff(): Promise<StaffRow[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      'SELECT telegram_id, full_name, tg_username, role, active FROM portal_staff ORDER BY active DESC, role NULLS FIRST, created_at',
    );
    return r.rows as StaffRow[];
  })) ?? [];
}

export async function setRole(telegramId: number, role: PortalRole, approvedBy: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      'UPDATE portal_staff SET role=$2, approved_by=$3, approved_at=now() WHERE telegram_id=$1',
      [telegramId, role, approvedBy],
    );
  });
}

export async function setActive(telegramId: number, active: boolean): Promise<void> {
  await withClient(async (c) => {
    await c.query('UPDATE portal_staff SET active=$2 WHERE telegram_id=$1', [telegramId, active]);
  });
}
