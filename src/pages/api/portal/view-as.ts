export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../lib/portalSession';
import { getStaff } from '../../../lib/portalStaff';

const ALLOWED: Record<string, Set<string>> = {
  admin: new Set(['admin', 'rukovoditel', 'teacher', 'vozhaty', 'student']),
  rukovoditel: new Set(['rukovoditel', 'vozhaty', 'teacher', 'student']),
  teacher: new Set(['teacher', 'student']),
  vozhaty: new Set(['vozhaty', 'student']),
};

/**
 * POST /api/portal/view-as
 *   Body: form-urlencoded или JSON {"role": "vozhaty"} либо {"clear": true}.
 *   Ставит/снимает cookie portal_view_as. Доступно admin и rukovoditel.
 *
 *   После установки делает 302 на ?next= или /portal/ — чтобы UI перерисовался.
 */
export const POST: APIRoute = async ({ request, cookies, url }) => {
  const payload = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!payload?.role) return new Response('Unauthorized', { status: 401 });

  let realRole: string | null = payload.role;
  if (payload.sub) {
    const staff = await getStaff(payload.sub);
    if (!staff?.active) {
      realRole = null;
    } else {
      // Допускаем сессию, если её роль ∈ staff.roles[] (мульти-роль), либо равна primary staff.role.
      const allRoles = Array.isArray(staff.roles) && staff.roles.length > 0 ? staff.roles : (staff.role ? [staff.role] : []);
      if (!allRoles.includes(payload.role)) {
        realRole = null;
      }
    }
  }
  if (!realRole) return new Response('Unauthorized', { status: 401 });
  if (!ALLOWED[realRole]) return new Response('Forbidden', { status: 403 });

  const contentType = request.headers.get('content-type') ?? '';
  let role = '';
  let clear = false;
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({} as any));
    role = String(body.role ?? '');
    clear = Boolean(body.clear);
  } else {
    const form = await request.formData();
    role = String(form.get('role') ?? '');
    clear = String(form.get('clear') ?? '') === 'true' || role === '';
  }

  const dom = process.env.PORTAL_COOKIE_DOMAIN?.trim();
  const cookieOpts: any = { path: '/', httpOnly: false, sameSite: 'lax', secure: true, maxAge: 60 * 60 * 24 };
  if (dom) cookieOpts.domain = dom;

  if (clear) {
    cookies.delete('portal_view_as', dom ? { path: '/', domain: dom } : { path: '/' });
  } else {
    const allowedForRole = ALLOWED[realRole];
    // Если у пользователя несколько ролей в staff.roles[] — разрешаем переключаться между ними.
    let canSwitch = allowedForRole?.has(role);
    if (!canSwitch && payload.sub) {
      const staff = await getStaff(payload.sub);
      const roles = Array.isArray(staff?.roles) ? staff!.roles : [];
      if (roles.length > 1 && roles.includes(role as any)) canSwitch = true;
    }
    if (!canSwitch) return new Response('Bad role', { status: 400 });
    cookies.set('portal_view_as', role, cookieOpts);
  }

  const next = url.searchParams.get('next') || '/portal/';
  return new Response(null, { status: 302, headers: { Location: next } });
};
