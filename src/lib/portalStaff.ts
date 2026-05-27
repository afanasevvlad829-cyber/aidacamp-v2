import type { PortalRole } from './portalSession';

export interface StaffRow {
  telegram_id: number | null;
  full_name: string | null;
  tg_username: string | null;
  /** Активная (выбранная) роль — для текущей сессии. */
  role: PortalRole | null;
  /** Полный набор ролей сотрудника. На неё опирается middleware при проверке доступа. */
  roles: PortalRole[];
  active: boolean;
}

export interface StaffRowFull extends StaffRow {
  id: number;
  staff_key: string | null;
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
      'SELECT telegram_id, full_name, tg_username, role, COALESCE(roles, ARRAY[]::TEXT[]) AS roles, active FROM portal_staff WHERE telegram_id=$1',
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
      'SELECT telegram_id, full_name, tg_username, role, COALESCE(roles, ARRAY[]::TEXT[]) AS roles, active FROM portal_staff WHERE telegram_id=$1',
      [telegramId],
    );
    return r.rows[0] as StaffRow;
  });
}

export async function listStaff(): Promise<StaffRowFull[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      'SELECT id, telegram_id, full_name, tg_username, role, COALESCE(roles, ARRAY[]::TEXT[]) AS roles, active, staff_key FROM portal_staff ORDER BY active DESC, role NULLS FIRST, created_at',
    );
    return r.rows as StaffRowFull[];
  })) ?? [];
}

/**
 * Объединяет pending-запись (без роли, без staff_key) с placeholder-ом (без telegram_id, со staff_key).
 * Транзакция: переносит telegram_id/tg_username/full_name в target, удаляет pending.
 */
export async function mergePendingIntoPlaceholder(
  pendingId: number,
  placeholderId: number,
  adminTelegramId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await withClient(async (c) => {
    await c.query('BEGIN');
    try {
      const pRes = await c.query(
        'SELECT id, telegram_id, tg_username, full_name, role, staff_key FROM portal_staff WHERE id=$1',
        [pendingId],
      );
      if (pRes.rows.length === 0) {
        await c.query('ROLLBACK');
        return { ok: false as const, error: 'pending не найден' };
      }
      const pending = pRes.rows[0];
      if (pending.role != null) {
        await c.query('ROLLBACK');
        return { ok: false as const, error: 'pending уже имеет роль — не является pending-записью' };
      }
      if (pending.staff_key != null) {
        await c.query('ROLLBACK');
        return { ok: false as const, error: 'pending имеет staff_key — не является pending-записью' };
      }
      if (pending.telegram_id == null) {
        await c.query('ROLLBACK');
        return { ok: false as const, error: 'pending не имеет telegram_id' };
      }

      const tRes = await c.query(
        'SELECT id, telegram_id, full_name, tg_username, staff_key, role FROM portal_staff WHERE id=$1',
        [placeholderId],
      );
      if (tRes.rows.length === 0) {
        await c.query('ROLLBACK');
        return { ok: false as const, error: 'placeholder не найден' };
      }
      const target = tRes.rows[0];
      if (target.telegram_id != null) {
        await c.query('ROLLBACK');
        return { ok: false as const, error: 'target уже имеет telegram_id — не является placeholder-ом' };
      }
      if (target.staff_key == null) {
        await c.query('ROLLBACK');
        return { ok: false as const, error: 'target не имеет staff_key — не является placeholder-ом' };
      }

      await c.query(
        `UPDATE portal_staff
         SET telegram_id  = $2,
             tg_username  = COALESCE($3, tg_username),
             full_name    = COALESCE(NULLIF(full_name, ''), $4, full_name),
             active       = TRUE,
             approved_at  = now(),
             approved_by  = $5
         WHERE id = $1`,
        [placeholderId, pending.telegram_id, pending.tg_username, pending.full_name, adminTelegramId],
      );

      await c.query('DELETE FROM portal_staff WHERE id=$1', [pendingId]);

      await c.query('COMMIT');
      return { ok: true as const };
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    }
  });
  return result ?? { ok: false, error: 'нет подключения к БД' };
}

export async function setRole(telegramId: number, role: PortalRole, approvedBy: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `UPDATE portal_staff
          SET role=$2,
              roles = CASE WHEN $2 = ANY(COALESCE(roles, ARRAY[]::TEXT[])) THEN roles ELSE COALESCE(roles, ARRAY[]::TEXT[]) || $2 END,
              approved_by=$3,
              approved_at=now()
        WHERE telegram_id=$1`,
      [telegramId, role, approvedBy],
    );
  });
}

/** Полный список ролей (заменяет существующий). Активная роль = первая из списка. */
export async function setRoles(telegramId: number, roles: PortalRole[], approvedBy: number): Promise<void> {
  await withClient(async (c) => {
    const activeRole = roles[0] ?? null;
    // Если выдаём хотя бы одну роль — также активируем учётку (одобряем pending).
    const willActivate = roles.length > 0;
    await c.query(
      `UPDATE portal_staff
          SET roles=$2,
              role=$3,
              active = CASE WHEN $5 THEN TRUE ELSE active END,
              approved_by=$4,
              approved_at=now()
        WHERE telegram_id=$1`,
      [telegramId, roles, activeRole, approvedBy, willActivate],
    );
  });
}

/** Включить/выключить сотрудника по PK id (работает и для placeholder без telegram_id). */
export async function setActiveById(id: number, active: boolean): Promise<void> {
  await withClient(async (c) => {
    await c.query('UPDATE portal_staff SET active=$2 WHERE id=$1', [id, active]);
  });
}

/** Удалить запись сотрудника (для placeholder который больше не нужен, либо отклонения pending). */
export async function deleteStaffById(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query('DELETE FROM portal_staff WHERE id=$1', [id]);
  });
}

export async function setActive(telegramId: number, active: boolean): Promise<void> {
  await withClient(async (c) => {
    await c.query('UPDATE portal_staff SET active=$2 WHERE telegram_id=$1', [telegramId, active]);
  });
}
