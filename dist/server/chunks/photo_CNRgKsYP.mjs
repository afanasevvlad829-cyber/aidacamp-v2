import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prerender = false;
let catalogPaths = null;
function loadCatalog() {
  if (catalogPaths) return catalogPaths;
  try {
    const raw = readFileSync(resolve("scripts/photo_catalog.json"), "utf-8");
    catalogPaths = new Set(Object.keys(JSON.parse(raw)));
  } catch {
    catalogPaths = /* @__PURE__ */ new Set();
  }
  return catalogPaths;
}
const GET = async ({ url }) => {
  const token = process.env.YADISK_TOKEN || "y0__xDrw6OaqveAAhjFlkAg5_-HhBfUZZoKKCrkP6i8mkawqMkD7DIuQQ";
  const path = url.searchParams.get("path");
  if (!path) {
    return json({ ok: false, error: "Missing ?path= parameter" }, 400);
  }
  const catalog = loadCatalog();
  if (catalog.size > 0 && !catalog.has(path)) {
    return json({ ok: false, error: "Path not found in catalog" }, 404);
  }
  if (path.includes("..") || !path.startsWith("disk:/")) {
    return json({ ok: false, error: "Invalid path" }, 400);
  }
  const preview = url.searchParams.get("preview") === "1";
  const mode = url.searchParams.get("mode") || "redirect";
  try {
    if (preview) {
      const apiUrl2 = `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}&fields=preview&preview_size=L`;
      const res2 = await fetch(apiUrl2, {
        headers: { Authorization: `OAuth ${token}` }
      });
      if (!res2.ok) {
        return json({ ok: false, error: `Yandex API ${res2.status}` }, res2.status);
      }
      const data2 = await res2.json();
      if (!data2.preview) {
        return json({ ok: false, error: "No preview available" }, 404);
      }
      return Response.redirect(data2.preview, 302);
    }
    const apiUrl = `https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`;
    const res = await fetch(apiUrl, {
      headers: { Authorization: `OAuth ${token}` }
    });
    if (!res.ok) {
      return json({ ok: false, error: `Yandex API ${res.status}` }, res.status);
    }
    const data = await res.json();
    const href = data.href;
    if (!href) {
      return json({ ok: false, error: "No download URL returned" }, 502);
    }
    if (mode === "proxy") {
      const fileRes = await fetch(href);
      if (!fileRes.ok || !fileRes.body) {
        return json({ ok: false, error: "Failed to fetch file" }, 502);
      }
      return new Response(fileRes.body, {
        headers: {
          "Content-Type": fileRes.headers.get("Content-Type") || "image/jpeg",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
    return Response.redirect(href, 302);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
};
const POST = async ({ request }) => {
  const token = process.env.YADISK_TOKEN || "y0__xDrw6OaqveAAhjFlkAg5_-HhBfUZZoKKCrkP6i8mkawqMkD7DIuQQ";
  try {
    const { paths } = await request.json();
    if (!Array.isArray(paths) || paths.length === 0) {
      return json({ ok: false, error: "Missing paths array" }, 400);
    }
    if (paths.length > 20) {
      return json({ ok: false, error: "Max 20 paths per request" }, 400);
    }
    const catalog = loadCatalog();
    const results = {};
    await Promise.all(
      paths.map(async (path) => {
        if (!path.startsWith("disk:/") || path.includes("..")) {
          results[path] = null;
          return;
        }
        if (catalog.size > 0 && !catalog.has(path)) {
          results[path] = null;
          return;
        }
        try {
          const apiUrl = `https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`;
          const res = await fetch(apiUrl, {
            headers: { Authorization: `OAuth ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            results[path] = data.href || null;
          } else {
            results[path] = null;
          }
        } catch {
          results[path] = null;
        }
      })
    );
    return json({ ok: true, results });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
