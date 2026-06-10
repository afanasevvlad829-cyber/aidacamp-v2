export const prerender = false;
/**
 * GET /api/portal/staff-for-rooms — список активных сотрудников для расселения.
 * Возвращает [{id, name, role}] отсортированных по роли.
 */
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../lib/portalPerms';
import { listStaff } from '../../../lib/portalStaff';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Админ', rukovoditel: 'Руководитель', teacher: 'Преподаватель',
  vozhaty: 'Вожатый', student: 'Участник',
};

export const GET: APIRoute = async ({ locals }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;

  const all = await listStaff();
  const staff = all
    .filter((s) => s.active && s.role && s.role !== 'student')
    .map((s) => ({
      id: s.id,
      name: s.full_name ?? s.tg_username ?? `staff-${s.id}`,
      role: s.role,
      roleLabel: ROLE_LABEL[s.role ?? ''] ?? s.role ?? '',
    }));
  return json({ ok: true, staff });
};
