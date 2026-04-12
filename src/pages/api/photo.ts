export const prerender = false;
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load catalog once at module level for path validation
let catalogPaths: Set<string> | null = null;

function loadCatalog(): Set<string> {
  if (catalogPaths) return catalogPaths;
  try {
    const raw = readFileSync(resolve('scripts/photo_catalog.json'), 'utf-8');
    catalogPaths = new Set(Object.keys(JSON.parse(raw)));
  } catch {
    catalogPaths = new Set();
  }
  return catalogPaths;
}

/**
 * GET /api/photo?path=disk:/Медиа/2024/Фото/...
 *
 * Proxies Yandex Disk download — token stays on server.
 * Optional: ?mode=redirect (302 to temp URL) or ?mode=proxy (default, streams bytes)
 * Optional: ?preview=1 (returns preview image instead of full file)
 */
export const GET: APIRoute = async ({ url }) => {
  const token = process.env.YADISK_TOKEN || import.meta.env.YADISK_TOKEN;
  if (!token) {
    return json({ ok: false, error: 'YADISK_TOKEN not configured' }, 500);
  }

  const path = url.searchParams.get('path');
  if (!path) {
    return json({ ok: false, error: 'Missing ?path= parameter' }, 400);
  }

  // Validate path exists in catalog (prevents arbitrary disk access)
  const catalog = loadCatalog();
  if (catalog.size > 0 && !catalog.has(path)) {
    return json({ ok: false, error: 'Path not found in catalog' }, 404);
  }

  // Reject traversal attempts
  if (path.includes('..') || !path.startsWith('disk:/')) {
    return json({ ok: false, error: 'Invalid path' }, 400);
  }

  const preview = url.searchParams.get('preview') === '1';
  const mode = url.searchParams.get('mode') || 'redirect';

  try {
    if (preview) {
      // Get preview URL
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}&fields=preview&preview_size=L`;
      const res = await fetch(apiUrl, {
        headers: { Authorization: `OAuth ${token}` },
      });
      if (!res.ok) {
        return json({ ok: false, error: `Yandex API ${res.status}` }, res.status);
      }
      const data = await res.json();
      if (!data.preview) {
        return json({ ok: false, error: 'No preview available' }, 404);
      }
      return Response.redirect(data.preview, 302);
    }

    // Get download URL
    const apiUrl = `https://cloud-api.yandex.net/v1/disk/resources/download?path=${encodeURIComponent(path)}`;
    const res = await fetch(apiUrl, {
      headers: { Authorization: `OAuth ${token}` },
    });
    if (!res.ok) {
      return json({ ok: false, error: `Yandex API ${res.status}` }, res.status);
    }
    const data = await res.json();
    const href = data.href;
    if (!href) {
      return json({ ok: false, error: 'No download URL returned' }, 502);
    }

    if (mode === 'proxy') {
      // Stream the file through our server
      const fileRes = await fetch(href);
      if (!fileRes.ok || !fileRes.body) {
        return json({ ok: false, error: 'Failed to fetch file' }, 502);
      }
      return new Response(fileRes.body, {
        headers: {
          'Content-Type': fileRes.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Default: redirect to temporary Yandex URL (~30 min valid)
    return Response.redirect(href, 302);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
};

/**
 * POST /api/photo — batch: get URLs for multiple paths at once
 * Body: { paths: ["disk:/...", "disk:/..."], mode?: "redirect" | "url" }
 * Returns: { ok: true, results: { "disk:/...": "https://..." } }
 */
export const POST: APIRoute = async ({ request }) => {
  const token = process.env.YADISK_TOKEN || import.meta.env.YADISK_TOKEN;
  if (!token) {
    return json({ ok: false, error: 'YADISK_TOKEN not configured' }, 500);
  }

  try {
    const { paths } = await request.json();
    if (!Array.isArray(paths) || paths.length === 0) {
      return json({ ok: false, error: 'Missing paths array' }, 400);
    }
    if (paths.length > 20) {
      return json({ ok: false, error: 'Max 20 paths per request' }, 400);
    }

    const catalog = loadCatalog();
    const results: Record<string, string | null> = {};

    await Promise.all(
      paths.map(async (path: string) => {
        if (!path.startsWith('disk:/') || path.includes('..')) {
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
            headers: { Authorization: `OAuth ${token}` },
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
