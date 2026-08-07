export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';
import { getAlbumIdForShift } from '../../../../lib/immich';
import { allShiftsIncludingArchived } from '../../../../data/shifts';

const IMMICH_BASE =
  process.env.IMMICH_BASE_URL || import.meta.env.IMMICH_BASE_URL || 'http://127.0.0.1:2283';

/** GET /api/foto/:shiftId/all — все фото/видео смены, независимо от распознавания лиц. */
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
    const album: {
      assets: { id: string; type: 'IMAGE' | 'VIDEO'; localDateTime?: string; fileCreatedAt?: string }[];
    } = await res.json();

    // Дата съёмки нужна странице, чтобы разложить кадры по дням.
    // localDateTime — местное время съёмки, fileCreatedAt — запасной вариант.
    // Порядок ассетов в альбоме Immich не документирован, поэтому сортируем
    // сами: свежее сверху, чтобы текущий день оказался первым.
    // В альбом попадают одиночные кадры, снятые до заезда (тесты камеры и
    // прочее) — родителю они не нужны и ломают список дней отдельными
    // секциями с одним фото. Отсекаем всё раньше даты старта смены.
    const startDate = allShiftsIncludingArchived.find((s) => s.id === shiftId)?.startDate ?? '';

    const assets = album.assets
      .map((a) => {
        const ts = a.localDateTime || a.fileCreatedAt || '';
        return { id: a.id, type: a.type, date: ts.slice(0, 10), ts };
      })
      .filter((a) => !startDate || !a.date || a.date >= startDate)
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .map(({ id, type, date }) => ({ id, type, date }));

    return new Response(
      JSON.stringify({ ok: true, assets }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
