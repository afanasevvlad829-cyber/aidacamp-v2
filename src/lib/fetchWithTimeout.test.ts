import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithTimeout } from './fetchWithTimeout';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchWithTimeout', () => {
  it('бросает ошибку с "timeout" когда fetch не отвечает дольше таймаута', async () => {
    // Мок fetch, который никогда не резолвится сам, но уважает signal (как настоящий fetch).
    vi.stubGlobal('fetch', (_url: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
        });
      }),
    );

    const start = Date.now();
    await expect(fetchWithTimeout('https://example.com', {}, 50)).rejects.toThrow(/timeout/i);
    // Убеждаемся, что обёртка отвалилась примерно по таймауту, а не висела дольше.
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('пробрасывает успешный ответ без изменений', async () => {
    const fakeResponse = { ok: true, status: 200 } as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const res = await fetchWithTimeout('https://example.com', {}, 5000);
    expect(res).toBe(fakeResponse);
  });

  it('передаёт signal в fetch (таймаутный abort доходит до вызова)', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', spy);

    await fetchWithTimeout('https://example.com', { method: 'POST' }, 5000);

    expect(spy).toHaveBeenCalledOnce();
    const passedInit = spy.mock.calls[0][1] as RequestInit;
    expect(passedInit.method).toBe('POST');
    expect(passedInit.signal).toBeInstanceOf(AbortSignal);
  });
});
