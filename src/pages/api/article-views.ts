export const prerender = false;
import type { APIRoute } from 'astro';
import pg from 'pg';

const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | null = null;
function getPool() {
  if (!_pool) {
    const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
    if (!url) return null;
    _pool = new Pool({ connectionString: url, max: 3 });
  }
  return _pool;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// GET /api/article-views → { slug: views, ... }
// Если БД/таблицы нет — отдаём пустой объект (каталог остаётся на снимке Метрики).
export const GET: APIRoute = async () => {
  const pool = getPool();
  if (!pool) return new Response('{}', { status: 200, headers: JSON_HEADERS });
  try {
    const { rows } = await pool.query('SELECT slug, views FROM article_views');
    const map: Record<string, number> = {};
    for (const r of rows) map[r.slug] = Number(r.views);
    return new Response(JSON.stringify(map), {
      status: 200,
      headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return new Response('{}', { status: 200, headers: JSON_HEADERS });
  }
};

// POST /api/article-views {slug} → инкремент. Дедуп за сессию — на клиенте (sessionStorage).
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid json' }), { status: 400, headers: JSON_HEADERS });
  }

  const raw = (body as Record<string, unknown>)?.slug;
  const slug = String(raw ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 96);
  if (!slug) {
    return new Response(JSON.stringify({ ok: false, error: 'slug required' }), { status: 400, headers: JSON_HEADERS });
  }

  const pool = getPool();
  if (!pool) return new Response(JSON.stringify({ ok: true, views: null }), { status: 200, headers: JSON_HEADERS });

  try {
    const { rows } = await pool.query(
      `INSERT INTO article_views (slug, views, updated_at)
       VALUES ($1, 1, now())
       ON CONFLICT (slug) DO UPDATE SET views = article_views.views + 1, updated_at = now()
       RETURNING views`,
      [slug],
    );
    return new Response(JSON.stringify({ ok: true, views: Number(rows[0]?.views ?? 0) }), { status: 200, headers: JSON_HEADERS });
  } catch (e) {
    console.error('[article-views] db error', e);
    return new Response(JSON.stringify({ ok: false }), { status: 200, headers: JSON_HEADERS });
  }
};

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
