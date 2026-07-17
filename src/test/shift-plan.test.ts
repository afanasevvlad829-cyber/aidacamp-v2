import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Тест эндпоинта src/pages/api/shift-plan.ts.
// Живёт в src/test/ (НЕ под src/pages/) — иначе Astro считает .test.ts роутом
// и билд падает на импорте vitest вне раннера (см. feedback_astro_no_tests_under_pages).

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => { throw new Error('ENOENT'); }),
  writeFile: vi.fn(async () => {}),
  mkdir: vi.fn(async () => {}),
}));

function makeCtx(cookie: string | null, body?: unknown, method: 'GET' | 'POST' = 'GET'): any {
  const headers: Record<string, string> = {};
  if (cookie !== null) headers['cookie'] = cookie;
  return {
    request: new Request('http://localhost/api/shift-plan', {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    }),
  };
}

describe('GET/POST /api/shift-plan — авторизация', () => {
  const ORIGINAL_ENV = process.env.STAFF_ACCESS_PASSWORD;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.STAFF_ACCESS_PASSWORD;
    else process.env.STAFF_ACCESS_PASSWORD = ORIGINAL_ENV;
    vi.resetModules();
  });

  it('без STAFF_ACCESS_PASSWORD на сервере — fail-closed 503, даже с валидной cookie', async () => {
    delete process.env.STAFF_ACCESS_PASSWORD;
    const { GET } = await import('../pages/api/shift-plan');
    const res = await GET(makeCtx('staff_auth_2026=anything') as any);
    expect(res.status).toBe(503);
  });

  it('без cookie — 401', async () => {
    process.env.STAFF_ACCESS_PASSWORD = 'secret123';
    const { GET } = await import('../pages/api/shift-plan');
    const res = await GET(makeCtx(null) as any);
    expect(res.status).toBe(401);
  });

  it('с неверным паролем в cookie — 401', async () => {
    process.env.STAFF_ACCESS_PASSWORD = 'secret123';
    const { GET } = await import('../pages/api/shift-plan');
    const res = await GET(makeCtx('staff_auth_2026=wrong') as any);
    expect(res.status).toBe(401);
  });

  it('с верным паролем в cookie — 200, план отдаётся', async () => {
    process.env.STAFF_ACCESS_PASSWORD = 'secret123';
    const { GET } = await import('../pages/api/shift-plan');
    const res = await GET(makeCtx('staff_auth_2026=secret123') as any);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
  });

  it('POST без auth не пишет файл — 401', async () => {
    process.env.STAFF_ACCESS_PASSWORD = 'secret123';
    const { POST } = await import('../pages/api/shift-plan');
    const res = await POST(makeCtx(null, { days: [] }, 'POST') as any);
    expect(res.status).toBe(401);
  });

  it('POST с верным паролем — 200', async () => {
    process.env.STAFF_ACCESS_PASSWORD = 'secret123';
    const { POST } = await import('../pages/api/shift-plan');
    const res = await POST(makeCtx('staff_auth_2026=secret123', { days: [] }, 'POST') as any);
    expect(res.status).toBe(200);
  });
});
