# Портал — Фаза 2: Telegram-вход + база сотрудников — дизайн

**Дата:** 2026-05-24
**Ветка:** `agent/portal-phase2` → PR в `dev`
**Зависит от:** Фаза 1 (портал-лончер на ролевых паролях, уже на dev)
**Статус:** дизайн утверждён (решения зафиксированы), готов к плану реализации

## 1. Цель

Заменить общие ролевые пароли для **сотрудников** на персональный
**Telegram-вход** и единый **реестр сотрудников**; **ученики** входят по **коду**.
Закрывает дыры текущей схемы: общий пароль на роль, отсутствие персональной
идентичности, невозможность отозвать доступ у одного человека. Готовит почву
под Telegram Mini App (`@Aidacamp2026bot`).

## 2. Зафиксированные решения

- **Механизм:** оба — Telegram **Login Widget** (веб, делаем сейчас) и **Mini App
  `initData`** (бэкенд-эндпоинт делаем сейчас, UI Mini App — позже).
- **Охват:** сотрудники (`admin`/`teacher`/`vozhaty`/`rukovoditel`) → Telegram;
  ученики (`student`) → код.
- **База:** новая таблица PostgreSQL `portal_staff` + мини-админка в портале.
- **Первый вход:** pending-флоу (сам зашёл → заявка → admin назначает роль).
- **Break-glass:** `PORTAL_PWD_ADMIN` остаётся как аварийный вход admin.
- **Токен:** `TELEGRAM_BOT_TOKEN` уже в env сервера (нужно подтвердить, что это
  именно `@Aidacamp2026bot` — см. §10 риски).
- **Объём сейчас:** дизайн + веб-вход (Login Widget) + база + админка на dev;
  эндпоинт `initData` реализуем, но UI Mini App — отдельной задачей позже.

### Не входит
- Вёрстка/логика самого Mini App (позже).
- Импорт сотрудников из AlfaCRM (группа 660) — отложено; pending-флоу наполняет базу.
- Перевод учеников на Telegram.

## 3. Архитектура (реюз Фазы 1)

Гейт `src/middleware.ts`, cookie `portal_session`, видимость по ролям и
хаб-лончер — **без изменений**. Меняется только *источник роли*.

```
Сотрудник:
  /portal/login (Login Widget)  ──► /api/portal/tg ──► verifyLoginWidget(hash)
  Mini App (initData)           ──► /api/portal/tg ──► verifyInitData(hash)
        │ ok → telegram_id
        ▼
  portal_staff[telegram_id]: active + role? ──► signSession(role, sub=tg_id) → cookie → /portal/
        ├─ нет записи        → создать pending (role=null) → «ждите подтверждения»
        ├─ role=null         → «ждите подтверждения»
        └─ active=false      → «доступ отозван»

Ученик:
  /portal/login (поле «код») ──► /api/portal/login (PORTAL_PWD_STUDENT) → signSession('student')

Аварийный admin:
  /portal/login (поле «код») ──► /api/portal/login (PORTAL_PWD_ADMIN) → signSession('admin')
```

## 4. Модель данных — `portal_staff`

PostgreSQL (DSN — тот же, что у `/api/lead`: `AIDAPLUS_PG_DSN` || `PG_DSN`).

```sql
CREATE TABLE IF NOT EXISTS portal_staff (
  id           BIGSERIAL PRIMARY KEY,
  telegram_id  BIGINT UNIQUE NOT NULL,
  full_name    TEXT,
  tg_username  TEXT,
  role         TEXT CHECK (role IN ('admin','teacher','vozhaty','rukovoditel')),  -- NULL = ожидает
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by  BIGINT,          -- telegram_id админа, кто подтвердил
  approved_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_portal_staff_role_active ON portal_staff (role, active);
```

Миграция — идемпотентный SQL-скрипт (`scripts/portal-staff-migration.sql`),
применяется вручную на dev/прод.

## 5. Проверка подписи Telegram — `src/lib/telegramAuth.ts`

- **Login Widget:** `data_check_string` = отсортированные `k=v`, склеенные `\n`
  (без поля `hash`); `secret = SHA256(bot_token)`;
  валидно если `HMAC_SHA256(secret, data_check_string) === hash`; плюс проверка
  свежести `auth_date` (≤ 24 ч).
- **Mini App initData:** распарсить query-string; `data_check_string` —
  отсортированные пары без `hash`; `secret = HMAC_SHA256(key="WebAppData", bot_token)`;
  сравнить с `hash` (timing-safe).
- Экспорт: `verifyLoginWidget(params) → TgUser | null`,
  `verifyInitData(initData: string) → TgUser | null`, где
  `TgUser = { telegram_id: number; username?: string; name?: string }`.
- Юнит-тесты с фиктивным токеном и заранее посчитанными подписями (валид/невалид/протух).

## 6. Эндпоинты

- **`POST /api/portal/tg`** (новый, `prerender=false`): принимает либо поля
  Login Widget, либо `initData` (различаем по наличию `initData`/параметру
  `source`). Верифицирует → `telegram_id` → запрос в `portal_staff`:
  - `active && role` → `signSession(role, { sub: telegram_id })` → cookie →
    303 на `next` (виджет) или `{ok:true}` (Mini App).
  - запись есть, `role IS NULL` → 200 «заявка на рассмотрении».
  - `active=false` → 403 «доступ отозван».
  - записи нет → `INSERT` pending (role NULL, full_name/username из TG) →
    200 «заявка отправлена».
- **`/api/portal/login`** (существующий) — оставляем только для **кода ученика**
  (`PORTAL_PWD_STUDENT`) и **break-glass admin** (`PORTAL_PWD_ADMIN`).
  Из `resolveRole` **убираем** `teacher`/`vozhaty`/`rukovoditel` (они теперь только TG).
- **`/api/portal/staff`** (новый, admin-only через гейт): `list`, `approve`
  (назначить роль, проставить `approved_by/at`), `deactivate` (`active=false`),
  `reactivate`, `setRole`. Все мутации — `POST`.

## 7. Источник роли и отзыв доступа

- `resolveRole` (пароль): только `student` (код) и `admin` (break-glass).
- TG-путь берёт роль из `portal_staff`.
- **Отзыв (важно):** cookie живёт 30 дней и несёт роль — иначе `active=false`
  не подействует до истечения. Решение:
  - В session-payload добавить **необязательный `sub` = telegram_id** для
    сотрудничьих сессий (`signSession(role, { sub })`, `verifySession` его отдаёт).
  - В `middleware.ts` для сессий **с `sub`** (сотрудники) проверять `active`
    в `portal_staff` с **кэшем в памяти 60 с** по `telegram_id`. `active=false`
    или роль изменилась → сбросить и редирект на login.
  - Сессии без `sub` (ученик/break-glass admin) — без обращения к БД.
- Это держит отзыв «почти мгновенным» (≤60 с) при минимальной нагрузке на БД.

## 8. UX страницы входа `/portal/login`

- Основное: кнопка **Telegram Login Widget** (для сотрудников). Подключается
  скриптом `telegram-widget.js` с `data-telegram-login=<bot_username>`,
  `data-auth-url=/api/portal/tg` (или callback-режим).
- Вторично: ссылка «Я ученик — ввести код» → раскрывает поле кода →
  `POST /api/portal/login`.
- Состояния после TG: «Заявка отправлена, ждите подтверждения» / «Доступ отозван».
- Брендстиль (DESIGN_SYSTEM, bi-иконки, без эмодзи).

## 9. Мини-админка `/portal/staff-admin` (только admin)

- Раздел в портале (виден роли admin; карточка на хабе для admin).
- Таблицы: **Заявки** (pending: назначить роль / отклонить), **Активные**
  (сменить роль / деактивировать), **Отключённые** (reactivate).
- SSR-страница + формы → `POST /api/portal/staff`.

## 10. env и BotFather

- `TELEGRAM_BOT_TOKEN` — токен `@Aidacamp2026bot` (подтвердить!).
- `PORTAL_BOT_USERNAME` — username бота для виджета (напр. `Aidacamp2026bot`).
- `PORTAL_SESSION_SECRET`, `AIDAPLUS_PG_DSN`/`PG_DSN` — уже есть.
- `PORTAL_PWD_STUDENT` (код ученика), `PORTAL_PWD_ADMIN` (break-glass) — остаются.
- **Убрать:** `PORTAL_PWD_TEACHER`, `PORTAL_PWD_VOZHATY`, `PORTAL_PWD_RUKOVODITEL`.
- **BotFather:** `/setdomain` для бота → домен Login Widget.

## 11. Выкат

dev сначала: применить SQL-миграцию, проставить env (username), подтвердить
токен/домен бота, smoke + E2E; затем PR `dev → main` и прод по «выкатываем».

## 12. Риски

- **Токен может быть не от `@Aidacamp2026bot`** (а от notify-бота) — тогда
  Login Widget не сойдётся. **Первый шаг реализации — подтвердить, чей это токен**
  (`getMe` по токену) и при необходимости получить токен нужного бота.
- **Login Widget = один домен на бота** (ограничение Telegram): dev и прод
  одновременно через один бот могут конфликтовать. Варианты: отдельный бот для
  dev, либо тестировать виджет на проде, а на dev — через Mini App `initData`/
  break-glass. Решить при реализации.
- **Отзыв доступа** vs срок cookie — снят через `sub` + проверку `active` (§7).
- Сотрудники без Telegram — нет; break-glass admin покрывает аварию.
