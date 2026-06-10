export const prerender = false;
import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/portalPerms';
import { PORTAL_ROLES, type PortalRole } from '../../../lib/portalSession';
import { listStaff, setRole, setActive } from '../../../lib/portalStaff';

function requireAdmin(locals: App.Locals): { sub: number } | null {
  const _a = requireRole(locals, ['admin']);
  if (_a instanceof Response) return null;
  return { sub: _a.sub };
}

export const GET: APIRoute = async ({ locals }) => {
  if (!requireAdmin(locals)) return new Response('Forbidden', { status: 403 });
  return new Response(JSON.stringify(await listStaff()), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ locals, request, redirect }) => {
  const admin = requireAdmin(locals);
  if (!admin) return new Response('Forbidden', { status: 403 });
  const form = await request.formData();
  const action = String(form.get('action') ?? '');
  const telegramId = Number(form.get('telegram_id'));
  if (!Number.isFinite(telegramId)) return new Response('bad telegram_id', { status: 400 });

  if (action === 'setRole') {
    const role = String(form.get('role') ?? '') as PortalRole;
    if (!PORTAL_ROLES.includes(role)) return new Response('bad role', { status: 400 });
    await setRole(telegramId, role, admin.sub ?? 0);
  } else if (action === 'deactivate') {
    await setActive(telegramId, false);
  } else if (action === 'reactivate') {
    await setActive(telegramId, true);
  } else {
    return new Response('bad action', { status: 400 });
  }
  return redirect('/portal/staff-admin', 303);
};
