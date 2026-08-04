# Фото по сменам с фильтром по ребёнку — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Публичная страница `/foto/[shiftId]` — родитель выбирает своего ребёнка из списка (уже подписанных в Immich людей) и видит только его фото со смены; плюс раздел «Неразобранные», где можно кликом подписать лицо на нераспознанном фото.

**Architecture:** Astro SSR-страница + 3 backend API-роута, которые проксируют self-hosted Immich (`https://photos.aidacamp.ru`, на том же сервере, что и сайт — доступен по `http://127.0.0.1:2283`). `IMMICH_API_KEY` никогда не покидает бэкенд. Вся логика построения индекса «кто на каких фото» — в одном модуле `src/lib/immich.ts` с in-memory кэшем (TTL), переиспользуемом всеми роутами.

**Tech Stack:** Astro (SSR API routes), vanilla TypeScript, vitest — без новых зависимостей.

**Спека:** [docs/superpowers/specs/2026-08-03-shift-photo-filter-design.md](../specs/2026-08-03-shift-photo-filter-design.md)

## Global Constraints

- Без авторизации — вся страница и все read-роуты открыты (решение владельца, зафиксировано в спеке).
- Страница закрыта от индексации: `noindex={true}` в `Base.astro` + исключение `/foto/` из фильтра sitemap в `astro.config.mjs`.
- `POST .../tag` — публичный write-эндпоинт: rate-limit 20 запросов/минуту с IP (тот же паттерн `Map<ip,{n,reset}>`, что в `src/pages/api/portal/login.ts:12-22`) + серверная проверка, что `faceId`/`personId` реально принадлежат данным этой смены (никакого свободного IDOR по всей базе Immich).
- `IMMICH_API_KEY` читается только на сервере (`process.env` / `import.meta.env`), никогда не попадает в HTML/JS, отдаваемый браузеру — по образцу `YADISK_TOKEN` в `src/pages/api/photo.ts`.
- Никаких новых npm-зависимостей.
- **Контейнер `agent-docker.sh`, в котором это будет реализовываться, не имеет доступа к проду/SSH/секретам Immich** (см. `DEV_PROTOCOL.md` → Правило №1). Это значит: агент может и должен проверять сборку (`npm run build`), типы и юнит-тесты (`npm run test`), но НЕ может дёрнуть живой Immich по HTTP — интеграционная проверка (curl на реальные album/person/face id) выполняется отдельно, после деплоя на dev, владельцем/оператором с SSH-доступом. Это явно отмечено в шагах ниже, а не пропущено молча.

---

### Task 1: `src/lib/immich.ts` — клиент Immich + индекс лиц по альбому

**Files:**
- Create: `src/lib/immich.ts`
- Test: `src/lib/immich.test.ts`

**Interfaces:**
- Produces (используются задачами 2 и 3):
  - `buildAlbumName(shift: { name: string; startDate: string }): string`
  - `getAlbumIdForShift(shiftId: string): Promise<string | null>`
  - `interface FaceBox { x1: number; y1: number; x2: number; y2: number; width: number; height: number }`
  - `interface NamedPerson { id: string; name: string; assetIds: string[] }`
  - `interface UnsortedFace { assetId: string; faceId: string; box: FaceBox }`
  - `interface FaceIndex { people: NamedPerson[]; unsorted: UnsortedFace[] }`
  - `getAlbumFaceIndex(albumId: string): Promise<FaceIndex>`
  - `invalidateFaceIndex(albumId: string): void`
  - `isUnnamedFace(face: { person: { name?: string } | null }): boolean`
  - `canTag(index: FaceIndex, faceId: string, personId: string): boolean`
  - `tagFace(faceId: string, personId: string): Promise<void>`

- [ ] **Step 1: Написать падающий тест для `buildAlbumName`**

Создать `src/lib/immich.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAlbumName, isUnnamedFace, canTag, type FaceIndex } from './immich';

describe('buildAlbumName', () => {
  it('собирает имя альбома из названия смены и года startDate', () => {
    expect(buildAlbumName({ name: 'Смена 3', startDate: '2026-08-03' })).toBe('Смена 3 — 2026');
  });

  it('берёт год именно из startDate, не из текущей даты', () => {
    expect(buildAlbumName({ name: 'Смена 1', startDate: '2025-05-30' })).toBe('Смена 1 — 2025');
  });
});

describe('isUnnamedFace', () => {
  it('true для лица без person вообще', () => {
    expect(isUnnamedFace({ person: null })).toBe(true);
  });

  it('true для лица с person, но без имени (пустой кластер)', () => {
    expect(isUnnamedFace({ person: { name: '' } })).toBe(true);
  });

  it('false для лица с именованным person', () => {
    expect(isUnnamedFace({ person: { name: 'Демид Слекеничс' } })).toBe(false);
  });
});

describe('canTag', () => {
  const index: FaceIndex = {
    people: [{ id: 'person-1', name: 'Демид', assetIds: ['asset-1'] }],
    unsorted: [{ assetId: 'asset-2', faceId: 'face-1', box: { x1: 0, y1: 0, x2: 1, y2: 1, width: 10, height: 10 } }],
  };

  it('true когда faceId и personId оба реально принадлежат этой смене', () => {
    expect(canTag(index, 'face-1', 'person-1')).toBe(true);
  });

  it('false для чужого/несуществующего faceId', () => {
    expect(canTag(index, 'face-does-not-exist', 'person-1')).toBe(false);
  });

  it('false для чужого/несуществующего personId', () => {
    expect(canTag(index, 'face-1', 'person-does-not-exist')).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что падает (модуля ещё нет)**

Run: `npm run test -- src/lib/immich.test.ts`
Expected: FAIL — `Cannot find module './immich'` (файла ещё нет)

- [ ] **Step 3: Написать `src/lib/immich.ts`**

```ts
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

/** Переназначает лицо на человека. Проверено вживую на проде: PUT /api/faces/{faceId} с телом {id: personId}. */
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
```

- [ ] **Step 4: Запустить тест и убедиться, что проходит**

Run: `npm run test -- src/lib/immich.test.ts`
Expected: PASS — все 8 тестов зелёные (2 `buildAlbumName` + 3 `isUnnamedFace` + 3 `canTag`)

- [ ] **Step 5: Typecheck**

Run: `npx astro check` (или `npm run build`, если отдельного typecheck-скрипта нет — см. `package.json`)
Expected: без новых ошибок типов в `src/lib/immich.ts` / `src/lib/immich.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/lib/immich.ts src/lib/immich.test.ts
git commit -m "feat(foto): клиент Immich + индекс лиц по альбому смены"
```

---

### Task 2: `GET /api/foto/[shiftId]/people` — список детей и фото ребёнка

**Files:**
- Create: `src/pages/api/foto/[shiftId]/people.ts`

**Interfaces:**
- Consumes: `getAlbumIdForShift`, `getAlbumFaceIndex` из `src/lib/immich.ts` (Task 1)
- Produces: `GET /api/foto/:shiftId/people` → `{ ok: true, people: {id,name,count}[] }`; `GET /api/foto/:shiftId/people?personId=X` → `{ ok: true, name: string, assetIds: string[] }`

- [ ] **Step 1: Написать роут**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx astro check`
Expected: без новых ошибок в `src/pages/api/foto/[shiftId]/people.ts`

- [ ] **Step 3: Сборка проходит**

Run: `npm run build`
Expected: сборка завершается без ошибок (сам роут не вызовет реальный Immich во время сборки — это SSR-эндпоинт, `prerender = false`)

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/foto/[shiftId]/people.ts
git commit -m "feat(foto): роут списка детей и фото ребёнка по смене"
```

**Проверка на живых данных (НЕ выполняется в контейнере агента — нет доступа к проду/Immich, см. Global Constraints). После деплоя на dev, отдельно, с SSH-доступом:**

```bash
curl -s https://dev.aidacamp.ru/api/foto/shift-3/people | python3 -m json.tool
# Ожидается: {"ok": true, "people": [{"id": "...", "name": "Горшков Пётр", "count": 8}, ...]}
```

---

### Task 3: `GET/POST /api/foto/[shiftId]/unsorted` — неразобранные фото + тег

**Files:**
- Create: `src/pages/api/foto/[shiftId]/unsorted.ts`

**Interfaces:**
- Consumes: `getAlbumIdForShift`, `getAlbumFaceIndex`, `canTag`, `tagFace`, `invalidateFaceIndex` из `src/lib/immich.ts` (Task 1)
- Produces: `GET /api/foto/:shiftId/unsorted` → `{ ok: true, faces: UnsortedFace[], people: {id,name}[] }`; `POST /api/foto/:shiftId/unsorted` `{faceId, personId}` → `{ ok: true }`

- [ ] **Step 1: Написать роут**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx astro check`
Expected: без новых ошибок в `src/pages/api/foto/[shiftId]/unsorted.ts`

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/foto/[shiftId]/unsorted.ts
git commit -m "feat(foto): роут неразобранных фото и тега лица"
```

**Проверка на живых данных (после деплоя на dev, вне контейнера):**

```bash
curl -s https://dev.aidacamp.ru/api/foto/shift-3/unsorted | python3 -m json.tool
# Ожидается: {"ok": true, "faces": [{"assetId": "...", "faceId": "...", "box": {...}}, ...], "people": [...]}

# Тег заведомо чужим faceId/personId (не из ответа выше) должен вернуть 403:
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://dev.aidacamp.ru/api/foto/shift-3/unsorted \
  -H "Content-Type: application/json" -d '{"faceId":"00000000-0000-0000-0000-000000000000","personId":"00000000-0000-0000-0000-000000000000"}'
# Ожидается: 403
```

---

### Task 4: `GET /api/foto/image/[id]` — проксирование байт превью/оригинала

**Files:**
- Create: `src/pages/api/foto/image/[id].ts`

**Interfaces:**
- Consumes: `fetchWithTimeout` из `src/lib/fetchWithTimeout.ts`
- Produces: `GET /api/foto/image/:id?kind=thumb|original` → байты изображения

- [ ] **Step 1: Написать роут (проксирование по образцу `src/pages/api/photo.ts`)**

Immich также отдаёт превью человека через `GET /api/people/{id}/thumbnail` (проверено вживую на проде) — но страница (Task 5) рендерит выбор ребёнка как обычный `<select>` без картинок, так что этот кейс сюда сознательно не добавляем (YAGNI — добавить, когда правда понадобится превью в выпадашке).

```ts
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
    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
};
```

- [ ] **Step 2: Typecheck**

Run: `npx astro check`
Expected: без новых ошибок в `src/pages/api/foto/image/[id].ts`

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/foto/image/[id].ts
git commit -m "feat(foto): проксирование превью/оригинала/аватара из Immich"
```

**Проверка на живых данных (после деплоя, вне контейнера):**

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "https://dev.aidacamp.ru/api/foto/image/<реальный assetId из people.ts>?kind=thumb"
# Ожидается: 200 image/jpeg
```

---

### Task 5: `src/pages/foto/[shiftId].astro` — сама страница

**Files:**
- Create: `src/pages/foto/[shiftId].astro`

**Interfaces:**
- Consumes: `allShiftsIncludingArchived` из `src/data/shifts.ts`; `Base` layout из `src/layouts/Base.astro` (проп `noindex`); API-роуты из Task 2–4
- Produces: страница `/foto/:shiftId`

- [ ] **Step 1: Написать страницу**

```astro
---
export const prerender = false;
import Base from '../../layouts/Base.astro';
import { allShiftsIncludingArchived } from '../../data/shifts';

const { shiftId } = Astro.params;
const shift = allShiftsIncludingArchived.find((s) => s.id === shiftId);
---

<Base
  title={shift ? `Фото — ${shift.name}` : 'Фото смены'}
  description="Фото со смены АйДаКемп"
  noindex={true}
>
  <main id="foto-root" style="max-width:960px;margin:0 auto;padding:24px 16px;" data-shift-id={shiftId}>
    {!shift && <p>Смена не найдена.</p>}
    {shift && (
      <>
        <h1>{shift.name} — фото</h1>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:16px 0;">
          <select id="foto-person-select" style="padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;">
            <option value="">Выбери ребёнка…</option>
          </select>
          <button id="foto-tab-unsorted" type="button" style="padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;">
            Неразобранные
          </button>
        </div>
        <div id="foto-status" style="color:#64748b;font-size:14px;min-height:20px;"></div>
        <div id="foto-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:16px;"></div>
      </>
    )}
  </main>

  <script>
    const root = document.getElementById('foto-root');
    if (root) {
      const shiftId = root.dataset.shiftId;
      const select = document.getElementById('foto-person-select') as HTMLSelectElement;
      const tabUnsorted = document.getElementById('foto-tab-unsorted') as HTMLButtonElement;
      const status = document.getElementById('foto-status')!;
      const grid = document.getElementById('foto-grid')!;

      function setStatus(text: string) {
        status.textContent = text;
      }
      function clearGrid() {
        grid.innerHTML = '';
      }

      function renderPhotoGrid(assetIds: string[]) {
        clearGrid();
        for (const id of assetIds) {
          const img = document.createElement('img');
          img.src = `/api/foto/image/${id}?kind=thumb`;
          img.loading = 'lazy';
          img.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;';
          img.addEventListener('click', () => window.open(`/api/foto/image/${id}?kind=original`, '_blank'));
          grid.appendChild(img);
        }
      }

      async function loadPeople() {
        setStatus('Загружаю список детей…');
        const res = await fetch(`/api/foto/${shiftId}/people`);
        const data = await res.json();
        if (!data.ok) { setStatus(data.error); return; }
        select.innerHTML = '<option value="">Выбери ребёнка…</option>';
        for (const p of data.people as { id: string; name: string; count: number }[]) {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = `${p.name} (${p.count})`;
          select.appendChild(opt);
        }
        setStatus(data.people.length ? '' : 'Пока никто не подписан — загляни в «Неразобранные».');
      }

      async function loadPersonPhotos(personId: string) {
        setStatus('Загружаю фото…');
        const res = await fetch(`/api/foto/${shiftId}/people?personId=${encodeURIComponent(personId)}`);
        const data = await res.json();
        if (!data.ok) { setStatus(data.error); return; }
        setStatus(`${data.name}: ${data.assetIds.length} фото`);
        renderPhotoGrid(data.assetIds);
      }

      async function loadUnsorted() {
        setStatus('Загружаю неразобранные фото…');
        const res = await fetch(`/api/foto/${shiftId}/unsorted`);
        const data = await res.json();
        if (!data.ok) { setStatus(data.error); return; }
        clearGrid();
        setStatus(`Неразобранных лиц: ${data.faces.length}`);
        const people = data.people as { id: string; name: string }[];
        for (const face of data.faces as { assetId: string; faceId: string }[]) {
          const card = document.createElement('div');
          const img = document.createElement('img');
          img.src = `/api/foto/image/${face.assetId}?kind=thumb`;
          img.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;';
          card.appendChild(img);

          const sel = document.createElement('select');
          sel.style.cssText = 'width:100%;margin-top:4px;';
          sel.innerHTML =
            '<option value="">Кто это?</option>' +
            people.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
          sel.addEventListener('change', async () => {
            if (!sel.value) return;
            sel.disabled = true;
            const r = await fetch(`/api/foto/${shiftId}/unsorted`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ faceId: face.faceId, personId: sel.value }),
            });
            const rd = await r.json();
            if (rd.ok) { card.remove(); } else { sel.disabled = false; alert(rd.error); }
          });
          card.appendChild(sel);
          grid.appendChild(card);
        }
      }

      select.addEventListener('change', () => {
        if (select.value) loadPersonPhotos(select.value);
      });
      tabUnsorted.addEventListener('click', loadUnsorted);

      loadPeople();
    }
  </script>
</Base>
```

- [ ] **Step 2: Typecheck**

Run: `npx astro check`
Expected: без новых ошибок в `src/pages/foto/[shiftId].astro`

- [ ] **Step 3: Сборка проходит**

Run: `npm run build`
Expected: сборка завершается без ошибок

- [ ] **Step 4: Commit**

```bash
git add "src/pages/foto/[shiftId].astro"
git commit -m "feat(foto): страница выбора ребёнка и неразобранных фото по смене"
```

---

### Task 6: Закрыть `/foto/` от индексации в sitemap

**Files:**
- Modify: `astro.config.mjs`

**Interfaces:** нет (только конфигурация)

- [ ] **Step 1: Добавить исключение в фильтр sitemap**

В `astro.config.mjs` рядом со строкой `!page.includes('/staff/') && // внутренний конструктор смен, доступ по cookie, noindex` добавить:

```js
        !page.includes('/foto/') && // фото по сменам с фильтром по ребёнку, noindex — см. docs/superpowers/specs/2026-08-03-shift-photo-filter-design.md
```

- [ ] **Step 2: Проверить, что sitemap собирается**

Run: `npm run build`
Expected: сборка проходит, в `dist/sitemap-0.xml` (или аналогичном) не должно быть URL с `/foto/` — можно проверить так:

```bash
grep -c "/foto/" dist/client/sitemap-0.xml 2>/dev/null || echo "0 (ок, файла с /foto/ нет)"
```

Expected output: `0`

- [ ] **Step 3: Commit**

```bash
git add astro.config.mjs
git commit -m "chore(foto): исключить /foto/ из sitemap"
```

---

## После мержа — ручной шаг вне PR (не задача агента)

`IMMICH_API_KEY` сейчас есть только в `/opt/mcp/.env` на проде. Чтобы бэкенд-роуты сайта могли достучаться до Immich, нужно продублировать переменную (и опционально `IMMICH_BASE_URL=http://127.0.0.1:2283`, хотя это и так дефолт) в `.env` самого сайта — на dev и на prod окружениях. Это делает владелец/оператор с доступом к серверу, отдельно от PR: у `agent-docker.sh`-контейнера нет доступа к серверным `.env`-файлам (по дизайну, см. Global Constraints). Без этого шага роуты `/api/foto/*` будут отвечать `500 IMMICH_API_KEY not configured`.
