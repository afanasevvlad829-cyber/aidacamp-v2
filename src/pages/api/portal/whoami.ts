export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../lib/portalSession';

/**
 * JSON-эндпойнт для overlay-страниц (например, инструменты Омара).
 * Возвращает { ok, role, sub } или 401.
 *
 * Имя в JSON не выдаём — для overlay достаточно роли. Если нужно
 * человеческое имя, академия Омара возьмёт его из своего localStorage-профиля.
 */
const ROLE_LABEL: Record<string, string> = {
  admin: 'Админ',
  rukovoditel: 'Руководитель',
  teacher: 'Преподаватель',
  vozhaty: 'Вожатый',
  student: 'Ученик',
};

export const GET: APIRoute = ({ cookies }) => {
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
  return new Response(JSON.stringify({
    ok: true,
    role: p.role,
    label: ROLE_LABEL[p.role] || p.role,
    sub: p.sub ?? null,
    name: ROLE_LABEL[p.role] || p.role,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
