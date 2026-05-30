export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../lib/portalSession';
import { isStaff } from '../../../lib/portalPerms';
import {
  ensureInventory, toggleCheck, setStatus, attachWalkthrough, getInventory, setNotes,
} from '../../../lib/portalRoomInventory';

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function readBody(request: Request): Promise<Record<string, any>> {
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await request.json().catch(() => ({}))) as any;
  const form = await request.formData();
  const obj: any = {};
  for (const [k, v] of form.entries()) obj[k] = v;
  return obj;
}

/**
 * GET /api/portal/room-inventory?shift_id=N&room=20  → состояние одной комнаты + checks
 * POST /api/portal/room-inventory  body: { shift_id, room, item_id?, done?, comment?, status?, walkthrough_photo_id? }
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  const payload = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!payload?.role) return json({ ok: false, error: 'unauthorized' }, 401);

  const shiftId = Number(url.searchParams.get('shift_id'));
  const room = Number(url.searchParams.get('room'));
  if (!Number.isFinite(shiftId) || !Number.isFinite(room)) return json({ ok: false, error: 'shift_id and room required' }, 400);

  const data = await getInventory(shiftId, room);
  return json({ ok: true, ...data });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const payload = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!payload?.role) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!isStaff(payload.role)) return json({ ok: false, error: 'forbidden' }, 403);

  const body = await readBody(request);
  const shiftId = Number(body.shift_id);
  const room = Number(body.room);
  if (!Number.isFinite(shiftId) || !Number.isFinite(room)) return json({ ok: false, error: 'shift_id and room required' }, 400);

  const invId = await ensureInventory(shiftId, room);
  if (!invId) return json({ ok: false, error: 'db unavailable' }, 503);

  // Чек-лист пункт
  if (body.item_id != null) {
    const itemId = String(body.item_id);
    const done = Boolean(body.done);
    const comment = body.comment != null && String(body.comment) !== '' ? String(body.comment) : null;
    await toggleCheck(invId, itemId, done, comment);
  }

  // Общий комментарий по комнате (одно поле на комнату)
  if (body.notes != null) {
    const notes = String(body.notes).trim() !== '' ? String(body.notes) : null;
    await setNotes(invId, notes);
  }

  // Статус комнаты
  if (body.status) {
    const st = String(body.status);
    if (!['pending', 'ok', 'defects'].includes(st)) return json({ ok: false, error: 'bad status' }, 400);
    await setStatus(invId, st as any, payload.sub ?? 0);
  }

  // Видео обхода
  if (body.walkthrough_photo_id != null) {
    const pid = Number(body.walkthrough_photo_id);
    if (Number.isFinite(pid)) await attachWalkthrough(invId, pid);
  }

  const data = await getInventory(shiftId, room);
  return json({ ok: true, ...data });
};
