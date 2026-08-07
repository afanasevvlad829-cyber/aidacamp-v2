# Foto Shift Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution reality for THIS plan specifically:** per `DEV_PROTOCOL.md` Правило №1, this feature touches personal data (child photos, CRM enrichment) — every task below is executed by `./scripts/agent-docker.sh "<title>" "<brief>"` (one-shot autonomous `claude -p` inside an isolated container that clones `dev`, implements, commits, pushes, opens a PR), **not** by in-session subagents. Each task's content below is self-contained enough to serve as that container's brief verbatim — a fresh container has zero access to this conversation or to any branch except `dev`. Tasks A–E have no file overlap and no dependency on each other → dispatched as Wave 1 (2 containers at a time per the owner's approved `FORCE_PARALLEL=1`, queued in pairs). Task F depends on A, B, C, D being merged into `dev` first → dispatched alone as Wave 2.

**Goal:** Redesign `/foto/[shiftId]` into a dark, premium photo/video gallery with face-cropped avatars, download/share/ZIP, cookie-remembered selection, and optional CRM visit attribution — while moving the unauthenticated face-tagging tool into `/admin`.

**Architecture:** Six independently-shippable slices. Five self-contained additions/small edits (avatar cropping via `sharp`, ZIP streaming via `archiver`, a shared client-side attribution module, an admin tagging page, an admin link generator) land first; the sixth rewrites the public gallery page to consume all of them.

**Tech Stack:** Astro 6 SSR routes (`export const prerender = false`), `sharp` (already a dependency), `archiver` (new dependency), vanilla TS in `<script>` tags (no framework), Immich REST API via `IMMICH_BASE_URL`/`IMMICH_API_KEY`, vitest for pure-function tests only (never under `src/pages/` — Astro tries to render `.test.ts` as a route and the build fails, see `src/lib/immich.test.ts` for the existing pattern).

## Global Constraints

- Never place a `*.test.ts` file under `src/pages/` — put logic tests next to the `src/lib/*.ts` module they cover instead (`vitest.config.ts` matches `src/**/*.test.ts` everywhere).
- No `@astrojs/partytown`, no UI libraries beyond Bootstrap Icons, no jQuery/lodash, no CSS-in-JS — plain CSS in `<style>` blocks, icons via `<i class="bi bi-*">` from `src/data/icons-manifest.json` only.
- Money/date/price/transfer literals are irrelevant to this feature — none of these tasks touch pricing or shift dates.
- Every new/modified API route returns JSON `{ ok: boolean, ... }` on JSON endpoints (matches `people.ts`/`unsorted.ts`), or raw bytes with explicit `Content-Type` on binary endpoints (matches `image/[id].ts`).
- `IMMICH_BASE_URL`/`IMMICH_API_KEY` are read via `process.env.X || import.meta.env.X` — copy this exact pattern, don't introduce a new config mechanism.
- Design tone: navy-950 (`#0d1a2b`) background, soft-orange (`#ec9b44`) accents only — literal hex values in scoped `<style>`, not Tailwind utility classes (the repo's `--color-primary-*` Tailwind scale is the *hard* orange `#ec7c00` that `DESIGN_SYSTEM.md` explicitly forbids for premium surfaces; `/p/[lid].astro` already establishes the literal-hex pattern for this class of page).
- Commit messages: short, imperative, in the style already in `git log` (e.g. `feat: crop avatar to largest face`).

---

### Task A: Avatar cropping — `immich.ts` + avatar endpoint

**Files:**
- Modify: `src/lib/immich.ts`
- Modify: `src/lib/immich.test.ts`
- Create: `src/pages/api/foto/[shiftId]/avatar/[personId].ts`

**Interfaces:**
- Produces: `getBestFaceForPerson(person: NamedPerson): { assetId: string; box: FaceBox } | null` — picks the appearance with the largest face-box area (most likely a big, clear, close portrait) instead of trusting Immich's own person-thumbnail choice.
- Produces: `computeAvatarCrop(box: FaceBox, imgW: number, imgH: number): { left: number; top: number; size: number }` — pure math, no I/O, unit-testable. `box` coordinates are in the *original* image's pixel space (`box.width`/`box.height` in `FaceBox` are the original image's full dimensions, not the face's own width/height — see existing `positionMarkers()` in the current `src/pages/foto/[shiftId].astro` for confirmation of this convention). `imgW`/`imgH` are the dimensions of whatever image buffer you're about to crop (which may be a smaller Immich "preview" thumbnail, not the original) — the function must scale the box into that buffer's coordinate space internally.
- Produces: `NamedPerson.assetIds` entries now carry `box: FaceBox` (was `{id, type}[]`, becomes `{id, type, box}[]`). This is additive — nothing that currently reads `assetIds` breaks (`people.ts` just serializes whatever shape `assetIds` has).

**Step 1: Extend `NamedPerson` and thread `box` through `getAlbumFaceIndex`**

In `src/lib/immich.ts`, change:
```ts
export interface NamedPerson {
  id: string;
  name: string;
  assetIds: { id: string; type: 'IMAGE' | 'VIDEO' }[];
}
```
to:
```ts
export interface NamedPerson {
  id: string;
  name: string;
  assetIds: { id: string; type: 'IMAGE' | 'VIDEO'; box: FaceBox }[];
}
```

In `getAlbumFaceIndex`, change the block that populates `peopleMap`:
```ts
          if (!isUnnamedFace(face)) {
            const existing = peopleMap.get(face.person!.id);
            if (existing) {
              if (!existing.assetIds.some((a) => a.id === assetId)) {
                existing.assetIds.push({ id: assetId, type: assetType });
              }
            } else {
              peopleMap.set(face.person!.id, {
                id: face.person!.id,
                name: face.person!.name,
                assetIds: [{ id: assetId, type: assetType }],
              });
            }
```
to:
```ts
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
```

**Step 2: Add `getBestFaceForPerson` and `computeAvatarCrop`**

Append to `src/lib/immich.ts`:
```ts
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
 * зажатая в границы `imgW`×`imgH`. `box` в координатах ОРИГИНАЛЬНОЙ картинки
 * (box.width/box.height = полные исходные размеры) — эта функция сама
 * пересчитывает координаты в пространство переданных `imgW`/`imgH`, потому
 * что кропаем чаще всего из уменьшенного Immich-превью, не из оригинала.
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
```

**Step 3: Write tests**

Append to `src/lib/immich.test.ts` (the existing `canTag` test's `index` literal needs a `box` field added to its `assetIds` entry too, or `tsc`/`astro check` will fail on the missing required field):

```ts
import { describe, it, expect } from 'vitest';
import {
  buildAlbumName,
  isUnnamedFace,
  canTag,
  getBestFaceForPerson,
  computeAvatarCrop,
  type FaceIndex,
  type NamedPerson,
} from './immich';

// ... (keep existing buildAlbumName / isUnnamedFace describe blocks unchanged) ...

describe('canTag', () => {
  const index: FaceIndex = {
    people: [{
      id: 'person-1', name: 'Демид',
      assetIds: [{ id: 'asset-1', type: 'IMAGE', box: { x1: 0, y1: 0, x2: 1, y2: 1, width: 10, height: 10 } }],
    }],
    unsortedByAsset: [{
      assetId: 'asset-2', assetType: 'IMAGE', recognizedNames: [],
      faces: [{ faceId: 'face-1', box: { x1: 0, y1: 0, x2: 1, y2: 1, width: 10, height: 10 } }],
    }],
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

describe('getBestFaceForPerson', () => {
  it('null для человека без единого появления', () => {
    const person: NamedPerson = { id: 'p1', name: 'Никто', assetIds: [] };
    expect(getBestFaceForPerson(person)).toBeNull();
  });

  it('выбирает появление с самым большим относительным face-box', () => {
    const person: NamedPerson = {
      id: 'p1',
      name: 'Демид',
      assetIds: [
        { id: 'small', type: 'IMAGE', box: { x1: 0, y1: 0, x2: 50, y2: 50, width: 1000, height: 1000 } },
        { id: 'big', type: 'IMAGE', box: { x1: 0, y1: 0, x2: 400, y2: 400, width: 1000, height: 1000 } },
        { id: 'medium', type: 'IMAGE', box: { x1: 0, y1: 0, x2: 200, y2: 200, width: 1000, height: 1000 } },
      ],
    };
    expect(getBestFaceForPerson(person)).toEqual({
      assetId: 'big',
      box: { x1: 0, y1: 0, x2: 400, y2: 400, width: 1000, height: 1000 },
    });
  });

  it('единственное появление — оно и лучшее', () => {
    const box = { x1: 10, y1: 10, x2: 90, y2: 90, width: 500, height: 500 };
    const person: NamedPerson = { id: 'p1', name: 'Один', assetIds: [{ id: 'only', type: 'IMAGE', box }] };
    expect(getBestFaceForPerson(person)).toEqual({ assetId: 'only', box });
  });
});

describe('computeAvatarCrop', () => {
  it('центрирует квадрат вокруг лица с отступом ×2.2, без пересчёта масштаба (imgW/imgH = box.width/height)', () => {
    // Лицо 100×100 в центре кадра 1000×1000 → side = 100*2.2 = 220, left/top = (1000-220)/2 = 390
    const box = { x1: 450, y1: 450, x2: 550, y2: 550, width: 1000, height: 1000 };
    const crop = computeAvatarCrop(box, 1000, 1000);
    expect(crop).toEqual({ left: 390, top: 390, size: 220 });
  });

  it('масштабирует box, когда imgW/imgH меньше оригинала (кроп из превью)', () => {
    // Оригинал 2000×2000, превью в 2 раза меньше (1000×1000) — лицо и центр должны уменьшиться вдвое
    const box = { x1: 900, y1: 900, x2: 1100, y2: 1100, width: 2000, height: 2000 };
    const crop = computeAvatarCrop(box, 1000, 1000);
    // faceW=faceH=100 (200*0.5), side=220, центр (500,500) → left/top = 500-110=390
    expect(crop).toEqual({ left: 390, top: 390, size: 220 });
  });

  it('зажимает область в границы картинки, когда лицо у самого края', () => {
    const box = { x1: 0, y1: 0, x2: 40, y2: 40, width: 200, height: 200 };
    const crop = computeAvatarCrop(box, 200, 200);
    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeGreaterThanOrEqual(0);
    expect(crop.left + crop.size).toBeLessThanOrEqual(200);
    expect(crop.top + crop.size).toBeLessThanOrEqual(200);
  });
});
```

**Step 4: Run tests**

```bash
npx vitest run src/lib/immich.test.ts
```
Expected: all tests pass (existing + new).

**Step 5: Avatar endpoint**

Create `src/pages/api/foto/[shiftId]/avatar/[personId].ts`:
```ts
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
 * человека в альбоме смены, вместо того чтобы доверять выбору превью в Immich
 * (иногда берёт дальний/размытый кадр — см. дизайн-спеку).
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
  if (!best) return new Response('No faces for this person', { status: 404 });

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

    return new Response(cropped, {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=21600' },
    });
  } catch {
    // Фолбэк — обычный превью без кропа лица (на фронте показывается object-fit:cover по центру).
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
```

**Step 6: Manual verification**

```bash
npm run dev
# в другом терминале, с реальным shiftId/personId из твоего Immich:
curl -sI "http://localhost:4321/api/foto/shift-3/avatar/<personId>" | head -5
```
Expected: `HTTP/1.1 200`, `content-type: image/jpeg`, `cache-control: public, max-age=21600`.

**Step 7: Commit**

```bash
git add src/lib/immich.ts src/lib/immich.test.ts src/pages/api/foto/[shiftId]/avatar/[personId].ts
git commit -m "feat: crop avatar to the person's largest face instead of trusting Immich's pick"
```

---

### Task B: Download + ZIP endpoints

**Files:**
- Modify: `src/pages/api/foto/image/[id].ts`
- Create: `src/lib/fotoZip.ts`
- Create: `src/lib/fotoZip.test.ts`
- Create: `src/pages/api/foto/[shiftId]/zip.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `clampIds(raw: unknown, max = 300): string[]` — validates a request body's `ids` field down to a deduped list of strings, capped at `max`. Pure, no I/O.
- Produces: `safeZipFilename(shiftName: string): string` — sanitizes a shift name into a safe `Content-Disposition` filename.
- Produces: `GET /api/foto/image/:id?kind=original&download=1` — same bytes as today, plus `Content-Disposition: attachment` when `download=1`.
- Produces: `POST /api/foto/:shiftId/zip` with body `{ ids: string[] }` → streams `application/zip`, `Content-Disposition: attachment; filename="<shift>.zip"`. Only ids that actually belong to the shift's Immich album are included (server-side membership check — a client-supplied id outside the album is silently dropped, mirroring how `canTag()` already guards `unsorted.ts`).

**Step 1: Add the `archiver` dependency**

```bash
npm install archiver@^7 --save
npm install @types/archiver@^6 --save-dev
```
Expected: `package.json` gains `"archiver": "^7.x.x"` under `dependencies` and `"@types/archiver": "^6.x.x"` under `devDependencies`; `package-lock.json` updates.

**Step 2: Write the failing tests**

Create `src/lib/fotoZip.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { clampIds, safeZipFilename } from './fotoZip';

describe('clampIds', () => {
  it('не массив → пусто', () => {
    expect(clampIds('not-an-array')).toEqual([]);
    expect(clampIds(null)).toEqual([]);
    expect(clampIds(undefined)).toEqual([]);
  });

  it('фильтрует не-строки и пустые строки', () => {
    expect(clampIds(['a', 1, null, '', 'b', {}])).toEqual(['a', 'b']);
  });

  it('убирает дубли, сохраняя порядок первого появления', () => {
    expect(clampIds(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('зажимает в max, по умолчанию 300', () => {
    const many = Array.from({ length: 400 }, (_, i) => `id-${i}`);
    expect(clampIds(many)).toHaveLength(300);
    expect(clampIds(many, 5)).toHaveLength(5);
  });
});

describe('safeZipFilename', () => {
  it('оставляет буквы/цифры/пробелы/точки/дефисы, добавляет .zip', () => {
    expect(safeZipFilename('Смена 3')).toBe('Смена 3.zip');
  });

  it('вырезает опасные для заголовка символы', () => {
    expect(safeZipFilename('Смена "3" / test?')).toBe('Смена 3  test.zip');
  });

  it('пустое имя после очистки → фолбэк foto.zip', () => {
    expect(safeZipFilename('"""')).toBe('foto.zip');
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
npx vitest run src/lib/fotoZip.test.ts
```
Expected: FAIL — `Cannot find module './fotoZip'`.

**Step 4: Implement `src/lib/fotoZip.ts`**

```ts
/** Достаём валидные строковые id из тела запроса — без дублей, максимум `max` штук (граница доверия входа). */
export function clampIds(raw: unknown, max = 300): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string' || !v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/** Имя файла для Content-Disposition — буквы (включая кириллицу)/цифры/пробелы/точки/дефисы, остальное вырезаем. */
export function safeZipFilename(shiftName: string): string {
  const cleaned = shiftName.replace(/[^\p{L}\p{N} .-]/gu, '').trim();
  return (cleaned || 'foto') + '.zip';
}
```

**Step 5: Run tests to verify they pass**

```bash
npx vitest run src/lib/fotoZip.test.ts
```
Expected: PASS, all tests green.

**Step 6: Add `download=1` to the existing image proxy**

In `src/pages/api/foto/image/[id].ts`, replace:
```ts
    if (!res.ok || !res.body) return new Response('Immich fetch failed', { status: 502 });
    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
```
with:
```ts
    if (!res.ok || !res.body) return new Response('Immich fetch failed', { status: 502 });
    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };
    if (url.searchParams.get('download') === '1') {
      const ext = contentType.includes('video') ? 'mp4' : contentType.includes('png') ? 'png' : 'jpg';
      headers['Content-Disposition'] = `attachment; filename="foto-${id}.${ext}"`;
    }
    return new Response(res.body, { headers });
```

**Step 7: ZIP endpoint**

Create `src/pages/api/foto/[shiftId]/zip.ts`:
```ts
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
```

**Step 8: Manual verification**

```bash
npm run dev
curl -s -X POST "http://localhost:4321/api/foto/shift-3/zip" \
  -H "Content-Type: application/json" \
  -d '{"ids":["<real-asset-id-from-this-albums>"]}' \
  -o /tmp/test-foto.zip
unzip -l /tmp/test-foto.zip
```
Expected: a valid zip listing containing one `foto-<id>.jpg` (or `.mp4`) entry.

**Step 9: Run the full test suite + astro check**

```bash
npx vitest run
npm run check:astro
```
Expected: all green, no type errors.

**Step 10: Commit**

```bash
git add src/lib/fotoZip.ts src/lib/fotoZip.test.ts src/pages/api/foto/image/[id].ts src/pages/api/foto/[shiftId]/zip.ts package.json package-lock.json
git commit -m "feat: add single-file download and ZIP endpoints for foto gallery"
```

---

### Task C: Shared attribution module + `/p/[lid].astro` refactor

**Files:**
- Create: `src/lib/attribution/collectAndBind.ts`
- Modify: `src/pages/p/[lid].astro`

**Interfaces:**
- Produces: `collectClientData(): ClientData` — browser-only, reads `document.referrer`/URL UTM params/screen/lang/timezone/`_ym_uid`/`_ym_d`/`vk_top_vid`/`ubtcuid`/Snowplow domain_userid cookies.
- Produces: `interface BindContext { lid: number; t: string; isPreview: boolean; isManagerBrowser: boolean; storageKey: string }`.
- Produces: `bindCid(cid: string, ctx: BindContext): void` — POSTs to `/api/bind-lead` (unchanged contract — `{lid, t, ym_client_id, is_manager, ...collectClientData()}`), sessionStorage-dedupes per `ctx.storageKey` (skipped entirely for manager browsers).
- Produces: `scheduleBind(ctx: BindContext, ymCounterId: number): void` — waits for Metrika (`window.ym`), retries at 1.5s/4.5s, no-ops when `ctx.isPreview`.
- Consumed by: Task F (`/foto/[shiftId].astro`) will `import { scheduleBind } from '../../lib/attribution/collectAndBind'`.

**Step 1: Write the module**

Create `src/lib/attribution/collectAndBind.ts`:
```ts
declare global {
  interface Window {
    Snowplow?: { getTrackerCf?: () => { getDomainUserId?: () => string } };
    ym?: (...args: unknown[]) => void;
  }
}

export interface ClientData {
  referrer?: string;
  utm?: Record<string, string>;
  screen_w?: number;
  screen_h?: number;
  lang?: string;
  tz?: string;
  ym_uid_cookie?: string;
  ym_first_visit?: string;
  vk_vid?: string;
  ubtcuid?: string;
  domain_userid?: string;
}

/** Собираем максимум атрибуции о браузере клиента — реферер, UTM, экран, таймзона, куки Метрики/VK/Andata. */
export function collectClientData(): ClientData {
  const data: ClientData = {};
  try {
    data.referrer = document.referrer || '';
    const sp = new URLSearchParams(location.search);
    const utm: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      if (sp.has(k)) utm[k] = sp.get(k)!;
    }
    if (Object.keys(utm).length) data.utm = utm;

    if (window.screen) {
      data.screen_w = window.screen.width;
      data.screen_h = window.screen.height;
    }
    data.lang = navigator.language || '';

    try {
      data.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      /* noop */
    }

    const ymUidMatch = document.cookie.match(/(?:^|;\s*)_ym_uid=([^;]+)/);
    if (ymUidMatch) data.ym_uid_cookie = ymUidMatch[1];
    const ymDMatch = document.cookie.match(/(?:^|;\s*)_ym_d=([^;]+)/);
    if (ymDMatch) {
      const ts = parseInt(ymDMatch[1], 10);
      if (ts > 1000000000) data.ym_first_visit = new Date(ts * 1000).toISOString().slice(0, 10);
    }

    const vkMatch = document.cookie.match(/(?:^|;\s*)vk_top_vid=([^;]+)/);
    if (vkMatch) data.vk_vid = vkMatch[1];

    const ubtMatch = document.cookie.match(/(?:^|;\s*)ubtcuid=([^;]+)/);
    if (ubtMatch) data.ubtcuid = decodeURIComponent(ubtMatch[1]);
    try {
      const did = window.Snowplow?.getTrackerCf?.()?.getDomainUserId?.();
      if (did) data.domain_userid = String(did);
    } catch {
      /* noop */
    }
    if (!data.domain_userid) {
      const spId = document.cookie
        .split(';')
        .map((s) => s.trim())
        .find((s) => s.indexOf('_sp_id.') === 0);
      if (spId) data.domain_userid = spId.slice(spId.indexOf('=') + 1).split('.')[0] || '';
    }
  } catch {
    /* noop */
  }
  return data;
}

export interface BindContext {
  lid: number;
  t: string;
  isPreview: boolean;
  isManagerBrowser: boolean;
  /** sessionStorage-ключ дедупликации, напр. 'pm_bound_' + lid или 'foto_bound_' + shiftId + '_' + lid */
  storageKey: string;
}

/** Отправляет ym_client_id + собранную атрибуцию на /api/bind-lead. Менеджерские визиты логируются, но не дедупятся в sessionStorage. */
export function bindCid(cid: string, ctx: BindContext): void {
  if (!cid) return;
  if (!ctx.isManagerBrowser && sessionStorage.getItem(ctx.storageKey) === cid) return;
  const extra = collectClientData();
  fetch('/api/bind-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lid: ctx.lid,
      t: ctx.t,
      ym_client_id: String(cid),
      is_manager: ctx.isManagerBrowser,
      ...extra,
    }),
  })
    .then((r) => r.json())
    .then((j) => {
      if (j && j.ok && !ctx.isManagerBrowser) sessionStorage.setItem(ctx.storageKey, cid);
    })
    .catch(() => {});
}

/** Метрика грузится асинхронно — 2 попытки биндинга с задержкой. Ничего не делает в preview. */
export function scheduleBind(ctx: BindContext, ymCounterId: number): void {
  if (ctx.isPreview) return;
  const tryBind = () => {
    try {
      if (window.ym) {
        window.ym(ymCounterId, 'getClientID', (cid: string) => bindCid(cid, ctx));
      }
      const m = document.cookie.match(/(?:^|;\s*)_ym_uid=([^;]+)/);
      if (m && m[1]) setTimeout(() => bindCid(m[1], ctx), 1500);
    } catch {
      /* noop */
    }
  };
  setTimeout(tryBind, 1500);
  setTimeout(tryBind, 4500);
}
```

**Step 2: Wire `/p/[lid].astro` to the module**

In `src/pages/p/[lid].astro`, the `<body>` tag currently opens as `<body>`. Change it to carry the SSR values as data attributes (a plain `<script type="module">` cannot receive Astro's `define:vars` — that directive forces inline, unbundled mode):
```html
<body data-lid={lidNum} data-t={t_safe} data-preview={isPreview ? '1' : '0'}>
```

Inside the big `<script is:inline define:vars={{ lid: lidNum, t: t_safe, total: totalItems, isPreview }}>` block, delete the attribution-specific code — the `isManagerBrowser` const, the `collectClientData` function, the `bindCid` function, the `tryBind` function, and the final:
```js
  // Метрика грузится async — подождём 1.5с. В preview-режиме не биндим.
  if (!isPreview) {
    setTimeout(tryBind, 1500);
    setTimeout(tryBind, 4500);
  }
```
(everything from the `// ====== bind ClientID к CRM ======` comment down through that `if (!isPreview) {...}` block). Leave the rest of that script (checklist state, confetti, toast, PWA instructions, video popup, info modal) untouched.

Immediately after that `</script>` closing tag (still inside `<body>`, before `</body>`), add a second script tag that imports the module:
```html
<script>
  import { scheduleBind } from '../../lib/attribution/collectAndBind';

  const lid = Number(document.body.dataset.lid);
  const t = document.body.dataset.t || '';
  const isPreview = document.body.dataset.preview === '1';
  const isManagerBrowser = (() => {
    try {
      return localStorage.getItem('aidacamp_is_manager') === '1';
    } catch {
      return false;
    }
  })();

  scheduleBind({ lid, t, isPreview, isManagerBrowser, storageKey: 'pm_bound_' + lid }, 96499295);
</script>
```

**Step 3: Manual verification**

```bash
npm run dev
```
Open `http://localhost:4321/p/preview` in a browser, open devtools Network tab, wait ~2s. Expected: a request to `/api/bind-lead` fires (or doesn't, if `window.ym` never loads in dev without the real Metrika tag — either way there must be no console errors from the page, and the checklist/confetti/PWA-instructions must still work exactly as before). Click checklist items, confirm progress bar still updates — this proves the untouched part of the script wasn't broken by the split.

**Step 4: Commit**

```bash
git add src/lib/attribution/collectAndBind.ts src/pages/p/[lid].astro
git commit -m "refactor: extract CRM attribution binding into a shared module"
```

---

### Task D: Move face-tagging into `/admin`

**Files:**
- Create: `src/pages/admin/gallery-tagging/[shiftId].astro`

**Interfaces:**
- Consumes (unchanged): `GET /api/foto/:shiftId/unsorted` → `{ok:true, groups: UnsortedAssetGroup[], people: {id,name}[]}`; `POST /api/foto/:shiftId/unsorted {faceId, personId}` → `{ok:true}` or `{ok:false, error}`.
- Consumes: same `ADMIN_KEY` gate pattern as `src/pages/admin/p-link.astro` (`?key=` or `x-admin-key` header).

**Step 1: Write the page**

Create `src/pages/admin/gallery-tagging/[shiftId].astro`. This moves the current "Неразобранные" tab's markup, styles, and script from `src/pages/foto/[shiftId].astro` verbatim (marker positioning math, face-list UI, `POST .../unsorted` wiring) behind an admin key gate, replacing the click-to-open-lightbox behavior (not needed for a tagging tool — a plain new-tab link to the original is enough) and adding a lightweight shift picker at the top:

```astro
---
export const prerender = false;
import { allShiftsIncludingArchived } from '../../../data/shifts';

const adminKey = process.env.ADMIN_KEY || '';
const provided = Astro.url.searchParams.get('key') || Astro.request.headers.get('x-admin-key') || '';
if (!adminKey || provided !== adminKey) {
  return new Response('Forbidden', { status: 403 });
}

const { shiftId } = Astro.params;
const shift = allShiftsIncludingArchived.find((s) => s.id === shiftId);
---
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>Разметка лиц — {shift ? shift.name : shiftId} — admin</title>
<link rel="stylesheet" href="/styles/icons.css" />
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:20px 16px 60px;font-family:'Inter',-apple-system,sans-serif;background:#f7f5f0;color:#0d1a2b}
  .wrap{max-width:720px;margin:0 auto}
  h1{font-size:20px;margin:0 0 6px;font-weight:900}
  .shift-nav{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px}
  .shift-nav a{font-size:12px;padding:5px 10px;border-radius:8px;background:#fff;border:1px solid #ebe7d8;text-decoration:none;color:#5e6878;font-weight:600}
  .shift-nav a.is-current{background:#0d1a2b;color:#fff;border-color:#0d1a2b}
  #status{color:#64748b;font-size:14px;min-height:20px;margin-bottom:12px}
  #grid{display:grid;grid-template-columns:1fr;gap:14px}

  .foto-unsorted-group{background:#fff;border:1px solid #ebe7d8;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}
  .foto-unsorted-thumb-wrap{position:relative;display:block}
  .foto-unsorted-thumb{width:100%;max-height:420px;object-fit:contain;border-radius:8px;display:block;background:#111}
  .foto-original-link{font-size:12px;color:#5e6878;text-decoration:none;font-weight:600}
  .foto-original-link:hover{text-decoration:underline}
  .foto-recognized-names{font-size:13px;color:#475569}
  .foto-face-marker{position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;pointer-events:none;line-height:1}
  .foto-face-marker::after{content:'';position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #fff}
  .foto-face-marker::before{content:'';position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid rgba(0,0,0,.65);z-index:-1}
  .foto-face-list{display:flex;flex-direction:column;gap:6px}
  .foto-face-list-item{display:flex;align-items:center;gap:8px;font-size:14px}
  .foto-face-list-item select{padding:4px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Разметка лиц {shift ? `— ${shift.name}` : ''}</h1>
  <div class="shift-nav">
    {allShiftsIncludingArchived.map((s) => (
      <a href={`/admin/gallery-tagging/${s.id}?key=${provided}`} class={s.id === shiftId ? 'is-current' : ''}>{s.name}</a>
    ))}
  </div>
  {!shift && <p>Смена не найдена.</p>}
  <div id="status"></div>
  <div id="grid"></div>
</div>

<script define:vars={{ shiftId }}>
  const status = document.getElementById('status');
  const grid = document.getElementById('grid');

  function setStatus(text) { status.textContent = text; }

  async function loadUnsorted() {
    setStatus('Загружаю неразобранные фото…');
    const res = await fetch(`/api/foto/${shiftId}/unsorted`);
    const data = await res.json();
    if (!data.ok) { setStatus(data.error); return; }
    grid.innerHTML = '';
    const groups = data.groups;
    const people = data.people;
    const totalFaces = groups.reduce((n, g) => n + g.faces.length, 0);
    setStatus(`Неразобранных лиц: ${totalFaces} на ${groups.length} фото`);

    const peopleOptions = '<option value="">Кто это?</option>' +
      people.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

    for (const group of groups) {
      const card = document.createElement('div');
      card.className = 'foto-unsorted-group';

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'foto-unsorted-thumb-wrap';
      const thumbImg = document.createElement('img');
      thumbImg.src = `/api/foto/image/${group.assetId}?kind=thumb`;
      thumbImg.className = 'foto-unsorted-thumb';
      thumbImg.alt = '';
      thumbWrap.appendChild(thumbImg);
      card.appendChild(thumbWrap);

      const original = document.createElement('a');
      original.className = 'foto-original-link';
      original.href = `/api/foto/image/${group.assetId}?kind=original`;
      original.target = '_blank';
      original.rel = 'noopener';
      original.textContent = 'Открыть оригинал в новой вкладке';
      card.appendChild(original);

      if (group.recognizedNames.length > 0) {
        const names = document.createElement('div');
        names.className = 'foto-recognized-names';
        names.textContent = `Уже опознаны: ${group.recognizedNames.join(', ')}`;
        card.appendChild(names);
      }

      const faceList = document.createElement('div');
      faceList.className = 'foto-face-list';
      card.appendChild(faceList);

      const markers = [];

      for (let i = 0; i < group.faces.length; i++) {
        const face = group.faces[i];

        const marker = document.createElement('div');
        marker.className = 'foto-face-marker';
        marker.textContent = String(i + 1);
        marker.style.visibility = 'hidden';
        thumbWrap.appendChild(marker);
        markers.push(marker);

        const listItem = document.createElement('div');
        listItem.className = 'foto-face-list-item';

        const label = document.createElement('span');
        label.textContent = `${i + 1})`;
        listItem.appendChild(label);

        const sel = document.createElement('select');
        sel.innerHTML = peopleOptions;
        sel.addEventListener('change', async () => {
          if (!sel.value) return;
          sel.disabled = true;
          const r = await fetch(`/api/foto/${shiftId}/unsorted`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ faceId: face.faceId, personId: sel.value }),
          });
          const rd = await r.json();
          if (rd.ok) {
            marker.remove();
            listItem.remove();
            if (faceList.childElementCount === 0) card.remove();
          } else {
            sel.disabled = false;
            alert(rd.error);
          }
        });
        listItem.appendChild(sel);
        faceList.appendChild(listItem);
      }

      function positionMarkers() {
        if (!thumbImg.naturalWidth) return;
        const containerW = thumbWrap.clientWidth;
        const containerH = thumbWrap.clientHeight;
        if (!containerW || !containerH) return;
        const imgAspect = thumbImg.naturalWidth / thumbImg.naturalHeight;
        const containerAspect = containerW / containerH;
        let renderedW, renderedH, offsetX, offsetY;
        if (imgAspect > containerAspect) {
          renderedW = containerW; renderedH = containerW / imgAspect;
          offsetX = 0; offsetY = (containerH - renderedH) / 2;
        } else {
          renderedH = containerH; renderedW = containerH * imgAspect;
          offsetY = 0; offsetX = (containerW - renderedW) / 2;
        }
        for (let j = 0; j < group.faces.length; j++) {
          const m = markers[j];
          if (!m.parentNode) continue;
          const box = group.faces[j].box;
          const scale = renderedW / box.width;
          const markerX = offsetX + ((box.x1 + box.x2) / 2) * scale;
          const TIP_GAP = 16, TAIL_H = 8, CIRCLE_H = 24;
          const tipY = offsetY + box.y1 * scale - TIP_GAP;
          const circleTopY = tipY - TAIL_H - CIRCLE_H;
          const left = Math.min(Math.max(markerX - 12, offsetX), offsetX + renderedW - 24);
          const top = Math.min(Math.max(circleTopY, offsetY), offsetY + renderedH - CIRCLE_H - TAIL_H);
          m.style.left = `${left}px`;
          m.style.top = `${top}px`;
          m.style.visibility = '';
        }
      }

      thumbImg.addEventListener('load', positionMarkers);
      if (thumbImg.complete && thumbImg.naturalWidth) positionMarkers();

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(positionMarkers, 150);
      });

      grid.appendChild(card);
    }
  }

  loadUnsorted();
</script>
</body>
</html>
```

**Step 2: Manual verification**

```bash
npm run dev
curl -s "http://localhost:4321/admin/gallery-tagging/shift-3" -o /dev/null -w "%{http_code}\n"
# без ключа → 403
ADMIN_KEY_VALUE=$(grep ^ADMIN_KEY .env 2>/dev/null | cut -d= -f2)
curl -s "http://localhost:4321/admin/gallery-tagging/shift-3?key=$ADMIN_KEY_VALUE" -o /dev/null -w "%{http_code}\n"
# с правильным ключом → 200
```

**Step 3: Commit**

```bash
git add "src/pages/admin/gallery-tagging/[shiftId].astro"
git commit -m "feat: move face-tagging tool from public /foto into admin"
```

---

### Task E: `/admin/p-link.astro` — shift selector for the second link

**Files:**
- Modify: `src/pages/admin/p-link.astro`

**Interfaces:**
- Consumes (unchanged): `signLid(lid: number): string` from `src/lib/leadLink.ts`.
- Consumes: `allShiftsIncludingArchived` from `src/data/shifts.ts` (`{id: string; name: string}[]`).

**Step 1: Add shift param + second link**

In `src/pages/admin/p-link.astro` frontmatter, after the existing `lidQuery`/`valid`/`url` block, add:
```ts
import { allShiftsIncludingArchived } from '../../data/shifts';

const shiftIdQuery = Astro.url.searchParams.get('shiftId') || '';
const fotoUrl =
  valid && shiftIdQuery
    ? `https://aidacamp.ru/foto/${shiftIdQuery}?lid=${lidNum}&t=${signLid(lidNum)}`
    : '';
```

In the `<form>`, add a shift `<select>` next to the existing `lid` input (submits together — same `method="get"`):
```astro
  <form method="get">
    <input type="hidden" name="key" value={provided} />
    <input type="text" name="lid" value={lidQuery || ''} placeholder="например, 12345" inputmode="numeric" pattern="[0-9]*" autofocus />
    <select name="shiftId">
      <option value="">— смена (для ссылки на фото) —</option>
      {allShiftsIncludingArchived.map((s) => (
        <option value={s.id} selected={s.id === shiftIdQuery}>{s.name}</option>
      ))}
    </select>
    <button type="submit">Сгенерировать</button>
  </form>
```
(`<select>` needs the same `padding/border-radius/font-family` treatment as the existing `input` — extend the existing `input{...}` CSS rule's selector to `input, select{...}`.)

After the existing `{url && (...)}` result block, add a second block:
```astro
  {fotoUrl && (
    <div class="result">
      <div class="result-lbl">Ссылка на фото смены для клиента №{lidNum}</div>
      <div class="result-url" id="foto-url">{fotoUrl}</div>
      <button class="copy-btn" onclick={`navigator.clipboard.writeText(${JSON.stringify(fotoUrl)});this.textContent='✓ Скопировано'`}>Копировать</button>
    </div>
  )}
```

**Step 2: Manual verification**

```bash
npm run dev
ADMIN_KEY_VALUE=$(grep ^ADMIN_KEY .env 2>/dev/null | cut -d= -f2)
open "http://localhost:4321/admin/p-link.astro?key=$ADMIN_KEY_VALUE&lid=12345&shiftId=shift-3"
```
Expected: page shows both the `/p/12345?t=...` link (unchanged behavior) and a new `/foto/shift-3?lid=12345&t=...` link with the same `t` value.

**Step 3: Commit**

```bash
git add src/pages/admin/p-link.astro
git commit -m "feat: generate a /foto link alongside the /p link in admin"
```

---

### Task F: Foto page redesign (Wave 2 — dispatch only after A, B, C, D are merged to `dev`)

**Files:**
- Modify: `src/pages/foto/[shiftId].astro` (full rewrite)
- Create: `src/pages/api/foto/[shiftId]/all.ts`

**Interfaces:**
- Consumes: `GET /api/foto/:shiftId/people` (unchanged) → `{ok, people:[{id,name,count}]}` / `?personId=` → `{ok, name, assetIds:[{id,type,...}]}`.
- Consumes: `GET /api/foto/:shiftId/avatar/:personId` (Task A) → `image/jpeg` bytes.
- Consumes: `GET /api/foto/image/:id?kind=thumb|original&download=1` (Task B) → bytes, `Content-Disposition: attachment` when `download=1`.
- Consumes: `POST /api/foto/:shiftId/zip {ids}` (Task B) → `application/zip` stream.
- Consumes: `import { scheduleBind } from '../../lib/attribution/collectAndBind'` (Task C), `BindContext` shape as defined there.
- Produces: `GET /api/foto/:shiftId/all` → `{ok:true, assets:[{id,type}]}` — full album asset list regardless of face recognition, needed for the "Все фото смены" tab (no existing endpoint returns this; `people.ts` only returns per-person subsets, `unsorted.ts` only returns unrecognized faces).

**Step 1: New "all assets" endpoint**

Create `src/pages/api/foto/[shiftId]/all.ts`:
```ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';
import { getAlbumIdForShift } from '../../../../lib/immich';

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
    const album: { assets: { id: string; type: 'IMAGE' | 'VIDEO' }[] } = await res.json();
    return new Response(
      JSON.stringify({ ok: true, assets: album.assets.map((a) => ({ id: a.id, type: a.type })) }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
```

**Step 2: Rewrite `src/pages/foto/[shiftId].astro`**

Required behavior (implement all of it — this is the actual deliverable the redesign is for):

*Frontmatter:* keep the existing `shift` lookup by `shiftId`. Additionally read `Astro.url.searchParams.get('lid')` and `('t')` for optional CRM attribution (no signature verification needed server-side here — verification happens server-side inside `/api/bind-lead` itself via `verifyLid`, same as `/p/[lid].astro` already relies on; this page just passes the raw values through).

*Visual tone:* background `#0d1a2b` (navy-950) for the whole page (`<Base>`'s default body background must be overridden — add `body{background:#0d1a2b}` in the scoped `<style>`, same technique the current file already uses for `body{overflow-x:hidden}`). Text `#fff`/`rgba(255,255,255,.7)`. Soft-orange `#ec9b44` only for: active avatar's ring, lightbox action-button icons, selection-mode floating bar's primary button, video-badge accent. `border-radius:14px` on grid thumbnails and avatar circles. No gradients/orbs — DESIGN_SYSTEM.md's "photo emotion > graphic effects" principle: the photos themselves are the only color source besides the two accent uses above.

*Avatar strip (replaces the `<select>`):* horizontal `overflow-x:auto` flex row, `-webkit-overflow-scrolling:touch`. First item is a fixed "Все фото" pill (icon `bi-collection`, no photo). Then one circular (`border-radius:50%`, 56px) avatar per person from `GET /api/foto/:shiftId/people`, `<img src="/api/foto/{shiftId}/avatar/{id}" loading="lazy">`, name truncated to one line below. Active item gets a 2-3px solid `#ec9b44` ring (`box-shadow` or `border`). Clicking "Все фото" fetches `GET /api/foto/:shiftId/all` and renders every asset in the grid; clicking a person fetches `GET /api/foto/:shiftId/people?personId=` as today.

*Cookie memory:* on avatar click, `document.cookie = 'foto_person_' + shiftId + '=' + personId + '; path=/foto/' + shiftId + '; max-age=15552000; SameSite=Lax'`. On "Все фото" click, clear it: `document.cookie = 'foto_person_' + shiftId + '=; path=/foto/' + shiftId + '; max-age=0'`. On page load, read the cookie via `document.cookie.match(...)`; if present and the id is still in the freshly-loaded people list, auto-select that person instead of defaulting to "Все фото" (skip the extra click on repeat visits).

*Grid:* CSS multi-column masonry, not the current fixed-aspect-ratio grid — `columns:2` under 640px, `columns:3` 640-1024px, `columns:4` above 1024px (`column-gap:8px`), each item `<img>` `width:100%; height:auto; display:block; border-radius:14px; break-inside:avoid; margin-bottom:8px`. Video items keep the existing small badge overlay pattern (reuse `.foto-video-badge`, swap the raw `▶` character for `<i class="bi bi-play-fill">` — no bare emoji/unicode glyphs per `DESIGN_SYSTEM.md`).

*Lightbox:* keep the existing prev/next/close/swipe/keyboard mechanics from the current file essentially as-is (dark overlay, `object-fit:contain`, `<video controls>` for video assets), but add two new action buttons (icon buttons, `#ec9b44` icon color, positioned bottom-center or top-left — your call on exact placement, just don't cover the image and don't collide with prev/next/close):
  - **Скачать** (`bi-download`): `<a>` (or programmatic click on a temporary `<a>`) pointing to `/api/foto/image/{id}?kind=original&download=1`.
  - **Поделиться** (`bi-share`): calls an `async function shareAsset(asset)` that (1) fetches `/api/foto/image/{id}?kind=original` as a blob, builds a `File`, and calls `navigator.share({files:[file]})` when `navigator.canShare({files:[file]})` is true; (2) falls back to `navigator.share({url: location.href})` when file-sharing isn't supported but `navigator.share` exists; (3) falls back to `navigator.clipboard.writeText(location.href)` + a small toast ("Ссылка скопирована") when neither exists. Wrap each step in try/catch so a rejected/cancelled share sheet doesn't throw an unhandled error.

*Selection mode + bulk actions:* pointerdown-and-hold (500ms, cancel on pointerup/pointerleave/pointercancel) on any grid thumbnail enters selection mode — subsequent taps on thumbnails toggle a checkmark overlay instead of opening the lightbox (matches DESIGN_SYSTEM icon-only rule: use `bi-check-circle-fill` for the checked state, semi-transparent circle outline for unchecked). A floating bottom bar (fixed, centered, dark glass background matching `/p/[lid].astro`'s `.pm-progress-wrap` treatment) appears with "Выбрано: N", a "Скачать ZIP" button, and — where `navigator.canShare` with `files` is supported — a "Поделиться" button (multi-file share). Both call `POST /api/foto/{shiftId}/zip {ids: selectedIds}`, download/share the resulting blob, and a header-level "Скачать всё (N фото)" button (shown above the grid on the person/all-photos view, outside selection mode) does the same with every currently-loaded asset's id.

*Attribution:* if both `lid` and `t` query params are present, add `data-lid`/`data-t` attributes to the `<main id="foto-root">` element (mirroring Task C's `/p/[lid].astro` pattern), and add a small `<script>import { scheduleBind } from '../../lib/attribution/collectAndBind';</script>` module script that reads those two attributes plus the `aidacamp_is_manager` localStorage flag (same check as Task C) and calls `scheduleBind({lid, t, isPreview:false, isManagerBrowser, storageKey:'foto_bound_'+shiftId+'_'+lid}, 96499295)`. When `lid`/`t` are absent, skip calling `scheduleBind` entirely — page must work identically to today for organic visits with no `lid`.

*Removed:* the entire "Неразобранные" tab (button, tab-switching logic, face-marker positioning code, `POST .../unsorted` calls) — that capability now lives at `/admin/gallery-tagging/[shiftId]` (Task D). Also remove the `#foto-person-select` `<select>` element entirely (replaced by the avatar strip).

**Step 3: Manual verification**

```bash
npm run dev
```
Walk through in a real browser against a shift that has an Immich album with recognized people:
1. Load `/foto/<shiftId>` — avatar strip renders, "Все фото" is active by default.
2. Click a person avatar — grid switches to their photos, masonry layout (no forced squares), cookie is set (check devtools Application > Cookies).
3. Reload the page — the same person's photos load automatically (cookie remembered).
4. Click "Все фото" — grid switches back, cookie is cleared.
5. Open a photo in the lightbox — Download button triggers a file save; Share button opens the OS share sheet (or falls back to clipboard-copy + toast on desktop Chrome, which doesn't support file sharing).
6. Long-press a thumbnail — selection mode activates, floating bar appears; select 2-3 more, tap "Скачать ZIP" — a `.zip` downloads containing those files.
7. Confirm no "Неразобранные" affordance exists anywhere on this public page.
8. Resize to 375px width (mobile) — avatar strip scrolls horizontally without wrapping, grid drops to 2 columns, lightbox buttons remain reachable and don't overlap prev/next/close.

```bash
npm run check:astro
npx vitest run
```
Expected: no type errors, all existing tests still pass (this task adds no new pure-logic tests of its own — the added code is DOM/network-driven page glue, consistent with the project's convention of not unit-testing `src/pages/*`).

**Step 4: Commit**

```bash
git add "src/pages/foto/[shiftId].astro" "src/pages/api/foto/[shiftId]/all.ts"
git commit -m "feat: redesign /foto gallery — face-cropped avatars, dark masonry grid, download/share/zip"
```
