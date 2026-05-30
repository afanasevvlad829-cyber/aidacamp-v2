export const prerender = false;
import type { APIRoute } from 'astro';
import { verifyLoginWidget, verifyInitData, type TgUser } from '../../../lib/telegramAuth';
import { getStaff, ensurePending, applyInviteForTelegram } from '../../../lib/portalStaff';
import { findUsableInviteByToken, markInviteUsed } from '../../../lib/portalInvite';
import { signSession } from '../../../lib/portalSession';
import { portalCookieOptions } from '../../../lib/portalCookie';

function botToken(): string {
  return process.env.PORTAL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
}

async function resolveTgUser(request: Request): Promise<{ user: TgUser | null; isMiniApp: boolean; inviteToken: string | null }> {
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
  const rawInv = String(params.invite || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  const inviteToken = rawInv || null;
  if (initData) return { user: verifyInitData(initData, botToken()), isMiniApp: true, inviteToken };
  return { user: verifyLoginWidget(params, botToken()), isMiniApp: false, inviteToken };
}

/**
 * Общая логика: по проверенному TG-пользователю выдать сессию или вернуть
 * статус (invalid/pending/revoked). cookieSet — колбэк установки cookie.
 */
async function loginResult(
  user: TgUser | null,
  cookieSet: (token: string) => void,
  inviteToken: string | null = null,
): Promise<{ ok: true; role: string } | { ok: false; status: 'invalid' | 'pending' | 'revoked' }> {
  if (!user) return { ok: false, status: 'invalid' };

  // 1) Если пришёл invite — пробуем применить ДО ensurePending,
  // чтобы сразу активировать аккаунт с предзаданными ролями.
  if (inviteToken) {
    const inv = await findUsableInviteByToken(inviteToken);
    if (inv) {
      const applied = await applyInviteForTelegram(
        user.telegram_id, user.name ?? null, user.username ?? null, inv.roles
      );
      if (applied && applied.role && applied.active) {
        await markInviteUsed(inv.id, user.telegram_id);
        const token = signSession(applied.role as any, process.env.PORTAL_SESSION_SECRET ?? '', Date.now(), user.telegram_id);
        cookieSet(token);
        return { ok: true, role: applied.role };
      }
    }
    // invite невалиден/истёк — падаем в обычный flow ниже
  }

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
  cookies.set('portal_session', token, portalCookieOptions());
}

// Telegram Login Widget (data-auth-url) редиректит сюда методом GET с параметрами в query.
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const params: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) params[k] = v;
  const user = verifyLoginWidget(params, botToken());
  const inviteToken = String(params.invite || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32) || null;
  const res = await loginResult(user, (t) => setSessionCookie(cookies, t), inviteToken);
  if (res.ok) return redirect('/portal/', 303);
  return redirect(`/portal/login?tg=${res.status}`, 303);
};

// POST: Login Widget callback-режим (form/JSON) или Mini App initData (JSON).
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user, isMiniApp, inviteToken } = await resolveTgUser(request);
  const res = await loginResult(user, (t) => setSessionCookie(cookies, t), inviteToken);
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
