export const prerender = false;
import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/portalPerms';

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
 * POST /api/portal/shift/copy-shift
 * Создаёт новую смену на основе существующей.
 *
 * Что копируется: все события смены с пересчётом дат относительно нового start_date.
 * Что НЕ копируется: чек-листы, ответственные, content_task_template_id, отметки.
 *
 * Body:
 *   source_shift_id  — id смены-источника
 *   name             — название новой смены
 *   start_date       — дата начала новой смены (YYYY-MM-DD)
 *   end_date         — дата окончания новой смены (YYYY-MM-DD)
 *
 * Доступ: только admin.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const auth = requireRole(locals, ['admin']);
  if (auth instanceof Response) return auth;

  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid json' }, 400); }

  const sourceShiftId = Number(body.source_shift_id);
  const name = String(body.name ?? '').trim();
  const startDate = String(body.start_date ?? '').trim();
  const endDate = String(body.end_date ?? '').trim();

  if (!Number.isFinite(sourceShiftId) || sourceShiftId <= 0)
    return json({ ok: false, error: 'source_shift_id required' }, 400);
  if (!name) return json({ ok: false, error: 'name required' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return json({ ok: false, error: 'start_date invalid' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate))   return json({ ok: false, error: 'end_date invalid' }, 400);
  if (startDate > endDate) return json({ ok: false, error: 'start_date должна быть раньше end_date' }, 400);

  const result = await withClient(async (c) => {
    // Проверяем источник
    const src = await c.query(
      `SELECT id, to_char(start_date,'YYYY-MM-DD') start_date FROM shift WHERE id=$1`,
      [sourceShiftId],
    );
    if (!src.rows[0]) throw new Error('source shift not found');
    const srcStartDate = src.rows[0].start_date as string;

    // Вычисляем сдвиг в днях: новый start_date - старый start_date
    const offsetMs = new Date(startDate).getTime() - new Date(srcStartDate).getTime();
    const offsetDays = Math.round(offsetMs / 86_400_000);

    // Создаём новую смену
    const ins = await c.query(
      `INSERT INTO shift(name, start_date, end_date, status)
       VALUES($1, $2, $3, 'active') RETURNING id`,
      [name, startDate, endDate],
    );
    const newShiftId = ins.rows[0].id as number;

    // Копируем события со сдвигом дат, без чек-листов, без ответственных
    const events = await c.query(
      `SELECT start_time, end_time, to_char(date,'YYYY-MM-DD') date,
              title, notes, sort, roles, event_type, activity_type, group_color_id
       FROM shift_event WHERE shift_id=$1 ORDER BY date, sort, start_time`,
      [sourceShiftId],
    );

    let count = 0;
    for (const e of events.rows) {
      const newDate = new Date(new Date(e.date).getTime() + offsetDays * 86_400_000)
        .toISOString().slice(0, 10);

      // Не копируем дни за пределами новой смены
      if (newDate < startDate || newDate > endDate) continue;

      await c.query(
        `INSERT INTO shift_event(shift_id, date, start_time, end_time, title, notes, sort,
                                  roles, event_type, activity_type, group_color_id,
                                  responsible_staff_id, content_task_template_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL,NULL)`,
        [newShiftId, newDate, e.start_time, e.end_time, e.title, e.notes, e.sort,
         e.roles, e.event_type, e.activity_type, e.group_color_id],
      );
      count++;
    }

    return { new_shift_id: newShiftId, events_copied: count };
  });

  if (result == null) return json({ ok: false, error: 'db unavailable' }, 503);
  if (result instanceof Error) return json({ ok: false, error: result.message }, 400);
  return json({ ok: true, ...result });
};
