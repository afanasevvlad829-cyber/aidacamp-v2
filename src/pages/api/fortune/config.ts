export const prerender = false;
import type { APIRoute } from 'astro';
import { getPool } from '../../../lib/db';

/**
 * Рантайм-конфиг колеса фортуны: где включено и на каких условиях.
 * Читается клиентом при каждой загрузке — переключение мгновенное,
 * без пересборки и деплоя (раньше приходилось править nearest в shifts.ts).
 *
 * audience: all | new | returning — кому показывать
 * until_date — после этой даты гаснет само
 * min_free   — включать только когда свободных мест <= N
 */
export const GET: APIRoute = async () => {
  const headers = {
    'Content-Type': 'application/json',
    // короткий кэш: переключение видно почти сразу, но не бьём базу на каждый хит
    'Cache-Control': 'public, max-age=60, s-maxage=60',
  };
  try {
    const res = await getPool()?.query(
      `SELECT shift_id, enabled, audience, until_date, min_free
         FROM fortune_config
        WHERE enabled = true
          AND (until_date IS NULL OR until_date >= CURRENT_DATE)`
    );
    const cfg: Record<string, { audience: string; minFree: number | null }> = {};
    for (const r of res?.rows ?? []) {
      cfg[r.shift_id] = { audience: r.audience ?? 'new', minFree: r.min_free ?? null };
    }
    return new Response(JSON.stringify({ ok: true, shifts: cfg }), { headers });
  } catch (e: any) {
    console.error('[fortune/config] DB error:', e.message);
    // Падать нельзя: при недоступной базе колесо просто не показываем.
    return new Response(JSON.stringify({ ok: false, shifts: {} }), { headers });
  }
};
