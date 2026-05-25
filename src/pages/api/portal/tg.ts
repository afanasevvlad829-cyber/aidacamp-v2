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

/**
 * Общая логика: по проверенному TG-пользователю выдать сессию или вернуть
 * статус (invalid/pending/revoked). cookieSet — колбэк установки cookie.
 */
async function loginResult(
  user: TgUser | null,
  cookieSet: (token: string) => void,
): Promise<{ ok: true; role: string } | { ok: false; status: 'invalid' | 'pending' | 'revoked' }> {
  if (!user) return { ok: false, status: 'invalid' };
  const staff = await getStaff(user.telegram_id);
  if (!staff) {
    await ensurePending(user.telegram_id, user.name ?? null, user.username ?? null);
    return { ok: false, status: 'pending' };
  }
  if (!staff.active) return { ok: false, status: 'revoked' };
  if (!staff.role) return { ok: false, status: 'pending' };
  const token = signSession(staff.role, process.env.PORTAL_SESSION_SECRET ?? '', Date.now(), user.telegram_id);
  cookieSet(token);
  return { ok: true, role: staff.role };
}

function setSessionCookie(cookies: Parameters<APIRoute>[0]['cookies'], token: string): void {
  cookies.set('portal_session', token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
  });
}

// Telegram Login Widget (data-auth-url) редиректит сюда методом GET с параметрами в query.
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const params: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) params[k] = v;
  const user = verifyLoginWidget(params, botToken());
  const res = await loginResult(user, (t) => setSessionCookie(cookies, t));
  if (res.ok) return redirect('/portal/', 303);
  return redirect(`/portal/login?tg=${res.status}`, 303);
};

// POST: Login Widget callback-режим (form/JSON) или Mini App initData (JSON).
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user, isMiniApp } = await resolveTgUser(request);
  const res = await loginResult(user, (t) => setSessionCookie(cookies, t));
  if (isMiniApp) {
    return res.ok
      ? new Response(JSON.stringify({ ok: true, role: res.role }), { headers: { 'Content-Type': 'application/json' } })
      : new Response(JSON.stringify({ ok: false, error: res.status }), {
          status: res.status === 'invalid' ? 401 : 403,
          headers: { 'Content-Type': 'application/json' },
        });
  }
  if (res.ok) return redirect('/portal/', 303);
  return redirect(`/portal/login?tg=${res.status}`, 303);
};
