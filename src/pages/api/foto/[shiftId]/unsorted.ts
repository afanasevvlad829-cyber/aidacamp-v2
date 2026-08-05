export const prerender = false;
import type { APIRoute } from 'astro';
import {
  getAlbumIdForShift,
  getAlbumFaceIndex,
  canTag,
  tagFace,
  invalidateFaceIndex,
} from '../../../../lib/immich';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

/** GET /api/foto/:shiftId/unsorted — фото с нераспознанными/неподписанными лицами этой смены. */
export const GET: APIRoute = async ({ params }) => {
  const shiftId = params.shiftId!;
  try {
    const albumId = await getAlbumIdForShift(shiftId);
    if (!albumId) return json({ ok: false, error: 'Альбом для этой смены не найден в Immich' }, 404);

    const index = await getAlbumFaceIndex(albumId);
    return json({
      ok: true,
      faces: index.unsorted,
      people: index.people.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
};

// rate-limit: не более 20 тегов в минуту с IP — эндпоинт публичный, без авторизации
// (тот же паттерн, что в src/pages/api/portal/login.ts)
const attempts = new Map<string, { n: number; reset: number }>();

/** POST /api/foto/:shiftId/unsorted {faceId, personId} — подписывает лицо на ребёнка. */
export const POST: APIRoute = async ({ params, request }) => {
  const shiftId = params.shiftId!;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const a = attempts.get(ip) ?? { n: 0, reset: now + 60_000 };
  if (now > a.reset) { a.n = 0; a.reset = now + 60_000; }
  a.n++;
  attempts.set(ip, a);
  if (a.n > 20) return json({ ok: false, error: 'Слишком много попыток. Подождите минуту.' }, 429);

  try {
    const body = await request.json();
    const faceId = String(body?.faceId ?? '');
    const personId = String(body?.personId ?? '');
    if (!faceId || !personId) return json({ ok: false, error: 'faceId и personId обязательны' }, 400);

    const albumId = await getAlbumIdForShift(shiftId);
    if (!albumId) return json({ ok: false, error: 'Альбом для этой смены не найден в Immich' }, 404);

    const index = await getAlbumFaceIndex(albumId);
    if (!canTag(index, faceId, personId)) {
      return json({ ok: false, error: 'Лицо или ребёнок не принадлежат этой смене' }, 403);
    }

    await tagFace(faceId, personId);
    invalidateFaceIndex(albumId);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
};
