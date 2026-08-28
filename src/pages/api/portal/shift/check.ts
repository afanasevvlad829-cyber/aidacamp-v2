export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/portalPerms';
import { isChecklistItemAttached, toggleDone, setDone } from '../../../../lib/portalShift';

export const POST: APIRoute = async ({ locals, request }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { sub } = _a;
  if (!sub) return new Response(JSON.stringify({ ok: false, error: 'no-session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const body = await request.json().catch(() => ({}));
  const eventId = Number(body.eventId), checklistId = Number(body.checklistId), itemId = String(body.itemId ?? '');
  if (!eventId || !checklistId || !itemId) return new Response(JSON.stringify({ ok: false, error: 'bad-args' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const validItem = await isChecklistItemAttached(eventId, checklistId, itemId);
  if (validItem == null) return new Response(JSON.stringify({ ok: false, error: 'db-unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  if (!validItem) return new Response(JSON.stringify({ ok: false, error: 'checklist-item-not-attached' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  // Ограничения по ролям сняты — отметить может любой авторизованный сотрудник.
  // Идемпотентно: если клиент прислал желаемое состояние done — ставим именно его
  // (надёжно для Safari/двойного тапа); старые клиенты без done — fallback на toggle.
  const res = typeof body.done === 'boolean'
    ? await setDone(sub, eventId, checklistId, itemId, body.done)
    : await toggleDone(sub, eventId, checklistId, itemId);
  return new Response(JSON.stringify({ ok: true, done: res?.done ?? false }), { headers: { 'Content-Type': 'application/json' } });
};
