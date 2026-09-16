export const prerender = false;
import type { APIRoute } from 'astro';
import { getAlbumIdForShift, getAlbumFaceIndex } from '../../../../lib/immich';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * GET /api/foto/:shiftId/people           — список уже подписанных в Immich детей этой смены
 * GET /api/foto/:shiftId/people?personId= — фото конкретного ребёнка
 */
export const GET: APIRoute = async ({ params, url }) => {
  const shiftId = params.shiftId!;
  try {
    const albumId = await getAlbumIdForShift(shiftId);
    if (!albumId) return json({ ok: false, error: 'Альбом для этой смены не найден в Immich' }, 404);

    const index = await getAlbumFaceIndex(albumId);
    const personId = url.searchParams.get('personId');

    if (!personId) {
      return json({
        ok: true,
        people: index.people.map((p) => ({ id: p.id, name: p.name, count: p.assetIds.length })),
      });
    }

    const person = index.people.find((p) => p.id === personId);
    if (!person) return json({ ok: false, error: 'Ребёнок не найден в этой смене' }, 404);
    return json({ ok: true, name: person.name, assetIds: person.assetIds });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
};
