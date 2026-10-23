export const prerender = false;
import type { APIRoute } from 'astro';
import { getAlbumIdForShift } from '../../../../lib/immich';
import { getAlbumAssets } from '../../../../lib/immichAssets';

/** YYYY-MM-DD по московскому времени (лагерь в Подмосковье). */
function moscowDateString(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(d);
}

/**
 * GET /api/foto/:shiftId/days — список дат (YYYY-MM-DD, МСК), на которые есть
 * хотя бы один asset в альбоме смены. По убыванию — сначала самые свежие.
 */
export const GET: APIRoute = async ({ params }) => {
  const shiftId = params.shiftId!;
  const apiKey = process.env.IMMICH_API_KEY || import.meta.env.IMMICH_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'IMMICH_API_KEY not configured' }), { status: 500 });
  }
  try {
    const albumId = await getAlbumIdForShift(shiftId);
    if (!albumId) {
      return new Response(JSON.stringify({ ok: false, error: 'Альбом для этой смены не найден в Immich' }), { status: 404 });
    }
    let assets;
    try {
      assets = await getAlbumAssets(albumId);
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Immich fetch failed' }), { status: 502 });
    }
    const days = new Set<string>();
    for (const a of assets) {
      const raw = a.fileCreatedAt ?? a.fileModifiedAt ?? a.createdAt;
      if (raw) days.add(moscowDateString(new Date(raw)));
    }
    const sorted = [...days].sort().reverse();

    return new Response(JSON.stringify({ ok: true, days: sorted }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
