export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';
import { getAlbumIdForShift } from '../../../../lib/immich';

const IMMICH_BASE =
  process.env.IMMICH_BASE_URL || import.meta.env.IMMICH_BASE_URL || 'http://127.0.0.1:2283';

type RawAsset = { id: string; type: 'IMAGE' | 'VIDEO'; fileCreatedAt?: string; fileModifiedAt?: string; createdAt?: string };
type RawAssetWithType = { id: string; type: 'IMAGE' | 'VIDEO'; fileCreatedAt?: string; fileModifiedAt?: string; createdAt?: string };

const BURST_WINDOW_MS = 3000;

/**
 * Группирует подряд снятые (по времени) кадры в «серии» — соседние по времени
 * фото с разницей ≤ BURST_WINDOW_MS считаются одной серией камеры (например,
 * 10 кадров подноса с чаем за долю секунды). Показываем только первый кадр
 * серии, остальные — в `extraIds` (не выбрасываются, просто скрыты за бейджем
 * на фронте — «Скачать всё» по-прежнему включает их все).
 */
function groupBursts(
  assets: { id: string; type: 'IMAGE' | 'VIDEO'; ts: number }[],
): { id: string; type: 'IMAGE' | 'VIDEO'; extraIds?: string[] }[] {
  const sorted = [...assets].sort((a, b) => a.ts - b.ts);
  const result: { id: string; type: 'IMAGE' | 'VIDEO'; extraIds?: string[] }[] = [];
  let lastTs = -Infinity;
  for (const a of sorted) {
    const prev = result[result.length - 1];
    if (prev && a.ts - lastTs <= BURST_WINDOW_MS) {
      prev.extraIds = [...(prev.extraIds ?? []), a.id];
    } else {
      result.push({ id: a.id, type: a.type });
    }
    lastTs = a.ts;
  }
  return result;
}

function toTimedAssets(items: RawAssetWithType[]): { id: string; type: 'IMAGE' | 'VIDEO'; ts: number }[] {
  return items
    .map((a) => {
      const raw = a.fileCreatedAt ?? a.fileModifiedAt ?? a.createdAt;
      const ts = raw ? new Date(raw).getTime() : NaN;
      return { id: a.id, type: a.type, ts };
    })
    .filter((a) => !Number.isNaN(a.ts));
}

async function resolveTagId(apiKey: string, sceneKey: string): Promise<string | null> {
  const res = await fetchWithTimeout(`${IMMICH_BASE}/api/tags`, { headers: { 'x-api-key': apiKey } });
  if (!res.ok) return null;
  const tags: { id: string; name: string }[] = await res.json();
  const tag = tags.find((t) => t.name === `scene:${sceneKey}`);
  return tag?.id ?? null;
}

/** YYYY-MM-DD по московскому времени (лагерь в Подмосковье — сравниваем даты по его локальному дню, не по UTC). */
function moscowDateString(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(d);
}

/**
 * GET /api/foto/:shiftId/all — фото/видео смены, независимо от распознавания лиц.
 * Без параметров — весь альбом. `?date=today` — только сегодняшний день (МСК),
 * `?date=YYYY-MM-DD` — конкретная дата (МСК).
 */
export const GET: APIRoute = async ({ params, url }) => {
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
    const sceneParam = url.searchParams.get('scene');
    if (sceneParam) {
      const tagId = await resolveTagId(apiKey, sceneParam);
      if (!tagId) {
        return new Response(JSON.stringify({ ok: true, assets: [] }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const searchRes = await fetchWithTimeout(`${IMMICH_BASE}/api/search/metadata`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumIds: [albumId], tagIds: [tagId] }),
      });
      if (!searchRes.ok) {
        return new Response(JSON.stringify({ ok: false, error: 'Immich search failed' }), { status: 502 });
      }
      const searchData = await searchRes.json();
      const items: RawAssetWithType[] = searchData.assets?.items ?? [];
      return new Response(
        JSON.stringify({ ok: true, assets: groupBursts(toTimedAssets(items)) }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }
    const res = await fetchWithTimeout(`${IMMICH_BASE}/api/albums/${albumId}`, {
      headers: { 'x-api-key': apiKey },
    });
    if (!res.ok) return new Response(JSON.stringify({ ok: false, error: 'Immich fetch failed' }), { status: 502 });
    const album: { assets: RawAsset[] } = await res.json();

    const dateParam = url.searchParams.get('date');
    let assets = album.assets;
    if (dateParam) {
      const targetDate = dateParam === 'today' ? moscowDateString(new Date()) : dateParam;
      assets = assets.filter((a) => {
        const raw = a.fileCreatedAt ?? a.fileModifiedAt ?? a.createdAt;
        if (!raw) return false;
        return moscowDateString(new Date(raw)) === targetDate;
      });
    }

    return new Response(
      JSON.stringify({ ok: true, assets: groupBursts(toTimedAssets(assets)) }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
