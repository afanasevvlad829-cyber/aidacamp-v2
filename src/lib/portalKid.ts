/**
 * Ученические аккаунты с персональными кодами.
 * Login flow: ребёнок вводит 6-значный код → находим по portal_kid.code →
 *             role=student, sub=portal_kid.id → Open WebUI получает kid<id>@students.
 */

export interface Kid {
  id: number;
  code: string;
  name: string;
  gender: 'M' | 'F' | null;
  age: number | null;
  alfa_id: number | null;
  room_number: number | null;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

/** Все ученики (active + неактивные). */
export async function listKids(includeArchived = false): Promise<Kid[]> {
  const r = await withClient(async (c) => {
    const q = await c.query(
      `SELECT id, code, name, gender, age, alfa_id, room_number, active,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at,
              to_char(last_login_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS last_login_at
         FROM portal_kid
         WHERE active = TRUE OR $1::boolean = TRUE
         ORDER BY room_number NULLS LAST, name`,
      [includeArchived]
    );
    return q.rows as Kid[];
  });
  return r ?? [];
}

/** Поиск по коду — для логина. */
export async function findKidByCode(code: string): Promise<Kid | null> {
  const r = await withClient(async (c) => {
    const q = await c.query(
      `SELECT id, code, name, gender, age, alfa_id, room_number, active,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at,
              to_char(last_login_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS last_login_at
         FROM portal_kid WHERE code = $1 AND active = TRUE`,
      [code]
    );
    return (q.rows[0] as Kid) ?? null;
  });
  return r ?? null;
}

export async function markKidLoggedIn(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(`UPDATE portal_kid SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, [id]);
  });
}

/** Регенерировать код. */
export async function regenerateCode(id: number): Promise<string | null> {
  const r = await withClient(async (c) => {
    for (let i = 0; i < 10; i++) {
      const code = String(Math.floor(Math.random() * 900000) + 100000);
      try {
        const q = await c.query(
          `UPDATE portal_kid SET code = $2, updated_at = NOW() WHERE id = $1 RETURNING code`,
          [id, code]
        );
        return (q.rows[0]?.code as string) ?? null;
      } catch (e: any) {
        if (e?.code === '23505') continue; // unique violation — пробуем ещё
        throw e;
      }
    }
    return null;
  });
  return r ?? null;
}

export async function setKidActive(id: number, active: boolean): Promise<void> {
  await withClient(async (c) => {
    await c.query(`UPDATE portal_kid SET active = $2, updated_at = NOW() WHERE id = $1`, [id, active]);
  });
}
