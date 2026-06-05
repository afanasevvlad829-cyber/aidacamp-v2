import type { PortalRole } from './portalSession';
import { highestRole } from './portalRoles';
import { query } from './db';

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
  /** Персональный код-вход (альтернатива TG). NULL — кода нет. */
  code?: string | null;
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
  const rows = await query<StaffRow>(
    'SELECT telegram_id, full_name, tg_username, role, COALESCE(roles, ARRAY[]::TEXT[]) AS roles, active FROM portal_staff WHERE telegram_id=$1',
    [telegramId],
  );
  return rows?.[0] ?? null;
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
  const rows = await query<StaffRowFull>(
    'SELECT id, telegram_id, full_name, tg_username, role, COALESCE(roles, ARRAY[]::TEXT[]) AS roles, active, staff_key, code FROM portal_staff ORDER BY active DESC, role NULLS FIRST, created_at',
  );
  return rows ?? [];
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
  await query(
    `UPDATE portal_staff
        SET role=$2,
            roles = CASE WHEN $2 = ANY(COALESCE(roles, ARRAY[]::TEXT[])) THEN roles ELSE COALESCE(roles, ARRAY[]::TEXT[]) || $2 END,
            approved_by=$3,
            approved_at=now()
      WHERE telegram_id=$1`,
    [telegramId, role, approvedBy],
  );
}

/** Полный список ролей (заменяет существующий). Активная роль = НАИВЫСШАЯ из выданных. */
export async function setRoles(telegramId: number, roles: PortalRole[], approvedBy: number): Promise<void> {
  const activeRole = highestRole(roles);
  const willActivate = roles.length > 0;
  await query(
    `UPDATE portal_staff
        SET roles=$2,
            role=$3,
            active = CASE WHEN $5 THEN TRUE ELSE active END,
            approved_by=$4,
            approved_at=now()
      WHERE telegram_id=$1`,
    [telegramId, roles, activeRole, approvedBy, willActivate],
  );
}

/** Включить/выключить сотрудника по PK id (работает и для placeholder без telegram_id). */
export async function setActiveById(id: number, active: boolean): Promise<void> {
  await query('UPDATE portal_staff SET active=$2 WHERE id=$1', [id, active]);
}

/** Переименовать сотрудника (full_name) по PK id. */
export async function setNameById(id: number, fullName: string): Promise<void> {
  await query('UPDATE portal_staff SET full_name=$2 WHERE id=$1', [id, fullName]);
}

/** Удалить запись сотрудника (для placeholder который больше не нужен, либо отклонения pending). */
export async function deleteStaffById(id: number): Promise<void> {
  await query('DELETE FROM portal_staff WHERE id=$1', [id]);
}

export async function setActive(telegramId: number, active: boolean): Promise<void> {
  await query('UPDATE portal_staff SET active=$2 WHERE telegram_id=$1', [telegramId, active]);
}

/**
 * Применить invite — авто-апрув сотрудника. Создаёт portal_staff (если нет) с предзаданными ролями
 * и active=true. Возвращает результирующий StaffRow.
 */
export async function applyInviteForTelegram(
  telegramId: number,
  fullName: string | null,
  username: string | null,
  inviteRoles: string[],
): Promise<StaffRow | null> {
  if (!Array.isArray(inviteRoles) || inviteRoles.length === 0) return null;
  return await withClient(async (c) => {
    const primary = highestRole(inviteRoles) ?? inviteRoles[0];
    await c.query(
      `INSERT INTO portal_staff (telegram_id, full_name, tg_username, role, roles, active)
       VALUES ($1, $2, $3, $4, $5::text[], TRUE)
       ON CONFLICT (telegram_id) DO UPDATE SET
         full_name   = COALESCE(portal_staff.full_name, EXCLUDED.full_name),
         tg_username = COALESCE(EXCLUDED.tg_username, portal_staff.tg_username),
         role        = EXCLUDED.role,
         roles       = EXCLUDED.roles,
         active      = TRUE`,
      [telegramId, fullName, username, primary, inviteRoles],
    );
    const r = await c.query(
      'SELECT telegram_id, full_name, tg_username, role, COALESCE(roles, ARRAY[]::TEXT[]) AS roles, active FROM portal_staff WHERE telegram_id=$1',
      [telegramId],
    );
    return r.rows[0] as StaffRow;
  });
}

// ─── Код-вход сотрудников (альтернатива Telegram) ────────────────────────────

/** Запись сотрудника по PK id (для код-входа: sid = portal_staff.id). */
export async function getStaffById(id: number): Promise<StaffRow | null> {
  const rows = await query<StaffRow>(
    'SELECT telegram_id, full_name, tg_username, role, COALESCE(roles, ARRAY[]::TEXT[]) AS roles, active FROM portal_staff WHERE id=$1',
    [id],
  );
  return rows?.[0] ?? null;
}

/** Поиск сотрудника по персональному коду — для код-входа. Только активные. */
export async function findStaffByCode(code: string): Promise<StaffRowFull | null> {
  const rows = await query<StaffRowFull>(
    `SELECT id, telegram_id, full_name, tg_username, role,
            COALESCE(roles, ARRAY[]::TEXT[]) AS roles, active, staff_key, code
       FROM portal_staff WHERE code=$1 AND active=TRUE`,
    [code],
  );
  return rows?.[0] ?? null;
}

/** Зафиксировать факт код-входа сотрудника (не критично если упадёт). */
export async function markStaffCodeLogin(id: number): Promise<void> {
  await query('UPDATE portal_staff SET code_login_at=NOW() WHERE id=$1', [id]);
}

/** Зафиксировать факт Telegram-входа сотрудника по telegram_id (не критично если упадёт). */
export async function markStaffTgLogin(telegramId: number): Promise<void> {
  await query('UPDATE portal_staff SET tg_login_at=NOW() WHERE telegram_id=$1', [telegramId]);
}

/**
 * Сгенерировать (перевыпустить) персональный 6-значный код сотрудника.
 * Код уникален и среди сотрудников, и среди учеников — иначе при логине он
 * сматчился бы как ученический (role=student). Возвращает новый код или null.
 */
export async function regenerateStaffCode(id: number): Promise<string | null> {
  return await withClient(async (c) => {
    for (let i = 0; i < 12; i++) {
      const code = String(Math.floor(Math.random() * 900000) + 100000);
      const kid = await c.query('SELECT 1 FROM portal_kid WHERE code=$1', [code]);
      if (kid.rowCount && kid.rowCount > 0) continue; // занят учеником — пробуем ещё
      try {
        const q = await c.query(
          'UPDATE portal_staff SET code=$2 WHERE id=$1 RETURNING code',
          [id, code],
        );
        return (q.rows[0]?.code as string) ?? null;
      } catch (e: any) {
        if (e?.code === '23505') continue; // занят другим сотрудником — пробуем ещё
        throw e;
      }
    }
    return null;
  });
}

/** Убрать код-вход у сотрудника (останется только вход через TG). */
export async function clearStaffCode(id: number): Promise<void> {
  await query('UPDATE portal_staff SET code=NULL, code_login_at=NULL WHERE id=$1', [id]);
}
