export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../../lib/portalSession';
import { toggleDone, setDone } from '../../../../lib/portalShift';

export const POST: APIRoute = async ({ request, cookies }) => {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p || !p.sub) return new Response(JSON.stringify({ ok: false, error: 'no-session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const body = await request.json().catch(() => ({}));
  const eventId = Number(body.eventId), checklistId = Number(body.checklistId), itemId = String(body.itemId ?? '');
  if (!eventId || !checklistId || !itemId) return new Response(JSON.stringify({ ok: false, error: 'bad-args' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  // Ограничения по ролям сняты — отметить может любой авторизованный сотрудник.
  // Идемпотентно: если клиент прислал желаемое состояние done — ставим именно его
  // (надёжно для Safari/двойного тапа); старые клиенты без done — fallback на toggle.
  const res = typeof body.done === 'boolean'
    ? await setDone(p.sub, eventId, checklistId, itemId, body.done)
    : await toggleDone(p.sub, eventId, checklistId, itemId);
  return new Response(JSON.stringify({ ok: true, done: res?.done ?? false }), { headers: { 'Content-Type': 'application/json' } });
};
