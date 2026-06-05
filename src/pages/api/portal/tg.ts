export const prerender = false;
import type { APIRoute } from 'astro';
import { verifyLoginWidget, verifyInitData, type TgUser } from '../../../lib/telegramAuth';
import { getStaff, ensurePending, applyInviteForTelegram, markStaffTgLogin } from '../../../lib/portalStaff';
import { findUsableInviteByToken, markInviteUsed } from '../../../lib/portalInvite';
import { signSession } from '../../../lib/portalSession';
import { portalCookieOptions } from '../../../lib/portalCookie';
import { logAuth, clientIp } from '../../../lib/portalLog';

function botToken(): string {
  return process.env.PORTAL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
}

/** Диагностика для отладки входа — отдаётся клиенту в поле `debug`. */
interface AuthDebug {
  method: 'tg-miniapp' | 'tg-widget';
  contentType: string;
  initDataPresent: boolean;
  initDataLength: number;
  botTokenPresent: boolean;
  signatureValid: boolean; // прошла ли проверка подписи Telegram
  telegramId: number | null;
  username: string | null;
  name: string | null;
  inviteToken: string | null;
  staffFound: boolean | null; // найден ли в portal_staff (null = не дошли до проверки)
  staffActive: boolean | null;
  staffRole: string | null;
  status: string; // итог: success/invalid/pending/revoked
  ip?: string;
}

async function resolveTgUser(request: Request): Promise<{ user: TgUser | null; isMiniApp: boolean; inviteToken: string | null; debug: AuthDebug }> {
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
  const isMiniApp = !!initData;
  const user = isMiniApp
    ? verifyInitData(initData, botToken())
    : verifyLoginWidget(params, botToken());
  const debug: AuthDebug = {
    method: isMiniApp ? 'tg-miniapp' : 'tg-widget',
    contentType: ct || '(none)',
    initDataPresent: isMiniApp,
    initDataLength: initData.length,
    botTokenPresent: !!botToken(),
    signatureValid: !!user,
    telegramId: user?.telegram_id ?? null,
    username: user?.username ?? null,
    name: user?.name ?? null,
    inviteToken,
    staffFound: null,
    staffActive: null,
    staffRole: null,
    status: '',
  };
  return { user, isMiniApp, inviteToken, debug };
}

/**
 * Общая логика: по проверенному TG-пользователю выдать сессию или вернуть
 * статус (invalid/pending/revoked). cookieSet — колбэк установки cookie.
 */
async function loginResult(
  user: TgUser | null,
  cookieSet: (token: string) => void,
  inviteToken: string | null = null,
  debug?: AuthDebug,
): Promise<{ ok: true; role: string } | { ok: false; status: 'invalid' | 'pending' | 'revoked' }> {
  if (!user) {
    if (debug) debug.status = 'invalid';
    return { ok: false, status: 'invalid' };
  }

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
        markStaffTgLogin(user.telegram_id).catch(() => {});
        cookieSet(token);
        if (debug) { debug.staffFound = true; debug.staffActive = true; debug.staffRole = applied.role; debug.status = 'success'; }
        return { ok: true, role: applied.role };
      }
    }
    // invite невалиден/истёк — падаем в обычный flow ниже
  }

  const staff = await getStaff(user.telegram_id);
  if (debug) {
    debug.staffFound = !!staff;
    debug.staffActive = staff?.active ?? null;
    debug.staffRole = staff?.role ?? null;
  }
  if (!staff) {
    await ensurePending(user.telegram_id, user.name ?? null, user.username ?? null);
    if (debug) debug.status = 'pending';
    return { ok: false, status: 'pending' };
  }
  if (!staff.active) {
    if (debug) debug.status = 'revoked';
    return { ok: false, status: 'revoked' };
  }
  if (!staff.role) {
    if (debug) debug.status = 'pending';
    return { ok: false, status: 'pending' };
  }
  const token = signSession(staff.role, process.env.PORTAL_SESSION_SECRET ?? '', Date.now(), user.telegram_id);
  cookieSet(token);
  markStaffTgLogin(user.telegram_id).catch(() => {});
  if (debug) debug.status = 'success';
  return { ok: true, role: staff.role };
}

function setSessionCookie(cookies: Parameters<APIRoute>[0]['cookies'], token: string): void {
  cookies.set('portal_session', token, portalCookieOptions());
}

// Telegram Login Widget (data-auth-url) редиректит сюда методом GET с параметрами в query.
export const GET: APIRoute = async ({ url, cookies, redirect, request }) => {
  const params: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) params[k] = v;
  const user = verifyLoginWidget(params, botToken());
  const inviteToken = String(params.invite || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32) || null;
  const res = await loginResult(user, (t) => setSessionCookie(cookies, t), inviteToken);
  logAuth({
    method: 'tg-widget',
    outcome: res.ok ? 'success' : res.status,
    telegramId: user?.telegram_id ?? null,
    role: res.ok ? res.role : null,
    ip: clientIp(request),
  });
  if (res.ok) return redirect('/portal/', 303);
  return redirect(`/portal/login?tg=${res.status}`, 303);
};

// POST: Login Widget callback-режим (form/JSON) или Mini App initData (JSON).
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user, isMiniApp, inviteToken, debug } = await resolveTgUser(request);
  debug.ip = clientIp(request);
  const res = await loginResult(user, (t) => setSessionCookie(cookies, t), inviteToken, debug);
  logAuth({
    method: isMiniApp ? 'tg-miniapp' : 'tg-widget',
    outcome: res.ok ? 'success' : res.status,
    telegramId: user?.telegram_id ?? null,
    role: res.ok ? res.role : null,
    ip: clientIp(request),
  });
  if (isMiniApp) {
    // Диагностику (debug) отдаём ВСЕГДА — и при успехе, и при ошибке,
    // чтобы Mini App мог показать максимум информации на экране.
    return res.ok
      ? new Response(JSON.stringify({ ok: true, role: res.role, debug }), { headers: { 'Content-Type': 'application/json' } })
      : new Response(JSON.stringify({ ok: false, error: res.status, debug }), {
          status: res.status === 'invalid' ? 401 : 403,
          headers: { 'Content-Type': 'application/json' },
        });
  }
  if (res.ok) return redirect('/portal/', 303);
  return redirect(`/portal/login?tg=${res.status}`, 303);
};
