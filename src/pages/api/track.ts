export const prerender = false;
import type { APIRoute } from 'astro';
import { getPool } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  // CORS preflight handled by Astro automatically
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).goal !== 'string'
  ) {
    return new Response(JSON.stringify({ ok: false, error: 'goal required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { goal, params, client_id, url, referrer } = body as Record<string, unknown>;

  // Санитизация goal — только латиница, цифры, _ и -
  const safeGoal = String(goal).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!safeGoal) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid goal' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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
          params && typeof params === 'object' ? JSON.stringify(params) : null,
          client_id ? String(client_id).slice(0, 64) : null,
          url ? String(url).slice(0, 512) : null,
          referrer ? String(referrer).slice(0, 512) : null,
          request.headers.get('user-agent')?.slice(0, 256) ?? null,
        ],
      );
    } catch (e) {
      // Не блокируем пользователя если БД недоступна
      console.error('[track] db error', e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// OPTIONS для CORS preflight (браузерный fetch с Content-Type: application/json)
export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
