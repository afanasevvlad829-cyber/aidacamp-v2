import { fetchWithTimeout } from './fetchWithTimeout';

const IMMICH_BASE =
  process.env.IMMICH_BASE_URL || import.meta.env.IMMICH_BASE_URL || 'http://127.0.0.1:2283';
const SEARCH_PAGE_SIZE = 250;
const MAX_SEARCH_PAGES = 10_000;

export interface ImmichAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  fileCreatedAt?: string;
  fileModifiedAt?: string;
  createdAt?: string;
}

type SearchFilters = {
  albumIds: string[];
  tagIds?: string[];
};

function apiKey(): string {
  const key = process.env.IMMICH_API_KEY || import.meta.env.IMMICH_API_KEY;
  if (!key) throw new Error('IMMICH_API_KEY not configured');
  return key;
}

/**
 * Immich v3 / Gallery no longer embeds the full asset list in GET /albums/:id.
 * Page through metadata search explicitly so albums larger than the default 250
 * are never silently truncated.
 */
export async function searchImmichAssets(filters: SearchFilters): Promise<ImmichAsset[]> {
  const items: ImmichAsset[] = [];
  const seenIds = new Set<string>();
  const seenPages = new Set<string>();
  let page = '1';

  for (let pageCount = 0; pageCount < MAX_SEARCH_PAGES; pageCount += 1) {
    if (seenPages.has(page)) throw new Error(`Immich search repeated page ${page}`);
    seenPages.add(page);

    const res = await fetchWithTimeout(`${IMMICH_BASE}/api/search/metadata`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...filters, page: Number(page), size: SEARCH_PAGE_SIZE }),
    });
    if (!res.ok) throw new Error(`Immich search ${res.status}`);

    const data = await res.json() as {
      assets?: { items?: ImmichAsset[]; nextPage?: string | number | null };
    };
    if (!data.assets || !Array.isArray(data.assets.items)) {
      throw new Error('Immich search returned malformed assets page');
    }
    for (const asset of data.assets.items) {
      if (!asset?.id || seenIds.has(asset.id)) continue;
      seenIds.add(asset.id);
      items.push(asset);
    }

    const nextPage = data.assets.nextPage;
    if (nextPage === null || nextPage === undefined || nextPage === '') return items;
    page = String(nextPage);
  }

  throw new Error(`Immich search exceeded ${MAX_SEARCH_PAGES} pages`);
}

/** Uses embedded assets on Immich v2, otherwise falls back to v3 metadata search. */
export async function getAlbumAssets(albumId: string): Promise<ImmichAsset[]> {
  const res = await fetchWithTimeout(`${IMMICH_BASE}/api/albums/${albumId}`, {
    headers: { 'x-api-key': apiKey() },
  });
  if (!res.ok) throw new Error(`Immich album ${albumId}: ${res.status}`);

  const album = await res.json() as { assets?: ImmichAsset[]; assetCount?: number };
  if (Array.isArray(album.assets)) {
    if (album.assets.length > 0) return album.assets;
    if (album.assetCount === 0) return [];
  }
  return searchImmichAssets({ albumIds: [albumId] });
}
