import { timingSafeEqual } from 'node:crypto';
import type { PortalRole } from './portalSession';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Сопоставляет введённый пароль роли по env-секретам. null — если не совпал. */
export function resolveRole(password: string): PortalRole | null {
  if (!password) return null;
  const map: Array<[PortalRole, string | undefined]> = [
    ['admin', process.env.PORTAL_PWD_ADMIN],
    ['teacher', process.env.PORTAL_PWD_TEACHER],
    ['student', process.env.PORTAL_PWD_STUDENT],
  ];
  for (const [role, pwd] of map) {
    if (pwd && safeEqual(password, pwd)) return role;
  }
  return null;
}
