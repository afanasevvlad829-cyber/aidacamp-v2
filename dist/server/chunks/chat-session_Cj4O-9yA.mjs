import pg from 'pg';

const prerender = false;
const DB_URL = process.env.DATABASE_URL;
let _pool = null;
function getPool() {
  if (!_pool && DB_URL) {
    _pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
  }
  return _pool;
}
const GET = async ({ url }) => {
  const id = url.searchParams.get("id");
  if (!id || id.length < 10 || id.length > 100) {
    return new Response(JSON.stringify({ error: "invalid id" }), { status: 400 });
  }
  const pool = getPool();
  if (!pool) {
    return new Response(JSON.stringify({ error: "no db" }), { status: 503 });
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
        headers: { "Content-Type": "application/json" }
      });
    }
    const messages = [];
    for (const row of res.rows) {
      if (row.user_q) messages.push({ role: "user", content: row.user_q });
      if (row.bot_a) messages.push({ role: "assistant", content: row.bot_a });
    }
    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (e) {
    console.error("[chat-session] db error", e);
    return new Response(JSON.stringify({ error: "db error" }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
