import type { PortalRole } from './portalSession';

/**
 * Может ли пользователь редактировать событие.
 *  - admin, rukovoditel: всегда.
 *  - teacher, vozhaty: только если их роль присутствует в event.roles.
 *  - student/null: нет.
 */
export function canEditEvent(role: PortalRole | null | undefined, eventRoles: string[] | null | undefined): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'rukovoditel') return true;
  if (role === 'teacher' || role === 'vozhaty') {
    return Array.isArray(eventRoles) && eventRoles.includes(role);
  }
  return false;
}

/** Поля, которые teacher/vozhaty МОГУТ менять (полный edit от admin/ruk идёт через старый /shift/admin). */
export const PARTIAL_EDIT_FIELDS = ['title', 'start_time', 'end_time', 'notes'] as const;
export type PartialEditField = (typeof PARTIAL_EDIT_FIELDS)[number];

/** Поля, которые НЕЛЬЗЯ менять через partial-edit (только через admin endpoint). */
export const PROTECTED_FIELDS = ['roles', 'staff_keys', 'event_type', 'date', 'shift_id', 'external_id'] as const;
