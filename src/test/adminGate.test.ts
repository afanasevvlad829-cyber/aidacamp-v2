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

function makeContext(path: string, cookie?: string, staffCookie?: string) {
  const url = new URL(`http://localhost${path}`);
  const locals: Record<string, unknown> = {};
  return {
    request: new Request(url),
    url,
    locals,
    cookies: {
      get: (name: string) => {
        if (name === 'portal_session' && cookie) return { value: cookie };
        if (name === 'staff_auth_2026' && staffCookie) return { value: staffCookie };
        return undefined;
      },
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

// Контекст дыры (27.08.2026, найдена архитектурным аудитом): тот же класс бага,
// что и в июле, но в трёх новых местах. /api/shift-roster отдавал ФИО/пол/возраст
// детей смены любому анониму (проверено на проде: HTTP 200), /api/foto/* — фото и
// распознанные лица, /admin/*.astro — админ-страницы по прямой ссылке.
// Причина — копипаста хелперов AlfaCRM без переноса модели доступа.
const STAFF_SECRET = 'test-staff-secret-for-roster-gate';

describe('гейт /api/shift-roster (персональные данные детей)', () => {
  let prevStaff: string | undefined;
  beforeAll(() => {
    prevStaff = process.env.STAFF_AUTH_SECRET;
    process.env.STAFF_AUTH_SECRET = STAFF_SECRET;
  });
  afterAll(() => {
    if (prevStaff === undefined) delete process.env.STAFF_AUTH_SECRET;
    else process.env.STAFF_AUTH_SECRET = prevStaff;
  });

  it('аноним без cookie → 401 (раньше было 200 с ФИО детей — дыра)', async () => {
    const res = await onRequest(makeContext('/api/shift-roster?shift=1'), next);
    expect(res.status).toBe(401);
  });

  it('портальная сессия (любая роль) → проходит: контур /portal/rooms', async () => {
    const token = signSession('vozhaty', SECRET);
    const res = await onRequest(makeContext('/api/shift-roster?shift=1', token), next);
    expect(res.status).toBe(200);
  });

  it('staff-кука → проходит: контур конструктора смены /staff/plan', async () => {
    const res = await onRequest(makeContext('/api/shift-roster?shift=1', undefined, STAFF_SECRET), next);
    expect(res.status).toBe(200);
  });

  it('staff-кука с неверным значением → 401', async () => {
    const res = await onRequest(makeContext('/api/shift-roster?shift=1', undefined, 'nope'), next);
    expect(res.status).toBe(401);
  });

  it('/api/ab-monitor-data — тот же гейт', async () => {
    const res = await onRequest(makeContext('/api/ab-monitor-data?limit=30'), next);
    expect(res.status).toBe(401);
  });
});

describe('гейт страниц /admin/*', () => {
  it('аноним → 302 на логин (раньше страница открывалась любому)', async () => {
    const res = await onRequest(makeContext('/admin/hero'), next);
    expect(res.status).toBe(302);
  });

  it('валидная сессия с ролью не admin → 403', async () => {
    const token = signSession('student', SECRET, Date.now(), 12345);
    const res = await onRequest(makeContext('/admin/gallery', token), next);
    expect(res.status).toBe(403);
  });

  it('admin-сессия → страница отдаётся', async () => {
    const token = signSession('admin', SECRET);
    const res = await onRequest(makeContext('/admin/ab-monitor', token), next);
    expect(res.status).toBe(200);
  });

  it('/admin/p-link — исключение: своя проверка ADMIN_KEY, гейт не вмешивается', async () => {
    const res = await onRequest(makeContext('/admin/p-link'), next);
    expect(res.status).toBe(200);
  });
});
