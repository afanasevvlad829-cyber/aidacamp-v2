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
  assetIds: { id: string; type: 'IMAGE' | 'VIDEO'; box: FaceBox }[];
}
export interface UnsortedAssetGroup {
  assetId: string;
  assetType: 'IMAGE' | 'VIDEO';
  recognizedNames: string[];
  faces: { faceId: string; box: FaceBox }[];
}
export interface FaceIndex {
  people: NamedPerson[];
  unsortedByAsset: UnsortedAssetGroup[];
}

/** Лицо без привязанного имени — либо не в кластере вообще, либо в кластере без имени. */
export function isUnnamedFace(face: { person: { name?: string } | null }): boolean {
  return !face.person || !face.person.name;
}

/** faceId и personId должны оба реально встречаться в данных ЭТОЙ смены — иначе tag-эндпоинт превратился бы в произвольный IDOR по всей базе Immich. */
export function canTag(index: FaceIndex, faceId: string, personId: string): boolean {
  const faceExists = index.unsortedByAsset.some((g) => g.faces.some((f) => f.faceId === faceId));
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
  const album: { assets: { id: string; type: 'IMAGE' | 'VIDEO' }[] } = await albumRes.json();

  const peopleMap = new Map<string, NamedPerson>();
  const groupsMap = new Map<string, UnsortedAssetGroup>();
  const assetTypeMap = new Map<string, 'IMAGE' | 'VIDEO'>();
  for (const a of album.assets) assetTypeMap.set(a.id, a.type);
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
        const assetType = assetTypeMap.get(assetId) ?? 'IMAGE';
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
              if (!existing.assetIds.some((a) => a.id === assetId)) {
                existing.assetIds.push({ id: assetId, type: assetType, box });
              }
            } else {
              peopleMap.set(face.person!.id, {
                id: face.person!.id,
                name: face.person!.name,
                assetIds: [{ id: assetId, type: assetType, box }],
              });
            }
            const group = groupsMap.get(assetId);
            if (group) {
              group.recognizedNames.push(face.person!.name);
            } else {
              groupsMap.set(assetId, { assetId, assetType, recognizedNames: [face.person!.name], faces: [] });
            }
          } else {
            const group = groupsMap.get(assetId);
            if (group) {
              group.faces.push({ faceId: face.id, box });
            } else {
              groupsMap.set(assetId, { assetId, assetType, recognizedNames: [], faces: [{ faceId: face.id, box }] });
            }
          }
        }
      }),
    );
  }

  const unsortedByAsset = [...groupsMap.values()].filter((g) => g.faces.length > 0);
  const data: FaceIndex = { people: [...peopleMap.values()], unsortedByAsset };
  faceIndexCache.set(albumId, { data, expiresAt: Date.now() + FACE_INDEX_TTL_MS });
  return data;
}

/** Сбрасывает кэш индекса после успешного тега — иначе до 3 минут показывали бы устаревшие данные. */
export function invalidateFaceIndex(albumId: string): void {
  faceIndexCache.delete(albumId);
}

/**
 * Переназначает лицо на человека — PUT /api/faces/{personId} с телом {id: faceId}.
 * ⚠️ У Immich {id} в URL — это ID ЧЕЛОВЕКА, а {id} в теле — ID ЛИЦА (см. FaceDto
 * в officialном OpenAPI: "Re-assign the face provided in the body to the person
 * identified by the id in the path parameter"). Перепутанный порядок даёт
 * `400 "Not found or no person.update access"` — не проблема прав API-ключа,
 * просто оба параметра называются "id" и легко перепутать местами. Проверено
 * вживую на проде 2026-08-05.
 */
export async function tagFace(faceId: string, personId: string): Promise<void> {
  const res = await fetchWithTimeout(
    `${IMMICH_BASE}/api/faces/${personId}`,
    {
      method: 'PUT',
      headers: { ...immichHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: faceId }),
    },
    15000,
  );
  if (!res.ok) throw new Error(`Immich tag face ${faceId}: ${res.status}`);
}

function faceBoxArea(box: FaceBox): number {
  const w = box.width > 0 ? box.width : 1;
  const h = box.height > 0 ? box.height : 1;
  return ((box.x2 - box.x1) * (box.y2 - box.y1)) / (w * h);
}

/**
 * Лучшее появление ребёнка для аватарки — где face-box занимает наибольшую
 * площадь кадра (крупный, чёткий, близкий портрет), а не то, что выбрал сам
 * Immich (иногда берёт дальний/размытый кадр).
 */
export function getBestFaceForPerson(
  person: NamedPerson,
): { assetId: string; box: FaceBox } | null {
  if (person.assetIds.length === 0) return null;
  let best = person.assetIds[0];
  let bestArea = faceBoxArea(best.box);
  for (const a of person.assetIds.slice(1)) {
    const area = faceBoxArea(a.box);
    if (area > bestArea) {
      best = a;
      bestArea = area;
    }
  }
  return { assetId: best.id, box: best.box };
}

/**
 * Квадратная область для кропа аватарки вокруг лица, с отступом ×2.2 от
 * большей стороны бокса (влезают волосы/плечи, не только глаза-нос-рот),
 * зажатая в границы imgW×imgH. box в координатах ОРИГИНАЛЬНОЙ картинки
 * (box.width/box.height = полные исходные размеры) — функция сама
 * пересчитывает координаты в пространство переданных imgW/imgH, потому что
 * кропаем чаще всего из уменьшенного Immich-превью, не из оригинала.
 */
export function computeAvatarCrop(
  box: FaceBox,
  imgW: number,
  imgH: number,
): { left: number; top: number; size: number } {
  const scaleX = imgW / box.width;
  const scaleY = imgH / box.height;

  const faceW = (box.x2 - box.x1) * scaleX;
  const faceH = (box.y2 - box.y1) * scaleY;
  const cx = ((box.x1 + box.x2) / 2) * scaleX;
  const cy = ((box.y1 + box.y2) / 2) * scaleY;

  const MARGIN = 2.2;
  const side = Math.max(faceW, faceH) * MARGIN;

  let left = Math.round(cx - side / 2);
  let top = Math.round(cy - side / 2);
  let size = Math.round(side);

  left = Math.max(0, Math.min(left, imgW - 1));
  top = Math.max(0, Math.min(top, imgH - 1));
  size = Math.max(1, Math.min(size, imgW - left, imgH - top));

  return { left, top, size };
}
