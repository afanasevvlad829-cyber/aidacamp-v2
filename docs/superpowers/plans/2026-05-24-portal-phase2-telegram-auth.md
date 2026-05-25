# Портал Фаза 2: Telegram-вход + база сотрудников — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить ролевые пароли сотрудников на персональный Telegram-вход с реестром сотрудников в PostgreSQL; ученики — по коду; admin — break-glass пароль.

**Architecture:** Реюз Фазы 1 (гейт `middleware.ts`, cookie `portal_session`, роли). Источник роли для сотрудников = таблица `portal_staff` (telegram_id→роль), доступ выдаётся после проверки подписи Telegram (Login Widget сейчас + Mini App `initData` — эндпоинт готов). Отзыв доступа — через `sub` в сессии + проверку `active` в middleware.

**Tech Stack:** Astro 6 SSR (`@astrojs/node`), TypeScript, Node `crypto` (HMAC), `pg` (PostgreSQL), Vitest, Tailwind v4, Bootstrap Icons.

**Спека:** `docs/superpowers/specs/2026-05-24-portal-phase2-telegram-auth-design.md`
**Ветка:** `agent/portal-phase2` → PR в `dev`. Worktree: `/tmp/wt-portal-unify`.

---

## Структура файлов

**Создать:**
- `src/lib/telegramAuth.ts` — проверка подписи Login Widget и Mini App initData.
- `src/lib/telegramAuth.test.ts` — юнит-тесты подписи.
- `src/lib/portalStaff.ts` — доступ к таблице `portal_staff` (pg).
- `scripts/portal-staff-migration.sql` — DDL таблицы.
- `src/pages/api/portal/tg.ts` — эндпоинт Telegram-входа.
- `src/pages/api/portal/staff.ts` — admin-API реестра.
- `src/pages/portal/staff-admin.astro` — мини-админка.

**Изменить:**
- `src/lib/portalSession.ts` — поддержка необязательного `sub` (telegram_id) в payload.
- `src/lib/portalSession.test.ts` — тесты на `sub`.
- `src/lib/portalAuth.ts` — оставить только `student` (код) и `admin` (break-glass).
- `src/lib/portalAuth.test.ts` — обновить.
- `src/middleware.ts` — для сессий с `sub` проверять `active` в БД (кэш 60 с).
- `src/pages/portal/login.astro` — кнопка Telegram + поле кода ученика + состояния.
- `src/pages/portal/index.astro` — карточка «Управление сотрудниками» для admin.

**Применить на сервере (вручную):**
- SQL-миграция; env `PORTAL_BOT_USERNAME`; подтвердить `TELEGRAM_BOT_TOKEN`=@Aidacamp2026bot; BotFather `/setdomain`.

---

## Task 0: Подтвердить бота и домен (предусловие)

**Files:** — (только проверка на сервере)

- [ ] **Step 1: Узнать, чей это токен (без раскрытия токена)**

Run (выводит только публичные данные бота, не токен):
```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 'set -a; . /var/www/aidacamp-dev/.env; set +a; curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get(\"ok\"), d.get(\"result\",{}).get(\"username\"))"'
```
Expected: `True Aidacamp2026bot` (или другой username).
- Если username = `Aidacamp2026bot` → ок, использовать `TELEGRAM_BOT_TOKEN`.
- Если другой бот → STOP, сообщить контроллеру: нужен токен `@Aidacamp2026bot` (положить в env как `PORTAL_BOT_TOKEN`, и в плане заменить `TELEGRAM_BOT_TOKEN`→`PORTAL_BOT_TOKEN`).

- [ ] **Step 2: Зафиксировать username бота**

Записать username (для виджета) — он понадобится как env `PORTAL_BOT_USERNAME` в Task 9/10. Сообщить контроллеру значение.

- [ ] **Step 3: Отметить про домен (BotFather)**

Login Widget работает только на домене, заданном боту в BotFather (`/setdomain`). Зафиксировать: на каком домене тестируем виджет (dev или прод). Если бот уже привязан к другому домену — отметить как открытый вопрос для контроллера (один домен на бота).

---

## Task 1: Миграция и доступ к `portal_staff`

**Files:**
- Create: `scripts/portal-staff-migration.sql`, `src/lib/portalStaff.ts`

- [ ] **Step 1: Создать `scripts/portal-staff-migration.sql`**

```sql
CREATE TABLE IF NOT EXISTS portal_staff (
  id           BIGSERIAL PRIMARY KEY,
  telegram_id  BIGINT UNIQUE NOT NULL,
  full_name    TEXT,
  tg_username  TEXT,
  role         TEXT CHECK (role IN ('admin','teacher','vozhaty','rukovoditel')),
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by  BIGINT,
  approved_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_portal_staff_role_active ON portal_staff (role, active);
```

- [ ] **Step 2: Создать `src/lib/portalStaff.ts`**

```ts
import type { PortalRole } from './portalSession';

export interface StaffRow {
  telegram_id: number;
  full_name: string | null;
  tg_username: string | null;
  role: PortalRole | null;
  active: boolean;
}

function dsn(): string {
  return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
}

async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn();
  if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Запись сотрудника по telegram_id (или null). */
export async function getStaff(telegramId: number): Promise<StaffRow | null> {
  return (await withClient(async (c) => {
    const r = await c.query(
      'SELECT telegram_id, full_name, tg_username, role, active FROM portal_staff WHERE telegram_id=$1',
      [telegramId],
    );
    return (r.rows[0] as StaffRow) ?? null;
  })) ?? null;
}

/** Создаёт заявку (pending, role=NULL), если сотрудника ещё нет. Возвращает запись. */
export async function ensurePending(
  telegramId: number,
  fullName: string | null,
  username: string | null,
): Promise<StaffRow | null> {
  return await withClient(async (c) => {
    await c.query(
      `INSERT INTO portal_staff (telegram_id, full_name, tg_username)
       VALUES ($1,$2,$3)
       ON CONFLICT (telegram_id) DO UPDATE SET
         full_name = COALESCE(portal_staff.full_name, EXCLUDED.full_name),
         tg_username = EXCLUDED.tg_username`,
      [telegramId, fullName, username],
    );
    const r = await c.query(
      'SELECT telegram_id, full_name, tg_username, role, active FROM portal_staff WHERE telegram_id=$1',
      [telegramId],
    );
    return r.rows[0] as StaffRow;
  });
}

export async function listStaff(): Promise<StaffRow[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      'SELECT telegram_id, full_name, tg_username, role, active FROM portal_staff ORDER BY active DESC, role NULLS FIRST, created_at',
    );
    return r.rows as StaffRow[];
  })) ?? [];
}

export async function setRole(telegramId: number, role: PortalRole, approvedBy: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      'UPDATE portal_staff SET role=$2, approved_by=$3, approved_at=now() WHERE telegram_id=$1',
      [telegramId, role, approvedBy],
    );
  });
}

export async function setActive(telegramId: number, active: boolean): Promise<void> {
  await withClient(async (c) => {
    await c.query('UPDATE portal_staff SET active=$2 WHERE telegram_id=$1', [telegramId, active]);
  });
}
```

- [ ] **Step 3: Проверка типов**

Run: `cd /tmp/wt-portal-unify && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "portalStaff" || echo "no type errors in portalStaff"`
Expected: нет ошибок в файле.

- [ ] **Step 4: Commit**

```bash
git add scripts/portal-staff-migration.sql src/lib/portalStaff.ts
git commit -m "feat(portal): таблица portal_staff и доступ к реестру (pg)"
```

---

## Task 2: Проверка подписи Telegram

**Files:**
- Create: `src/lib/telegramAuth.ts`, `src/lib/telegramAuth.test.ts`

- [ ] **Step 1: Написать падающий тест**

`src/lib/telegramAuth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { verifyLoginWidget, verifyInitData } from './telegramAuth';

const TOKEN = '123456:TESTTOKEN';

function signWidget(data: Record<string, string>): Record<string, string> {
  const secret = createHash('sha256').update(TOKEN).digest();
  const checkString = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join('\n');
  const hash = createHmac('sha256', secret).update(checkString).digest('hex');
  return { ...data, hash };
}

function signInitData(data: Record<string, string>): string {
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const checkString = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join('\n');
  const hash = createHmac('sha256', secret).update(checkString).digest('hex');
  const params = new URLSearchParams({ ...data, hash });
  return params.toString();
}

describe('verifyLoginWidget', () => {
  const now = Math.floor(Date.now() / 1000);
  it('принимает валидную подпись', () => {
    const params = signWidget({ id: '777', first_name: 'Даша', username: 'dasha', auth_date: String(now) });
    expect(verifyLoginWidget(params, TOKEN)).toEqual({ telegram_id: 777, username: 'dasha', name: 'Даша' });
  });
  it('отклоняет подделанный hash', () => {
    const params = signWidget({ id: '777', auth_date: String(now) });
    params.hash = params.hash.slice(0, -2) + 'xx';
    expect(verifyLoginWidget(params, TOKEN)).toBeNull();
  });
  it('отклоняет протухший auth_date (>24ч)', () => {
    const old = now - 25 * 3600;
    const params = signWidget({ id: '777', auth_date: String(old) });
    expect(verifyLoginWidget(params, TOKEN)).toBeNull();
  });
});

describe('verifyInitData', () => {
  const now = Math.floor(Date.now() / 1000);
  it('принимает валидный initData', () => {
    const user = JSON.stringify({ id: 888, first_name: 'Вож', username: 'vozh' });
    const init = signInitData({ user, auth_date: String(now) });
    expect(verifyInitData(init, TOKEN)).toEqual({ telegram_id: 888, username: 'vozh', name: 'Вож' });
  });
  it('отклоняет подделку', () => {
    const user = JSON.stringify({ id: 888 });
    const init = signInitData({ user, auth_date: String(now) }).replace(/hash=[^&]+/, 'hash=deadbeef');
    expect(verifyInitData(init, TOKEN)).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- telegramAuth`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/lib/telegramAuth.ts`**

```ts
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface TgUser {
  telegram_id: number;
  username?: string;
  name?: string;
}

const MAX_AGE_SEC = 24 * 60 * 60;

function safeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function freshAuthDate(authDate: string | undefined, now = Date.now()): boolean {
  const t = Number(authDate);
  if (!Number.isFinite(t)) return false;
  return now / 1000 - t <= MAX_AGE_SEC;
}

function toUser(fields: Record<string, string>): TgUser | null {
  const id = Number(fields.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    telegram_id: id,
    username: fields.username || undefined,
    name: [fields.first_name, fields.last_name].filter(Boolean).join(' ') || undefined,
  };
}

/** Telegram Login Widget: secret = SHA256(token). */
export function verifyLoginWidget(
  params: Record<string, string>,
  token: string,
  now = Date.now(),
): TgUser | null {
  if (!token || !params.hash) return null;
  const { hash, ...data } = params;
  if (!freshAuthDate(data.auth_date, now)) return null;
  const checkString = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join('\n');
  const secret = createHash('sha256').update(token).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest('hex');
  if (!safeHexEqual(expected, hash)) return null;
  return toUser(data);
}

/** Mini App initData: secret = HMAC_SHA256(key="WebAppData", token). */
export function verifyInitData(initData: string, token: string, now = Date.now()): TgUser | null {
  if (!token || !initData) return null;
  const sp = new URLSearchParams(initData);
  const hash = sp.get('hash');
  if (!hash) return null;
  sp.delete('hash');
  const entries: string[] = [];
  for (const [k, v] of [...sp.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    entries.push(`${k}=${v}`);
  }
  const authDate = sp.get('auth_date') ?? undefined;
  if (!freshAuthDate(authDate, now)) return null;
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = createHmac('sha256', secret).update(entries.join('\n')).digest('hex');
  if (!safeHexEqual(expected, hash)) return null;
  let userField: Record<string, unknown> = {};
  try {
    userField = JSON.parse(sp.get('user') ?? '{}');
  } catch {
    return null;
  }
  const id = Number(userField.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    telegram_id: id,
    username: (userField.username as string) || undefined,
    name: [userField.first_name, userField.last_name].filter(Boolean).join(' ') || undefined,
  };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- telegramAuth`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegramAuth.ts src/lib/telegramAuth.test.ts
git commit -m "feat(portal): проверка подписи Telegram (Login Widget + initData)"
```

---

## Task 3: `sub` (telegram_id) в сессии

**Files:**
- Modify: `src/lib/portalSession.ts`, `src/lib/portalSession.test.ts`

- [ ] **Step 1: Добавить тест на `sub`**

В `src/lib/portalSession.test.ts` добавить:

```ts
import { signSession, verifySession, verifySessionPayload } from './portalSession';

it('хранит и возвращает sub (telegram_id) для сотрудника', () => {
  const token = signSession('vozhaty', SECRET, Date.now(), 777);
  expect(verifySession(token, SECRET)).toBe('vozhaty');
  expect(verifySessionPayload(token, SECRET)).toEqual({ role: 'vozhaty', sub: 777 });
});

it('payload без sub для парольных ролей', () => {
  const token = signSession('student', SECRET);
  expect(verifySessionPayload(token, SECRET)).toEqual({ role: 'student', sub: undefined });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `npm test -- portalSession`
Expected: FAIL — `verifySessionPayload` / 4-й аргумент не существует.

- [ ] **Step 3: Изменить `src/lib/portalSession.ts`**

Изменить интерфейс payload и сигнатуры (сохранив старое поведение `verifySession`):

```ts
interface SessionPayload {
  role: PortalRole;
  exp: number;
  sub?: number; // telegram_id для сотрудников
}

export function signSession(role: PortalRole, secret: string, now = Date.now(), sub?: number): string {
  const payload: SessionPayload = { role, exp: now + SESSION_TTL_MS };
  if (typeof sub === 'number') payload.sub = sub;
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${p}.${hmac(p, secret)}`;
}
```

Добавить функцию (и переиспользовать её в `verifySession`):

```ts
/** Возвращает {role, sub} при валидном токене; иначе null. */
export function verifySessionPayload(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): { role: PortalRole; sub?: number } | null {
  if (!token || !secret) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(p, secret);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!PORTAL_ROLES.includes(payload.role)) return null;
  if (typeof payload.exp !== 'number' || payload.exp < now) return null;
  return { role: payload.role, sub: typeof payload.sub === 'number' ? payload.sub : undefined };
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): PortalRole | null {
  return verifySessionPayload(token, secret, now)?.role ?? null;
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `npm test -- portalSession`
Expected: PASS (все, включая 2 новых).

- [ ] **Step 5: Commit**

```bash
git add src/lib/portalSession.ts src/lib/portalSession.test.ts
git commit -m "feat(portal): sub (telegram_id) в session-payload + verifySessionPayload"
```

---

## Task 4: Пароли — только student + break-glass admin

**Files:**
- Modify: `src/lib/portalAuth.ts`, `src/lib/portalAuth.test.ts`

- [ ] **Step 1: Обновить тест**

Заменить тело `src/lib/portalAuth.test.ts` на:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveRole } from './portalAuth';

describe('resolveRole', () => {
  beforeEach(() => {
    process.env.PORTAL_PWD_ADMIN = 'admin-pw';
    process.env.PORTAL_PWD_STUDENT = 'student-pw';
    delete process.env.PORTAL_PWD_TEACHER;
    delete process.env.PORTAL_PWD_VOZHATY;
    delete process.env.PORTAL_PWD_RUKOVODITEL;
  });

  it('сопоставляет код ученика и break-glass admin', () => {
    expect(resolveRole('admin-pw')).toBe('admin');
    expect(resolveRole('student-pw')).toBe('student');
  });

  it('пароли сотрудников больше не работают', () => {
    process.env.PORTAL_PWD_TEACHER = 'teacher-pw';
    expect(resolveRole('teacher-pw')).toBeNull();
  });

  it('возвращает null на неверный/пустой', () => {
    expect(resolveRole('nope')).toBeNull();
    expect(resolveRole('')).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `npm test -- portalAuth`
Expected: FAIL (teacher всё ещё резолвится).

- [ ] **Step 3: Изменить `src/lib/portalAuth.ts`**

В массиве `map` оставить только admin и student:

```ts
  const map: Array<[PortalRole, string | undefined]> = [
    ['admin', process.env.PORTAL_PWD_ADMIN],
    ['student', process.env.PORTAL_PWD_STUDENT],
  ];
```

- [ ] **Step 4: Запустить — проходит**

Run: `npm test -- portalAuth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/portalAuth.ts src/lib/portalAuth.test.ts
git commit -m "feat(portal): пароли только для ученика (код) и break-glass admin"
```

---

## Task 5: Эндпоинт `/api/portal/tg`

**Files:**
- Create: `src/pages/api/portal/tg.ts`

- [ ] **Step 1: Создать `src/pages/api/portal/tg.ts`**

```ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { verifyLoginWidget, verifyInitData, type TgUser } from '../../../lib/telegramAuth';
import { getStaff, ensurePending } from '../../../lib/portalStaff';
import { signSession } from '../../../lib/portalSession';

function botToken(): string {
  return process.env.PORTAL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
}

async function resolveTgUser(request: Request): Promise<{ user: TgUser | null; isMiniApp: boolean }> {
  const ct = request.headers.get('content-type') ?? '';
  let initData = '';
  let params: Record<string, string> = {};
  if (ct.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    if (typeof body.initData === 'string') initData = body.initData;
    else params = body as Record<string, string>;
  } else {
    const form = await request.formData();
    for (const [k, v] of form.entries()) params[k] = String(v);
    if (params.initData) initData = params.initData;
  }
  if (initData) return { user: verifyInitData(initData, botToken()), isMiniApp: true };
  return { user: verifyLoginWidget(params, botToken()), isMiniApp: false };
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user, isMiniApp } = await resolveTgUser(request);
  const fail = (status: number, msg: string) =>
    isMiniApp ? new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { 'Content-Type': 'application/json' } })
              : redirect(`/portal/login?tg=${msg}`, 303);
  if (!user) return fail(401, 'invalid');

  let staff = await getStaff(user.telegram_id);
  if (!staff) {
    staff = await ensurePending(user.telegram_id, user.name ?? null, user.username ?? null);
    return fail(403, 'pending');
  }
  if (!staff.active) return fail(403, 'revoked');
  if (!staff.role) return fail(403, 'pending');

  const token = signSession(staff.role, process.env.PORTAL_SESSION_SECRET ?? '', Date.now(), user.telegram_id);
  cookies.set('portal_session', token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
  });
  if (isMiniApp) return new Response(JSON.stringify({ ok: true, role: staff.role }), { headers: { 'Content-Type': 'application/json' } });
  return redirect('/portal/', 303);
};
```

- [ ] **Step 2: Добавить публичные пути в middleware**

В `src/middleware.ts` в `PORTAL_PUBLIC` добавить `'/api/portal/tg'` (вход должен быть доступен без сессии). (Полный гейт — Task 7.)

- [ ] **Step 3: Проверка типов/сборки**

Run: `cd /tmp/wt-portal-unify && npx astro check --minimal 2>&1 | grep -iE "tg.ts|portalStaff|telegramAuth" || echo "no new errors"`
Expected: нет ошибок в новых файлах.

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/portal/tg.ts src/middleware.ts
git commit -m "feat(portal): /api/portal/tg — вход через Telegram (widget + initData)"
```

---

## Task 6: Admin-API реестра `/api/portal/staff`

**Files:**
- Create: `src/pages/api/portal/staff.ts`

- [ ] **Step 1: Создать `src/pages/api/portal/staff.ts`**

```ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload, PORTAL_ROLES, type PortalRole } from '../../../lib/portalSession';
import { listStaff, setRole, setActive } from '../../../lib/portalStaff';

function requireAdmin(cookies: Parameters<APIRoute>[0]['cookies']): { sub?: number } | null {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  return p && p.role === 'admin' ? { sub: p.sub } : null;
}

export const GET: APIRoute = async ({ cookies }) => {
  if (!requireAdmin(cookies)) return new Response('Forbidden', { status: 403 });
  return new Response(JSON.stringify(await listStaff()), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const admin = requireAdmin(cookies);
  if (!admin) return new Response('Forbidden', { status: 403 });
  const form = await request.formData();
  const action = String(form.get('action') ?? '');
  const telegramId = Number(form.get('telegram_id'));
  if (!Number.isFinite(telegramId)) return new Response('bad telegram_id', { status: 400 });

  if (action === 'setRole') {
    const role = String(form.get('role') ?? '') as PortalRole;
    if (!PORTAL_ROLES.includes(role)) return new Response('bad role', { status: 400 });
    await setRole(telegramId, role, admin.sub ?? 0);
  } else if (action === 'deactivate') {
    await setActive(telegramId, false);
  } else if (action === 'reactivate') {
    await setActive(telegramId, true);
  } else {
    return new Response('bad action', { status: 400 });
  }
  return redirect('/portal/staff-admin', 303);
};
```

- [ ] **Step 2: Сборка**

Run: `npx astro check --minimal 2>&1 | grep -i "staff.ts" || echo "no new errors"`
Expected: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/portal/staff.ts
git commit -m "feat(portal): admin-API реестра сотрудников (list/setRole/deactivate)"
```

---

## Task 7: Отзыв доступа в middleware

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Добавить кэш и проверку active для сессий с sub**

В `src/middleware.ts`: импорт `verifySessionPayload` (вместо/в дополнение к `verifySession`) и `getStaff`. Кэш в модульной области:

```ts
import { verifySessionPayload } from './lib/portalSession';
import { getStaff } from './lib/portalStaff';

const staffActiveCache = new Map<number, { ok: boolean; role: string | null; exp: number }>();
const STAFF_CACHE_MS = 60_000;
```

В блоке гейта заменить получение роли на:

```ts
      const payload = verifySessionPayload(
        cookies.get('portal_session')?.value,
        process.env.PORTAL_SESSION_SECRET ?? '',
      );
      let role = payload?.role ?? null;
      // Для сотрудничьих сессий (есть sub) — проверяем active/role в БД (кэш 60с)
      if (role && payload?.sub) {
        const now = Date.now();
        let c = staffActiveCache.get(payload.sub);
        if (!c || c.exp < now) {
          const staff = await getStaff(payload.sub);
          c = { ok: !!staff?.active && !!staff?.role, role: staff?.role ?? null, exp: now + STAFF_CACHE_MS };
          staffActiveCache.set(payload.sub, c);
        }
        if (!c.ok || c.role !== role) role = null;
      }
      if (!role) {
        if (path.startsWith('/api/')) return new Response('Unauthorized', { status: 401 });
        const location = `/portal/login?next=${encodeURIComponent(path)}`;
        return new Response(null, { status: 302, headers: { Location: location } });
      }
      locals.portalRole = role;
```

(остальной гейт и `PORTAL_PUBLIC` — без изменений).

- [ ] **Step 2: Сборка/типы**

Run: `npx astro check --minimal 2>&1 | grep -i "middleware" || echo "no new errors"`
Expected: нет ошибок.

- [ ] **Step 3: Ручная проверка деградации без БД**

Без `PG_DSN` `getStaff` вернёт null → сотрудничья сессия станет невалидной (ожидаемо: на dev/прод DSN есть). Проверить, что ученик/admin (без sub) работают как раньше:
```bash
PORTAL_SESSION_SECRET=x PORTAL_PWD_STUDENT=s npm run dev & sleep 5
curl -s -c /tmp/c -X POST -d "password=s&next=/portal/" http://localhost:4321/api/portal/login -o /dev/null
curl -s -b /tmp/c -o /dev/null -w "hub=%{http_code}\n" http://localhost:4321/portal/
kill %1 2>/dev/null
```
Expected: `hub=200` (сессия без sub в БД не ходит).

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(portal): отзыв доступа сотрудников — проверка active в middleware (кэш 60с)"
```

---

## Task 8: Страница входа — Telegram + код ученика

**Files:**
- Modify: `src/pages/portal/login.astro`

- [ ] **Step 1: Обновить `login.astro`**

Добавить: Telegram Login Widget (через env `PORTAL_BOT_USERNAME`), разделитель, раскрывающееся поле «код ученика» (существующая форма на `/api/portal/login`), и сообщения по `?tg=pending|revoked|invalid`. Сохранить брендстиль, без эмодзи.

```astro
---
export const prerender = false;
import PortalLayout from '../../layouts/PortalLayout.astro';
const error = Astro.url.searchParams.get('error');
const tg = Astro.url.searchParams.get('tg');
const next = Astro.url.searchParams.get('next') ?? '/portal/';
const botUser = import.meta.env.PORTAL_BOT_USERNAME || process.env.PORTAL_BOT_USERNAME || '';
const tgMsg = tg === 'pending' ? 'Заявка отправлена — ждите подтверждения администратором.'
  : tg === 'revoked' ? 'Доступ отозван. Обратитесь к администратору.'
  : tg === 'invalid' ? 'Не удалось проверить вход через Telegram. Попробуйте ещё раз.' : '';
---
<PortalLayout title="Вход" showHeader={false}>
  <div class="mx-auto max-w-sm pt-12">
    <h1 class="mb-2 text-2xl font-bold">Вход в портал</h1>
    {tgMsg && <div class="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[15px] text-amber-800">{tgMsg}</div>}

    <!-- Сотрудники -->
    <p class="mb-2 text-[16px] text-body-muted">Сотрудники — через Telegram:</p>
    {botUser ? (
      <script async src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-login={botUser} data-size="large" data-userpic="false"
        data-auth-url="/api/portal/tg" data-request-access="write"></script>
    ) : (
      <div class="rounded-lg bg-red-50 px-3 py-2 text-[15px] text-red-700">Бот не настроен (PORTAL_BOT_USERNAME).</div>
    )}

    <!-- Ученики -->
    <details class="mt-8">
      <summary class="cursor-pointer text-[16px] font-medium text-primary">Я ученик — войти по коду</summary>
      {error && <div class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[15px] text-red-700">Неверный код</div>}
      <form method="POST" action="/api/portal/login" class="mt-3 space-y-3">
        <input type="hidden" name="next" value={next} />
        <input type="password" name="password" required placeholder="Код"
          class="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-primary focus:outline-none" />
        <button type="submit" class="w-full rounded-lg bg-navy-950 px-4 py-3 font-semibold text-white">Войти</button>
      </form>
    </details>
  </div>
</PortalLayout>
```

- [ ] **Step 2: Сборка**

Run: `npm run build 2>&1 | tail -5`
Expected: успех (guard по эмодзи/banned проходит).

- [ ] **Step 3: Ручная проверка кода ученика (без бота)**

```bash
PORTAL_SESSION_SECRET=x PORTAL_PWD_STUDENT=s npm run dev & sleep 5
curl -s http://localhost:4321/portal/login | grep -c "войти по коду"
kill %1 2>/dev/null
```
Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/portal/login.astro
git commit -m "feat(portal): вход — Telegram-виджет для сотрудников + код для учеников"
```

---

## Task 9: Мини-админка `/portal/staff-admin`

**Files:**
- Create: `src/pages/portal/staff-admin.astro`
- Modify: `src/pages/portal/index.astro` (карточка для admin)

- [ ] **Step 1: Создать `src/pages/portal/staff-admin.astro`**

SSR, только admin (гейт уже пускает только с ролью; дополнительно проверяем `locals.portalRole==='admin'`).

```astro
---
export const prerender = false;
import PortalLayout from '../../layouts/PortalLayout.astro';
import { listStaff } from '../../lib/portalStaff';
if (Astro.locals.portalRole !== 'admin') return Astro.redirect('/portal/');
const staff = await listStaff();
const pending = staff.filter((s) => !s.role);
const active = staff.filter((s) => s.role && s.active);
const inactive = staff.filter((s) => s.role && !s.active);
const ROLES = ['teacher', 'vozhaty', 'rukovoditel', 'admin'];
---
<PortalLayout title="Сотрудники">
  <h1 class="mb-6 text-2xl font-bold">Сотрудники</h1>

  <section class="mb-8">
    <h2 class="mb-3 text-lg font-semibold">Заявки ({pending.length})</h2>
    {pending.length === 0 && <p class="text-body-muted">Нет заявок.</p>}
    {pending.map((s) => (
      <form method="POST" action="/api/portal/staff" class="mb-2 flex items-center gap-2 rounded-lg border border-border bg-white p-3">
        <input type="hidden" name="telegram_id" value={s.telegram_id} />
        <input type="hidden" name="action" value="setRole" />
        <span class="min-w-0 flex-1">{s.full_name ?? '—'} {s.tg_username ? `@${s.tg_username}` : ''} <span class="text-body-muted">#{s.telegram_id}</span></span>
        <select name="role" class="rounded border border-slate-300 px-2 py-1 text-[15px]">{ROLES.map((r) => <option value={r}>{r}</option>)}</select>
        <button class="rounded bg-primary px-3 py-1 text-[15px] font-medium text-white">Назначить</button>
      </form>
    ))}
  </section>

  <section class="mb-8">
    <h2 class="mb-3 text-lg font-semibold">Активные ({active.length})</h2>
    {active.map((s) => (
      <div class="mb-2 flex items-center gap-2 rounded-lg border border-border bg-white p-3">
        <span class="min-w-0 flex-1">{s.full_name ?? '—'} {s.tg_username ? `@${s.tg_username}` : ''} — <b>{s.role}</b></span>
        <form method="POST" action="/api/portal/staff">
          <input type="hidden" name="telegram_id" value={s.telegram_id} />
          <input type="hidden" name="action" value="deactivate" />
          <button class="rounded border border-red-300 px-3 py-1 text-[15px] text-red-700">Отключить</button>
        </form>
      </div>
    ))}
  </section>

  <section>
    <h2 class="mb-3 text-lg font-semibold">Отключённые ({inactive.length})</h2>
    {inactive.map((s) => (
      <div class="mb-2 flex items-center gap-2 rounded-lg border border-border bg-white p-3 opacity-70">
        <span class="min-w-0 flex-1">{s.full_name ?? '—'} — {s.role}</span>
        <form method="POST" action="/api/portal/staff">
          <input type="hidden" name="telegram_id" value={s.telegram_id} />
          <input type="hidden" name="action" value="reactivate" />
          <button class="rounded border border-slate-300 px-3 py-1 text-[15px]">Включить</button>
        </form>
      </div>
    ))}
  </section>
</PortalLayout>
```

- [ ] **Step 2: Карточка в хабе для admin**

В `src/pages/portal/index.astro` в группе «Сотрудникам смены» (или новой группе с `roles:['admin']`) добавить карточку:

```ts
{ title: 'Управление сотрудниками', href: '/portal/staff-admin', desc: 'Заявки, роли, отзыв доступа', icon: 'people-fill' },
```
(использует href без `${BASE}` — относительный). Если карточка внутренняя, можно не открывать в новой вкладке — допустимо оставить как есть (target=_blank).

- [ ] **Step 3: Сборка**

Run: `npm run build 2>&1 | tail -5`
Expected: успех.

- [ ] **Step 4: Commit**

```bash
git add src/pages/portal/staff-admin.astro src/pages/portal/index.astro
git commit -m "feat(portal): мини-админка сотрудников + карточка в хабе"
```

---

## Task 10: Применение на dev (миграция, env, бот)

**Files:** — (сервер)

- [ ] **Step 1: Применить миграцию на dev**

```bash
scp -i ~/.ssh/aidacamp_prod scripts/portal-staff-migration.sql root@159.194.223.55:/tmp/
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 'set -a; . /var/www/aidacamp-dev/.env; set +a; psql "$AIDAPLUS_PG_DSN" -f /tmp/portal-staff-migration.sql 2>&1 | tail -3 || psql "$PG_DSN" -f /tmp/portal-staff-migration.sql'
```
Expected: `CREATE TABLE` / `CREATE INDEX` (или «already exists»).

- [ ] **Step 2: Добавить env на dev**

В `/var/www/aidacamp-dev/.env` добавить `PORTAL_BOT_USERNAME=<username из Task 0>`. Убрать `PORTAL_PWD_TEACHER/VOZHATY/RUKOVODITEL` (по желанию — они уже не используются). `systemctl restart aidacamp-dev`.

- [ ] **Step 3: BotFather домен**

Контроллер/владелец: в BotFather `/setdomain` → `dev.aidacamp.ru` (для теста виджета) либо договориться о домене. (Шаг владельца — описать в отчёте.)

- [ ] **Step 4: Smoke вход первого сотрудника (pending)**

После деплоя (Task 11): открыть `/portal/login`, войти Telegram → ожидать «заявка отправлена». В БД появится pending-строка:
```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 'set -a; . /var/www/aidacamp-dev/.env; set +a; psql "$AIDAPLUS_PG_DSN" -c "SELECT telegram_id, full_name, role, active FROM portal_staff;"'
```
Expected: строка с `role=NULL`.

---

## Task 11: Деплой dev + проверка

**Files:** —

- [ ] **Step 1: Сборка + тесты**

Run: `cd /tmp/wt-portal-unify && npm test 2>&1 | tail -4 && npm run build 2>&1 | tail -5`
Expected: тесты зелёные, build ок.

- [ ] **Step 2: PR в dev + мёрдж + деплой**

```bash
git push origin agent/portal-phase2
gh pr create --base dev --title "feat(portal): Фаза 2 — Telegram-вход + база сотрудников" --body "См. спеку Фазы 2"
# мёрдж + деплой dev — мастер-агент/владелец
```

- [ ] **Step 3: Проверка ролей**

Ученик по коду заходит; admin (break-glass) заходит и видит `/portal/staff-admin`; после назначения роли сотруднику его TG-вход даёт доступ; деактивация закрывает доступ ≤60с.

---

## Task 12: Прод (СТОП до апрува)

**Files:** — (сервер)

- [ ] **Step 1:** Применить миграцию + env (`PORTAL_BOT_USERNAME`) на прод; BotFather домен `aidacamp.ru`.
- [ ] **Step 2:** PR `dev → main`, мёрдж, `./scripts/deploy.sh prod` — **только после явного «выкатываем»**.
- [ ] **Step 3:** Smoke на `https://aidacamp.ru/portal/`.

---

## Self-review (выполнено при написании плана)

- **Покрытие спеки:** §4 таблица → Task 1; §5 проверка подписи → Task 2; §6 эндпоинты → Task 5/6; §7 источник роли/отзыв → Task 3/4/7; §8 UX входа → Task 8; §9 админка → Task 9; §10 env/бот → Task 0/10; §11 выкат → Task 11/12; §12 риски (чей токен, домен) → Task 0. Покрыто.
- **Плейсхолдеры:** нет TBD/TODO; весь код приведён.
- **Согласованность типов:** `PortalRole`, `signSession(role,secret,now?,sub?)`, `verifySessionPayload`, `verifyLoginWidget/verifyInitData`, `TgUser{telegram_id,username?,name?}`, `getStaff/ensurePending/listStaff/setRole/setActive`, `StaffRow`, cookie `portal_session`, env `PORTAL_BOT_TOKEN||TELEGRAM_BOT_TOKEN`, `PORTAL_BOT_USERNAME` — едины во всех задачах.
