export const prerender = false;
import type { APIRoute } from 'astro';
import { resolveRole } from '../../../lib/portalAuth';
import { signSession } from '../../../lib/portalSession';

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
  const rawNext = String(form.get('next') ?? '/portal/');
  // защита от open-redirect: пускаем только внутрь /portal
  const next = rawNext.startsWith('/portal') ? rawNext : '/portal/';

  const role = resolveRole(password);
  if (!role) {
    return redirect(`/portal/login?error=1&next=${encodeURIComponent(next)}`, 303);
  }

  const token = signSession(role, process.env.PORTAL_SESSION_SECRET ?? '');
  cookies.set('portal_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return redirect(next, 303);
};
