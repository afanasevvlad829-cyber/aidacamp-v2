import { fetchWithTimeout } from './fetchWithTimeout';
import { allShiftsIncludingArchived } from '../data/shifts';

const IMMICH_BASE =
  process.env.IMMICH_BASE_URL || import.meta.env.IMMICH_BASE_URL || 'http://127.0.0.1:2283';

function getApiKey(): string {
  const key = process.env.IMMICH_API_KEY || import.meta.env.IMMICH_API_KEY;
  if (!key) throw new Error('IMMICH_API_KEY not configured');
  return key;
}

function immichHeaders(): Record<string, string> {
  return { 'x-api-key': getApiKey() };
}

/** Имя альбома в Immich собирается владельцем вручную как «Смена N — {год}» (см. спеку). */
export function buildAlbumName(shift: { name: string; startDate: string }): string {
  const year = new Date(shift.startDate).getFullYear();
  return `${shift.name} — ${year}`;
}

interface AlbumCacheEntry {
  id: string | null;
  expiresAt: number;
}
const albumCache = new Map<string, AlbumCacheEntry>();
const ALBUM_TTL_MS = 5 * 60_000;

/** shiftId → id альбома Immich (или null, если смены/альбома нет). Кэш 5 минут. */
export async function getAlbumIdForShift(shiftId: string): Promise<string | null> {
  const cached = albumCache.get(shiftId);
  if (cached && cached.expiresAt > Date.now()) return cached.id;

  const shift = allShiftsIncludingArchived.find((s) => s.id === shiftId);
  if (!shift) {
    albumCache.set(shiftId, { id: null, expiresAt: Date.now() + ALBUM_TTL_MS });
    return null;
  }

  const albumName = buildAlbumName(shift);
  const res = await fetchWithTimeout(`${IMMICH_BASE}/api/albums`, { headers: immichHeaders() });
  if (!res.ok) throw new Error(`Immich albums ${res.status}`);
  const albums: { id: string; albumName: string }[] = await res.json();
  const found = albums.find((a) => a.albumName === albumName);
  const id = found?.id ?? null;
  albumCache.set(shiftId, { id, expiresAt: Date.now() + ALBUM_TTL_MS });
  return id;
}

export interface FaceBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}
export interface NamedPerson {
  id: string;
  name: string;
  assetIds: string[];
}
export interface UnsortedFace {
  assetId: string;
  faceId: string;
  box: FaceBox;
}
export interface FaceIndex {
  people: NamedPerson[];
  unsorted: UnsortedFace[];
}

/** Лицо без привязанного имени — либо не в кластере вообще, либо в кластере без имени. */
export function isUnnamedFace(face: { person: { name?: string } | null }): boolean {
  return !face.person || !face.person.name;
}

/** faceId и personId должны оба реально встречаться в данных ЭТОЙ смены — иначе tag-эндпоинт превратился бы в произвольный IDOR по всей базе Immich. */
export function canTag(index: FaceIndex, faceId: string, personId: string): boolean {
  const faceExists = index.unsorted.some((f) => f.faceId === faceId);
  const personExists = index.people.some((p) => p.id === personId);
  return faceExists && personExists;
}

interface FaceIndexCacheEntry {
  data: FaceIndex;
  expiresAt: number;
}
const faceIndexCache = new Map<string, FaceIndexCacheEntry>();
const FACE_INDEX_TTL_MS = 3 * 60_000;
const FACE_FETCH_CONCURRENCY = 5;

interface RawFace {
  id: string;
  boundingBoxX1: number;
  boundingBoxY1: number;
  boundingBoxX2: number;
  boundingBoxY2: number;
  imageWidth: number;
  imageHeight: number;
  person: { id: string; name: string } | null;
}

/**
 * Строит индекс лиц альбома одним проходом по всем фото (GET /api/faces?id= на каждый asset).
 * Тяжёлая операция на больших альбомах (сотни фото) — поэтому кэшируется на 3 минуты.
 */
export async function getAlbumFaceIndex(albumId: string): Promise<FaceIndex> {
  const cached = faceIndexCache.get(albumId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const albumRes = await fetchWithTimeout(`${IMMICH_BASE}/api/albums/${albumId}`, {
    headers: immichHeaders(),
  });
  if (!albumRes.ok) throw new Error(`Immich album ${albumId}: ${albumRes.status}`);
  const album: { assets: { id: string }[] } = await albumRes.json();

  const peopleMap = new Map<string, NamedPerson>();
  const unsorted: UnsortedFace[] = [];
  const assetIds = album.assets.map((a) => a.id);

  for (let i = 0; i < assetIds.length; i += FACE_FETCH_CONCURRENCY) {
    const batch = assetIds.slice(i, i + FACE_FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(async (assetId) => {
        const facesRes = await fetchWithTimeout(`${IMMICH_BASE}/api/faces?id=${assetId}`, {
          headers: immichHeaders(),
        });
        if (!facesRes.ok) return;
        const faces: RawFace[] = await facesRes.json();
        for (const face of faces) {
          const box: FaceBox = {
            x1: face.boundingBoxX1,
            y1: face.boundingBoxY1,
            x2: face.boundingBoxX2,
            y2: face.boundingBoxY2,
            width: face.imageWidth,
            height: face.imageHeight,
          };
          if (!isUnnamedFace(face)) {
            const existing = peopleMap.get(face.person!.id);
            if (existing) {
              if (!existing.assetIds.includes(assetId)) existing.assetIds.push(assetId);
            } else {
              peopleMap.set(face.person!.id, {
                id: face.person!.id,
                name: face.person!.name,
                assetIds: [assetId],
              });
            }
          } else {
            unsorted.push({ assetId, faceId: face.id, box });
          }
        }
      }),
    );
  }

  const data: FaceIndex = { people: [...peopleMap.values()], unsorted };
  faceIndexCache.set(albumId, { data, expiresAt: Date.now() + FACE_INDEX_TTL_MS });
  return data;
}

/** Сбрасывает кэш индекса после успешного тега — иначе до 3 минут показывали бы устаревшие данные. */
export function invalidateFaceIndex(albumId: string): void {
  faceIndexCache.delete(albumId);
}

/** Переназначает лицо на человека. PUT /api/faces/{faceId} с телом {id: personId}. */
export async function tagFace(faceId: string, personId: string): Promise<void> {
  const res = await fetchWithTimeout(
    `${IMMICH_BASE}/api/faces/${faceId}`,
    {
      method: 'PUT',
      headers: { ...immichHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: personId }),
    },
    15000,
  );
  if (!res.ok) throw new Error(`Immich tag face ${faceId}: ${res.status}`);
}
