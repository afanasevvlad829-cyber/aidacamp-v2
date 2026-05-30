import type { PortalRole } from './portalSession';

/**
 * Приоритет ролей от наивысшей к низшей.
 * Если у сотрудника несколько ролей, активная (primary) — это наивысшая из доступных,
 * иначе теряется доступ к admin-страницам при логине.
 */
export const ROLE_PRIORITY: readonly PortalRole[] = [
  'admin',
  'rukovoditel',
  'teacher',
  'vozhaty',
  'student',
] as const;

/** Возвращает наивысшую роль из переданного списка, либо null. */
export function highestRole(roles: readonly string[]): PortalRole | null {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  const found = ROLE_PRIORITY.find((r) => roles.includes(r));
  if (found) return found;
  const first = roles[0];
  if ((ROLE_PRIORITY as readonly string[]).includes(first)) return first as PortalRole;
  return null;
}
