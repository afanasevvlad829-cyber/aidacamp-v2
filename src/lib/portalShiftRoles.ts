import type { PortalRole } from './portalSession';
/** admin видит всё; иначе роль должна быть в списке. */
export function roleAllowed(role: PortalRole | null | undefined, roles: string[]): boolean {
  if (role === 'admin') return true;
  if (!role) return false;
  return roles.includes(role);
}
