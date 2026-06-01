import type { PortalRole } from './portalSession';

/**
 * Может ли пользователь редактировать событие.
 * Ограничения по ролям сняты: править может любой авторизованный сотрудник
 * (admin, rukovoditel, teacher, vozhaty), кроме ученика. Роли остаются только
 * как визуальные ярлыки, а не как ограничение доступа. eventRoles больше не влияет.
 */
export function canEditEvent(role: PortalRole | null | undefined, _eventRoles?: string[] | null | undefined): boolean {
  return !!role && role !== 'student';
}

/** Поля, которые teacher/vozhaty МОГУТ менять (полный edit от admin/ruk идёт через старый /shift/admin). */
export const PARTIAL_EDIT_FIELDS = ['title', 'start_time', 'end_time', 'notes'] as const;
export type PartialEditField = (typeof PARTIAL_EDIT_FIELDS)[number];

/** Поля, которые НЕЛЬЗЯ менять через partial-edit (только через admin endpoint). */
export const PROTECTED_FIELDS = ['roles', 'staff_keys', 'event_type', 'date', 'shift_id', 'external_id'] as const;
