export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/portalPerms';
import { setContactById } from '../../../../lib/portalStaff';
import { normalizePhone, normalizeUsername } from '../../../../lib/portalLinkDelivery';

/**
 * POST /api/portal/staff/contact  form: id, phone?, tg_username?
 * Только admin. Пустое поле очищает значение; непустое проходит валидацию.
 */
export const POST: APIRoute = async ({ locals, request, redirect }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  if (_a.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await request.formData();
  const id = Number(form.get('id'));
  if (!Number.isFinite(id) || id <= 0) return new Response('bad id', { status: 400 });
  const rawPhone = String(form.get('phone') ?? '').trim();
  const rawTg = String(form.get('tg_username') ?? '').trim();
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  const tg = rawTg ? normalizeUsername(rawTg) : null;
  if (rawPhone && !phone) return new Response('Неверный телефон (нужно 11 цифр)', { status: 400 });
  if (rawTg && !tg) return new Response('Неверный @username (5–32 символа: латиница, цифры, _)', { status: 400 });

  await setContactById(id, phone, tg);
  return redirect('/portal/staff-admin');
};
