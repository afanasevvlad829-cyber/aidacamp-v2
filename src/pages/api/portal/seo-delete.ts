export const prerender = false;
import type { APIRoute } from 'astro';
import { withDbClient } from '../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.portalRole) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  try {
    const { keyword } = await request.json();
    if (!keyword || typeof keyword !== 'string' || keyword.length > 200) {
      return new Response(JSON.stringify({ error: 'keyword required' }), { status: 400 });
    }
    const result = await withDbClient(async (c) => {
      await c.query('BEGIN');
      try {
        await c.query('DELETE FROM seo_position_snapshots WHERE keyword = $1', [keyword]);
        await c.query('DELETE FROM seo_keywords WHERE keyword = $1', [keyword]);
        await c.query('COMMIT');
      } catch (err) {
        await c.query('ROLLBACK');
        throw err;
      }
      return true;
    });
    if (result === null) {
      return new Response(JSON.stringify({ error: 'db not configured' }), { status: 503 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[seo-delete]', e?.message ?? e);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }
};
