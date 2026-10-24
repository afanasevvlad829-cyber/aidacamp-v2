export const prerender = false;
import type { APIRoute } from 'astro';
import { getPool } from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  let body: { discount?: number; shiftId?: string } = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const discount = typeof body.discount === 'number' ? body.discount : null;
  const shiftId  = typeof body.shiftId  === 'string' ? body.shiftId  : 'shift-1';
  const ip       = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
  const ua       = request.headers.get('user-agent') ?? null;

  try {
    await getPool()?.query(
      `INSERT INTO fortune_events (event_type, discount, shift_id, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      ['spin', discount, shiftId, ip, ua]
    );
  } catch (e: any) {
    console.error('[fortune/spin] DB error:', e.message);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
