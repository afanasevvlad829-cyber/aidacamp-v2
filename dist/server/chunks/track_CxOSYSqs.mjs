import pg from 'pg';

const prerender = false;
const { Pool } = pg;
let _pool = null;
function getPool() {
  if (!_pool) {
    const url = process.env.DATABASE_URL || undefined                            ;
    if (!url) return null;
    _pool = new Pool({ connectionString: url, max: 3 });
  }
  return _pool;
}
const POST = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (typeof body !== "object" || body === null || typeof body.goal !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "goal required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { goal, params, client_id, url, referrer } = body;
  const safeGoal = String(goal).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!safeGoal) {
    return new Response(JSON.stringify({ ok: false, error: "invalid goal" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const pool = getPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO analytics_events (goal, params, client_id, url, referrer, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          safeGoal,
          params && typeof params === "object" ? JSON.stringify(params) : null,
          client_id ? String(client_id).slice(0, 64) : null,
          url ? String(url).slice(0, 512) : null,
          referrer ? String(referrer).slice(0, 512) : null,
          request.headers.get("user-agent")?.slice(0, 256) ?? null
        ]
      );
    } catch (e) {
      console.error("[track] db error", e);
    }
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
const OPTIONS = () => new Response(null, {
  status: 204,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
});

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  OPTIONS,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
