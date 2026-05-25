export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../../lib/portalSession';
import { roleAllowed } from '../../../../lib/portalShiftRoles';
import { eventChecklistRoles, toggleDone } from '../../../../lib/portalShift';

export const POST: APIRoute = async ({ request, cookies }) => {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p || !p.sub) return new Response(JSON.stringify({ ok: false, error: 'no-session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const body = await request.json().catch(() => ({}));
  const eventId = Number(body.eventId), checklistId = Number(body.checklistId), itemId = String(body.itemId ?? '');
  if (!eventId || !checklistId || !itemId) return new Response(JSON.stringify({ ok: false, error: 'bad-args' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const roles = await eventChecklistRoles(eventId, checklistId);
  if (!roleAllowed(p.role, roles)) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  const res = await toggleDone(p.sub, eventId, checklistId, itemId);
  return new Response(JSON.stringify({ ok: true, done: res?.done ?? false }), { headers: { 'Content-Type': 'application/json' } });
};
