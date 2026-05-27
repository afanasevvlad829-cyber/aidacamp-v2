export const prerender = false;
import type { APIRoute } from 'astro';
import { resolveRole } from '../../../lib/portalAuth';
import { signSession } from '../../../lib/portalSession';
import { portalCookieOptions } from '../../../lib/portalCookie';

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

  const role = resolveRole(password);
  if (!role) {
    // если пришли с ai.aidacamp.ru — вернёмся туда после ошибки
    const safeNext = rawNext.startsWith('https://ai.aidacamp.ru') || rawNext.startsWith('/portal') ? rawNext : '/portal/';
    return redirect(`/portal/login?error=1&next=${encodeURIComponent(safeNext)}`, 303);
  }

  const token = signSession(role, process.env.PORTAL_SESSION_SECRET ?? '');
  cookies.set('portal_session', token, portalCookieOptions());

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
