export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../../lib/portalSession';
import { getActiveShift, getEvents, getDone } from '../../../../lib/portalShift';

export const GET: APIRoute = async ({ cookies }) => {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p) return new Response('Unauthorized', { status: 401 });
  const shift = await getActiveShift();
  if (!shift) return new Response(JSON.stringify({ ok: true, shift: null, events: [] }), { headers: { 'Content-Type': 'application/json' } });
  const events = await getEvents(shift.id);
  const done = p.sub ? [...await getDone(p.sub, shift.id)] : [];
  return new Response(JSON.stringify({ ok: true, shift, events, done }), { headers: { 'Content-Type': 'application/json' } });
};
