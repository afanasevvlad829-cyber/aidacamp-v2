export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../lib/portalSession';
import { listAssignments, upsertKid, deleteKid } from '../../../lib/portalRasselenie';

const STAFF_ROLES = new Set(['admin', 'rukovoditel', 'teacher', 'vozhaty']);

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

async function readBody(request: Request): Promise<Record<string, any>> {
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await request.json().catch(() => ({}))) as any;
  const form = await request.formData();
  const obj: any = {};
  for (const [k, v] of form.entries()) obj[k] = v;
  return obj;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p?.role) return json({ ok: false, error: 'unauthorized' }, 401);
  const shiftId = Number(url.searchParams.get('shift_id'));
  if (!Number.isFinite(shiftId)) return json({ ok: false, error: 'shift_id required' }, 400);
  const items = await listAssignments(shiftId);
  return json({ ok: true, items });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p?.role) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!STAFF_ROLES.has(p.role)) return json({ ok: false, error: 'forbidden' }, 403);
  const b = await readBody(request);
  const shift_id = Number(b.shift_id);
  const kid_id = String(b.kid_id ?? '').trim();
  const kid_name = String(b.kid_name ?? '').trim();
  if (!Number.isFinite(shift_id) || !kid_id || !kid_name) {
    return json({ ok: false, error: 'shift_id, kid_id, kid_name required' }, 400);
  }
  const room_number = b.room_number != null && b.room_number !== '' ? Number(b.room_number) : null;
  const bed_index = b.bed_index != null && b.bed_index !== '' ? Number(b.bed_index) : null;
  const r = await upsertKid({
    shift_id, kid_id, kid_name,
    kid_gender: (b.kid_gender === 'M' || b.kid_gender === 'F') ? b.kid_gender : null,
    kid_age: b.kid_age != null && b.kid_age !== '' ? Number(b.kid_age) : null,
    notes: b.notes ? String(b.notes) : null,
    room_number, bed_index,
  });
  return json({ ok: true, ...r });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p?.role || !STAFF_ROLES.has(p.role)) return json({ ok: false, error: 'forbidden' }, 403);
  const b = await readBody(request);
  const shift_id = Number(b.shift_id);
  const kid_id = String(b.kid_id ?? '').trim();
  if (!Number.isFinite(shift_id) || !kid_id) return json({ ok: false, error: 'shift_id, kid_id required' }, 400);
  await deleteKid(shift_id, kid_id);
  return json({ ok: true });
};
