export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/portalPerms';
import { withDbClient } from '../../../../lib/db';

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/**
 * POST /api/portal/shift/copy-shift
 * Создаёт новую смену на основе существующей: копирует все события со сдвигом дат.
 * Body: { source_shift_id, name, start_date, end_date }
 * Доступ: только admin.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role } = _a;
  if (role !== 'admin') return json({ ok: false, error: 'forbidden' }, 403);

  const body = await request.json().catch(() => ({}));
  const sourceShiftId = Number(body.source_shift_id);
  const name = String(body.name ?? '').trim();
  const startDate = String(body.start_date ?? '').trim();
  const endDate = String(body.end_date ?? '').trim();

  if (!Number.isFinite(sourceShiftId) || sourceShiftId <= 0)
    return json({ ok: false, error: 'source_shift_id required' }, 400);
  if (!name) return json({ ok: false, error: 'name required' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return json({ ok: false, error: 'start_date invalid' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return json({ ok: false, error: 'end_date invalid' }, 400);
  if (endDate < startDate) return json({ ok: false, error: 'end_date < start_date' }, 400);

  const result = await withDbClient(async (c) => {
    // Получаем источник
    const src = await c.query('SELECT start_date FROM shift WHERE id=$1', [sourceShiftId]);
    if (src.rowCount === 0) return { code: 404, error: 'source shift not found' };

    const srcStart: Date = src.rows[0].start_date;
    const srcStartMs = new Date(srcStart).getTime();
    const newStartMs = new Date(startDate).getTime();
    const offsetDays = Math.round((newStartMs - srcStartMs) / 86400000);

    // Создаём новую смену
    const ins = await c.query(
      'INSERT INTO shift(name, start_date, end_date) VALUES($1,$2,$3) RETURNING id',
      [name, startDate, endDate],
    );
    const newShiftId: number = ins.rows[0].id;

    // Копируем события со сдвигом дат
    const events = await c.query(
      `SELECT id, date, start_time, end_time, title, notes, sort,
              responsible_staff_id, content_task_template_id, roles, event_type, activity_type
         FROM shift_event WHERE shift_id=$1 ORDER BY date, sort, start_time`,
      [sourceShiftId],
    );

    for (const e of events.rows) {
      const origDate = new Date(e.date);
      origDate.setDate(origDate.getDate() + offsetDays);
      const newDate = origDate.toISOString().slice(0, 10);

      const evIns = await c.query(
        `INSERT INTO shift_event(shift_id, date, start_time, end_time, title, notes, sort,
                                  responsible_staff_id, content_task_template_id, roles, event_type, activity_type)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [newShiftId, newDate, e.start_time, e.end_time, e.title, e.notes, e.sort,
         e.responsible_staff_id, e.content_task_template_id, e.roles, e.event_type, e.activity_type],
      );
      const newEventId = evIns.rows[0]?.id;
      if (newEventId) {
        await c.query(
          `INSERT INTO event_checklist(event_id, checklist_id, roles)
           SELECT $1, checklist_id, roles FROM event_checklist WHERE event_id=$2`,
          [newEventId, e.id],
        );
      }
    }

    return { code: 200, newShiftId };
  });

  if (!result) return json({ ok: false, error: 'db unavailable' }, 503);
  if (result.code !== 200) return json({ ok: false, error: (result as any).error }, result.code);
  return json({ ok: true, shift_id: (result as any).newShiftId });
};
