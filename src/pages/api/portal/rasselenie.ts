export const prerender = false;
import type { APIRoute } from 'astro';
import { isStaff, requireStaff } from '../../../lib/portalPerms';
import { listAssignments, upsertKid, deleteKid, autoAssign } from '../../../lib/portalRasselenie';
import { ROOMS } from '../../../lib/portalRooms';

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

export const GET: APIRoute = async ({ locals, url }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  const shiftId = Number(url.searchParams.get('shift_id'));
  if (!Number.isFinite(shiftId)) return json({ ok: false, error: 'shift_id required' }, 400);
  const items = await listAssignments(shiftId);
  return json({ ok: true, items });
};

export const POST: APIRoute = async ({ locals, request }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  const b = await readBody(request);
  const shift_id = Number(b.shift_id);
  if (!Number.isFinite(shift_id)) return json({ ok: false, error: 'shift_id required' }, 400);

  // Авто-расстановка (action=auto_assign)
  if (b.action === 'auto_assign') {
    const eligibleRooms = ROOMS.filter((r) => r.type !== 'staff').map((r) => ({ number: r.number, capacity: r.capacity }));
    const r = await autoAssign(shift_id, eligibleRooms);
    return json({ ok: true, ...r });
  }

  const kid_id = String(b.kid_id ?? '').trim();
  const kid_name = String(b.kid_name ?? '').trim();
  if (!kid_id || !kid_name) {
    return json({ ok: false, error: 'kid_id, kid_name required' }, 400);
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

export const DELETE: APIRoute = async ({ locals, request }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  if (!isStaff(role)) return json({ ok: false, error: 'forbidden' }, 403);
  const b = await readBody(request);
  const shift_id = Number(b.shift_id);
  if (!Number.isFinite(shift_id)) return json({ ok: false, error: 'shift_id required' }, 400);

  // Сброс всего расселения смены (action=reset_all): обнуляем room_number и bed_index, дети остаются в списке.
  if (b.action === 'reset_all') {
    const { resetAssignmentsForShift } = await import('../../../lib/portalRasselenie');
    const cleared = await resetAssignmentsForShift(shift_id);
    return json({ ok: true, cleared });
  }

  // Полная очистка списка (action=wipe_all): удаляем всех детей вообще
  if (b.action === 'wipe_all') {
    const { wipeKidsForShift } = await import('../../../lib/portalRasselenie');
    const removed = await wipeKidsForShift(shift_id);
    return json({ ok: true, removed });
  }

  const kid_id = String(b.kid_id ?? '').trim();
  if (!kid_id) return json({ ok: false, error: 'kid_id required' }, 400);
  await deleteKid(shift_id, kid_id);
  return json({ ok: true });
};
