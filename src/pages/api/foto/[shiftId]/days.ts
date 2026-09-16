export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';
import { getAlbumIdForShift } from '../../../../lib/immich';

const IMMICH_BASE =
  process.env.IMMICH_BASE_URL || import.meta.env.IMMICH_BASE_URL || 'http://127.0.0.1:2283';

type RawAsset = { fileCreatedAt?: string; fileModifiedAt?: string; createdAt?: string };

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
    const res = await fetchWithTimeout(`${IMMICH_BASE}/api/albums/${albumId}`, {
      headers: { 'x-api-key': apiKey },
    });
    if (!res.ok) return new Response(JSON.stringify({ ok: false, error: 'Immich fetch failed' }), { status: 502 });
    const album: { assets: RawAsset[] } = await res.json();

    const days = new Set<string>();
    for (const a of album.assets) {
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
