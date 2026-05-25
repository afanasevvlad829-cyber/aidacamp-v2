export const prerender = false;
import type { APIRoute } from 'astro';
import { verifyLoginWidget, verifyInitData, type TgUser } from '../../../lib/telegramAuth';
import { getStaff, ensurePending } from '../../../lib/portalStaff';
import { signSession } from '../../../lib/portalSession';

function botToken(): string {
  return process.env.PORTAL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
}

async function resolveTgUser(request: Request): Promise<{ user: TgUser | null; isMiniApp: boolean }> {
  const ct = request.headers.get('content-type') ?? '';
  let initData = '';
  let params: Record<string, string> = {};
  if (ct.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    if (typeof body.initData === 'string') initData = body.initData;
    else params = body as Record<string, string>;
  } else {
    const form = await request.formData();
    for (const [k, v] of form.entries()) params[k] = String(v);
    if (params.initData) initData = params.initData;
  }
  if (initData) return { user: verifyInitData(initData, botToken()), isMiniApp: true };
  return { user: verifyLoginWidget(params, botToken()), isMiniApp: false };
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user, isMiniApp } = await resolveTgUser(request);
  const fail = (status: number, msg: string) =>
    isMiniApp ? new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { 'Content-Type': 'application/json' } })
              : redirect(`/portal/login?tg=${msg}`, 303);
  if (!user) return fail(401, 'invalid');

  let staff = await getStaff(user.telegram_id);
  if (!staff) {
    staff = await ensurePending(user.telegram_id, user.name ?? null, user.username ?? null);
    return fail(403, 'pending');
  }
  if (!staff.active) return fail(403, 'revoked');
  if (!staff.role) return fail(403, 'pending');

  const token = signSession(staff.role, process.env.PORTAL_SESSION_SECRET ?? '', Date.now(), user.telegram_id);
  cookies.set('portal_session', token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
  });
  if (isMiniApp) return new Response(JSON.stringify({ ok: true, role: staff.role }), { headers: { 'Content-Type': 'application/json' } });
  return redirect('/portal/', 303);
};
