export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/portalPerms';
import { getActiveShift, getEvents, getDone } from '../../../../lib/portalShift';

export const GET: APIRoute = async ({ locals }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  const shift = await getActiveShift();
  if (!shift) return new Response(JSON.stringify({ ok: true, shift: null, events: [] }), { headers: { 'Content-Type': 'application/json' } });
  const events = await getEvents(shift.id);
  const done = sub ? [...await getDone(sub, shift.id)] : [];
  return new Response(JSON.stringify({ ok: true, shift, events, done }), { headers: { 'Content-Type': 'application/json' } });
};
