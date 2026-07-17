import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { onRequest } from '../middleware';
import { signSession } from '../lib/portalSession';

// Живёт в src/test/ (НЕ под src/pages/) — правило про Astro и .test.ts
// (см. feedback_astro_no_tests_under_pages).
//
// Контекст дыры (17.07.2026): /api/admin/* (portal-audit с execSync внутри,
// gallery-upload, hero-upload, gallery-delete) не гейтился вообще — аноним
// с прода получал 200. Фикс: middleware требует валидную portal_session
// с ролью 'admin'; без сессии → 401, с чужой ролью → 403.

const SECRET = 'test-secret-for-admin-gate';

function makeContext(path: string, cookie?: string) {
  const url = new URL(`http://localhost${path}`);
  const locals: Record<string, unknown> = {};
  return {
    request: new Request(url),
    url,
    locals,
    cookies: {
      get: (name: string) => (name === 'portal_session' && cookie ? { value: cookie } : undefined),
    },
  } as any;
}

const next = async () => new Response('ok', { status: 200 });

let prevSecret: string | undefined;
beforeAll(() => {
  prevSecret = process.env.PORTAL_SESSION_SECRET;
  process.env.PORTAL_SESSION_SECRET = SECRET;
});
afterAll(() => {
  if (prevSecret === undefined) delete process.env.PORTAL_SESSION_SECRET;
  else process.env.PORTAL_SESSION_SECRET = prevSecret;
});

describe('гейт /api/admin/*', () => {
  it('аноним без cookie → 401 (раньше было 200 — дыра)', async () => {
    const res = await onRequest(makeContext('/api/admin/portal-audit-progress'), next);
    expect(res.status).toBe(401);
  });

  it('cookie, подписанная чужим секретом → 401', async () => {
    const forged = signSession('admin', 'wrong-secret');
    const res = await onRequest(makeContext('/api/admin/portal-audit', forged), next);
    expect(res.status).toBe(401);
  });

  it('валидная сессия, но роль не admin (student) → 403', async () => {
    // student-сессии не валидируются через portal_staff (без обращения к БД)
    const token = signSession('student', SECRET, Date.now(), 12345);
    const res = await onRequest(makeContext('/api/admin/gallery-upload', token), next);
    expect(res.status).toBe(403);
  });

  it('валидная admin-сессия → запрос проходит к endpoint', async () => {
    const token = signSession('admin', SECRET); // без sub/sid — без обращения к БД
    const res = await onRequest(makeContext('/api/admin/gallery-upload', token), next);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });
});
