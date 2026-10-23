import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchWithTimeout = vi.fn();
vi.mock('./fetchWithTimeout', () => ({
  fetchWithTimeout: (...args: unknown[]) => fetchWithTimeout(...args),
}));

import { getAlbumAssets, searchImmichAssets } from './immichAssets';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Immich/Gallery asset compatibility', () => {
  beforeEach(() => {
    process.env.IMMICH_API_KEY = 'test-key';
    fetchWithTimeout.mockReset();
  });

  it('uses embedded album assets from Immich v2 without metadata search', async () => {
    fetchWithTimeout.mockResolvedValueOnce(jsonResponse({
      assetCount: 2,
      assets: [{ id: 'a1', type: 'IMAGE' }, { id: 'a2', type: 'VIDEO' }],
    }));

    await expect(getAlbumAssets('album-1')).resolves.toEqual([
      { id: 'a1', type: 'IMAGE' },
      { id: 'a2', type: 'VIDEO' },
    ]);
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  it('falls back for v3 and follows every metadata-search page', async () => {
    fetchWithTimeout
      .mockResolvedValueOnce(jsonResponse({ assetCount: 3, assets: [] }))
      .mockResolvedValueOnce(jsonResponse({
        assets: { items: [{ id: 'a1', type: 'IMAGE' }, { id: 'a2', type: 'VIDEO' }], nextPage: '2' },
      }))
      .mockResolvedValueOnce(jsonResponse({
        assets: { items: [{ id: 'a2', type: 'VIDEO' }, { id: 'a3', type: 'IMAGE' }], nextPage: null },
      }));

    await expect(getAlbumAssets('album-1')).resolves.toEqual([
      { id: 'a1', type: 'IMAGE' },
      { id: 'a2', type: 'VIDEO' },
      { id: 'a3', type: 'IMAGE' },
    ]);
    const pageBodies = fetchWithTimeout.mock.calls.slice(1).map((call) =>
      JSON.parse(String((call[1] as RequestInit).body)),
    );
    expect(pageBodies).toEqual([
      { albumIds: ['album-1'], page: 1, size: 250 },
      { albumIds: ['album-1'], page: 2, size: 250 },
    ]);
  });

  it('keeps albumIds and tagIds on every page', async () => {
    fetchWithTimeout.mockResolvedValueOnce(jsonResponse({
      assets: { items: [], nextPage: null },
    }));
    await searchImmichAssets({ albumIds: ['album-1'], tagIds: ['tag-1'] });
    expect(JSON.parse(String(fetchWithTimeout.mock.calls[0][1].body))).toEqual({
      albumIds: ['album-1'],
      tagIds: ['tag-1'],
      page: 1,
      size: 250,
    });
  });

  it('surfaces album, search, and malformed-response errors', async () => {
    fetchWithTimeout.mockResolvedValueOnce(jsonResponse({}, 503));
    await expect(getAlbumAssets('album-1')).rejects.toThrow('Immich album album-1: 503');

    fetchWithTimeout.mockResolvedValueOnce(jsonResponse({}, 502));
    await expect(searchImmichAssets({ albumIds: ['album-1'] })).rejects.toThrow('Immich search 502');

    fetchWithTimeout.mockResolvedValueOnce(jsonResponse({ assets: {} }));
    await expect(searchImmichAssets({ albumIds: ['album-1'] })).rejects.toThrow('malformed assets page');
  });
});
