# Портал — Фаза 3: «Сетка смены» (расписание + чек-листы + отметки) — дизайн

**Дата:** 2026-05-25
**Ветка:** `agent/portal-smena` → PR в `dev`
**Зависит от:** Фаза 1 (портал-лончер), Фаза 2 (роли/реестр `portal_staff`, вход)
**Статус:** дизайн утверждён («делай быстро»), готов к плану

## 1. Цель

Одна **сетка смены** как единый источник: дни → события (активности). У события —
**роли-ответственные** и **чек-листы** (оба опциональны). Сотрудник видит свой день
по роли и ставит **личные галочки** по пунктам чек-листов. Одни данные — несколько
представлений (день / по роли / по активности / шахматка). **Архив, не удаление.**

### Решения (зафиксированы)
- Подход **B**: чистая модель в БД портала (Postgres), роли из `portal_staff`.
- Ответственный = **роль** (admin/teacher/vozhaty/rukovoditel).
- Галочки = **per-person** (каждый за себя, по `telegram_id`).
- В первый заход — **все 4 представления** в портале.
- Telegram-вебап галочки — следующий шаг (API уже совместим, дёргает тот же эндпоинт).

## 2. Данные (Postgres, рядом с `portal_staff`)

```sql
CREATE TABLE IF NOT EXISTS shift (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived'))
);
CREATE TABLE IF NOT EXISTS shift_day (
  id BIGSERIAL PRIMARY KEY,
  shift_id BIGINT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT,
  UNIQUE (shift_id, date)
);
CREATE TABLE IF NOT EXISTS shift_event (
  id BIGSERIAL PRIMARY KEY,
  shift_id BIGINT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  title TEXT NOT NULL,
  activity_type TEXT,
  roles TEXT[] NOT NULL DEFAULT '{}',   -- роли-ответственные/участники
  sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS checklist (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE,                       -- 'zaezd','rasselenie','priyomka',...
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'      -- [{ "id": "i1", "text": "..." }]
);
CREATE TABLE IF NOT EXISTS event_checklist (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES shift_event(id) ON DELETE CASCADE,
  checklist_id BIGINT NOT NULL REFERENCES checklist(id) ON DELETE CASCADE,
  roles TEXT[] NOT NULL DEFAULT '{}'     -- каким ролям этот чек-лист на этом событии
);
CREATE TABLE IF NOT EXISTS checklist_done (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES shift_event(id) ON DELETE CASCADE,
  checklist_id BIGINT NOT NULL REFERENCES checklist(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  telegram_id BIGINT NOT NULL,
  done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, checklist_id, item_id, telegram_id)
);
```

Семантика отметки: **строка в `checklist_done` есть = пункт выполнен этим человеком**;
снять галочку = удалить строку. **Удаление смены не делаем** — `shift.status='archived'`.

## 3. Доступ к данным — `src/lib/portalShift.ts`

Функции (pg, DSN как у `portalStaff`):
- `getActiveShift()` → `Shift | null`.
- `getEventsForDate(shiftId, date)` / `getEventsForShift(shiftId)` → события + их чек-листы (через `event_checklist`+`checklist`).
- `getDoneFor(telegramId, shiftId)` → множество ключей `event:checklist:item`, отмеченных этим человеком.
- `toggleDone(telegramId, eventId, checklistId, itemId)` → вставка/удаление строки; возвращает новое состояние (done bool).
- Admin: `upsertEvent`, `deleteEventSoft`(не нужно — каскад от shift), `upsertChecklist`, `setEventChecklist`, `archiveShift`, `importFromPlan(json)`.

## 4. API

- `POST /api/portal/shift/check` — тело `{eventId, checklistId, itemId}`; берёт `telegram_id` из сессии (`sub`); проверяет, что роль пользователя ∈ `event_checklist.roles`; toggle; возвращает `{done}`. **Тот же эндпоинт для портала и будущего TG-вебапа.**
- `GET /api/portal/shift` — данные сетки (опц. `?date=&view=`) для рендера/обновления.
- Admin (роль admin/rukovoditel) `POST /api/portal/shift/admin` — действия: `upsertEvent`, `upsertChecklist`, `attachChecklist`, `archiveShift`, `importPlan`.

Гейт: пути под `/api/portal/shift*` закрыты существующим middleware (нужна сессия).

## 5. Представления (один источник, 4 среза) — `/portal/smena`

SSR-страница с переключателем вида (`?view=day|role|activity|matrix`, `?date=`):
- **role** (по умолчанию для сотрудника) — «Мой день»: события роли пользователя на дату + чек-листы + его галочки (интерактив).
- **day** — все события выбранного дня (обзор), сгруппированы по времени.
- **activity** — события сгруппированы по `activity_type`/названию через смену.
- **matrix** (шахматка) — дни × роли; переиспользуем CSS-паттерн из существующего `/staff` (`sched-*`).

Галочки: клик → `fetch POST /api/portal/shift/check` → оптимистичное обновление.
Брендстиль (DESIGN_SYSTEM, bi-иконки, без эмодзи, 16px моб.).

## 6. Редактор сетки — `/portal/smena/admin`

Только роли `admin`/`rukovoditel`. Формами: создать/править смену, дни (тема), события
(дата, время, название, тип, роли), чек-листы (шаблон + пункты), привязать чек-лист к
событию для ролей, архивировать смену. Без drag-n-drop (YAGNI).

## 7. Засев и старый `/staff`

- Разовый импорт текущего плана: `GET /api/shift-plan` (JSON `days/events/role-checklists`)
  → `importFromPlan` раскладывает в таблицы. Скрипт/админ-действие `importPlan`.
- Старый `/staff` остаётся доступен (помечаем «старый»), новый источник правды — `/portal/smena`.
- Карточка на хабе портала: «Сетка смены» → `/portal/smena` (роли admin/teacher/vozhaty/rukovoditel).

## 8. Хаб / навигация
- Группа «Сотрудникам смены»: добавить карточку **«Сетка смены»** → `/portal/smena`
  (видна admin/rukovoditel/vozhaty/teacher).
- «Управление сеткой» → `/portal/smena/admin` — в группе «Управление» (admin/rukovoditel).

## 9. Тестирование
- Юнит: `toggleDone` (вставка/удаление, идемпотентность), проверка «роль ∈ roles».
- E2E (dev): сотрудник видит свои события по роли; ставит галочку → сохраняется (reload держит); чужую роль не видит; админ создаёт событие+чек-лист → появляется у роли; переключение видов.

## 10. Что НЕ входит (YAGNI / следующие шаги)
- **Telegram-вебап галочки** — API готов; UI/Mini App — следующий шаг.
- Drag-n-drop редактор шахматки.
- Уведомления/напоминания о невыполненных пунктах.
- Аналитика выполнения по сотрудникам.

## 11. Выкат
dev: миграция таблиц + засев из плана + деплой + E2E; затем прод по «выкатываем».
Внимание: после потери `.env` держать его бэкап (`/root/env-backups/`) — деплой не должен сносить env.
