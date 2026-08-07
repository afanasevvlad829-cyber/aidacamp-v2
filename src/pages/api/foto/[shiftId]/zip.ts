export const prerender = false;
import type { APIRoute } from 'astro';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';
import { getAlbumIdForShift } from '../../../../lib/immich';
import { clampIds, safeZipFilename } from '../../../../lib/fotoZip';
import { allShiftsIncludingArchived } from '../../../../data/shifts';

const IMMICH_BASE =
  process.env.IMMICH_BASE_URL || import.meta.env.IMMICH_BASE_URL || 'http://127.0.0.1:2283';

/**
 * POST /api/foto/:shiftId/zip {ids: string[]}
 * Стримит ZIP выбранных фото/видео. Каждый id сверяется с реальным составом
 * альбома этой смены в Immich — id вне альбома молча выбрасывается (тот же
 * принцип, что canTag() в immich.ts: клиентский id не должен позволять
 * скачать чужой альбом по подобранному значению).
 */
export const POST: APIRoute = async ({ params, request }) => {
  const shiftId = params.shiftId!;
  const apiKey = process.env.IMMICH_API_KEY || import.meta.env.IMMICH_API_KEY;
  if (!apiKey) return new Response('IMMICH_API_KEY not configured', { status: 500 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const requestedIds = clampIds((body as { ids?: unknown })?.ids);
  if (!requestedIds.length) return new Response('No ids', { status: 400 });

  const albumId = await getAlbumIdForShift(shiftId);
  if (!albumId) return new Response('Album not found', { status: 404 });

  const albumRes = await fetchWithTimeout(`${IMMICH_BASE}/api/albums/${albumId}`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!albumRes.ok) return new Response('Immich album fetch failed', { status: 502 });
  const album: { assets: { id: string }[] } = await albumRes.json();
  const inAlbum = new Set(album.assets.map((a) => a.id));
  const ids = requestedIds.filter((id) => inAlbum.has(id));
  if (!ids.length) return new Response('No valid ids in this album', { status: 403 });

  const shift = allShiftsIncludingArchived.find((s) => s.id === shiftId);
  const filename = safeZipFilename(shift?.name || shiftId);

  const archive = archiver('zip', { store: true });
  archive.on('warning', () => {});
  archive.on('error', () => {});

  (async () => {
    for (const id of ids) {
      try {
        const res = await fetchWithTimeout(
          `${IMMICH_BASE}/api/assets/${id}/original`,
          { headers: { 'x-api-key': apiKey } },
          20000,
        );
        if (!res.ok || !res.body) continue;
        const contentType = res.headers.get('Content-Type') || '';
        const ext = contentType.includes('video') ? 'mp4' : 'jpg';
        archive.append(Readable.fromWeb(res.body as any), { name: `foto-${id}.${ext}` });
      } catch {
        // пропускаем недоступный файл, архивируем остальные
      }
    }
    archive.finalize();
  })();

  return new Response(Readable.toWeb(archive) as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};
