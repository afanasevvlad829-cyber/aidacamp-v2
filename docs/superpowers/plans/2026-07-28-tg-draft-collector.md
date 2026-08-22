# Telegram-сборщик черновиков (Фаза 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вожатый/преподаватель шлёт боту `@Aidacamp2026bot` текст+фото/видео → руководитель смены правит/пересобирает/одобряет прямо в Telegram → одобренное публикуется в TG-канал смены.

**Architecture:** Логика живёт в Astro/TS-бэкенде сайта (не отдельный Python-сервис). Приём сообщений — не веб-хук, а постоянный GramJS-клиент (MTProto, npm-пакет `telegram`), авторизованный по `BOT_TOKEN`, поднятый один раз при старте Node-процесса `aidacamp-prod` и живущий всё время его жизни (как `pg.Pool`-синглтон в `src/lib/db.ts`). GramJS снимает лимит обычного Bot API на скачивание файлов >20 МБ.

**Tech Stack:** Astro (Node adapter, standalone), TypeScript, PostgreSQL (`pg`), GramJS (`telegram` npm), vitest.

## Global Constraints

- Единственный способ получить медиа-оригинал 1-в-1 — приём как `document` c mime `image/*`/`video/*`; `photo`/`video`-тип сообщения (сжатый Telegram) — отклоняется с инструкцией переслать файлом.
- Файл > ~300 МБ — отклонить с понятным сообщением (буфер сверх регламентных 200 МБ, `_notes/АйДаКемп/Регламенты-портала/00 - Общий регламент.md` §4).
- Публикация в канал смены — обычные `photo`/`video` (сжато, с превью и проигрыванием в ленте) — не `document`.
- Ревьюер — единственный активный `portal_staff` со `staff_key='director'` (без привязки к смене), тот же паттерн, что в `src/lib/portalPenalty.ts` (`scanUnassignedEvents`).
- Только активный `portal_staff` с ролью `vozhaty`/`teacher`/`rukovoditel`/`admin` может слать черновики; всех прочих бот вежливо отклоняет, ничего не сохраняя.
- Редактирование состава медиа в Фазе 1 — только руководителю на этапе одобрения, не автору во время сбора.
- Ошибка публикации не блокирует повторную попытку: черновик остаётся `pending_review`, не помечается `approved`, пока публикация реально не прошла.

---

## Файловая структура

| Файл | Ответственность |
|---|---|
| `scripts/portal-draft-post-migration.sql` | Новая таблица `draft_post` + колонка `shift.tg_parent_channel_id` |
| `src/lib/telegramMedia.ts` | Чистая функция: классификация входящего вложения (photo/video/document+mime) → принять/отклонить + текст инструкции |
| `src/lib/draftPost.ts` | CRUD и переходы состояний `draft_post` (`collecting`→`pending_review`→`approved`/`rejected`) |
| `src/lib/telegramClient.ts` | GramJS-клиент — синглтон, поднимается один раз за процесс |
| `src/lib/telegramDraftBot.ts` | Вся диалоговая логика бота: авторизация, приём сообщений, `/готово`/`/отмена`, сборка превью, 5 callback-хендлеров ревью, публикация |
| `src/lib/portalShift.ts` | Модифицируется: добавляется `getShiftById(id)` |
| `src/lib/portalMedia.ts` | Не модифицируется — переиспользуется как есть (`attachMedia`/`listMedia`/`reorderMedia`/`deleteMedia`) |

---

## Task 1: Спайк — подтвердить логин GramJS как бот

Первая задача из открытых вопросов спека: нужно живьём подтвердить, что `TG_API_ID`/`TG_API_HASH`/`BOT_TOKEN` дают рабочий MTProto-логин, прежде чем строить логику поверх этого. Без этого шага остальные задачи не начинать.

**Files:**
- Create: `scripts/spike-gramjs-login.mjs`

- [ ] **Step 1: Установить зависимость**

```bash
npm install telegram
```

- [ ] **Step 2: Получить `TG_API_ID`/`TG_API_HASH`**

Уточнить у владельца/на сервере — есть ли уже эти значения в `.env` `/opt/shift-content-bot/.env` (там они точно есть, использовались для того бота) — можно взять оттуда же или завести отдельное приложение на my.telegram.org. `BOT_TOKEN` — токен `@Aidacamp2026bot` (уже есть в `.env` портала как `TELEGRAM_BOT_TOKEN`/`PORTAL_BOT_TOKEN`).

- [ ] **Step 3: Написать спайк-скрипт**

```javascript
// scripts/spike-gramjs-login.mjs
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const botToken = process.env.PORTAL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

if (!apiId || !apiHash || !botToken) {
  console.error("Нужны TG_API_ID, TG_API_HASH, PORTAL_BOT_TOKEN/TELEGRAM_BOT_TOKEN в env");
  process.exit(1);
}

const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
  connectionRetries: 5,
});

await client.start({ botAuthToken: botToken });
console.log("Session string (сохранить для повторных запусков):");
console.log(client.session.save());

const me = await client.getMe();
console.log("Бот залогинен как:", me.username, me.id);

await client.disconnect();
```

- [ ] **Step 4: Запустить и проверить**

```bash
TG_API_ID=<id> TG_API_HASH=<hash> PORTAL_BOT_TOKEN=<token> node scripts/spike-gramjs-login.mjs
```

Ожидаем: строка `Бот залогинен как: Aidacamp2026bot <id>`, напечатана session string.

**Если шаг не проходит** — STOP, разбираться с доступом (неверный api_id/hash, токен не от того бота) до перехода к Task 2.

- [ ] **Step 5: Сохранить session string как секрет**

Записать полученную session string в `.env` сервера как `TG_BOT_SESSION` (не в git) — переиспользуется в Task 5, чтобы не логиниться заново при каждом рестарте процесса.

---

## Task 2: Миграция БД — `draft_post` + `shift.tg_parent_channel_id`

**Files:**
- Create: `scripts/portal-draft-post-migration.sql`

- [ ] **Step 1: Написать миграцию**

```sql
-- portal-draft-post-migration.sql
-- Черновики постов для родительского канала (Фаза 1 tg-draft-collector).
BEGIN;

CREATE TABLE IF NOT EXISTS draft_post (
  id                  BIGSERIAL PRIMARY KEY,
  shift_id            BIGINT REFERENCES shift(id),
  author_telegram_id  BIGINT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'collecting'
                         CHECK (status IN ('collecting','pending_review','approved','rejected')),
  text                TEXT,
  reviewer_chat_id    BIGINT,
  reviewer_message_id BIGINT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  decided_at          TIMESTAMPTZ,
  decided_by          BIGINT
);

CREATE INDEX IF NOT EXISTS idx_draft_post_author_status
  ON draft_post(author_telegram_id, status);

ALTER TABLE shift ADD COLUMN IF NOT EXISTS tg_parent_channel_id BIGINT;

GRANT SELECT, INSERT, UPDATE, DELETE ON draft_post TO aidacamp_app;
GRANT USAGE, SELECT ON SEQUENCE draft_post_id_seq TO aidacamp_app;

COMMIT;
```

- [ ] **Step 2: Применить на dev-БД**

```bash
psql "$AIDAPLUS_PG_DSN" -f scripts/portal-draft-post-migration.sql
```

Ожидаем: `BEGIN`/`CREATE TABLE`/`ALTER TABLE`/`GRANT`×2/`COMMIT`, без ошибок.

- [ ] **Step 3: Проверить структуру**

```bash
psql "$AIDAPLUS_PG_DSN" -c '\d draft_post'
```

Ожидаем: колонки `id, shift_id, author_telegram_id, status, text, reviewer_chat_id, reviewer_message_id, created_at, decided_at, decided_by`.

- [ ] **Step 4: Commit**

```bash
git add scripts/portal-draft-post-migration.sql
git commit -m "feat(portal): миграция draft_post + shift.tg_parent_channel_id"
```

---

## Task 3: `telegramMedia.ts` — классификация вложения

**Files:**
- Create: `src/lib/telegramMedia.ts`
- Test: `src/lib/telegramMedia.test.ts`

**Interfaces:**
- Produces: `classifyIncomingMedia(msg: TelegramMessageLike): MediaClassification`, где
  ```typescript
  export interface TelegramMessageLike {
    photo?: unknown;
    video?: unknown;
    document?: { mimeType?: string; size?: number };
  }
  export type MediaClassification =
    | { accept: true; fileType: 'photo' | 'video'; mime: string }
    | { accept: false; reason: string; instructionText: string };
  ```

- [ ] **Step 1: Написать падающий тест**

```typescript
// src/lib/telegramMedia.test.ts
import { describe, it, expect } from 'vitest';
import { classifyIncomingMedia } from './telegramMedia';

describe('classifyIncomingMedia', () => {
  it('отклоняет сжатое фото (photo) с инструкцией прислать файлом', () => {
    const r = classifyIncomingMedia({ photo: {} });
    expect(r.accept).toBe(false);
    if (!r.accept) {
      expect(r.instructionText).toContain('Файл');
    }
  });

  it('отклоняет сжатое видео (video) с инструкцией', () => {
    const r = classifyIncomingMedia({ video: {} });
    expect(r.accept).toBe(false);
    if (!r.accept) expect(r.instructionText).toContain('видео');
  });

  it('принимает document с image/*', () => {
    const r = classifyIncomingMedia({ document: { mimeType: 'image/jpeg', size: 5_000_000 } });
    expect(r).toEqual({ accept: true, fileType: 'photo', mime: 'image/jpeg' });
  });

  it('принимает document с video/*', () => {
    const r = classifyIncomingMedia({ document: { mimeType: 'video/mp4', size: 50_000_000 } });
    expect(r).toEqual({ accept: true, fileType: 'video', mime: 'video/mp4' });
  });

  it('отклоняет document с посторонним mime', () => {
    const r = classifyIncomingMedia({ document: { mimeType: 'application/pdf', size: 100 } });
    expect(r.accept).toBe(false);
    if (!r.accept) expect(r.reason).toContain('поддерживаются');
  });

  it('отклоняет document крупнее ~300 МБ', () => {
    const r = classifyIncomingMedia({ document: { mimeType: 'video/mp4', size: 320 * 1024 * 1024 } });
    expect(r.accept).toBe(false);
    if (!r.accept) expect(r.reason).toContain('300');
  });

  it('отклоняет сообщение вообще без вложения', () => {
    const r = classifyIncomingMedia({});
    expect(r.accept).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

```bash
npx vitest run src/lib/telegramMedia.test.ts
```

Ожидаем: FAIL — `Cannot find module './telegramMedia'`.

- [ ] **Step 3: Реализовать**

```typescript
// src/lib/telegramMedia.ts
export interface TelegramMessageLike {
  photo?: unknown;
  video?: unknown;
  document?: { mimeType?: string; size?: number };
}

export type MediaClassification =
  | { accept: true; fileType: 'photo' | 'video'; mime: string }
  | { accept: false; reason: string; instructionText: string };

const MAX_BYTES = 300 * 1024 * 1024;

const PHOTO_INSTRUCTION =
  'Это сжатое фото. Пришлите оригинал: 📎 → Файл (в галерее отключите сжатие/иконку HD перед отправкой).';
const VIDEO_INSTRUCTION =
  'Это сжатое видео. Пришлите оригинал: 📎 → Файл (в галерее отключите сжатие перед отправкой).';

export function classifyIncomingMedia(msg: TelegramMessageLike): MediaClassification {
  if (msg.photo) {
    return { accept: false, reason: 'compressed_photo', instructionText: PHOTO_INSTRUCTION };
  }
  if (msg.video) {
    return { accept: false, reason: 'compressed_video', instructionText: VIDEO_INSTRUCTION };
  }
  if (!msg.document) {
    return {
      accept: false,
      reason: 'no_attachment',
      instructionText: 'Пришлите фото или видео файлом (📎 → Файл).',
    };
  }
  const mime = msg.document.mimeType ?? '';
  const size = msg.document.size ?? 0;
  if (size > MAX_BYTES) {
    return {
      accept: false,
      reason: 'too_large',
      instructionText: 'Файл больше 300 МБ — камп принимает файлы до 200 МБ. Сожмите или разбейте на части.',
    };
  }
  if (mime.startsWith('image/')) {
    return { accept: true, fileType: 'photo', mime };
  }
  if (mime.startsWith('video/')) {
    return { accept: true, fileType: 'video', mime };
  }
  return {
    accept: false,
    reason: 'unsupported_mime',
    instructionText: 'Поддерживаются только фото и видео.',
  };
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

```bash
npx vitest run src/lib/telegramMedia.test.ts
```

Ожидаем: PASS, 7/7.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegramMedia.ts src/lib/telegramMedia.test.ts
git commit -m "feat(portal): классификация входящих вложений бота черновиков"
```

---

## Task 4: `draftPost.ts` — CRUD и переходы состояний

**Files:**
- Create: `src/lib/draftPost.ts`
- Test: `src/lib/draftPost.test.ts`

**Interfaces:**
- Consumes: `query`, `withDbClient` из `./db` (уже существуют).
- Produces:
  ```typescript
  export interface DraftPost {
    id: number;
    shift_id: number | null;
    author_telegram_id: number;
    status: 'collecting' | 'pending_review' | 'approved' | 'rejected';
    text: string | null;
    reviewer_chat_id: number | null;
    reviewer_message_id: number | null;
  }
  export async function getOrCreateCollectingDraft(authorTelegramId: number, shiftId: number | null): Promise<DraftPost>;
  export async function getDraft(id: number): Promise<DraftPost | null>;
  export async function appendDraftText(id: number, extraText: string): Promise<void>;
  export async function setDraftStatus(id: number, status: DraftPost['status'], decidedBy?: number): Promise<void>;
  export async function setReviewerMessage(id: number, chatId: number, messageId: number): Promise<void>;
  export async function setDraftText(id: number, text: string): Promise<void>;
  ```

- [ ] **Step 1: Написать падающий тест**

```typescript
// src/lib/draftPost.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

let client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({
  default: {
    Client: vi.fn(() => client),
    Pool: vi.fn(() => ({
      connect: vi.fn(async () => client),
      query: vi.fn((...args: any[]) => (client.query as any)(...args)),
      on: vi.fn(),
    })),
  },
}));

beforeEach(() => {
  process.env.AIDAPLUS_PG_DSN = 'postgres://fake/aidacamp';
  client = makeFakeClient();
});

describe('getOrCreateCollectingDraft', () => {
  it('возвращает существующий collecting-черновик, если есть', async () => {
    client = makeFakeClient({
      handlers: [
        (sql) => {
          if (sql.includes("status='collecting'")) {
            return { rows: [{ id: 5, shift_id: 3, author_telegram_id: 111, status: 'collecting', text: null, reviewer_chat_id: null, reviewer_message_id: null }], rowCount: 1 };
          }
          return null;
        },
      ],
    });
    const { getOrCreateCollectingDraft } = await import('./draftPost');
    const d = await getOrCreateCollectingDraft(111, 3);
    expect(d.id).toBe(5);
    expect(client.calls.some((c) => /INSERT INTO draft_post/.test(c.sql))).toBe(false);
  });

  it('создаёт новый черновик, если collecting нет', async () => {
    client = makeFakeClient({
      handlers: [
        (sql) => {
          if (sql.includes("status='collecting'")) return { rows: [], rowCount: 0 };
          if (sql.includes('INSERT INTO draft_post')) {
            return { rows: [{ id: 9, shift_id: 3, author_telegram_id: 111, status: 'collecting', text: null, reviewer_chat_id: null, reviewer_message_id: null }], rowCount: 1 };
          }
          return null;
        },
      ],
    });
    const { getOrCreateCollectingDraft } = await import('./draftPost');
    const d = await getOrCreateCollectingDraft(111, 3);
    expect(d.id).toBe(9);
  });
});

describe('appendDraftText', () => {
  it('дописывает текст через пробел к уже существующему', async () => {
    client = makeFakeClient({
      handlers: [
        (sql) => {
          if (/SELECT text FROM draft_post/.test(sql)) return { rows: [{ text: 'Первая часть' }], rowCount: 1 };
          return null;
        },
      ],
    });
    const { appendDraftText } = await import('./draftPost');
    await appendDraftText(5, 'вторая часть');
    const update = client.calls.find((c) => /UPDATE draft_post SET text/.test(c.sql));
    expect(update?.params?.[0]).toBe('Первая часть вторая часть');
  });
});

describe('setDraftStatus', () => {
  it('пишет approved + decided_by + decided_at', async () => {
    const { setDraftStatus } = await import('./draftPost');
    await setDraftStatus(5, 'approved', 999);
    const update = client.calls.find((c) => /UPDATE draft_post SET status/.test(c.sql));
    expect(update?.params).toEqual([5, 'approved', 999]);
  });
});
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

```bash
npx vitest run src/lib/draftPost.test.ts
```

Ожидаем: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

```typescript
// src/lib/draftPost.ts
import { query, withDbClient } from './db';

export interface DraftPost {
  id: number;
  shift_id: number | null;
  author_telegram_id: number;
  status: 'collecting' | 'pending_review' | 'approved' | 'rejected';
  text: string | null;
  reviewer_chat_id: number | null;
  reviewer_message_id: number | null;
}

const SELECT = 'SELECT id, shift_id, author_telegram_id, status, text, reviewer_chat_id, reviewer_message_id FROM draft_post';

export async function getOrCreateCollectingDraft(authorTelegramId: number, shiftId: number | null): Promise<DraftPost> {
  const existing = await query<DraftPost>(
    `${SELECT} WHERE author_telegram_id=$1 AND status='collecting' ORDER BY created_at DESC LIMIT 1`,
    [authorTelegramId],
  );
  if (existing?.[0]) return existing[0];

  const created = await query<DraftPost>(
    `INSERT INTO draft_post (shift_id, author_telegram_id, status) VALUES ($1, $2, 'collecting') RETURNING id, shift_id, author_telegram_id, status, text, reviewer_chat_id, reviewer_message_id`,
    [shiftId, authorTelegramId],
  );
  return created![0];
}

export async function getDraft(id: number): Promise<DraftPost | null> {
  const rows = await query<DraftPost>(`${SELECT} WHERE id=$1`, [id]);
  return rows?.[0] ?? null;
}

export async function appendDraftText(id: number, extraText: string): Promise<void> {
  await withDbClient(async (c) => {
    const r = await c.query('SELECT text FROM draft_post WHERE id=$1', [id]);
    const current: string | null = r.rows[0]?.text ?? null;
    const next = current ? `${current} ${extraText}` : extraText;
    await c.query('UPDATE draft_post SET text=$1 WHERE id=$2', [next, id]);
  });
}

export async function setDraftText(id: number, text: string): Promise<void> {
  await query('UPDATE draft_post SET text=$1 WHERE id=$2', [text, id]);
}

export async function setDraftStatus(
  id: number,
  status: DraftPost['status'],
  decidedBy?: number,
): Promise<void> {
  if (status === 'approved' || status === 'rejected') {
    await query(
      'UPDATE draft_post SET status=$2, decided_by=$3, decided_at=now() WHERE id=$1',
      [id, status, decidedBy ?? null],
    );
  } else {
    await query('UPDATE draft_post SET status=$2 WHERE id=$1', [id, status]);
  }
}

export async function setReviewerMessage(id: number, chatId: number, messageId: number): Promise<void> {
  await query(
    'UPDATE draft_post SET reviewer_chat_id=$2, reviewer_message_id=$3 WHERE id=$1',
    [id, chatId, messageId],
  );
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

```bash
npx vitest run src/lib/draftPost.test.ts
```

Ожидаем: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/lib/draftPost.ts src/lib/draftPost.test.ts
git commit -m "feat(portal): CRUD и состояния draft_post"
```

---

## Task 5: `portalShift.ts` — добавить `getShiftById`

**Files:**
- Modify: `src/lib/portalShift.ts`
- Test: `src/lib/portalShift.test.ts` (новый файл — для этой функции тестов раньше не было)

**Interfaces:**
- Produces: `getShiftById(id: number): Promise<Shift | null>`

- [ ] **Step 1: Написать падающий тест**

```typescript
// src/lib/portalShift.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

let client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({
  default: {
    Client: vi.fn(() => client),
    Pool: vi.fn(() => ({
      connect: vi.fn(async () => client),
      query: vi.fn((...args: any[]) => (client.query as any)(...args)),
      on: vi.fn(),
    })),
  },
}));

beforeEach(() => {
  process.env.AIDAPLUS_PG_DSN = 'postgres://fake/aidacamp';
  client = makeFakeClient({
    handlers: [
      (sql, params) => {
        if (sql.includes('FROM shift WHERE id=$1') && (params as any)?.[0] === 3) {
          return { rows: [{ id: 3, name: 'Смена 10–23 июня', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    ],
  });
});

describe('getShiftById', () => {
  it('возвращает смену по id', async () => {
    const { getShiftById } = await import('./portalShift');
    const s = await getShiftById(3);
    expect(s?.id).toBe(3);
    expect(s?.status).toBe('active');
  });

  it('возвращает null, если не найдена', async () => {
    const { getShiftById } = await import('./portalShift');
    const s = await getShiftById(999);
    expect(s).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

```bash
npx vitest run src/lib/portalShift.test.ts
```

Ожидаем: FAIL — `getShiftById is not a function`.

- [ ] **Step 3: Добавить функцию**

Вставить в `src/lib/portalShift.ts` сразу после `getLatestShift` (строка 100):

```typescript
export async function getShiftById(id: number): Promise<Shift | null> {
  const rows = await query<Shift>(
    "SELECT id,name,to_char(start_date,'YYYY-MM-DD') start_date,to_char(end_date,'YYYY-MM-DD') end_date,status FROM shift WHERE id=$1",
    [id],
  );
  return rows?.[0] ?? null;
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

```bash
npx vitest run src/lib/portalShift.test.ts
```

Ожидаем: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/portalShift.ts src/lib/portalShift.test.ts
git commit -m "feat(portal): getShiftById"
```

---

## Task 6: `telegramClient.ts` — GramJS-синглтон

**Files:**
- Create: `src/lib/telegramClient.ts`

Сетевой код, полноценный юнит-тест бессмыслен (реальный MTProto-логин). Проверяется вручную через Task 1 спайк-паттерн, воспроизведённый здесь как модуль.

**Interfaces:**
- Produces: `getTelegramClient(): Promise<TelegramClient>` (тип `TelegramClient` из пакета `telegram`)

- [ ] **Step 1: Реализовать**

```typescript
// src/lib/telegramClient.ts
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

let clientPromise: Promise<TelegramClient> | null = null;

export function getTelegramClient(): Promise<TelegramClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const apiId = Number(process.env.TG_API_ID);
      const apiHash = process.env.TG_API_HASH ?? '';
      const botToken = process.env.PORTAL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
      const savedSession = process.env.TG_BOT_SESSION ?? '';
      if (!apiId || !apiHash || !botToken) {
        throw new Error('TG_API_ID/TG_API_HASH/PORTAL_BOT_TOKEN не заданы');
      }
      const client = new TelegramClient(new StringSession(savedSession), apiId, apiHash, {
        connectionRetries: 5,
      });
      await client.start({ botAuthToken: botToken });
      return client;
    })();
  }
  return clientPromise;
}
```

- [ ] **Step 2: Ручная проверка на dev**

Запустить dev-сервер (`npm run dev` или через уже настроенный workflow), вызвать `getTelegramClient()` из временного тестового роута/скрипта, убедиться что не падает и `client.getMe()` возвращает `@Aidacamp2026bot`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/telegramClient.ts
git commit -m "feat(portal): GramJS-клиент синглтон для бота черновиков"
```

---

## Task 7: Приём сообщений — авторизация + сбор черновика

**Files:**
- Create: `src/lib/telegramDraftBot.ts`
- Test: `src/lib/telegramDraftBot.test.ts`

**Interfaces:**
- Consumes: `classifyIncomingMedia` (Task 3), `getOrCreateCollectingDraft`/`appendDraftText` (Task 4), `getStaff` из `./portalStaff` (существует), `getActiveShift` из `./portalShift`.
- Produces:
  ```typescript
  export interface IncomingTextResult { reply: string }
  export async function handleIncomingText(telegramId: number, text: string): Promise<IncomingTextResult>;
  export async function handleIncomingMedia(telegramId: number, msg: TelegramMessageLike): Promise<IncomingTextResult>;
  ```
  (полная маршрутизация `/готово`/`/отмена` — Task 8; здесь только приём обычного текста/медиа в состоянии `collecting`.)

- [ ] **Step 1: Написать падающий тест**

```typescript
// src/lib/telegramDraftBot.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./portalStaff', () => ({
  getStaff: vi.fn(),
}));
vi.mock('./portalShift', () => ({
  getActiveShift: vi.fn(async () => ({ id: 3, name: 'Смена', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active' })),
}));
vi.mock('./draftPost', () => ({
  getOrCreateCollectingDraft: vi.fn(async () => ({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'collecting', text: null, reviewer_chat_id: null, reviewer_message_id: null })),
  appendDraftText: vi.fn(async () => {}),
}));

import { getStaff } from './portalStaff';
import { appendDraftText } from './draftPost';

beforeEach(() => vi.clearAllMocks());

describe('handleIncomingText', () => {
  it('отклоняет неизвестного telegram_id', async () => {
    (getStaff as any).mockResolvedValue(null);
    const { handleIncomingText } = await import('./telegramDraftBot');
    const r = await handleIncomingText(999, 'привет');
    expect(r.reply).toContain('не зарегистрированы');
    expect(appendDraftText).not.toHaveBeenCalled();
  });

  it('отклоняет роль student', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'student', roles: ['student'], active: true, full_name: 'Вася', tg_username: null });
    const { handleIncomingText } = await import('./telegramDraftBot');
    const r = await handleIncomingText(111, 'привет');
    expect(r.reply).toContain('не зарегистрированы');
  });

  it('отклоняет неактивного сотрудника', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'vozhaty', roles: ['vozhaty'], active: false, full_name: 'Вася', tg_username: null });
    const { handleIncomingText } = await import('./telegramDraftBot');
    const r = await handleIncomingText(111, 'привет');
    expect(r.reply).toContain('не зарегистрированы');
  });

  it('копит текст в черновик активного vozhaty', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'vozhaty', roles: ['vozhaty'], active: true, full_name: 'Вася', tg_username: null });
    const { handleIncomingText } = await import('./telegramDraftBot');
    const r = await handleIncomingText(111, 'Сегодня было весело');
    expect(appendDraftText).toHaveBeenCalledWith(5, 'Сегодня было весело');
    expect(r.reply).toContain('добавлено');
  });
});

describe('handleIncomingMedia', () => {
  it('отклоняет сжатое фото с инструкцией', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'teacher', roles: ['teacher'], active: true, full_name: 'Аня', tg_username: null });
    const { handleIncomingMedia } = await import('./telegramDraftBot');
    const r = await handleIncomingMedia(111, { photo: {} });
    expect(r.reply).toContain('Файл');
  });
});
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

```typescript
// src/lib/telegramDraftBot.ts
import { getStaff } from './portalStaff';
import { getActiveShift } from './portalShift';
import { getOrCreateCollectingDraft, appendDraftText } from './draftPost';
import { classifyIncomingMedia, type TelegramMessageLike } from './telegramMedia';

const ALLOWED_ROLES = new Set(['vozhaty', 'teacher', 'rukovoditel', 'admin']);
const NOT_REGISTERED = 'Вы не зарегистрированы в портале, обратитесь к администратору.';

export interface IncomingTextResult { reply: string }

async function authorize(telegramId: number): Promise<{ ok: true } | { ok: false; reply: string }> {
  const staff = await getStaff(telegramId);
  if (!staff || !staff.active || !ALLOWED_ROLES.has(staff.role ?? '')) {
    return { ok: false, reply: NOT_REGISTERED };
  }
  return { ok: true };
}

export async function handleIncomingText(telegramId: number, text: string): Promise<IncomingTextResult> {
  const auth = await authorize(telegramId);
  if (!auth.ok) return { reply: auth.reply };

  const shift = await getActiveShift();
  const draft = await getOrCreateCollectingDraft(telegramId, shift?.id ?? null);
  await appendDraftText(draft.id, text);
  return { reply: 'Текст добавлено в черновик. Пришлите ещё фото/видео или /готово.' };
}

export async function handleIncomingMedia(telegramId: number, msg: TelegramMessageLike): Promise<IncomingTextResult> {
  const auth = await authorize(telegramId);
  if (!auth.ok) return { reply: auth.reply };

  const classified = classifyIncomingMedia(msg);
  if (!classified.accept) {
    return { reply: classified.instructionText };
  }
  // Сохранение файла и attachMedia — Task 8.
  return { reply: `Принято (${classified.fileType}).` };
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegramDraftBot.ts src/lib/telegramDraftBot.test.ts
git commit -m "feat(portal): авторизация и сбор текста/медиа черновика"
```

---

## Task 8: Скачивание и сохранение медиа в `archive_photo`

**Files:**
- Modify: `src/lib/telegramDraftBot.ts`
- Modify: `src/lib/telegramDraftBot.test.ts`

**Interfaces:**
- Consumes: `attachMedia` из `./portalMedia` (существует), `getTelegramClient` (Task 6).
- Produces: `handleIncomingMedia` теперь реально скачивает файл через GramJS и вызывает `attachMedia({ entity_type: 'draft_post', entity_id: draft.id, ... })`.

- [ ] **Step 1: Дописать тест на реальное сохранение**

Добавить в `src/lib/telegramDraftBot.test.ts`:

```typescript
vi.mock('./portalMedia', () => ({
  attachMedia: vi.fn(async () => 42),
}));
vi.mock('fs/promises', () => ({ mkdir: vi.fn(async () => {}), writeFile: vi.fn(async () => {}) }));
vi.mock('./telegramClient', () => ({
  getTelegramClient: vi.fn(async () => ({
    downloadMedia: vi.fn(async () => Buffer.from('fake-bytes')),
  })),
}));

import { attachMedia } from './portalMedia';

// добавить в describe('handleIncomingMedia', ...):
it('скачивает и сохраняет document с image/*', async () => {
  (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'vozhaty', roles: ['vozhaty'], active: true, full_name: 'Вася', tg_username: null });
  const { handleIncomingMedia } = await import('./telegramDraftBot');
  const r = await handleIncomingMedia(111, { document: { mimeType: 'image/jpeg', size: 1000 } } as any);
  expect(attachMedia).toHaveBeenCalledWith(
    expect.objectContaining({ entity_type: 'draft_post', entity_id: 5, file_type: 'photo', mime: 'image/jpeg', author_telegram_id: 111 }),
  );
  expect(r.reply).toContain('Принято');
});
```

- [ ] **Step 2: Запустить тест, убедиться что новый кейс падает**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: FAIL на новом тесте — `attachMedia` не вызван (текущая реализация — заглушка).

- [ ] **Step 3: Дописать `handleIncomingMedia`**

Заменить в `src/lib/telegramDraftBot.ts`:

```typescript
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { attachMedia } from './portalMedia';
import { getTelegramClient } from './telegramClient';

const UPLOADS_ROOT = process.env.PORTAL_UPLOADS_ROOT || '/var/www/aidacamp-dev/uploads/portal';
const URL_PREFIX = '/portal/uploads';

export async function handleIncomingMedia(
  telegramId: number,
  msg: TelegramMessageLike & { rawMessage?: unknown; fileName?: string },
): Promise<IncomingTextResult> {
  const auth = await authorize(telegramId);
  if (!auth.ok) return { reply: auth.reply };

  const classified = classifyIncomingMedia(msg);
  if (!classified.accept) {
    return { reply: classified.instructionText };
  }

  const shift = await getActiveShift();
  const draft = await getOrCreateCollectingDraft(telegramId, shift?.id ?? null);

  const client = await getTelegramClient();
  const buffer = (await client.downloadMedia(msg.rawMessage as any)) as Buffer;

  const uuid = randomUUID();
  const ext = extname(msg.fileName ?? '').replace(/^\./, '') || (classified.fileType === 'photo' ? 'jpg' : 'mp4');
  const relDir = `media/draft_post/${draft.id}`;
  const absDir = join(UPLOADS_ROOT, relDir);
  await mkdir(absDir, { recursive: true });
  const fileName = `${uuid}.${ext}`;
  const relPath = `${relDir}/${fileName}`;
  await writeFile(join(UPLOADS_ROOT, relPath), buffer);
  const fileUrl = `${URL_PREFIX}/${relPath}`;

  await attachMedia({
    entity_type: 'draft_post',
    entity_id: draft.id,
    file_url: fileUrl,
    file_path: relPath,
    file_type: classified.fileType,
    mime: classified.mime,
    size_bytes: buffer.byteLength,
    author_telegram_id: telegramId,
    storage_kind: 'local',
  });

  return { reply: `Принято (${classified.fileType}).` };
}
```

- [ ] **Step 4: Запустить тест, убедиться что проходит**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegramDraftBot.ts src/lib/telegramDraftBot.test.ts
git commit -m "feat(portal): скачивание и сохранение медиа черновика через GramJS"
```

---

## Task 9: `/готово` — сборка превью и отправка руководителю

**Files:**
- Modify: `src/lib/telegramDraftBot.ts`
- Modify: `src/lib/telegramDraftBot.test.ts`

**Interfaces:**
- Consumes: `listMedia` из `./portalMedia`, `setDraftStatus`/`setReviewerMessage` из `./draftPost`, поиск руководителя — `query` напрямую (`staff_key='director'`, по образцу `portalPenalty.ts`).
- Produces: `handleReadyCommand(telegramId: number): Promise<IncomingTextResult>`, `buildReviewPreviewText(draft: DraftPost, media: MediaItem[]): string` (чистая функция для теста состава).

- [ ] **Step 1: Написать падающий тест**

```typescript
// добавить в src/lib/telegramDraftBot.test.ts

vi.mock('./portalMedia', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    listMedia: vi.fn(async () => [
      { id: 1, file_type: 'photo' }, { id: 2, file_type: 'video' },
    ]),
  };
});

describe('buildReviewPreviewText', () => {
  it('нумерует состав по типам', async () => {
    const { buildReviewPreviewText } = await import('./telegramDraftBot');
    const text = buildReviewPreviewText(
      { id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'Привет', reviewer_chat_id: null, reviewer_message_id: null } as any,
      [{ file_type: 'photo' }, { file_type: 'photo' }, { file_type: 'video' }] as any,
    );
    expect(text).toContain('1) Фото');
    expect(text).toContain('2) Фото');
    expect(text).toContain('3) Видео');
    expect(text).toContain('Привет');
  });
});

describe('handleReadyCommand', () => {
  it('без активного руководителя — сообщает об ошибке, не падает', async () => {
    // query() из ./db мокается глобально ниже в setup файла — в этом тесте
    // используем прямой vi.mock('./db', ...) с пустым результатом на staff_key='director'.
  });
});
```

Для `handleReadyCommand` — реалистичный сценарный тест с мокнутым `query` из `./db`:

```typescript
vi.mock('./db', () => ({
  query: vi.fn(async (sql: string) => {
    if (sql.includes("staff_key='director'")) {
      return [{ telegram_id: 777, full_name: 'Иван' }];
    }
    return [];
  }),
  withDbClient: vi.fn(),
}));

it('находит руководителя и переводит черновик в pending_review', async () => {
  (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'vozhaty', roles: ['vozhaty'], active: true, full_name: 'Вася', tg_username: null });
  const { handleReadyCommand } = await import('./telegramDraftBot');
  const r = await handleReadyCommand(111);
  expect(r.reply).toContain('отправлен');
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: FAIL — `buildReviewPreviewText`/`handleReadyCommand` не существуют.

- [ ] **Step 3: Реализовать**

Добавить в `src/lib/telegramDraftBot.ts`:

```typescript
import { listMedia, type MediaItem } from './portalMedia';
import { setDraftStatus, setReviewerMessage, type DraftPost } from './draftPost';
import { query } from './db';
import { getTelegramClient } from './telegramClient';

const TYPE_LABEL: Record<string, string> = { photo: 'Фото', video: 'Видео' };

export function buildReviewPreviewText(draft: DraftPost, media: MediaItem[]): string {
  const lines = media.map((m, i) => `${i + 1}) ${TYPE_LABEL[m.file_type] ?? m.file_type}`);
  return [
    `Черновик от сотрудника:`,
    '',
    draft.text ?? '',
    '',
    '📎 Состав:',
    ...lines,
  ].join('\n');
}

async function getDirector(): Promise<{ telegram_id: number; full_name: string | null } | null> {
  const rows = await query<{ telegram_id: number; full_name: string | null }>(
    "SELECT telegram_id, full_name FROM portal_staff WHERE staff_key='director' AND active=TRUE LIMIT 1",
  );
  return rows?.[0] ?? null;
}

export async function handleReadyCommand(telegramId: number): Promise<IncomingTextResult> {
  const auth = await authorize(telegramId);
  if (!auth.ok) return { reply: auth.reply };

  const shift = await getActiveShift();
  const draft = await getOrCreateCollectingDraft(telegramId, shift?.id ?? null);

  const director = await getDirector();
  if (!director) {
    return { reply: 'Не найден активный руководитель смены — сообщите администратору.' };
  }

  const media = await listMedia('draft_post', draft.id);
  const previewText = buildReviewPreviewText(draft, media);

  const client = await getTelegramClient();
  const sent = await client.sendMessage(director.telegram_id, {
    message: previewText,
    buttons: [
      [{ text: '✅ Одобрить и опубликовать', data: `approve:${draft.id}` }, { text: '✏️ Изменить текст', data: `edit_text:${draft.id}` }],
      [{ text: '🗑 Убрать элемент', data: `remove:${draft.id}` }, { text: '🔀 Порядок', data: `reorder:${draft.id}` }],
      [{ text: '❌ Отклонить', data: `reject:${draft.id}` }],
    ],
  });

  await setDraftStatus(draft.id, 'pending_review');
  await setReviewerMessage(draft.id, director.telegram_id, (sent as any).id);

  return { reply: 'Черновик отправлен руководителю на одобрение.' };
}
```

*(Точный вид вызова кнопок (`Button.inline` из GramJS) — уточнить по факту API в Task 1/6; здесь показан целевой контракт данных `[{text, data}]`, обёртка в `Button.inline(text, Buffer.from(data))` добавляется при подключении реального клиента, если `sendMessage` не принимает такой упрощённый вид напрямую.)*

- [ ] **Step 4: Запустить, убедиться что проходит**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: PASS, все тесты файла зелёные.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegramDraftBot.ts src/lib/telegramDraftBot.test.ts
git commit -m "feat(portal): /готово — сборка превью и отправка руководителю"
```

---

## Task 10: Callback-хендлеры ревью — «Изменить текст», «Убрать элемент», «Порядок»

**Files:**
- Modify: `src/lib/telegramDraftBot.ts`
- Modify: `src/lib/telegramDraftBot.test.ts`

**Interfaces:**
- Consumes: `deleteMedia`/`reorderMedia` из `./portalMedia` (существуют), `setDraftText` (Task 4).
- Produces:
  ```typescript
  export type ReviewCallback =
    | { action: 'edit_text'; draftId: number }
    | { action: 'remove'; draftId: number }
    | { action: 'reorder'; draftId: number }
    | { action: 'approve'; draftId: number }
    | { action: 'reject'; draftId: number };
  export function parseCallbackData(data: string): ReviewCallback | null;
  export async function applyTextEdit(draftId: number, newText: string): Promise<void>;
  export async function applyRemoveMedia(mediaId: number): Promise<void>;
  export async function applyReorder(draftId: number, orderedMediaIds: number[]): Promise<void>;
  ```

- [ ] **Step 1: Написать падающий тест**

```typescript
// добавить в src/lib/telegramDraftBot.test.ts
describe('parseCallbackData', () => {
  it('парсит approve:5', async () => {
    const { parseCallbackData } = await import('./telegramDraftBot');
    expect(parseCallbackData('approve:5')).toEqual({ action: 'approve', draftId: 5 });
  });
  it('парсит edit_text:12', async () => {
    const { parseCallbackData } = await import('./telegramDraftBot');
    expect(parseCallbackData('edit_text:12')).toEqual({ action: 'edit_text', draftId: 12 });
  });
  it('возвращает null для мусора', async () => {
    const { parseCallbackData } = await import('./telegramDraftBot');
    expect(parseCallbackData('что-то не то')).toBeNull();
  });
});

describe('applyTextEdit / applyRemoveMedia / applyReorder', () => {
  it('applyTextEdit пишет новый текст', async () => {
    const { setDraftText } = await import('./draftPost');
    const { applyTextEdit } = await import('./telegramDraftBot');
    await applyTextEdit(5, 'Новый текст');
    expect(setDraftText).toHaveBeenCalledWith(5, 'Новый текст');
  });

  it('applyRemoveMedia вызывает deleteMedia', async () => {
    const { deleteMedia } = await import('./portalMedia');
    const { applyRemoveMedia } = await import('./telegramDraftBot');
    await applyRemoveMedia(2);
    expect(deleteMedia).toHaveBeenCalledWith(2);
  });

  it('applyReorder вызывает reorderMedia с порядком', async () => {
    const { reorderMedia } = await import('./portalMedia');
    const { applyReorder } = await import('./telegramDraftBot');
    await applyReorder(5, [3, 1, 2]);
    expect(reorderMedia).toHaveBeenCalledWith([3, 1, 2]);
  });
});
```

Дописать в мок `./portalMedia` (Task 8/9) недостающие `deleteMedia`/`reorderMedia`:

```typescript
vi.mock('./portalMedia', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    listMedia: vi.fn(async () => [{ id: 1, file_type: 'photo' }, { id: 2, file_type: 'video' }]),
    deleteMedia: vi.fn(async () => {}),
    reorderMedia: vi.fn(async () => {}),
  };
});
```

Также добавить `setDraftText` в мок `./draftPost` (Task 7's мок) как `vi.fn(async () => {})`.

- [ ] **Step 2: Запустить, убедиться что падает**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: FAIL — новые экспорты отсутствуют.

- [ ] **Step 3: Реализовать**

```typescript
import { deleteMedia, reorderMedia } from './portalMedia';
import { setDraftText } from './draftPost';

export type ReviewCallback =
  | { action: 'edit_text'; draftId: number }
  | { action: 'remove'; draftId: number }
  | { action: 'reorder'; draftId: number }
  | { action: 'approve'; draftId: number }
  | { action: 'reject'; draftId: number };

const KNOWN_ACTIONS = new Set(['edit_text', 'remove', 'reorder', 'approve', 'reject']);

export function parseCallbackData(data: string): ReviewCallback | null {
  const [action, idRaw] = data.split(':');
  const draftId = Number(idRaw);
  if (!KNOWN_ACTIONS.has(action) || !Number.isFinite(draftId)) return null;
  return { action: action as ReviewCallback['action'], draftId };
}

export async function applyTextEdit(draftId: number, newText: string): Promise<void> {
  await setDraftText(draftId, newText);
}

export async function applyRemoveMedia(mediaId: number): Promise<void> {
  await deleteMedia(mediaId);
}

export async function applyReorder(draftId: number, orderedMediaIds: number[]): Promise<void> {
  void draftId; // порядок применяется глобально к списку id — draftId для будущей валидации принадлежности
  await reorderMedia(orderedMediaIds);
}
```

- [ ] **Step 4: Запустить, убедиться что проходит**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegramDraftBot.ts src/lib/telegramDraftBot.test.ts
git commit -m "feat(portal): callback-хендлеры правки текста/состава медиа"
```

---

## Task 11: «Отклонить» — уведомление автору

**Files:**
- Modify: `src/lib/telegramDraftBot.ts`
- Modify: `src/lib/telegramDraftBot.test.ts`

**Interfaces:**
- Produces: `applyReject(draftId: number): Promise<void>` — переводит `draft_post` в `rejected`, шлёт автору уведомление.

- [ ] **Step 1: Написать падающий тест**

```typescript
// добавить в src/lib/telegramDraftBot.test.ts
describe('applyReject', () => {
  it('переводит черновик в rejected и уведомляет автора', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'X', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { applyReject } = await import('./telegramDraftBot');
    await applyReject(5);
    expect(setDraftStatus).toHaveBeenCalledWith(5, 'rejected');
  });
});
```

Добавить `getDraft: vi.fn()` в мок `./draftPost`.

- [ ] **Step 2: Запустить, убедиться что падает**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: FAIL — `applyReject` не существует.

- [ ] **Step 3: Реализовать**

```typescript
import { getDraft } from './draftPost';

export async function applyReject(draftId: number): Promise<void> {
  const draft = await getDraft(draftId);
  await setDraftStatus(draftId, 'rejected');
  if (draft) {
    const client = await getTelegramClient();
    await client.sendMessage(draft.author_telegram_id, {
      message: 'Ваш черновик отклонён руководителем.',
    });
  }
}
```

- [ ] **Step 4: Запустить, убедиться что проходит**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegramDraftBot.ts src/lib/telegramDraftBot.test.ts
git commit -m "feat(portal): отклонение черновика с уведомлением автору"
```

---

## Task 12: «Одобрить» — публикация в канал смены

**Files:**
- Modify: `src/lib/telegramDraftBot.ts`
- Modify: `src/lib/telegramDraftBot.test.ts`

**Interfaces:**
- Consumes: `getShiftById` (Task 5).
- Produces: `applyApprove(draftId: number, approvedBy: number): Promise<{ ok: true } | { ok: false; error: string }>`.

- [ ] **Step 1: Написать падающий тест**

```typescript
// добавить в src/lib/telegramDraftBot.test.ts
describe('applyApprove', () => {
  it('без tg_parent_channel_id у смены — возвращает ошибку, не публикует, не меняет статус', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'Текст', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getShiftById } = await import('./portalShift');
    (getShiftById as any).mockResolvedValue({ id: 3, name: 'Смена', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active' });
    const { applyApprove } = await import('./telegramDraftBot');
    const r = await applyApprove(5, 777);
    expect(r).toEqual({ ok: false, error: expect.stringContaining('канал') });
    expect(setDraftStatus).not.toHaveBeenCalledWith(5, 'approved', expect.anything());
  });

  it('публикует и переводит в approved', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'Текст', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getShiftById } = await import('./portalShift');
    (getShiftById as any).mockResolvedValue({ id: 3, name: 'Смена', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active', tg_parent_channel_id: -100123 });
    const { applyApprove } = await import('./telegramDraftBot');
    const r = await applyApprove(5, 777);
    expect(r).toEqual({ ok: true });
    expect(setDraftStatus).toHaveBeenCalledWith(5, 'approved', 777);
  });
});
```

Добавить `getShiftById: vi.fn()` в мок `./portalShift` (Task 7's блок).

- [ ] **Step 2: Запустить, убедиться что падает**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: FAIL — `applyApprove` не существует.

- [ ] **Step 3: Реализовать**

```typescript
import { getShiftById } from './portalShift';

export async function applyApprove(
  draftId: number,
  approvedBy: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const draft = await getDraft(draftId);
  if (!draft) return { ok: false, error: 'Черновик не найден' };

  const shift = draft.shift_id ? await getShiftById(draft.shift_id) : null;
  const channelId = (shift as any)?.tg_parent_channel_id;
  if (!channelId) {
    return { ok: false, error: 'У смены не настроен канал (tg_parent_channel_id) — обратитесь к администратору' };
  }

  const media = await listMedia('draft_post', draftId);
  const client = await getTelegramClient();

  try {
    const photos = media.filter((m) => m.file_type === 'photo');
    const videos = media.filter((m) => m.file_type === 'video');
    if (photos.length > 0) {
      await client.sendFile(channelId, {
        file: photos.map((p) => p.file_path ?? p.file_url),
        caption: draft.text ?? '',
      });
    }
    for (const v of videos) {
      await client.sendFile(channelId, { file: v.file_path ?? v.file_url });
    }
    if (photos.length === 0 && videos.length === 0 && draft.text) {
      await client.sendMessage(channelId, { message: draft.text });
    }
  } catch (e) {
    return { ok: false, error: `Ошибка публикации: ${String(e)}` };
  }

  await setDraftStatus(draftId, 'approved', approvedBy);
  return { ok: true };
}
```

- [ ] **Step 4: Запустить, убедиться что проходит**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts
```

Ожидаем: PASS, весь файл зелёный.

- [ ] **Step 5: Прогнать полный набор тестов файла**

```bash
npx vitest run src/lib/telegramDraftBot.test.ts src/lib/draftPost.test.ts src/lib/telegramMedia.test.ts src/lib/portalShift.test.ts
```

Ожидаем: все PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/telegramDraftBot.ts src/lib/telegramDraftBot.test.ts
git commit -m "feat(portal): публикация одобренного черновика в канал смены"
```

---

## Самопроверка плана

**Покрытие спека:**
- Правило «оригинал» (photo/video отклонить, document принять, >300МБ отклонить) → Task 3.
- Роли/авторизация → Task 7.
- `draft_post` состояния → Task 4, 9, 11, 12.
- Границы черновика (`/готово` собирает всё, что накопилось) → Task 4 (`getOrCreateCollectingDraft`) + Task 9.
- Правка на этапе одобрения (текст/убрать/порядок) → Task 10.
- Отклонить → Task 11.
- Публикация в канал (photo/video, не document) → Task 12.
- Обработка ошибки публикации (не блокирует повтор) → Task 12 (не меняет статус при ошибке).
- GramJS вместо гипотезы с локальным bot-api → Task 1, 6.

**Не покрыто этим планом (по дизайну — отдельные спеки):** face-match, контекст дня, генерация текста через Grok — это Task соответствующих отдельных планов по специкам 2–4 Фазы 2.

**Type consistency:** `DraftPost.status` использует один и тот же union `'collecting'|'pending_review'|'approved'|'rejected'` во всех задачах; `MediaClassification`/`TelegramMessageLike` определены один раз в Task 3 и переиспользуются без изменений в Task 7–8; `ReviewCallback.action` строки совпадают со строками `data:` в кнопках Task 9 (`approve:`, `edit_text:`, `remove:`, `reorder:`, `reject:`).
