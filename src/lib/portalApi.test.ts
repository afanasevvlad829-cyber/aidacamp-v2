import { describe, it, expect, vi, afterEach } from 'vitest';
import { postJson } from './portalApi';

afterEach(() => vi.restoreAllMocks());

describe('postJson', () => {
  it('возвращает распарсенный ok-ответ', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, deleted: 3 }), { status: 200 })));
    const r = await postJson('/api/portal/x', { a: 1 });
    expect(r.ok).toBe(true);
    expect(r.deleted).toBe(3);
  });
  it('нормализует HTTP-ошибку в {ok:false,error}', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const r = await postJson('/api/portal/x', {});
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
  });
});
