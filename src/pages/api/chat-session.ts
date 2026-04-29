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

/** GET /api/chat-session?id=<session_id>
 *  Returns conversation history as [{role, content}] pairs
 */
export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  if (!id || id.length < 10 || id.length > 100) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  }

  const pool = getPool();
  if (!pool) {
    return new Response(JSON.stringify({ error: 'no db' }), { status: 503 });
  }

  try {
    const res = await pool.query(
      `SELECT user_q, bot_a FROM ai_ask_sessions
       WHERE session_id = $1
       ORDER BY ts ASC, id ASC
       LIMIT 30`,
      [id]
    );

    if (res.rows.length === 0) {
      return new Response(JSON.stringify({ messages: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build flat [{role, content}] array
    const messages: { role: string; content: string }[] = [];
    for (const row of res.rows) {
      if (row.user_q) messages.push({ role: 'user', content: row.user_q });
      if (row.bot_a)  messages.push({ role: 'assistant', content: row.bot_a });
    }

    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[chat-session] db error', e);
    return new Response(JSON.stringify({ error: 'db error' }), { status: 500 });
  }
};
