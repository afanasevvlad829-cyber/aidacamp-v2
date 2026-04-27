import { execSync } from 'node:child_process';

const prerender = false;
const POST = async ({ request }) => {
  try {
    const { keyword } = await request.json();
    if (!keyword || typeof keyword !== "string") {
      return new Response(JSON.stringify({ error: "keyword required" }), { status: 400 });
    }
    const safe = keyword.replace(/'/g, "''");
    execSync(`psql -U postgres aidacamp -c "DELETE FROM seo_position_snapshots WHERE keyword = '${safe}'; DELETE FROM seo_keywords WHERE keyword = '${safe}';"`, {
      env: { ...process.env, PGCLIENTENCODING: "UTF8" }
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
