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
