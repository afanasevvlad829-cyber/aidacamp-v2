export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';

const IMMICH_BASE =
  process.env.IMMICH_BASE_URL || import.meta.env.IMMICH_BASE_URL || 'http://127.0.0.1:2283';

/**
 * GET /api/foto/image/:id?kind=thumb|original
 * thumb (по умолчанию) — превью фото; original — полный размер.
 * Проксирует байты — IMMICH_API_KEY остаётся на сервере (по образцу src/pages/api/photo.ts).
 */
export const GET: APIRoute = async ({ params, url }) => {
  const id = params.id!;
  const kind = url.searchParams.get('kind') || 'thumb';
  const apiKey = process.env.IMMICH_API_KEY || import.meta.env.IMMICH_API_KEY;
  if (!apiKey) return new Response('IMMICH_API_KEY not configured', { status: 500 });

  const path =
    kind === 'original'
      ? `/api/assets/${id}/original`
      : `/api/assets/${id}/thumbnail?size=preview`;

  try {
    const res = await fetchWithTimeout(
      `${IMMICH_BASE}${path}`,
      { headers: { 'x-api-key': apiKey } },
      15000,
    );
    if (!res.ok || !res.body) return new Response('Immich fetch failed', { status: 502 });
    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };
    if (url.searchParams.get('download') === '1') {
      const ext = contentType.includes('video') ? 'mp4' : contentType.includes('png') ? 'png' : 'jpg';
      headers['Content-Disposition'] = `attachment; filename="foto-${id}.${ext}"`;
    }
    return new Response(res.body, { headers });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
};
