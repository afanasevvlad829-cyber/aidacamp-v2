export const prerender = false;
import type { APIRoute } from 'astro';
import { resolveRole } from '../../../lib/portalAuth';
import { signSession } from '../../../lib/portalSession';
import { portalCookieOptions } from '../../../lib/portalCookie';
import { findKidByCode, markKidLoggedIn } from '../../../lib/portalKid';

const attempts = new Map<string, { n: number; reset: number }>();

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // rate-limit: не более 10 попыток в минуту с IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const a = attempts.get(ip) ?? { n: 0, reset: now + 60_000 };
  if (now > a.reset) { a.n = 0; a.reset = now + 60_000; }
  a.n++;
  attempts.set(ip, a);
  if (a.n > 10) return new Response('Слишком много попыток. Подождите минуту.', { status: 429 });

  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const rawNext = String(form.get('next') ?? '');

  // 1) Сначала пробуем как персональный код ребёнка (6 цифр и матчится с portal_kid).
  let role: string | null = null;
  let sub: number | undefined;
  if (/^\d{6}$/.test(password)) {
    const kid = await findKidByCode(password);
    if (kid) {
      role = 'student';
      sub = kid.id;
      // фоном фиксируем последний логин (не критично если упадёт)
      markKidLoggedIn(kid.id).catch(() => {});
    }
  }
  // 2) Иначе fallback — общий пароль (admin / rukovoditel / teacher / vozhaty / student)
  if (!role) {
    role = resolveRole(password);
  }
  if (!role) {
    const safeNext = rawNext.startsWith('https://ai.aidacamp.ru') || rawNext.startsWith('/portal') ? rawNext : '/portal/';
    return redirect(`/portal/login?error=1&next=${encodeURIComponent(safeNext)}`, 303);
  }

  const token = signSession(role as any, process.env.PORTAL_SESSION_SECRET ?? '', Date.now(), sub);
  cookies.set('portal_session', token, portalCookieOptions());
  // Сбрасываем view-as чтобы не застрять в старой роли при смене аккаунта
  const dom = process.env.PORTAL_COOKIE_DOMAIN?.trim();
  cookies.delete('portal_view_as', dom ? { path: '/', domain: dom } : { path: '/' });

  // Куда отправлять после логина:
  //  - явный next (если safe: /portal/* или https://ai.aidacamp.ru/*) → туда
  //  - иначе student → ai.aidacamp.ru (его учебная среда)
  //  - иначе staff → /portal/ (управление сменой)
  let dest: string;
  if (rawNext.startsWith('/portal') || rawNext.startsWith('https://ai.aidacamp.ru')) {
    dest = rawNext;
  } else if (role === 'student') {
    dest = 'https://ai.aidacamp.ru/';
  } else {
    dest = '/portal/';
  }
  return redirect(dest, 303);
};
