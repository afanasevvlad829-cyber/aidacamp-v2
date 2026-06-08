// src/lib/portalPerms.ts
import type { PortalRole } from './portalSession';

export type Tier = 'admin' | 'rukovoditel' | 'staff';
export type Capability = 'MANAGE_USERS' | 'ASSIGN_RESPONSIBLES';

/** Map any role string to a tier. teacher/vozhaty both → 'staff'. */
export function tierOf(role: string): Tier | null {
  if (role === 'admin') return 'admin';
  if (role === 'rukovoditel') return 'rukovoditel';
  if (role === 'teacher' || role === 'vozhaty') return 'staff';
  return null; // student or unknown
}

/** Is this role a staff member (any non-student)? */
export function isStaff(role: string): boolean {
  return tierOf(role) !== null;
}

/** Can this role perform a capability? */
export function can(role: string, cap: Capability): boolean {
  const tier = tierOf(role);
  if (!tier) return false;
  switch (cap) {
    case 'MANAGE_USERS': return tier === 'admin';
    case 'ASSIGN_RESPONSIBLES': return tier === 'admin' || tier === 'rukovoditel';
  }
}

/** Shared role label map — single source of truth. */
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Админ',
  rukovoditel: 'Руководитель',
  teacher: 'Преподаватель',
  vozhaty: 'Вожатый',
  student: 'Ученик',
};

/**
 * Проверяет роль из locals (уже валидированных middleware).
 * Использовать вместо verifySessionPayload в эндпоинтах.
 */
export function requireRole(
  locals: App.Locals,
  roles: string[],
): { role: string; sub: number } | Response {
  const role = locals.portalRole;
  const sub  = locals.portalSub;
  if (!role || sub == null) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  if (!roles.includes(role)) {
    return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  return { role, sub };
}

/** Любой сотрудник (не student). */
export function requireStaff(locals: App.Locals): { role: string; sub: number } | Response {
  return requireRole(locals, ['admin', 'rukovoditel', 'teacher', 'vozhaty']);
}

/** Любая аутентифицированная роль. */
export function requireAuth(locals: App.Locals): { role: string; sub: number } | Response {
  const role = locals.portalRole;
  const sub  = locals.portalSub;
  if (!role || sub == null) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  return { role, sub };
}
