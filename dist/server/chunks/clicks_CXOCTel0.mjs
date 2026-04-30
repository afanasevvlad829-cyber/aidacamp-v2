import { mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

const prerender = false;
const DATA_DIR = "/var/www/aidacamp-dev/clicks";
const POST = async ({ request }) => {
  try {
    const events = await request.json();
    if (!Array.isArray(events) || events.length === 0) {
      return new Response("[]", { status: 200 });
    }
    const batch = events.slice(0, 50);
    const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    await mkdir(DATA_DIR, { recursive: true });
    const lines = batch.map((e) => JSON.stringify({
      type: e.type,
      path: String(e.path || "").slice(0, 200),
      text: String(e.text || "").slice(0, 80),
      x: Number(e.x) || 0,
      y: Number(e.y) || 0,
      page: String(e.page || "/").slice(0, 100),
      ts: Number(e.ts) || Date.now(),
      vw: Number(e.vw) || 0,
      count: Number(e.count) || 1
    })).join("\n") + "\n";
    await appendFile(join(DATA_DIR, `${date}.jsonl`), lines);
    return new Response("ok", { status: 200 });
  } catch {
    return new Response("err", { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
