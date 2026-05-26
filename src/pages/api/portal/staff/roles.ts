export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload, type PortalRole } from '../../../../lib/portalSession';
import { setRoles } from '../../../../lib/portalStaff';

const VALID: PortalRole[] = ['admin', 'rukovoditel', 'teacher', 'vozhaty', 'student'];

/**
 * POST /api/portal/staff/roles
 *   form: telegram_id, roles (multiple values)
 * Только admin.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const p = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!p || p.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await request.formData();
  const tgId = Number(form.get('telegram_id'));
  const rolesRaw = form.getAll('roles').map(String);
  const roles = rolesRaw.filter((r): r is PortalRole => (VALID as string[]).includes(r));
  if (!Number.isFinite(tgId) || tgId <= 0) return new Response('bad telegram_id', { status: 400 });

  await setRoles(tgId, roles, p.sub ?? 0);
  return redirect('/portal/staff-admin');
};
