export const prerender = false;
import type { APIRoute } from 'astro';
import { resolveRole } from '../../../lib/portalAuth';
import { signSession } from '../../../lib/portalSession';
import { portalCookieOptions } from '../../../lib/portalCookie';
import { findKidByCode, markKidLoggedIn } from '../../../lib/portalKid';
import { findStaffByCode, markStaffCodeLogin } from '../../../lib/portalStaff';
import { logAuth } from '../../../lib/portalLog';

const ROLE_PRIORITY = ['admin', 'rukovoditel', 'teacher', 'vozhaty', 'student'] as const;

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
  let sid: number | undefined;
  if (/^\d{6}$/.test(password)) {
    const kid = await findKidByCode(password);
    if (kid) {
      role = 'student';
      sub = kid.id;
      // фоном фиксируем последний логин (не критично если упадёт)
      markKidLoggedIn(kid.id).catch(() => {});
    }
  }
  // 2) Персональный код сотрудника (альтернатива Telegram — TG не всегда доступен).
  //    sid = portal_staff.id; роль — высшая из ролей сотрудника. Работает и для
  //    placeholder-ов без telegram_id (тех, кто вообще не заходил через TG).
  if (!role && /^\d{6}$/.test(password)) {
    const st = await findStaffByCode(password);
    if (st && st.active) {
      const rs = (st.roles && st.roles.length > 0) ? st.roles : (st.role ? [st.role] : []);
      role = ROLE_PRIORITY.find((r) => rs.includes(r as any)) ?? rs[0] ?? null;
      if (role) {
        sid = st.id;
        markStaffCodeLogin(st.id).catch(() => {});
      }
    }
  }
  // 3) Иначе fallback — общий пароль (admin / rukovoditel / teacher / vozhaty / student)
  if (!role) {
    role = resolveRole(password);
  }
  if (!role) {
    logAuth({ method: 'code', outcome: 'bad-code', ip });
    const safeNext = rawNext.startsWith('https://ai.aidacamp.ru') || rawNext.startsWith('/portal') ? rawNext : '/portal/';
    return redirect(`/portal/login?error=1&next=${encodeURIComponent(safeNext)}`, 303);
  }

  // Для code-входа sub — это portal_kid.id (ученик) либо undefined (staff по паролю),
  // НЕ telegram_id, поэтому telegramId здесь не передаём.
  logAuth({ method: 'code', outcome: 'success', role, ip });

  const token = signSession(role as any, process.env.PORTAL_SESSION_SECRET ?? '', Date.now(), sub, sid);
  cookies.set('portal_session', token, portalCookieOptions());

  // Куда отправлять после логина:
  //  - student → ai.aidacamp.ru (учебная среда)
  //  - staff   → ВСЕГДА на главную /portal/ (никаких next-параметров — иначе попадают
  //              на /portal/smena, /portal/rooms и т.д., а пользователь хочет хаб)
  let dest: string;
  if (role === 'student') {
    dest = 'https://ai.aidacamp.ru/';
  } else {
    dest = '/portal/';
  }
  return redirect(dest, 303);
};
