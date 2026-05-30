export const prerender = false;
import type { APIRoute } from 'astro';
import { listForEvent, markChecked, unmark } from '../../../lib/portalSelfCheck';

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { 'Content-Type': 'application/json' } });
}
function ok(data: object) {
  return new Response(JSON.stringify({ ok: true, ...data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.portalRole) return bad('unauthorized', 401);
  const eventId = Number(url.searchParams.get('event_id') ?? '0');
  if (!eventId) return bad('event_id required');
  const sub = locals.portalSub;
  let meStaffId: number | null = null;
  if (sub != null) {
    const conn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
    if (conn) {
      const { default: pg } = await import('pg');
      const c = new pg.Client({ connectionString: conn });
      await c.connect();
      try {
        const r = await c.query('SELECT id FROM portal_staff WHERE telegram_id=$1', [sub]);
        meStaffId = r.rows[0] ? Number(r.rows[0].id) : null;
      } finally { await c.end(); }
    }
  }
  return ok({ rows: await listForEvent(eventId), me_staff_id: meStaffId });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const role = locals.portalRole;
  const sub  = locals.portalSub;
  if (!role) return bad('unauthorized', 401);
  if (sub == null) return bad('сессия без telegram_id — перелогинься', 403);

  let body: any;
  try { body = await request.json(); } catch { return bad('invalid json'); }
  const action = String(body.action || 'mark');
  const eventId = Number(body.event_id);
  if (!eventId) return bad('event_id required');

  if (action === 'mark') {
    const r = await markChecked(eventId, sub);
    if (!r.ok) return bad(r.error, 400);
    return ok({ checked_at: r.checked_at });
  }
  if (action === 'unmark') {
    const r = await unmark(eventId, sub);
    return ok({ removed: r.ok });
  }
  return bad('unknown action');
};
