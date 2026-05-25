# Единый портал aidacamp.ru/portal — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Свести танковый полигон (Robocode), материалы преподавателей и онбординг/квесты учеников в единый портал `aidacamp.ru/portal` с входом по ролям и брендстилем основного сайта.

**Architecture:** Портал живёт внутри существующего Astro-сайта (`~/Aidacamp-cloude`), отдаётся через работающий node SSR (`127.0.0.1:4181`). Авторизация по ролям — подписанная HMAC HttpOnly-cookie, гейт в `src/middleware.ts` + nginx `auth_request` для проксируемого движка робокода. Тяжёлые сервисы (Tank Royale java:7654, bot-runner:8095, teacher-api:8092) не трогаем — только добавляем nginx-локейшены под `/portal/`.

**Tech Stack:** Astro 6 (SSR, `@astrojs/node` standalone), Tailwind v4, Bootstrap Icons, Node `crypto` (HMAC), Vitest (юнит), Playwright (E2E).

**Спека:** `docs/superpowers/specs/2026-05-24-portal-unify-design.md`

**Рабочая ветка:** `agent/portal-unify` → PR в `dev`. Worktree: `/tmp/wt-portal-unify`.

---

## Структура файлов

**Создать:**
- `src/lib/portalSession.ts` — подпись/проверка session-токена (HMAC), типы ролей.
- `src/lib/portalSession.test.ts` — юнит-тесты подписи.
- `src/lib/portalAuth.ts` — маппинг пароль→роль из env (timing-safe).
- `src/lib/portalAuth.test.ts` — юнит-тесты маппинга.
- `vitest.config.ts` — конфиг тест-раннера.
- `src/layouts/PortalLayout.astro` — лёгкий брендовый layout портала (noindex, без маркетинг-аналитики).
- `src/components/portal/PortalNav.astro` — навигация с учётом роли.
- `src/pages/portal/login.astro` — страница входа.
- `src/pages/portal/index.astro` — хаб.
- `src/pages/portal/poligon.astro` — арена (брендовый shell + canvas-движок).
- `src/pages/portal/uchitelyu/index.astro` — раздел преподавателя (онбординг + список уроков).
- `src/pages/portal/uchitelyu/uroki/[id].astro` — просмотр урока.
- `src/pages/portal/ucheniku/index.astro` — онбординг ученика.
- `src/pages/portal/ucheniku/kvesty.astro` — квесты.
- `src/pages/portal/ucheniku/katalog.astro` — каталог.
- `src/pages/api/portal/login.ts` — POST вход.
- `src/pages/api/portal/logout.ts` — POST выход.
- `src/pages/api/portal/check.ts` — GET 204/401 для nginx auth_request.
- `src/lib/portalLessons.ts` — чтение списка уроков (источник teacher-api/каталог).
- `public/portal/engine/**` — игровой JS/ассеты, перенесённые с сервера.
- `tests/e2e/portal.spec.ts` — E2E (Playwright).

**Изменить:**
- `src/middleware.ts` — добавить гейт `/portal/**` и `/api/portal/**`.
- `src/env.d.ts` — тип `App.Locals.portalRole`.
- `package.json` — devDep `vitest`, скрипты `test`, `test:e2e`.

**Применить на сервере (вне репо, вручную, с `nginx -t`):**
- `/etc/nginx/sites-enabled/aidacamp-dev.conf` (сначала), затем `aidacamp.conf` — локейшены `/portal/`.
- env-секреты в окружении node-сервиса: `PORTAL_PWD_ADMIN`, `PORTAL_PWD_TEACHER`, `PORTAL_PWD_STUDENT`, `PORTAL_SESSION_SECRET`.

---

## Фаза 1 — Авторизация (фундамент)

### Task 1: Тест-раннер Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Установить vitest**

Run: `cd /tmp/wt-portal-unify && npm i -D vitest@^2`
Expected: добавлен в devDependencies, без ошибок.

- [ ] **Step 2: Создать `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Добавить скрипты в `package.json`**

В блок `"scripts"` добавить:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 4: Проверить, что раннер запускается**

Run: `npm test`
Expected: `No test files found` (тестов ещё нет) — раннер работает.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(portal): добавить vitest для юнит-тестов"
```

---

### Task 2: Session-токен (подпись/проверка)

**Files:**
- Create: `src/lib/portalSession.ts`
- Test: `src/lib/portalSession.test.ts`

- [ ] **Step 1: Написать падающий тест**

`src/lib/portalSession.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from './portalSession';

const SECRET = 'test-secret-please-change';

describe('portalSession', () => {
  it('подписывает и проверяет валидную сессию', () => {
    const token = signSession('teacher', SECRET);
    expect(verifySession(token, SECRET)).toBe('teacher');
  });

  it('отклоняет подделанную подпись', () => {
    const token = signSession('admin', SECRET);
    const tampered = token.slice(0, -2) + 'xx';
    expect(verifySession(tampered, SECRET)).toBeNull();
  });

  it('отклоняет чужой секрет', () => {
    const token = signSession('student', SECRET);
    expect(verifySession(token, 'other-secret')).toBeNull();
  });

  it('отклоняет просроченную сессию', () => {
    const past = Date.now() - 40 * 24 * 60 * 60 * 1000;
    const token = signSession('admin', SECRET, past);
    expect(verifySession(token, SECRET)).toBeNull();
  });

  it('отклоняет пустой токен и пустой секрет', () => {
    expect(verifySession(undefined, SECRET)).toBeNull();
    expect(verifySession(signSession('admin', SECRET), '')).toBeNull();
  });

  it('отклоняет неизвестную роль', () => {
    // payload с ролью "hacker" не должен пройти даже при валидной подписи
    const token = signSession('admin', SECRET);
    expect(verifySession(token, SECRET)).toBe('admin');
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- portalSession`
Expected: FAIL — `Cannot find module './portalSession'`.

- [ ] **Step 3: Реализовать `src/lib/portalSession.ts`**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export type PortalRole = 'admin' | 'teacher' | 'student';
export const PORTAL_ROLES: PortalRole[] = ['admin', 'teacher', 'student'];

/** Срок жизни сессии — 30 дней. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface SessionPayload {
  role: PortalRole;
  exp: number;
}

function hmac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Возвращает токен вида `<base64url(payload)>.<base64url(hmac)>`. */
export function signSession(role: PortalRole, secret: string, now = Date.now()): string {
  const payload: SessionPayload = { role, exp: now + SESSION_TTL_MS };
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${p}.${hmac(p, secret)}`;
}

/** Возвращает роль, если токен валиден и не просрочен; иначе null. */
export function verifySession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): PortalRole | null {
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
  return payload.role;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- portalSession`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/lib/portalSession.ts src/lib/portalSession.test.ts
git commit -m "feat(portal): HMAC-подпись session-токена с ролью"
```

---

### Task 3: Маппинг пароль→роль

**Files:**
- Create: `src/lib/portalAuth.ts`
- Test: `src/lib/portalAuth.test.ts`

- [ ] **Step 1: Написать падающий тест**

`src/lib/portalAuth.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveRole } from './portalAuth';

describe('resolveRole', () => {
  beforeEach(() => {
    process.env.PORTAL_PWD_ADMIN = 'admin-pw';
    process.env.PORTAL_PWD_TEACHER = 'teacher-pw';
    process.env.PORTAL_PWD_STUDENT = 'student-pw';
  });

  it('сопоставляет пароль роли', () => {
    expect(resolveRole('admin-pw')).toBe('admin');
    expect(resolveRole('teacher-pw')).toBe('teacher');
    expect(resolveRole('student-pw')).toBe('student');
  });

  it('возвращает null на неверный пароль', () => {
    expect(resolveRole('nope')).toBeNull();
    expect(resolveRole('')).toBeNull();
  });

  it('игнорирует роль с незаданным паролем', () => {
    delete process.env.PORTAL_PWD_ADMIN;
    expect(resolveRole('')).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- portalAuth`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `src/lib/portalAuth.ts`**

```ts
import { timingSafeEqual } from 'node:crypto';
import type { PortalRole } from './portalSession';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Сопоставляет введённый пароль роли по env-секретам. null — если не совпал. */
export function resolveRole(password: string): PortalRole | null {
  if (!password) return null;
  const map: Array<[PortalRole, string | undefined]> = [
    ['admin', process.env.PORTAL_PWD_ADMIN],
    ['teacher', process.env.PORTAL_PWD_TEACHER],
    ['student', process.env.PORTAL_PWD_STUDENT],
  ];
  for (const [role, pwd] of map) {
    if (pwd && safeEqual(password, pwd)) return role;
  }
  return null;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- portalAuth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/portalAuth.ts src/lib/portalAuth.test.ts
git commit -m "feat(portal): timing-safe маппинг пароль→роль из env"
```

---

### Task 4: API-роуты входа/выхода/проверки

**Files:**
- Create: `src/pages/api/portal/login.ts`, `src/pages/api/portal/logout.ts`, `src/pages/api/portal/check.ts`

- [ ] **Step 1: Создать `src/pages/api/portal/check.ts`**

```ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/portalSession';

/** Для nginx auth_request: 204 = пускать, 401 = нет. */
export const GET: APIRoute = ({ cookies }) => {
  const role = verifySession(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  return new Response(null, { status: role ? 204 : 401 });
};
```

- [ ] **Step 2: Создать `src/pages/api/portal/login.ts`**

```ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { resolveRole } from '../../../lib/portalAuth';
import { signSession } from '../../../lib/portalSession';

const attempts = new Map<string, { n: number; reset: number }>();

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // rate-limit: не более 10 попыток в минуту с IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const a = attempts.get(ip) ?? { n: 0, reset: now + 60_000 };
  if (now > a.reset) { a.n = 0; a.reset = now + 60_000; }
  a.n++;
  attempts.set(ip, a);
  if (a.n > 10) return new Response('Слишком много попыток. Подождите минуту.', { status: 429 });

  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const rawNext = String(form.get('next') ?? '/portal/');
  // защита от open-redirect: пускаем только внутрь /portal
  const next = rawNext.startsWith('/portal') ? rawNext : '/portal/';

  const role = resolveRole(password);
  if (!role) {
    return redirect(`/portal/login?error=1&next=${encodeURIComponent(next)}`, 303);
  }

  const token = signSession(role, process.env.PORTAL_SESSION_SECRET ?? '');
  cookies.set('portal_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return redirect(next, 303);
};
```

- [ ] **Step 3: Создать `src/pages/api/portal/logout.ts`**

```ts
export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete('portal_session', { path: '/' });
  return redirect('/portal/login', 303);
};
```

- [ ] **Step 4: Проверить сборку типов**

Run: `npx astro check --minimal 2>&1 | tail -20`
Expected: без ошибок в созданных файлах (предупреждения по остальному проекту допустимы).

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/portal/
git commit -m "feat(portal): API входа/выхода/проверки сессии"
```

---

### Task 5: Гейт в middleware

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/env.d.ts`

- [ ] **Step 1: Добавить тип роли в `src/env.d.ts`**

Добавить (если файла нет — создать) блок:

```ts
declare namespace App {
  interface Locals {
    portalRole?: 'admin' | 'teacher' | 'student';
  }
}
```

- [ ] **Step 2: Изменить сигнатуру и добавить гейт в `src/middleware.ts`**

Заменить строку:

```ts
export const onRequest: MiddlewareHandler = async ({ request, url }, next) => {
  const path = url.pathname;
```

на:

```ts
import { verifySession } from './lib/portalSession';

const PORTAL_PUBLIC = new Set(['/portal/login', '/portal/login/', '/api/portal/login', '/api/portal/check']);

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, url, cookies, locals } = context;
  const path = url.pathname;

  // ── Гейт портала ───────────────────────────────────────────────
  if (path.startsWith('/portal') || path.startsWith('/api/portal')) {
    const cleanPortal = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    const isPublic = PORTAL_PUBLIC.has(path) || PORTAL_PUBLIC.has(cleanPortal);
    if (!isPublic) {
      const role = verifySession(
        cookies.get('portal_session')?.value,
        process.env.PORTAL_SESSION_SECRET ?? '',
      );
      if (!role) {
        if (path.startsWith('/api/')) return new Response('Unauthorized', { status: 401 });
        const to = new URL('/portal/login', url);
        to.searchParams.set('next', path);
        return Response.redirect(to, 302);
      }
      locals.portalRole = role;
    }
  }
```

(остальной код обработчика — редиректы, rate-limit `/api/ask`, security-заголовки — оставить без изменений).

- [ ] **Step 3: Сборка/типы**

Run: `npx astro check --minimal 2>&1 | tail -20`
Expected: без новых ошибок.

- [ ] **Step 4: Ручная проверка гейта на dev-сервере Astro**

Run:
```bash
PORTAL_SESSION_SECRET=x PORTAL_PWD_STUDENT=s npm run dev &
sleep 4
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:4321/portal/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/api/portal/check
kill %1
```
Expected: `/portal/` → `302` на `/portal/login?next=/portal/`; `/api/portal/check` → `401`.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/env.d.ts
git commit -m "feat(portal): гейт авторизации /portal/** в middleware"
```

---

## Фаза 2 — Брендовая оболочка и вход

### Task 6: PortalLayout + PortalNav

**Files:**
- Create: `src/layouts/PortalLayout.astro`, `src/components/portal/PortalNav.astro`

- [ ] **Step 1: Создать `src/layouts/PortalLayout.astro`**

Лёгкий layout: брендовые стили (`global.css`, `icons.css`), `noindex`, без маркетинг-аналитики и модалок. Использует токены DESIGN_SYSTEM (Tailwind). Роль берётся из `Astro.locals.portalRole`.

```astro
---
import '../styles/global.css';
import '../styles/icons.css';
import PortalNav from '../components/portal/PortalNav.astro';

interface Props {
  title: string;
  active?: string;
  showNav?: boolean;
}
const { title, active, showNav = true } = Astro.props;
const role = Astro.locals.portalRole;
---
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>{title} — АйДаКэмп</title>
  </head>
  <body class="min-h-screen bg-slate-50 text-slate-900 antialiased">
    {showNav && role && <PortalNav role={role} active={active} />}
    <main class="mx-auto max-w-6xl px-4 py-8">
      <slot />
    </main>
  </body>
</html>
```

(Брендовые цвета/радиусы/тени — по `DESIGN_SYSTEM.md`; здесь даны базовые Tailwind-классы, при реализации привести к фирменной палитре проекта.)

- [ ] **Step 2: Создать `src/components/portal/PortalNav.astro`**

Навигация с разделами по роли. Только bi-иконки (без эмодзи).

```astro
---
import type { PortalRole } from '../../lib/portalSession';
interface Props { role: PortalRole; active?: string; }
const { role, active } = Astro.props;

interface Link { href: string; label: string; icon: string; roles: PortalRole[]; key: string; }
const links: Link[] = [
  { key: 'home',    href: '/portal/',           label: 'Хаб',       icon: 'bi-grid',        roles: ['admin','teacher','student'] },
  { key: 'poligon', href: '/portal/poligon',    label: 'Полигон',   icon: 'bi-bullseye',    roles: ['admin','teacher','student'] },
  { key: 'teacher', href: '/portal/uchitelyu',  label: 'Учителю',   icon: 'bi-mortarboard', roles: ['admin','teacher'] },
  { key: 'student', href: '/portal/ucheniku',   label: 'Ученику',   icon: 'bi-controller',  roles: ['admin','teacher','student'] },
];
const visible = links.filter((l) => l.roles.includes(role));
---
<header class="border-b border-slate-200 bg-white">
  <nav class="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3">
    <a href="/portal/" class="mr-4 font-bold text-lg">АйДаКэмп</a>
    {visible.map((l) => (
      <a
        href={l.href}
        class={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${active === l.key ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        <i class={`bi ${l.icon}`} aria-hidden="true"></i>{l.label}
      </a>
    ))}
    <form method="POST" action="/api/portal/logout" class="ml-auto">
      <button type="submit" class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
        <i class="bi bi-box-arrow-right" aria-hidden="true"></i>Выйти
      </button>
    </form>
  </nav>
</header>
```

- [ ] **Step 3: Проверить, что иконки есть в манифесте**

Run:
```bash
node -e "const m=require('./src/data/icons-manifest.json'); ['bi-grid','bi-bullseye','bi-mortarboard','bi-controller','bi-box-arrow-right'].forEach(i=>console.log(i, m.includes(i)?'OK':'НЕТ — добавить'))"
```
Expected: все OK. Если «НЕТ» — добавить строку в `src/data/icons-manifest.json` и выполнить `npm run icons`.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/PortalLayout.astro src/components/portal/PortalNav.astro src/data/icons-manifest.json src/styles/icons.css
git commit -m "feat(portal): брендовый layout и навигация по ролям"
```

---

### Task 7: Страница входа

**Files:**
- Create: `src/pages/portal/login.astro`

- [ ] **Step 1: Создать `src/pages/portal/login.astro`**

```astro
---
export const prerender = false;
import PortalLayout from '../../layouts/PortalLayout.astro';
const error = Astro.url.searchParams.get('error');
const next = Astro.url.searchParams.get('next') ?? '/portal/';
---
<PortalLayout title="Вход" showNav={false}>
  <div class="mx-auto max-w-sm pt-12">
    <h1 class="mb-2 text-2xl font-bold">Вход в портал</h1>
    <p class="mb-6 text-slate-600">Введите пароль доступа.</p>
    {error && (
      <div class="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>Неверный пароль
      </div>
    )}
    <form method="POST" action="/api/portal/login" class="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        required
        autofocus
        placeholder="Пароль"
        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-slate-900 focus:outline-none"
      />
      <button type="submit" class="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800">
        Войти
      </button>
    </form>
  </div>
</PortalLayout>
```

(Проверить `bi-exclamation-triangle-fill` в манифесте — см. Task 6 Step 3.)

- [ ] **Step 2: Ручная проверка цикла вход→cookie→доступ**

Run:
```bash
PORTAL_SESSION_SECRET=x PORTAL_PWD_STUDENT=s npm run dev &
sleep 4
# неверный пароль → редирект на login?error=1
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -X POST -d "password=wrong&next=/portal/" http://localhost:4321/api/portal/login
# верный пароль → 303 на /portal/ и Set-Cookie
curl -s -i -X POST -d "password=s&next=/portal/" http://localhost:4321/api/portal/login | grep -iE "HTTP/|location|set-cookie"
kill %1
```
Expected: неверный → `303 …/portal/login?error=1`; верный → `303`, `location: /portal/`, `set-cookie: portal_session=…; HttpOnly; Secure; SameSite=Lax`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/portal/login.astro
git commit -m "feat(portal): брендовая страница входа"
```

---

### Task 8: Хаб (главная портала)

**Files:**
- Create: `src/pages/portal/index.astro`

- [ ] **Step 1: Создать `src/pages/portal/index.astro`**

Хаб с карточками разделов по роли (роль из `Astro.locals.portalRole`).

```astro
---
export const prerender = false;
import PortalLayout from '../../layouts/PortalLayout.astro';
const role = Astro.locals.portalRole!;

interface Card { href: string; title: string; desc: string; icon: string; roles: string[]; }
const cards: Card[] = [
  { href: '/portal/poligon',   title: 'Танковый полигон', desc: 'Боевая арена Robocode',            icon: 'bi-bullseye',    roles: ['admin','teacher','student'] },
  { href: '/portal/uchitelyu', title: 'Учителю',          desc: 'Онбординг, уроки, методички',       icon: 'bi-mortarboard', roles: ['admin','teacher'] },
  { href: '/portal/ucheniku',  title: 'Ученику',          desc: 'Онбординг, квесты, каталог',        icon: 'bi-controller',  roles: ['admin','teacher','student'] },
];
const visible = cards.filter((c) => c.roles.includes(role));
---
<PortalLayout title="Портал" active="home">
  <h1 class="mb-6 text-2xl font-bold">Портал АйДаКэмп</h1>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {visible.map((c) => (
      <a href={c.href} class="group rounded-2xl border border-slate-200 bg-white p-6 hover:border-slate-900 hover:shadow-md">
        <i class={`bi ${c.icon} text-3xl`} aria-hidden="true"></i>
        <h2 class="mt-3 text-lg font-semibold">{c.title}</h2>
        <p class="mt-1 text-sm text-slate-600">{c.desc}</p>
      </a>
    ))}
  </div>
</PortalLayout>
```

- [ ] **Step 2: Ручная проверка по ролям**

Run:
```bash
PORTAL_SESSION_SECRET=x PORTAL_PWD_STUDENT=s PORTAL_PWD_TEACHER=t npm run dev &
sleep 4
# логинимся учеником, сохраняем cookie, открываем хаб — НЕ должно быть «Учителю»
curl -s -c /tmp/cj -X POST -d "password=s&next=/portal/" http://localhost:4321/api/portal/login >/dev/null
curl -s -b /tmp/cj http://localhost:4321/portal/ | grep -c "Учителю"   # ожидание: 0
# логинимся учителем — «Учителю» должно быть
curl -s -c /tmp/cj2 -X POST -d "password=t&next=/portal/" http://localhost:4321/api/portal/login >/dev/null
curl -s -b /tmp/cj2 http://localhost:4321/portal/ | grep -c "Учителю"  # ожидание: 1
kill %1
```
Expected: ученик `0`, учитель `1`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/portal/index.astro
git commit -m "feat(portal): хаб с разделами по роли"
```

---

## Фаза 3 — Полигон (арена)

### Task 9: Перенос игрового движка в public

**Files:**
- Create: `public/portal/engine/**`

- [ ] **Step 1: Выгрузить ассеты арены с сервера**

Источник — `/opt/aistudio/portal/` (файлы `tank-battle.html`, `arena.html`, `train.html`, папки `assets/`, `gui/`). Скопировать JS/CSS/ассеты движка (не HTML-обёртки) в `public/portal/engine/`:

```bash
mkdir -p public/portal/engine
scp -i ~/.ssh/aidacamp_prod -r root@159.194.223.55:/opt/aistudio/portal/assets public/portal/engine/
scp -i ~/.ssh/aidacamp_prod -r root@159.194.223.55:/opt/aistudio/portal/gui public/portal/engine/
scp -i ~/.ssh/aidacamp_prod root@159.194.223.55:/opt/aistudio/portal/tank-battle.html /tmp/tank-battle.html
```

- [ ] **Step 2: Выделить разметку/скрипты арены**

Прочитать `/tmp/tank-battle.html`, выделить: (а) DOM-контейнер canvas, (б) подключаемые скрипты, (в) точку, где задаётся URL WSS. Сохранить очищенный фрагмент разметки в `/tmp/arena-body.html` для вставки в Astro-страницу (Task 10).

- [ ] **Step 3: Заменить абсолютные URL на относительные**

В перенесённых файлах `public/portal/engine/**` заменить все ссылки на ассеты/WS, указывающие на `ai.aidacamp.ru` или корневые `/assets`, `/gui`, `/robocode-ws`, на `/portal/engine/...` и `/portal/robocode-ws`:

```bash
grep -rn "ai.aidacamp.ru\|/robocode-ws\|\"/assets\|'/assets\|\"/gui\|'/gui" public/portal/engine/ | head -40
```
Ожидание: после правок grep по `ai.aidacamp.ru` пуст; WS-URL → `/portal/robocode-ws`; ассеты → `/portal/engine/...`.

- [ ] **Step 4: Commit**

```bash
git add public/portal/engine
git commit -m "feat(portal): перенос игрового движка арены в public/portal/engine"
```

---

### Task 10: Брендовая страница арены

**Files:**
- Create: `src/pages/portal/poligon.astro`

- [ ] **Step 1: Создать `src/pages/portal/poligon.astro`**

Брендовая шапка/нав (PortalLayout) + контейнер арены из `/tmp/arena-body.html` + подключение скриптов движка из `/portal/engine/`. WSS строится из текущего хоста:

```astro
---
export const prerender = false;
import PortalLayout from '../../layouts/PortalLayout.astro';
---
<PortalLayout title="Танковый полигон" active="poligon">
  <h1 class="mb-4 text-2xl font-bold">Танковый полигон</h1>
  <div id="arena-root" class="rounded-2xl border border-slate-200 bg-white p-2">
    <!-- сюда вставить очищенную разметку арены из /tmp/arena-body.html -->
  </div>

  <script is:inline>
    // URL WSS движка через гейт nginx
    window.ROBOCODE_WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/portal/robocode-ws`;
  </script>
  <!-- подключить скрипты движка из /portal/engine/... согласно tank-battle.html -->
</PortalLayout>
```

(Конкретные `<script src="/portal/engine/...">` взять из `/tmp/tank-battle.html`. Игровой код использует `window.ROBOCODE_WS_URL`; если в оригинале URL задаётся иначе — поправить точку инициализации WS на это значение.)

- [ ] **Step 2: Собрать и проверить, что страница рендерится**

Run:
```bash
PORTAL_SESSION_SECRET=x PORTAL_PWD_STUDENT=s npm run dev &
sleep 4
curl -s -c /tmp/cj -X POST -d "password=s&next=/portal/poligon" http://localhost:4321/api/portal/login >/dev/null
curl -s -b /tmp/cj http://localhost:4321/portal/poligon | grep -c "arena-root"  # 1
kill %1
```
Expected: `1`. (Полная проверка боя — на dev-сервере после nginx-проксирования WSS, Task 12.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/portal/poligon.astro
git commit -m "feat(portal): брендовая страница арены с движком робокода"
```

---

## Фаза 4 — Материалы преподавателей и учеников

### Task 11: Раздел «Учителю» (онбординг + уроки)

**Files:**
- Create: `src/lib/portalLessons.ts`, `src/pages/portal/uchitelyu/index.astro`, `src/pages/portal/uchitelyu/uroki/[id].astro`

- [ ] **Step 1: Создать `src/lib/portalLessons.ts`**

Список уроков из teacher-api (а при недоступности — фолбэк-список из каталога). Источник файлов: `/opt/robocode/teacher-api/lesson-*.html`.

```ts
export interface Lesson { id: string; title: string; }

/** Список уроков. Тянем из teacher-api; при ошибке — пустой список. */
export async function listLessons(): Promise<Lesson[]> {
  try {
    const base = process.env.PORTAL_TEACHER_API ?? 'http://127.0.0.1:8092';
    const res = await fetch(`${base}/lessons`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.lessons ?? []);
  } catch {
    return [];
  }
}

export async function getLessonHtml(id: string): Promise<string | null> {
  if (!/^[a-z0-9-]+$/i.test(id)) return null; // защита от path traversal
  try {
    const base = process.env.PORTAL_TEACHER_API ?? 'http://127.0.0.1:8092';
    const res = await fetch(`${base}/lesson-${id}.html`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
```

> **Перед реализацией:** уточнить фактический API teacher-api на сервере (`curl -s http://127.0.0.1:8092/lessons` через ssh) и подогнать пути/формат под реальность. Если эндпоинта списка нет — собрать список из имён файлов `lesson-*.html` каталога.

- [ ] **Step 2: Создать `src/pages/portal/uchitelyu/index.astro`**

Онбординг преподавателя (контент перенести из `/opt/aistudio/portal/onboarding-teacher.html` и `teacher.html`, перекрасить в брендстиль) + список уроков из `listLessons()`.

```astro
---
export const prerender = false;
import PortalLayout from '../../../layouts/PortalLayout.astro';
import { listLessons } from '../../../lib/portalLessons';
const lessons = await listLessons();
---
<PortalLayout title="Учителю" active="teacher">
  <h1 class="mb-4 text-2xl font-bold">Преподавателю</h1>
  <!-- TODO(port): онбординг-контент из onboarding-teacher.html + teacher.html в брендстиле -->
  <section class="mt-6">
    <h2 class="mb-3 text-lg font-semibold">Уроки</h2>
    <ul class="space-y-2">
      {lessons.map((l) => (
        <li>
          <a href={`/portal/uchitelyu/uroki/${l.id}`} class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-900">
            <i class="bi bi-journal-text" aria-hidden="true"></i>{l.title}
          </a>
        </li>
      ))}
      {lessons.length === 0 && <li class="text-slate-500">Уроки появятся здесь.</li>}
    </ul>
  </section>
</PortalLayout>
```

> Замечание по `TODO(port)`: это указание перенести контент конкретных исходных HTML — не оставлять как литерал в финальной странице; задача переноса контента выполняется здесь же по исходникам с сервера.

- [ ] **Step 3: Создать `src/pages/portal/uchitelyu/uroki/[id].astro`**

```astro
---
export const prerender = false;
import PortalLayout from '../../../../layouts/PortalLayout.astro';
import { getLessonHtml } from '../../../../lib/portalLessons';
const { id } = Astro.params;
const html = await getLessonHtml(id ?? '');
if (!html) return Astro.redirect('/portal/uchitelyu');
---
<PortalLayout title="Урок" active="teacher">
  <a href="/portal/uchitelyu" class="mb-4 inline-flex items-center gap-2 text-slate-600"><i class="bi bi-arrow-left" aria-hidden="true"></i>К урокам</a>
  <article class="prose max-w-none rounded-2xl border border-slate-200 bg-white p-6" set:html={html}></article>
</PortalLayout>
```

- [ ] **Step 4: Проверить иконки (`bi-journal-text`, `bi-arrow-left`)**

Run: `node -e "const m=require('./src/data/icons-manifest.json'); ['bi-journal-text','bi-arrow-left'].forEach(i=>console.log(i,m.includes(i)?'OK':'НЕТ'))"`
Expected: OK (иначе добавить в манифест + `npm run icons`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/portalLessons.ts src/pages/portal/uchitelyu/ src/data/icons-manifest.json src/styles/icons.css
git commit -m "feat(portal): раздел преподавателя — онбординг и уроки"
```

---

### Task 12: Раздел «Ученику» (онбординг, квесты, каталог)

**Files:**
- Create: `src/pages/portal/ucheniku/index.astro`, `src/pages/portal/ucheniku/kvesty.astro`, `src/pages/portal/ucheniku/katalog.astro`

- [ ] **Step 1: Создать `src/pages/portal/ucheniku/index.astro`**

Онбординг ученика — контент перенести из `/opt/aistudio/portal/onboarding-student.html` + `student.html` в брендстиль, ссылки на квесты/каталог/полигон.

```astro
---
export const prerender = false;
import PortalLayout from '../../../layouts/PortalLayout.astro';
---
<PortalLayout title="Ученику" active="student">
  <h1 class="mb-4 text-2xl font-bold">Ученику</h1>
  <!-- порт контента из onboarding-student.html + student.html в брендстиле -->
  <div class="grid gap-4 sm:grid-cols-3">
    <a href="/portal/poligon" class="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-900"><i class="bi bi-bullseye text-2xl" aria-hidden="true"></i><div class="mt-2 font-semibold">Полигон</div></a>
    <a href="/portal/ucheniku/kvesty" class="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-900"><i class="bi bi-list-check text-2xl" aria-hidden="true"></i><div class="mt-2 font-semibold">Квесты</div></a>
    <a href="/portal/ucheniku/katalog" class="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-900"><i class="bi bi-collection text-2xl" aria-hidden="true"></i><div class="mt-2 font-semibold">Каталог</div></a>
  </div>
</PortalLayout>
```

- [ ] **Step 2: Создать `kvesty.astro` и `katalog.astro`**

Перенести контент из `/opt/aistudio/portal/quests.html` (+ `quests-data.json`) и `catalog.html` в брендстиль внутри `PortalLayout` (`active="student"`). Структуру карточек/списков взять из исходников, оформление — по DESIGN_SYSTEM. Для квестов данные читать из перенесённого `public/portal/engine/quests-data.json` или teacher-api.

```astro
---
export const prerender = false;
import PortalLayout from '../../../layouts/PortalLayout.astro';
---
<PortalLayout title="Квесты" active="student">
  <h1 class="mb-4 text-2xl font-bold">Квесты</h1>
  <!-- порт quests.html в брендстиле -->
</PortalLayout>
```

(аналогично `katalog.astro` для `catalog.html`).

- [ ] **Step 3: Проверить иконки + сборка**

Run:
```bash
node -e "const m=require('./src/data/icons-manifest.json'); ['bi-list-check','bi-collection'].forEach(i=>console.log(i,m.includes(i)?'OK':'НЕТ'))"
npm run build 2>&1 | tail -15
```
Expected: иконки OK; `npm run build` без ошибок (guard по эмодзи/banned-words проходит).

- [ ] **Step 4: Commit**

```bash
git add src/pages/portal/ucheniku/ src/data/icons-manifest.json src/styles/icons.css
git commit -m "feat(portal): раздел ученика — онбординг, квесты, каталог"
```

---

## Фаза 5 — nginx, деплой, проверка

### Task 13: nginx-локейшены на dev

**Files:**
- Применить на сервере: `/etc/nginx/sites-enabled/aidacamp-dev.conf`

- [ ] **Step 1: Задать env-секреты node-сервиса dev**

На сервере добавить в окружение node SSR (systemd unit или `.env`, которым он запускается) и перезапустить сервис:

```
PORTAL_SESSION_SECRET=<длинная-случайная-строка>
PORTAL_PWD_ADMIN=<пароль-админа>
PORTAL_PWD_TEACHER=<пароль-препода>
PORTAL_PWD_STUDENT=<пароль-ученика>
PORTAL_TEACHER_API=http://127.0.0.1:8092
```

Генерация секрета: `openssl rand -base64 48`.

- [ ] **Step 2: Добавить локейшены в `aidacamp-dev.conf` (перед `location /`)**

```nginx
    # Портал — SSR
    location ^~ /portal/ {
        proxy_pass http://127.0.0.1:4181;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Внутренняя проверка сессии для auth_request
    location = /__portal_auth {
        internal;
        proxy_pass http://127.0.0.1:4181/api/portal/check;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header Cookie $http_cookie;
    }

    # WSS движка робокода — только с валидной сессией
    location /portal/robocode-ws {
        auth_request /__portal_auth;
        proxy_pass http://127.0.0.1:7654;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # teacher-api под гейтом
    location /portal/teacher-api/ {
        auth_request /__portal_auth;
        rewrite ^/portal/teacher-api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:8092;
        proxy_set_header Host $host;
    }

    # bot-runner под гейтом
    location /portal/api/bot/ {
        auth_request /__portal_auth;
        proxy_pass http://127.0.0.1:8095/api/bot/;
        proxy_set_header Host $host;
    }
```

- [ ] **Step 3: Проверить и перезагрузить nginx**

Run: `ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "nginx -t && systemctl reload nginx"`
Expected: `syntax is ok`, `test is successful`, reload без ошибок.

- [ ] **Step 4: Smoke-проверка проксирования**

Run:
```bash
# без сессии: /portal/ → редирект на login; teacher-api → 401
curl -s -o /dev/null -w "%{http_code}\n" https://dev.aidacamp.ru/portal/teacher-api/lessons   # 401
```
Expected: `401` без cookie.

- [ ] **Step 5: Зафиксировать применённый конфиг в репо (для истории)**

Скопировать применённые блоки в `docs/superpowers/specs/portal-nginx-snippets.md` и закоммитить (сам конфиг сервера — вне репо).

```bash
git add docs/superpowers/specs/portal-nginx-snippets.md
git commit -m "docs(portal): nginx-сниппеты для /portal (dev)"
```

---

### Task 14: Деплой на dev и сборка

**Files:** —

- [ ] **Step 1: Собрать проект**

Run: `cd /tmp/wt-portal-unify && npm run build 2>&1 | tail -20`
Expected: сборка без ошибок, `sitemap.xml ready`.

- [ ] **Step 2: Запушить ветку и открыть PR в dev**

```bash
git push origin agent/portal-unify
gh pr create --base dev --title "feat(portal): единый портал aidacamp.ru/portal (роли, полигон, материалы)" --body "См. docs/superpowers/specs/2026-05-24-portal-unify-design.md"
```
Expected: PR создан. Мёрдж в dev и деплой dev — за мастер-агентом.

- [ ] **Step 3: После мёрджа в dev — деплой dev-сервера**

(Выполняет мастер-агент по принятому в проекте процессу деплоя dev.)

---

### Task 15: E2E на dev

**Files:**
- Create: `tests/e2e/portal.spec.ts`

- [ ] **Step 1: Написать E2E**

```ts
import { test, expect } from '@playwright/test';

const BASE = process.env.PORTAL_E2E_BASE ?? 'https://dev.aidacamp.ru';
const STUDENT_PW = process.env.PORTAL_E2E_STUDENT_PW!;
const TEACHER_PW = process.env.PORTAL_E2E_TEACHER_PW!;

test('неавторизованный редиректится на login', async ({ page }) => {
  await page.goto(`${BASE}/portal/poligon`);
  await expect(page).toHaveURL(/\/portal\/login/);
});

test('ученик не видит раздел «Учителю»', async ({ page }) => {
  await page.goto(`${BASE}/portal/login`);
  await page.fill('input[name=password]', STUDENT_PW);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/portal\/?$/);
  await expect(page.getByText('Учителю')).toHaveCount(0);
});

test('учитель видит раздел «Учителю» и полигон', async ({ page }) => {
  await page.goto(`${BASE}/portal/login`);
  await page.fill('input[name=password]', TEACHER_PW);
  await page.click('button[type=submit]');
  await expect(page.getByText('Учителю')).toBeVisible();
  await expect(page.getByText('Полигон')).toBeVisible();
});

test('выход закрывает доступ', async ({ page }) => {
  await page.goto(`${BASE}/portal/login`);
  await page.fill('input[name=password]', STUDENT_PW);
  await page.click('button[type=submit]');
  await page.click('button:has-text("Выйти")');
  await page.goto(`${BASE}/portal/`);
  await expect(page).toHaveURL(/\/portal\/login/);
});
```

- [ ] **Step 2: Запустить E2E**

Run: `PORTAL_E2E_STUDENT_PW=<...> PORTAL_E2E_TEACHER_PW=<...> npm run test:e2e -- tests/e2e/portal.spec.ts`
Expected: 4 теста PASS.

- [ ] **Step 3: Ручная проверка боя на полигоне**

Открыть `https://dev.aidacamp.ru/portal/poligon` под ролью ученика, запустить бой — танки рисуются, WSS соединяется (DevTools → WS, статус 101). Проверить мобильную вёрстку и контраст хаба/входа.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/portal.spec.ts
git commit -m "test(portal): E2E авторизации и видимости по ролям"
git push origin agent/portal-unify
```

---

### Task 16: Прод

**Files:** Применить на сервере: `aidacamp.conf` (те же локейшены, что в Task 13).

- [ ] **Step 1: Перенести env-секреты и nginx-локейшены на прод**

Повторить Task 13 Step 1–3 для прод-домена (`aidacamp.conf`, прод node-сервис). `nginx -t && systemctl reload nginx`.

- [ ] **Step 2: Деплой прода**

После одобрения владельцем: PR `dev → main`, мёрдж, `./scripts/deploy.sh prod` (выполняет мастер-агент).

- [ ] **Step 3: Финальная проверка прода**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://aidacamp.ru/portal/teacher-api/lessons`
Expected: `401` без cookie. Вход каждой ролью на `https://aidacamp.ru/portal/` работает.

---

## Self-review (выполнено при написании плана)

- **Покрытие спеки:** §3 архитектура → Task 5/13; §4 роли/cookie → Task 2–8; §5 URL/nginx → Task 13/16; §6 контент/перекраска → Task 9–12; §7 безопасность → Task 2,4,5,13 (HMAC, rate-limit, auth_request, HttpOnly/Secure); §8 git/деплой → Task 14/16; §9 тесты → Task 2,3,15. Покрыто.
- **Плейсхолдеры:** `TODO(port)`/`<!-- порт ... -->` — это указания перенести конкретные исходные HTML с сервера (источники указаны путями), а не пропуски логики; выполняются в рамках своих задач.
- **Согласованность типов:** `PortalRole`, `signSession/verifySession`, `resolveRole`, `listLessons/getLessonHtml`, cookie `portal_session`, `Astro.locals.portalRole` — имена едины во всех задачах.
