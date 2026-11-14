export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/portalPerms';
import { dbDeps, deliverStaffLink } from '../../../../lib/portalLinkDelivery';

/**
 * POST /api/portal/staff/send-link  form: id
 * Только admin. «Отправить заново»: отзывает прошлую неиспользованную ссылку, создаёт новый
 * одноразовый invite и шлёт его в Telegram через Green API. Автоповторов нет.
 */
export const POST: APIRoute = async ({ locals, request, redirect }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  if (_a.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await request.formData();
  const id = Number(form.get('id'));
  if (!Number.isFinite(id) || id <= 0) return new Response('bad id', { status: 400 });

  const baseUrl = process.env.PORTAL_PUBLIC_URL || 'https://aidacamp.ru';
  await deliverStaffLink(id, { baseUrl, createdBy: String(_a.sub ?? _a.role) }, dbDeps);
  return redirect('/portal/staff-admin');
};
