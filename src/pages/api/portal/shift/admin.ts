export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../../lib/portalSession';
import {
  createShift, archiveShift, upsertEvent, duplicateEvent, deleteEvent, upsertChecklist, attachChecklist, deleteChecklist,
} from '../../../../lib/portalShift';

const ALLOWED_ROLES = ['admin', 'rukovoditel'] as const;

function requireAdmin(cookies: Parameters<APIRoute>[0]['cookies']): boolean {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  return !!p && (ALLOWED_ROLES as readonly string[]).includes(p.role);
}

/** Считать поля из formData или JSON-тела. */
async function readBody(request: Request): Promise<Record<string, unknown> & { __form: boolean }> {
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const j = await request.json().catch(() => ({}));
    return { ...j, __form: false };
  }
  const form = await request.formData();
  const obj: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) {
    // roles[] — повторяющиеся поля → массив
    if (k in obj) {
      const cur = obj[k];
      obj[k] = Array.isArray(cur) ? [...cur, v] : [cur, v];
    } else {
      obj[k] = v;
    }
  }
  return { ...obj, __form: true };
}

function asStr(v: unknown): string { return v == null ? '' : String(v); }
function asNum(v: unknown): number { return Number(v); }
function asArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (v == null || v === '') return [];
  return [String(v)];
}
/** items из textarea (одна строка = один пункт) или из JSON-массива. */
function parseItems(v: unknown): { id: string; text: string }[] {
  if (Array.isArray(v)) {
    return v
      .map((it: any, i: number) => ({ id: String(it?.id ?? `i${i + 1}`), text: String(it?.text ?? '').trim() }))
      .filter((it) => it.text);
  }
  return asStr(v)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text, i) => ({ id: `i${i + 1}`, text }));
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!requireAdmin(cookies)) return new Response(JSON.stringify({ ok: false, error: 'нет прав (нужен руководитель или админ)' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  const body = await readBody(request);
  const isForm = body.__form === true;
  const action = asStr(body.action);

  const ok = (extra?: Record<string, unknown>) =>
    isForm
      ? redirect('/portal/smena/admin', 303)
      : new Response(JSON.stringify({ ok: true, ...extra }), { headers: { 'Content-Type': 'application/json' } });
  const bad = (msg: string) => new Response(JSON.stringify({ ok: false, error: msg }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  try {
    if (action === 'createShift') {
      const name = asStr(body.name).trim();
      const start = asStr(body.start);
      const end = asStr(body.end);
      if (!name || !start || !end) return bad('name/start/end required');
      const id = await createShift(name, start, end);
      return ok({ id });
    }

    if (action === 'archiveShift') {
      const id = asNum(body.id);
      if (!id) return bad('id required');
      await archiveShift(id);
      return ok();
    }

    if (action === 'upsertEvent') {
      const shiftId = asNum(body.shiftId ?? body.shift_id);
      const date = asStr(body.date);
      const title = asStr(body.title).trim();
      if (!shiftId || !date || !title) return bad('shiftId/date/title required');
      const respRaw = body.responsible_staff_id;
      const respId = respRaw != null && respRaw !== '' && asNum(respRaw) > 0 ? asNum(respRaw) : null;
      const id = await upsertEvent({
        id: body.id ? asNum(body.id) : undefined,
        shiftId,
        date,
        start_time: asStr(body.start_time) || null,
        end_time: asStr(body.end_time) || null,
        title,
        activity_type: asStr(body.activity_type) || null,
        roles: asArr(body.roles),
        sort: Number.isFinite(asNum(body.sort)) ? asNum(body.sort) : 0,
        notes: body.notes != null && asStr(body.notes) !== '' ? asStr(body.notes) : null,
        responsible_staff_id: respId,
      });
      return ok({ id });
    }

    if (action === 'duplicateEvent') {
      const srcId = asNum(body.id);
      if (!srcId) return bad('id required');
      const respRaw = body.responsible_staff_id;
      const respId = respRaw != null && respRaw !== '' && asNum(respRaw) > 0 ? asNum(respRaw) : null;
      const newId = await duplicateEvent(srcId, respId);
      if (!newId) return bad('Исходное событие не найдено или не удалось создать копию');
      return ok({ id: newId });
    }

    if (action === 'deleteEvent') {
      const id = asNum(body.id);
      if (!id) return bad('id required');
      await deleteEvent(id);
      return ok();
    }

    if (action === 'upsertChecklist') {
      const title = asStr(body.title).trim();
      if (!title) return bad('title required');
      const id = await upsertChecklist({
        id: body.id ? asNum(body.id) : undefined,
        key: asStr(body.key).trim() || null,
        title,
        items: parseItems(body.items),
      });
      return ok({ id });
    }

    if (action === 'deleteChecklist') {
      const id = asNum(body.id);
      if (!id) return bad('id required');
      await deleteChecklist(id);
      return ok();
    }

    if (action === 'attachChecklist') {
      const eventId = asNum(body.event_id ?? body.eventId);
      const checklistId = asNum(body.checklist_id ?? body.checklistId);
      if (!eventId || !checklistId) return bad('event_id/checklist_id required');
      await attachChecklist(eventId, checklistId, asArr(body.roles));
      return ok();
    }

    return bad('unknown action');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: 'server-error: ' + msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
