/**
 * Приглашения сотрудников. Админ создаёт invite → получает короткую ссылку
 * /i/<token>. Сотрудник кликает → авторизуется через TG → его аккаунт сразу
 * активный с предзаданными ролями. Срок жизни — 14 дней.
 */
import crypto from 'node:crypto';
import { withDbClient } from './db';

export interface Invite {
  id: number;
  token: string;
  name: string | null;
  comment: string | null;
  roles: string[];
  created_by: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_tg: number | null;
  revoked: boolean;
}


function normalise(r: any): Invite {
  return {
    ...r,
    id: Number(r.id),
    roles: Array.isArray(r.roles) ? r.roles : [],
    used_by_tg: r.used_by_tg == null ? null : Number(r.used_by_tg),
  };
}

/** Список всех приглашений (для админ-страницы). */
export async function listInvites(): Promise<Invite[]> {
  const r = await withDbClient(async (c) => {
    const q = await c.query(
      `SELECT id, token, name, comment, roles, created_by,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at,
              to_char(expires_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS expires_at,
              to_char(used_at,    'YYYY-MM-DD"T"HH24:MI:SSOF') AS used_at,
              used_by_tg, revoked
         FROM portal_invite
         ORDER BY created_at DESC
         LIMIT 100`
    );
    return q.rows.map(normalise);
  });
  return r ?? [];
}

/** Создать приглашение. Генерирует уникальный токен (8 символов base36). */
export async function createInvite(p: {
  name?: string | null;
  comment?: string | null;
  roles: string[];
  created_by?: string | null;
}): Promise<Invite | null> {
  const r = await withDbClient(async (c) => {
    // Не более 5 попыток на коллизию (вероятность исчезающе мала)
    for (let i = 0; i < 5; i++) {
      const token = crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, '').slice(0, 8);
      try {
        const q = await c.query(
          `INSERT INTO portal_invite (token, name, comment, roles, created_by)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, token, name, comment, roles, created_by,
                     to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at,
                     to_char(expires_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS expires_at,
                     to_char(used_at,    'YYYY-MM-DD"T"HH24:MI:SSOF') AS used_at,
                     used_by_tg, revoked`,
          [token, p.name ?? null, p.comment ?? null, p.roles ?? [], p.created_by ?? null]
        );
        return normalise(q.rows[0]);
      } catch (e: any) {
        if (e?.code === '23505') continue; // unique violation
        throw e;
      }
    }
    return null;
  });
  return r ?? null;
}

/** Найти не-использованный, не-revoked и не-истёкший. */
export async function findUsableInviteByToken(token: string): Promise<Invite | null> {
  const r = await withDbClient(async (c) => {
    const q = await c.query(
      `SELECT id, token, name, comment, roles, created_by,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at,
              to_char(expires_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS expires_at,
              to_char(used_at,    'YYYY-MM-DD"T"HH24:MI:SSOF') AS used_at,
              used_by_tg, revoked
         FROM portal_invite
         WHERE token = $1 AND revoked = FALSE AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );
    return q.rows[0] ? normalise(q.rows[0]) : null;
  });
  return r ?? null;
}

/** Помечает приглашение использованным. */
export async function markInviteUsed(id: number, tgId: number): Promise<void> {
  await withDbClient(async (c) => {
    await c.query(
      `UPDATE portal_invite SET used_at = NOW(), used_by_tg = $2 WHERE id = $1`,
      [id, tgId]
    );
  });
}

export async function revokeInvite(id: number): Promise<void> {
  await withDbClient(async (c) => {
    await c.query(`UPDATE portal_invite SET revoked = TRUE WHERE id = $1`, [id]);
  });
}
