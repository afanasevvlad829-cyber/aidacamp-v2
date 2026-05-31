export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../lib/portalSession';
import { query } from '../../../lib/db';

/**
 * Идентификационный эндпойнт для nginx `auth_request` и для overlay-страниц.
 *
 * Возвращает либо 200 + JSON (с заголовками X-Auth-* для проксирования),
 * либо 401 (без тела).
 *
 * Заголовки на 200:
 *   X-Auth-Role        — admin | teacher | vozhaty | rukovoditel | student
 *   X-Auth-Sub         — telegram_id (для staff) или kid_id (для student) или 'shared'
 *   X-Auth-Email       — детерминированный e-mail-ID для Open WebUI trusted-header
 *
 * Email-схема:
 *   staff   → tg<telegram_id>@staff.aidacamp.local
 *   student → kid<kid_id>@students.aidacamp.local
 *   shared (общий код без sub) → student-shared@students.aidacamp.local
 */
const ROLE_LABEL: Record<string, string> = {
  admin: 'Админ',
  rukovoditel: 'Руководитель',
  teacher: 'Преподаватель',
  vozhaty: 'Вожатый',
  student: 'Ученик',
};

function authEmail(role: string, sub?: number | string): string {
  if (role === 'student') {
    if (sub == null) return 'student-shared@students.aidacamp.local';
    return `kid${sub}@students.aidacamp.local`;
  }
  if (sub == null) return `${role}-shared@staff.aidacamp.local`;
  return `tg${sub}@staff.aidacamp.local`;
}

export const GET: APIRoute = async ({ cookies }) => {
  const p = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!p) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const email = authEmail(p.role, p.sub);
  const subStr = p.sub != null ? String(p.sub) : 'shared';

  // Реальное ФИО для отображения в Open WebUI: для ученика берём из portal_kid.
  // Open WebUI создаёт аккаунт с этим именем при первом входе (X-Auth-Name).
  let displayName = ROLE_LABEL[p.role] || p.role;
  if (p.role === 'student' && p.sub != null) {
    try {
      const rows = await query<{ name: string }>(
        'SELECT name FROM portal_kid WHERE id = $1',
        [p.sub],
      );
      if (rows && rows[0]?.name) displayName = rows[0].name;
    } catch {
      // при сбое БД — оставляем метку роли, не ломаем авторизацию
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    role: p.role,
    label: ROLE_LABEL[p.role] || p.role,
    sub: p.sub ?? null,
    name: displayName,
    email,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Role': p.role,
      'X-Auth-Sub': subStr,
      'X-Auth-Email': email,
      // ФИО для trusted-header Open WebUI. Percent-encoded (UTF-8) —
      // Open WebUI делает urllib.parse.unquote(name). Заголовки HTTP только ASCII.
      'X-Auth-Name': encodeURIComponent(displayName),
      // Open WebUI принимает только определённые символы в e-mail; наш формат — стандартный.
      'Cache-Control': 'no-store',
    },
  });
};
