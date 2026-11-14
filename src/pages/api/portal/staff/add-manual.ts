export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/portalPerms';
import { type PortalRole } from '../../../../lib/portalSession';
import { withDbClient } from '../../../../lib/db';
import { dbDeps, deliverStaffLink, normalizePhone, normalizeUsername } from '../../../../lib/portalLinkDelivery';

const VALID: PortalRole[] = ['admin', 'rukovoditel', 'teacher', 'vozhaty', 'student'];

/**
 * POST /api/portal/staff/add-manual
 *   form/JSON: full_name, roles (multiple), staff_key?, active?
 * Только admin. Создаёт portal_staff без telegram_id (placeholder).
 * Когда сотрудник позже зайдёт через TG — admin сможет объединить через merge UI.
 */
export const POST: APIRoute = async ({ locals, request, redirect }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  if (role !== 'admin') return new Response('Forbidden', { status: 403 });

  let body: Record<string, any>;
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    body = await request.json().catch(() => ({}));
  } else {
    const form = await request.formData();
    body = {};
    for (const [k, v] of form.entries()) {
      if (k === 'roles') {
        body[k] = body[k] ? [...body[k], v] : [v];
      } else body[k] = v;
    }
  }

  const full_name = String(body.full_name ?? '').trim();
  if (!full_name) return new Response('full_name required', { status: 400 });
  const rolesRaw = Array.isArray(body.roles) ? body.roles : (body.roles ? [body.roles] : []);
  const roles = rolesRaw.map(String).filter((r): r is PortalRole => (VALID as string[]).includes(r));
  if (roles.length === 0) return new Response('at least one role required', { status: 400 });
  const staff_key = body.staff_key ? String(body.staff_key).trim() || null : null;
  const activeRole = roles[0];
  const rawPhone = String(body.phone ?? '').trim();
  const rawTg = String(body.tg_username ?? '').trim();
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  const tg_username = rawTg ? normalizeUsername(rawTg) : null;
  if (rawPhone && !phone) return new Response('Неверный телефон', { status: 400 });
  if (rawTg && !tg_username) return new Response('Неверный @username', { status: 400 });

  const newId = await withDbClient(async (c) => {
    const r = await c.query(
      `INSERT INTO portal_staff (full_name, role, roles, active, staff_key, approved_by, approved_at, phone, tg_username)
       VALUES ($1, $2, $3, TRUE, $4, $5, now(), $6, $7) RETURNING id`,
      [full_name, activeRole, roles, staff_key, sub ?? 0, phone, tg_username],
    );
    return Number(r.rows[0]?.id);
  });

  // Преподавателю с контактом автоматически уходит одноразовая ссылка входа (один раз, без автоповторов).
  if (newId && roles.includes('teacher') && (phone || tg_username)) {
    const baseUrl = process.env.PORTAL_PUBLIC_URL || 'https://aidacamp.ru';
    await deliverStaffLink(newId, { baseUrl, createdBy: String(sub ?? role) }, dbDeps).catch(() => {});
  }

  return redirect('/portal/staff-admin');
};
