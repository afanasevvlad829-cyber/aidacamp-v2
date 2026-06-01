import { createHmac, timingSafeEqual } from 'node:crypto';

export type PortalRole = 'admin' | 'teacher' | 'student' | 'vozhaty' | 'rukovoditel';
export const PORTAL_ROLES: PortalRole[] = ['admin', 'teacher', 'student', 'vozhaty', 'rukovoditel'];

/** Срок жизни сессии — 30 дней. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface SessionPayload {
  role: PortalRole;
  exp: number;
  sub?: number; // telegram_id для сотрудников (TG-вход) либо portal_kid.id (ученик)
  sid?: number; // portal_staff.id — для код-входа сотрудника (альтернатива TG)
}

function hmac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Возвращает токен вида `<base64url(payload)>.<base64url(hmac)>`. */
export function signSession(role: PortalRole, secret: string, now = Date.now(), sub?: number, sid?: number): string {
  const payload: SessionPayload = { role, exp: now + SESSION_TTL_MS };
  if (typeof sub === 'number') payload.sub = sub;
  if (typeof sid === 'number') payload.sid = sid;
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${p}.${hmac(p, secret)}`;
}

/** Возвращает {role, sub, sid} при валидном токене; иначе null. */
export function verifySessionPayload(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): { role: PortalRole; sub?: number; sid?: number } | null {
  if (!token || !secret) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(p, secret);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!PORTAL_ROLES.includes(payload.role)) return null;
  if (typeof payload.exp !== 'number' || payload.exp < now) return null;
  return {
    role: payload.role,
    sub: typeof payload.sub === 'number' ? payload.sub : undefined,
    sid: typeof payload.sid === 'number' ? payload.sid : undefined,
  };
}

/** Возвращает роль, если токен валиден и не просрочен; иначе null. */
export function verifySession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): PortalRole | null {
  return verifySessionPayload(token, secret, now)?.role ?? null;
}
