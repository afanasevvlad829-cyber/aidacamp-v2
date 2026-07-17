export const prerender = false;
import type { APIRoute } from 'astro';
import pg from 'pg';

const DB_URL = process.env.DATABASE_URL;
let _pool: InstanceType<typeof pg.Pool> | null = null;
function getPool() {
  if (!_pool && DB_URL) {
    _pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
  }
  return _pool;
}

/** POST /api/ask-feedback  { message_id: number, csat: 1 | -1 }
 *  Оценка ответа AI-бота на /ask/ — пишет csat в ai_ask_sessions.
 *  Повторный клик по другой кнопке просто перезаписывает оценку.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 });
  }

  const messageId = body?.message_id;
  const csat = body?.csat;
  if (!Number.isInteger(messageId) || messageId <= 0 || (csat !== 1 && csat !== -1)) {
    return new Response(JSON.stringify({ error: 'invalid params' }), { status: 400 });
  }

  const pool = getPool();
  if (!pool) {
    return new Response(JSON.stringify({ error: 'no db' }), { status: 503 });
  }

  try {
    await pool.query(
      `UPDATE ai_ask_sessions SET csat = $2, csat_ts = now() WHERE id = $1`,
      [messageId, csat]
    );
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[ask-feedback] db error', e);
    return new Response(JSON.stringify({ error: 'db error' }), { status: 500 });
  }
};
