export const prerender = false;
import type { APIRoute } from 'astro';
import { runAllScanners } from '../../../../lib/portalPenalty';

/**
 * Cron-endpoint: вызывается раз в 10 минут серверным cron'ом.
 * Защита: X-Cron-Secret = PORTAL_CRON_SECRET из env.
 * Возвращает JSON с количеством созданных штрафов по типам.
 */
export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.PORTAL_CRON_SECRET ?? '';
  const got = request.headers.get('x-cron-secret') ?? '';
  if (!secret || got !== secret) {
    return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }

  const grace = Number(new URL(request.url).searchParams.get('grace') ?? '30');
  const result = await runAllScanners(grace);
  return new Response(JSON.stringify({ ok: true, result, at: new Date().toISOString() }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
