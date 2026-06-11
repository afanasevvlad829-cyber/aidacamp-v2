export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/portalPerms';
import { canEditEvent } from '../../../../lib/portalShiftPerms';
import type { PortalRole } from '../../../../lib/portalSession';

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}
function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/**
 * POST /api/portal/shift/copy-day
 * Копирует все блоки дня (shift_event + привязки чек-листов) с одной даты на другую.
 * Копируются: время, название, ответственный, комментарий, контент-задание, чек-листы (структура).
 * НЕ копируются: персональные отметки (checklist_done) и загруженные фото.
 * Body: { shift_id, from_date, to_date }
 * Доступ: все сотрудники (не ученики).
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  if (!canEditEvent(role as PortalRole, null)) return json({ ok: false, error: 'forbidden' }, 403);

  const body = await request.json().catch(() => ({}));
  const shiftId = Number(body.shift_id);
  const fromDate = String(body.from_date ?? '').trim();
  const toDate = String(body.to_date ?? '').trim();
  if (!Number.isFinite(shiftId) || shiftId <= 0) return json({ ok: false, error: 'shift_id required' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) return json({ ok: false, error: 'from_date invalid' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return json({ ok: false, error: 'to_date invalid' }, 400);
  if (fromDate === toDate) return json({ ok: false, error: 'даты совпадают' }, 400);

  const result = await withClient(async (c) => {
    const src = await c.query(
      `SELECT id, start_time, end_time, title, notes, sort,
              responsible_staff_id, content_task_template_id, roles, event_type, activity_type
         FROM shift_event WHERE shift_id=$1 AND date=$2 ORDER BY sort, start_time`,
      [shiftId, fromDate],
    );
    let count = 0;
    for (const e of src.rows) {
      const ins = await c.query(
        `INSERT INTO shift_event(shift_id, date, start_time, end_time, title, notes, sort,
                                 responsible_staff_id, content_task_template_id, roles, event_type, activity_type)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [shiftId, toDate, e.start_time, e.end_time, e.title, e.notes, e.sort,
         e.responsible_staff_id, e.content_task_template_id, e.roles, e.event_type, e.activity_type],
      );
      const newId = ins.rows[0]?.id;
      // Копируем привязки чек-листов (без отметок)
      await c.query(
        `INSERT INTO event_checklist(event_id, checklist_id, roles)
         SELECT $1, checklist_id, roles FROM event_checklist WHERE event_id=$2`,
        [newId, e.id],
      );
      count++;
    }
    return count;
  });

  if (result == null) return json({ ok: false, error: 'db unavailable' }, 503);
  return json({ ok: true, count: result });
};
