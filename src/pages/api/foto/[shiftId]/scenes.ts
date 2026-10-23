export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';
import { getAlbumIdForShift } from '../../../../lib/immich';
import { searchImmichAssets } from '../../../../lib/immichAssets';

const IMMICH_BASE =
  process.env.IMMICH_BASE_URL || import.meta.env.IMMICH_BASE_URL || 'http://127.0.0.1:2283';

const SCENE_KEYS = ['food', 'swimming_pool', 'computer_class', 'football', 'other'] as const;

/**
 * GET /api/foto/:shiftId/scenes — счётчики фото по категориям сцен (теги scene:*
 * в Immich, размечены отдельным пакетным скриптом). Возвращает только категории
 * с count > 0 — если смена ещё не размечена, массив будет пустым (это нормально,
 * фронт в этом случае просто не показывает фильтр).
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

    const tagsRes = await fetchWithTimeout(`${IMMICH_BASE}/api/tags`, { headers: { 'x-api-key': apiKey } });
    if (!tagsRes.ok) return new Response(JSON.stringify({ ok: false, error: 'Immich tags fetch failed' }), { status: 502 });
    const tags: { id: string; name: string }[] = await tagsRes.json();
    const tagByKey = new Map(
      tags.filter((t) => t.name.startsWith('scene:')).map((t) => [t.name.slice('scene:'.length), t.id]),
    );

    const scenes: { key: string; count: number }[] = [];
    for (const key of SCENE_KEYS) {
      const tagId = tagByKey.get(key);
      if (!tagId) continue;
      let count = 0;
      try {
        count = (await searchImmichAssets({ albumIds: [albumId], tagIds: [tagId] })).length;
      } catch {
        continue;
      }
      if (count > 0) scenes.push({ key, count });
    }

    return new Response(JSON.stringify({ ok: true, scenes }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
