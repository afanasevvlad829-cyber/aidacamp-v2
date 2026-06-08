export const prerender = false;
import type { APIRoute } from 'astro';
import { isStaff, requireStaff } from '../../../lib/portalPerms';
import { listContentTaskTemplates, suggestContentTasks } from '../../../lib/portalShift';

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/**
 * Библиотека контент-заданий для сборки дня.
 * GET                      → вся библиотека
 * GET ?suggest=<название>   → подсказки по контексту блока (матчинг по тегам)
 * Доступ: все сотрудники (не ученики).
 */
export const GET: APIRoute = async ({ locals, url }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;

  const suggest = url.searchParams.get('suggest');
  if (suggest != null) {
    const items = await suggestContentTasks(suggest, 5);
    return json({ ok: true, items });
  }
  const items = await listContentTaskTemplates();
  return json({ ok: true, items });
};
