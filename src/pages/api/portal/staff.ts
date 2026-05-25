export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload, PORTAL_ROLES, type PortalRole } from '../../../lib/portalSession';
import { listStaff, setRole, setActive } from '../../../lib/portalStaff';

function requireAdmin(cookies: Parameters<APIRoute>[0]['cookies']): { sub?: number } | null {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  return p && p.role === 'admin' ? { sub: p.sub } : null;
}

export const GET: APIRoute = async ({ cookies }) => {
  if (!requireAdmin(cookies)) return new Response('Forbidden', { status: 403 });
  return new Response(JSON.stringify(await listStaff()), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const admin = requireAdmin(cookies);
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
