export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../../lib/portalSession';
import { canEditEvent } from '../../../../lib/portalShiftPerms';

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

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
 * POST /api/portal/shift/event-edit
 * Частичный edit события. admin/rukovoditel — всё; teacher/vozhaty — только свои события и подмножество полей.
 *
 * Body: { event_id, title?, start_time?, end_time?, notes?,
 *         attach_checklist?: { checklist_id, roles? },
 *         detach_event_checklist_id?: number }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const payload = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!payload?.role) return json({ ok: false, error: 'unauthorized' }, 401);
  const role = payload.role;

  const body = await readBody(request);

  // ── action=create: создать новый блок дня ──────────────────────────────
  if (body.action === 'create') {
    if (canEditEvent(role, null) !== true) return json({ ok: false, error: 'forbidden' }, 403);
    const shiftId = Number(body.shift_id);
    const date = String(body.date ?? '').trim();
    const title = String(body.title ?? '').trim();
    if (!Number.isFinite(shiftId) || shiftId <= 0) return json({ ok: false, error: 'shift_id required' }, 400);
    if (!date) return json({ ok: false, error: 'date required' }, 400);
    if (!title) return json({ ok: false, error: 'title required' }, 400);
    const created = await withClient(async (c) => {
      const r = await c.query(
        `INSERT INTO shift_event(shift_id, date, title, start_time, end_time, notes, sort)
         VALUES($1,$2,$3,$4,$5,$6,COALESCE($7,0)) RETURNING id`,
        [shiftId, date, title,
         body.start_time ? String(body.start_time) : null,
         body.end_time ? String(body.end_time) : null,
         body.notes ? String(body.notes) : null,
         body.sort != null && body.sort !== '' ? Number(body.sort) : null],
      );
      return r.rows[0]?.id ?? null;
    });
    if (created == null) return json({ ok: false, error: 'db unavailable' }, 503);
    return json({ ok: true, id: Number(created) });
  }

  const eventId = Number(body.event_id);
  if (!Number.isFinite(eventId) || eventId <= 0) return json({ ok: false, error: 'event_id required' }, 400);

  const result = await withClient(async (c) => {
    // Получить event.roles для проверки доступа.
    const ev = await c.query('SELECT id, roles FROM shift_event WHERE id=$1', [eventId]);
    if (ev.rowCount === 0) return { code: 404, error: 'event not found' };
    const eventRoles: string[] = ev.rows[0].roles ?? [];

    if (!canEditEvent(role, eventRoles)) {
      return { code: 403, error: 'не ваше событие' };
    }

    // Удаление события (ограничения по ролям сняты — может любой, кто проходит canEditEvent).
    if (body.delete === true || body.delete === 'true' || body.delete === 1 || body.delete === '1') {
      await c.query('DELETE FROM event_checklist WHERE event_id=$1', [eventId]);
      await c.query('DELETE FROM shift_event WHERE id=$1', [eventId]);
      return { code: 200, deleted: true };
    }

    // Сборка UPDATE-полей (только разрешённые)
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    function maybe(field: string, raw: any, transform?: (v: any) => any) {
      if (raw === undefined || raw === null) return;
      const v = transform ? transform(raw) : String(raw);
      sets.push(`${field}=$${i++}`); vals.push(v);
    }
    maybe('title', body.title);
    maybe('start_time', body.start_time, (v) => (v === '' ? null : String(v)));
    maybe('end_time', body.end_time, (v) => (v === '' ? null : String(v)));
    maybe('notes', body.notes, (v) => (v === '' ? null : String(v)));
    // Привязка/отвязка контент-задания из библиотеки (id текстовый или null)
    maybe('content_task_template_id', body.content_task_template_id, (v) => (v === '' ? null : String(v)));
    // Назначение ответственного (id числовой или null)
    maybe('responsible_staff_id', body.responsible_staff_id, (v) => (v === '' || v === null ? null : Number(v)));

    if (sets.length > 0) {
      vals.push(eventId);
      await c.query(`UPDATE shift_event SET ${sets.join(', ')} WHERE id=$${i}`, vals);
    }

    // attach_checklist
    if (body.attach_checklist) {
      const ac = typeof body.attach_checklist === 'string' ? JSON.parse(body.attach_checklist) : body.attach_checklist;
      const checklistId = Number(ac.checklist_id);
      if (Number.isFinite(checklistId) && checklistId > 0) {
        const roles = Array.isArray(ac.roles) ? ac.roles.map(String) : eventRoles;
        const existing = await c.query(
          'SELECT id FROM event_checklist WHERE event_id=$1 AND checklist_id=$2',
          [eventId, checklistId],
        );
        if (existing.rowCount && existing.rowCount > 0) {
          await c.query('UPDATE event_checklist SET roles=$2 WHERE id=$1', [existing.rows[0].id, roles]);
        } else {
          await c.query(
            'INSERT INTO event_checklist(event_id, checklist_id, roles) VALUES($1,$2,$3)',
            [eventId, checklistId, roles],
          );
        }
      }
    }

    // detach_event_checklist_id
    if (body.detach_event_checklist_id) {
      const ecId = Number(body.detach_event_checklist_id);
      if (Number.isFinite(ecId) && ecId > 0) {
        await c.query('DELETE FROM event_checklist WHERE id=$1 AND event_id=$2', [ecId, eventId]);
      }
    }

    return { code: 200 };
  });

  if (!result) return json({ ok: false, error: 'db unavailable' }, 503);
  if (result.code !== 200) return json({ ok: false, error: result.error }, result.code);
  return json({ ok: true });
};
