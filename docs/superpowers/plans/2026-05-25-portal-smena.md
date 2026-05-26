# Портал Фаза 3: Сетка смены — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Одна сетка смены (дни→события, роли-ответственные, чек-листы) с личными галочками и 4 представлениями (день/роль/активность/шахматка) в портале.

**Architecture:** Postgres-модель рядом с `portal_staff`; доступ через `src/lib/portalShift.ts`; роль из сессии (`verifySessionPayload().role`/`.sub`); страницы `/portal/smena` (+ `/admin`); общий эндпоинт отметок (готов под Telegram). Архив=флаг, не удаление.

**Tech Stack:** Astro 6 SSR, TypeScript, `pg`, Vitest, Tailwind v4, Bootstrap Icons.

**Спека:** `docs/superpowers/specs/2026-05-25-portal-smena-design.md`
**Ветка:** `agent/portal-smena` → PR в `dev`. Worktree: `/tmp/wt-portal-unify`.

---

## Структура файлов
- Create: `scripts/portal-smena-migration.sql`
- Create: `src/lib/portalShift.ts` (доступ к данным) + `src/lib/portalShift.test.ts`
- Create: `src/lib/portalShiftRoles.ts` (чистый помощник проверки роли) + тест
- Create: `src/pages/api/portal/shift/check.ts`, `src/pages/api/portal/shift/index.ts` (GET), `src/pages/api/portal/shift/admin.ts`
- Create: `src/pages/portal/smena.astro` (4 вида + галочки), `src/pages/portal/smena/admin.astro`
- Create: `scripts/import-shift-plan.mjs` (засев из /api/shift-plan JSON)
- Modify: `src/pages/portal/index.astro` (карточки «Сетка смены» / «Управление сеткой»)

---

## Task 1: Чистый помощник проверки роли (TDD)

**Files:** Create `src/lib/portalShiftRoles.ts`, `src/lib/portalShiftRoles.test.ts`

- [ ] **Step 1: Тест**
```ts
import { describe, it, expect } from 'vitest';
import { roleAllowed } from './portalShiftRoles';
describe('roleAllowed', () => {
  it('пускает, если роль в списке', () => { expect(roleAllowed('vozhaty', ['vozhaty','teacher'])).toBe(true); });
  it('admin проходит всегда', () => { expect(roleAllowed('admin', ['vozhaty'])).toBe(true); });
  it('не пускает чужую роль', () => { expect(roleAllowed('student', ['vozhaty'])).toBe(false); });
  it('пустой список ролей = никому (кроме admin)', () => { expect(roleAllowed('vozhaty', [])).toBe(false); expect(roleAllowed('admin', [])).toBe(true); });
});
```
- [ ] **Step 2: Запустить — падает.** `npm test -- portalShiftRoles` → FAIL.
- [ ] **Step 3: Реализация**
```ts
import type { PortalRole } from './portalSession';
/** admin видит всё; иначе роль должна быть в списке. */
export function roleAllowed(role: PortalRole | null | undefined, roles: string[]): boolean {
  if (role === 'admin') return true;
  if (!role) return false;
  return roles.includes(role);
}
```
- [ ] **Step 4: Запустить — проходит.** `npm test -- portalShiftRoles` → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(smena): helper roleAllowed (+тесты)"`

---

## Task 2: Миграция + слой данных `portalShift.ts`

**Files:** Create `scripts/portal-smena-migration.sql`, `src/lib/portalShift.ts`

- [ ] **Step 1: Миграция** — создать `scripts/portal-smena-migration.sql` с DDL из спеки §2 (таблицы `shift, shift_day, shift_event, checklist, event_checklist, checklist_done`, ровно как в спеке). Идемпотентно (`IF NOT EXISTS`).

- [ ] **Step 2: `src/lib/portalShift.ts`** — pg-доступ (паттерн `withClient` как в `portalStaff.ts`: DSN `AIDAPLUS_PG_DSN||PG_DSN`, динамический `import('pg')`).

```ts
import type { PortalRole } from './portalSession';

export interface ShiftEvent {
  id: number; date: string; start_time: string | null; end_time: string | null;
  title: string; activity_type: string | null; roles: string[]; sort: number;
  checklists: { event_checklist_id: number; checklist_id: number; title: string;
    roles: string[]; items: { id: string; text: string }[] }[];
}
export interface Shift { id: number; name: string; start_date: string; end_date: string; status: string; }

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

export async function getActiveShift(): Promise<Shift | null> {
  return (await withClient(async (c) => {
    const r = await c.query("SELECT id,name,to_char(start_date,'YYYY-MM-DD') start_date,to_char(end_date,'YYYY-MM-DD') end_date,status FROM shift WHERE status='active' ORDER BY start_date DESC LIMIT 1");
    return (r.rows[0] as Shift) ?? null;
  })) ?? null;
}

export async function getEvents(shiftId: number): Promise<ShiftEvent[]> {
  return (await withClient(async (c) => {
    const ev = await c.query(
      "SELECT id,to_char(date,'YYYY-MM-DD') date,start_time::text,end_time::text,title,activity_type,roles,sort FROM shift_event WHERE shift_id=$1 ORDER BY date,sort,start_time", [shiftId]);
    const ecl = await c.query(
      "SELECT ec.id event_checklist_id, ec.event_id, ec.checklist_id, ec.roles, cl.title, cl.items FROM event_checklist ec JOIN checklist cl ON cl.id=ec.checklist_id WHERE ec.event_id = ANY($1)",
      [ev.rows.map((e: any) => e.id)]);
    const byEvent = new Map<number, any[]>();
    for (const row of ecl.rows) {
      const arr = byEvent.get(row.event_id) ?? []; arr.push(row); byEvent.set(row.event_id, arr);
    }
    return ev.rows.map((e: any) => ({ ...e, checklists: (byEvent.get(e.id) ?? []).map((r: any) => ({
      event_checklist_id: r.event_checklist_id, checklist_id: r.checklist_id, title: r.title, roles: r.roles, items: r.items })) }));
  })) ?? [];
}

/** Множество ключей "eventId:checklistId:itemId", отмеченных этим человеком. */
export async function getDone(telegramId: number, shiftId: number): Promise<Set<string>> {
  return (await withClient(async (c) => {
    const r = await c.query(
      "SELECT d.event_id,d.checklist_id,d.item_id FROM checklist_done d JOIN shift_event e ON e.id=d.event_id WHERE e.shift_id=$1 AND d.telegram_id=$2",
      [shiftId, telegramId]);
    return new Set(r.rows.map((x: any) => `${x.event_id}:${x.checklist_id}:${x.item_id}`));
  })) ?? new Set<string>();
}

/** Переключить пункт; возвращает {done}. roles — роли event_checklist для проверки доступа. */
export async function toggleDone(telegramId: number, eventId: number, checklistId: number, itemId: string): Promise<{ done: boolean } | null> {
  return await withClient(async (c) => {
    const del = await c.query("DELETE FROM checklist_done WHERE event_id=$1 AND checklist_id=$2 AND item_id=$3 AND telegram_id=$4",
      [eventId, checklistId, itemId, telegramId]);
    if (del.rowCount && del.rowCount > 0) return { done: false };
    await c.query("INSERT INTO checklist_done(event_id,checklist_id,item_id,telegram_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [eventId, checklistId, itemId, telegramId]);
    return { done: true };
  });
}

/** Роли event_checklist (для проверки доступа в API). */
export async function eventChecklistRoles(eventId: number, checklistId: number): Promise<string[]> {
  return (await withClient(async (c) => {
    const r = await c.query("SELECT roles FROM event_checklist WHERE event_id=$1 AND checklist_id=$2 LIMIT 1", [eventId, checklistId]);
    return (r.rows[0]?.roles as string[]) ?? [];
  })) ?? [];
}
```

> Перед реализацией убедись, что `portalStaff.ts` уже даёт паттерн `withClient` — повтори тот же стиль.

- [ ] **Step 3: Типы.** `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i portalShift || echo ok`
- [ ] **Step 4: Commit** `git add scripts/portal-smena-migration.sql src/lib/portalShift.ts && git commit -m "feat(smena): таблицы + слой данных portalShift"`

---

## Task 3: API отметок и данных

**Files:** Create `src/pages/api/portal/shift/check.ts`, `src/pages/api/portal/shift/index.ts`

- [ ] **Step 1: `check.ts`** (toggle, общий для портала и TG)
```ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../../lib/portalSession';
import { roleAllowed } from '../../../../lib/portalShiftRoles';
import { eventChecklistRoles, toggleDone } from '../../../../lib/portalShift';

export const POST: APIRoute = async ({ request, cookies }) => {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p || !p.sub) return new Response(JSON.stringify({ ok: false, error: 'no-session' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const body = await request.json().catch(() => ({}));
  const eventId = Number(body.eventId), checklistId = Number(body.checklistId), itemId = String(body.itemId ?? '');
  if (!eventId || !checklistId || !itemId) return new Response(JSON.stringify({ ok: false, error: 'bad-args' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const roles = await eventChecklistRoles(eventId, checklistId);
  if (!roleAllowed(p.role, roles)) return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  const res = await toggleDone(p.sub, eventId, checklistId, itemId);
  return new Response(JSON.stringify({ ok: true, done: res?.done ?? false }), { headers: { 'Content-Type': 'application/json' } });
};
```

- [ ] **Step 2: `index.ts`** (GET сетки JSON — для обновления/отладки)
```ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../../lib/portalSession';
import { getActiveShift, getEvents, getDone } from '../../../../lib/portalShift';

export const GET: APIRoute = async ({ cookies }) => {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p) return new Response('Unauthorized', { status: 401 });
  const shift = await getActiveShift();
  if (!shift) return new Response(JSON.stringify({ ok: true, shift: null, events: [] }), { headers: { 'Content-Type': 'application/json' } });
  const events = await getEvents(shift.id);
  const done = p.sub ? [...await getDone(p.sub, shift.id)] : [];
  return new Response(JSON.stringify({ ok: true, shift, events, done }), { headers: { 'Content-Type': 'application/json' } });
};
```

- [ ] **Step 3: Сборка.** `npx astro check --minimal 2>&1 | grep -iE "shift/check|shift/index" || echo ok`
- [ ] **Step 4: Commit** `git add src/pages/api/portal/shift/ && git commit -m "feat(smena): API отметок (check) и данных сетки (GET)"`

---

## Task 4: Страница `/portal/smena` — 4 представления + галочки

**Files:** Create `src/pages/portal/smena.astro`

- [ ] **Step 1:** SSR-страница. Читает роль/`sub` из `Astro.locals.portalRole` + cookie (через `getActiveShift`,`getEvents`,`getDone`). Переключатель вида `?view=role|day|activity|matrix`, `?date=`. По умолчанию `role`.
  - **role:** события, где `roles.includes(role)` (admin — все), на выбранную дату; под каждым — его чек-листы (только те `event_checklist`, чьи `roles` включают роль), пункты с чекбоксами (checked если ключ в `done`).
  - **day:** все события даты по времени.
  - **activity:** группировка по `activity_type`.
  - **matrix:** таблица дни×роли (переиспользовать CSS-идею `sched-*` из `/staff`).
  - Чекбокс: инлайн-скрипт `fetch('/api/portal/shift/check',{method:'POST',body:JSON.stringify({eventId,checklistId,itemId})})` → оптимистично переключить.
  - Брендстиль, bi-иконки, без эмодзи, ≥16px. Если активной смены нет — заглушка «Смена не создана».
  Полный astro-код реализатор пишет по этому контракту (данные из `portalShift`, разметка в духе `PortalLayout` и существующих карточек).

- [ ] **Step 2: Сборка.** `npm run build 2>&1 | tail -5` (если падает на `@playform/compress` — `npm i @playform/compress --no-save`, не коммитить lock).
- [ ] **Step 3: Commit** `git add src/pages/portal/smena.astro && git commit -m "feat(smena): страница расписания — 4 вида + галочки"`

---

## Task 5: Редактор `/portal/smena/admin` + админ-API + карточки хаба

**Files:** Create `src/pages/api/portal/shift/admin.ts`, `src/pages/portal/smena/admin.astro`; Modify `src/pages/portal/index.astro`

- [ ] **Step 1: `admin.ts`** — POST, только роль `admin`/`rukovoditel` (через `verifySessionPayload`). Действия (form/JSON `action`): `upsertEvent`(date,time,title,type,roles,sort,id?), `upsertChecklist`(key,title,items,id?), `attachChecklist`(event_id,checklist_id,roles), `archiveShift`(id), `createShift`(name,start,end). Реализация — соответствующие функции в `portalShift.ts` (реализатор добавляет `upsertEvent`/`upsertChecklist`/`attachChecklist`/`createShift`/`archiveShift` по тому же `withClient`-паттерну).
- [ ] **Step 2: `admin.astro`** — формы для тех же действий (только admin/rukovoditel; иначе `Astro.redirect('/portal/')`). Список смен/событий/чек-листов с кнопками править/архивировать.
- [ ] **Step 3: Карточки в `index.astro`** — в группе «Сотрудникам смены» добавить `{ title:'Сетка смены', href:'/portal/smena', desc:'Расписание, чек-листы, отметки', icon:'calendar-week' }`; в группе «Управление» (roles ['admin']) добавить `{ title:'Управление сеткой', href:'/portal/smena/admin', desc:'События и чек-листы смены', icon:'kanban' }`. Проверить иконки в `icons-manifest.json` (добавить + `npm run icons` если нет).
- [ ] **Step 4: Сборка.** `npm run build 2>&1 | tail -5`
- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(smena): редактор сетки + админ-API + карточки хаба"`

---

## Task 6: Засев из текущего плана

**Files:** Create `scripts/import-shift-plan.mjs`

- [ ] **Step 1:** Скрипт читает JSON текущего плана (с сервера: `GET https://dev.aidacamp.ru/api/shift-plan` или файл `/var/lib/aidacamp/shift-plan.json`), раскладывает `days/events/role-checklists` в таблицы через psql/pg. Маппинг описать в комментарии скрипта; идемпотентно (по дате+названию не дублировать).
- [ ] **Step 2: Commit** `git add scripts/import-shift-plan.mjs && git commit -m "feat(smena): импорт сетки из текущего плана"`

---

## Task 7: Миграция + засев + деплой dev + E2E

- [ ] **Step 1: Миграция на dev**
```bash
scp -i ~/.ssh/aidacamp_prod scripts/portal-smena-migration.sql root@159.194.223.55:/tmp/
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "sudo -u postgres psql -d aidacamp -f /tmp/portal-smena-migration.sql"
```
Expected: CREATE TABLE ×6.
- [ ] **Step 2: Тесты+сборка.** `npm test 2>&1 | tail -4 && npm run build 2>&1 | tail -5`
- [ ] **Step 3: PR в dev** `git push origin agent/portal-smena && gh pr create --base dev ...` → мёрдж+деплой (мастер-агент).
- [ ] **Step 4: Засев** запустить `import-shift-plan.mjs` против dev (или вручную создать тестовую смену админкой).
- [ ] **Step 5: E2E на dev:** admin создаёт смену/событие/чек-лист → у роли видно; сотрудник ставит галочку → reload держит; чужая роль не видит; 4 вида переключаются. Создать `tests/e2e/smena.spec.ts` (код-логин admin + проверки).

---

## Task 8: Прод (СТОП до апрува)
- [ ] Миграция + деплой прод — **только по «выкатываем»**.

---

## Self-review
- Покрытие спеки: §2→T2, §3→T2, §4→T3/T5, §5→T4, §6→T5, §7→T6, §9→T1/T7. Покрыто.
- Плейсхолдеров нет (контракты страниц явные; код данных/API приведён полностью).
- Имена согласованы: `getActiveShift/getEvents/getDone/toggleDone/eventChecklistRoles`, `roleAllowed`, таблицы из §2, эндпоинт `/api/portal/shift/check`.
