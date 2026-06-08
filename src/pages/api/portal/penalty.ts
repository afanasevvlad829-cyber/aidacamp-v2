export const prerender = false;
import type { APIRoute } from 'astro';
import { isStaff } from '../../../lib/portalPerms';
import {
  listPenalties, createPenalty, confirmPenalty, cancelPenalty, markPaid, getReasons,
  type PenaltyStatus,
} from '../../../lib/portalPenalty';

function unauthorized(msg = 'unauthorized') {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 401, headers: { 'Content-Type': 'application/json' },
  });
}
function forbidden(msg = 'forbidden') {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 403, headers: { 'Content-Type': 'application/json' },
  });
}
function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
function ok(payload: unknown) {
  return new Response(JSON.stringify({ ok: true, ...(payload as object) }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}

function isManager(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'rukovoditel';
}

export const GET: APIRoute = async ({ url, locals }) => {
  const role = locals.portalRole ?? null;
  const sub  = locals.portalSub ?? null;
  if (!role || sub == null) return unauthorized();

  const reasons = url.searchParams.get('reasons') === '1';
  if (reasons) return ok({ reasons: await getReasons() });

  const scope = url.searchParams.get('scope') ?? 'mine';   // 'mine' | 'all'
  const status = url.searchParams.get('status');
  const shiftId = Number(url.searchParams.get('shift_id') ?? 0) || undefined;
  const filter: Parameters<typeof listPenalties>[0] = { shift_id: shiftId };
  if (status === 'open' || status === 'proposed' || status === 'confirmed' || status === 'paid' || status === 'cancelled' || status === 'contested') {
    filter.status = status as PenaltyStatus | 'open';
  }

  if (scope === 'all') {
    if (!isManager(role)) return forbidden('only admin/rukovoditel can see all');
  } else {
    // 'mine' — фильтр по своему staff_id. У нас в локалях есть portalSub (telegram_id),
    // нужно превратить его в portal_staff.id. Самый лёгкий способ — отдельный SQL.
    const sid = await staffIdByTelegram(sub);
    if (!sid) return forbidden('staff not found');
    filter.staff_id = sid;
  }

  return ok({ penalties: await listPenalties(filter) });
};

async function staffIdByTelegram(telegramId: number): Promise<number | null> {
  // мини-утилита, чтобы не тянуть весь lib portalStaff
  const conn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
  if (!conn) return null;
  const { default: pg } = await import('pg');
  const c = new pg.Client({ connectionString: conn });
  await c.connect();
  try {
    const r = await c.query('SELECT id FROM portal_staff WHERE telegram_id=$1 LIMIT 1', [telegramId]);
    return (r.rows[0]?.id as number) ?? null;
  } finally { await c.end(); }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const role = locals.portalRole ?? null;
  const sub  = locals.portalSub ?? null;
  if (!role || sub == null) return unauthorized();
  if (!isStaff(role ?? '')) return forbidden('only staff can issue penalties');

  let body: any;
  try { body = await request.json(); } catch { return bad('invalid json'); }

  const action = String(body.action || 'create');
  const actorId = await staffIdByTelegram(sub);
  if (!actorId) return forbidden('actor staff not found');

  if (action === 'create') {
    const staff_id = Number(body.staff_id);
    const reason_code = String(body.reason_code || '');
    if (!staff_id || !reason_code) return bad('staff_id + reason_code required');
    const id = await createPenalty({
      staff_id,
      shift_id: body.shift_id ? Number(body.shift_id) : null,
      event_id: body.event_id ? Number(body.event_id) : null,
      reason_code,
      reason_text: body.reason_text ?? null,
      amount_rub: body.amount_rub != null ? Math.max(0, Math.floor(Number(body.amount_rub))) : undefined,
      source: 'manual',
      status: 'confirmed',  // ручной выдан → сразу confirmed
      created_by: actorId,
    });
    return ok({ id });
  }

  if (action === 'confirm') {
    const id = Number(body.id);
    if (!id) return bad('id required');
    const amount = body.amount_rub != null ? Math.max(0, Math.floor(Number(body.amount_rub))) : undefined;
    await confirmPenalty(id, actorId, amount);
    return ok({ id });
  }

  if (action === 'cancel') {
    const id = Number(body.id);
    const note = String(body.note || '').trim();
    if (!id) return bad('id required');
    if (!note) return bad('note required (укажи причину отмены)');
    // Отменять штрафы может только admin
    if (role !== 'admin') return forbidden('отменять штрафы может только администратор');
    await cancelPenalty(id, actorId, note);
    return ok({ id });
  }

  if (action === 'paid') {
    const id = Number(body.id);
    if (!id) return bad('id required');
    await markPaid(id, actorId);
    return ok({ id });
  }

  return bad('unknown action');
};
