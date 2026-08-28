export const prerender = false;
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { fetchWithTimeout } from '../../../../../lib/fetchWithTimeout';
import {
  getAlbumIdForShift,
  getAlbumFaceIndex,
  getBestFaceForPerson,
  computeAvatarCrop,
} from '../../../../../lib/immich';

const IMMICH_BASE =
  process.env.IMMICH_BASE_URL || import.meta.env.IMMICH_BASE_URL || 'http://127.0.0.1:2283';

/**
 * GET /api/foto/:shiftId/avatar/:personId
 * Аватарка ребёнка — сами вырезаем квадрат вокруг самого крупного лица этого
 * человека в альбоме смены, вместо того чтобы доверять выбору превью в Immich.
 */
export const GET: APIRoute = async ({ params }) => {
  const shiftId = params.shiftId!;
  const personId = params.personId!;
  const apiKey = process.env.IMMICH_API_KEY || import.meta.env.IMMICH_API_KEY;
  if (!apiKey) return new Response('IMMICH_API_KEY not configured', { status: 500 });

  const albumId = await getAlbumIdForShift(shiftId);
  if (!albumId) return new Response('Album not found', { status: 404 });

  const index = await getAlbumFaceIndex(albumId);
  const person = index.people.find((p) => p.id === personId);
  if (!person) return new Response('Person not found', { status: 404 });

  const best = getBestFaceForPerson(person);
  if (!best) {
    // Нет ни одного появления на фото (только видео, где box лица не
    // совпадает с кадром нашего превью) — доверяем собственному подбору
    // Immich вместо попытки кропать ненадёжный видео-кадр.
    try {
      const res = await fetchWithTimeout(
        `${IMMICH_BASE}/api/people/${personId}/thumbnail`,
        { headers: { 'x-api-key': apiKey } },
        15000,
      );
      if (!res.ok || !res.body) return new Response('Immich fetch failed', { status: 502 });
      return new Response(res.body, {
        headers: {
          'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=21600',
        },
      });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }

  try {
    const res = await fetchWithTimeout(
      `${IMMICH_BASE}/api/assets/${best.assetId}/thumbnail?size=preview`,
      { headers: { 'x-api-key': apiKey } },
      15000,
    );
    if (!res.ok) throw new Error(`Immich fetch failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) throw new Error('no image metadata');

    const crop = computeAvatarCrop(best.box, meta.width, meta.height);
    const cropped = await sharp(buf)
      .extract({ left: crop.left, top: crop.top, width: crop.size, height: crop.size })
      .resize(200, 200)
      .jpeg({ quality: 82 })
      .toBuffer();

    return new Response(new Uint8Array(cropped), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=21600' },
    });
  } catch {
    try {
      const res = await fetchWithTimeout(
        `${IMMICH_BASE}/api/assets/${best.assetId}/thumbnail?size=preview`,
        { headers: { 'x-api-key': apiKey } },
        15000,
      );
      if (!res.ok || !res.body) return new Response('Immich fetch failed', { status: 502 });
      return new Response(res.body, {
        headers: {
          'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=21600',
        },
      });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }
};
