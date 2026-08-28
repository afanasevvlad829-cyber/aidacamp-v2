export const prerender = false;
/**
 * /api/staff-login — серверная авторизация внутренних инструментов /staff.
 *
 * GET    → { ok, authed }   — статус авторизации (клиентский гейт на /staff и /staff/plan).
 * POST   → { ok }           — { password, remember? }; сверяет с STAFF_AUTH_SECRET,
 *                             при успехе сам ставит httpOnly-куку. 401 при неверном пароле.
 * DELETE → { ok }           — выход (сброс куки).
 *
 * Fail-closed: нет STAFF_AUTH_SECRET → 503 (не фолбэк). Пароль в браузере НЕ проверяется.
 */
import type { APIRoute } from 'astro';
import {
  STAFF_COOKIE,
  getStaffSecret,
  checkStaffPassword,
  isStaffAuthed,
  staffCookieOptions,
} from '../../lib/staffAuth';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const GET: APIRoute = async ({ cookies }) => {
  const secret = getStaffSecret();
  if (!secret) return json({ ok: false, error: 'Service Unavailable' }, 503);
  return json({ ok: true, authed: isStaffAuthed(cookies.get(STAFF_COOKIE)?.value, secret) });
};

// rate-limit: не более 10 попыток в минуту с IP (как в /api/portal/login)
const attempts = new Map<string, { n: number; reset: number }>();

export const POST: APIRoute = async ({ request, cookies }) => {
  const secret = getStaffSecret();
  if (!secret) return json({ ok: false, error: 'Service Unavailable' }, 503);

  const ip =
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ||
    'unknown';
  const now = Date.now();
  const a = attempts.get(ip) ?? { n: 0, reset: now + 60_000 };
  if (now > a.reset) { a.n = 0; a.reset = now + 60_000; }
  a.n++;
  attempts.set(ip, a);
  if (a.n > 10) return json({ ok: false, error: 'Слишком много попыток. Подождите минуту.' }, 429);

  let password = '';
  let remember = true;
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = await request.json();
      password = String((body as any)?.password ?? '');
      remember = (body as any)?.remember !== false;
    } else {
      const form = await request.formData();
      password = String(form.get('password') ?? '');
      remember = form.get('remember') !== 'false';
    }
  } catch {
    return json({ ok: false, error: 'Bad request' }, 400);
  }

  if (!checkStaffPassword(password, secret)) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  cookies.set(STAFF_COOKIE, secret, staffCookieOptions(remember));
  return json({ ok: true });
};

export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete(STAFF_COOKIE, { path: '/' });
  return json({ ok: true });
};
