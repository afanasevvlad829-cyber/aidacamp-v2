export const prerender = false;
import type { APIRoute } from 'astro';
import { Pool } from 'pg';

let _pool: Pool | null = null;
function getPool() {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) return null;
    _pool = new Pool({ connectionString: url, max: 3, statement_timeout: 5000 });
  }
  return _pool;
}

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
