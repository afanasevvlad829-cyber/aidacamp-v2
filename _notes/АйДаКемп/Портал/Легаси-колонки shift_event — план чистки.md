# Легаси-колонки shift_event — план чистки БД

> Статус на 2026-06-04: **НЕ удалять**. Все перечисленные колонки ещё используются. Документ — карта зависимостей и пошаговый план для будущей чистки.

## Контекст

При упрощении конструктора дня (`/portal/smena` = `den.astro`) центральная таблица `shift_event` осталась с легаси-колонками от старого конструктора (`staff/plan`, `smena/DayView`, `MatrixView`). Новый конструктор ими не пользуется, но **старый код и смежные подсистемы — пользуются**. Удаление сейчас сломает уроки, права и привязку фото.

## Карта колонок shift_event

| Колонка | Чем держится | Можно удалить? |
|---|---|---|
| `activity_type` (TEXT) | `portalShift.ts` (SELECT/INSERT/upsertEvent), `copy-day.ts`, старые `smena/DayView`, `MatrixView`, `admin.astro`. Новый конструктор пишет туда NULL. | Нет. Сначала убрать из upsertEvent/copy-day и старых компонентов. |
| `activity_slug` (TEXT) | `portalShift.ts` SELECT + duplicateEvent. Само поле `activity_slug` ещё фигурирует в уроках, но там это таблица `lesson`, не `shift_event`. В `shift_event` — только чтение/копирование, бизнес-логика не завязана. | Почти мёртвая в shift_event. Удалять после правки SELECT/duplicateEvent в portalShift.ts. |
| `group_color_id` (BIGINT FK group_color) | `portalShift.ts` SELECT + duplicateEvent. Активно используется в таблице `lesson` (НЕ shift_event). | В shift_event можно удалять после правки SELECT/duplicateEvent. FK на group_color оставить (нужен урокам). |
| `staff_keys` (TEXT[]) | `portalShift.ts` SELECT/duplicateEvent, `MatrixView`, `portalShiftPerms.ts` (PROTECTED_FIELDS — только список имён, не логика). | После вывода MatrixView и чистки SELECT. |
| `external_id` (TEXT) | `portalShift.ts`, `photo.ts` (`COALESCE(external_id, id::text)` для пути файла!), `portalShiftPerms` (PROTECTED_FIELDS). | **Осторожно:** photo.ts строит путь хранения фото через external_id. Удаление сломает связь со старыми загруженными фото. НЕ удалять без миграции путей. |
| `event_type` (enum) | старые компоненты, copy-day, event-edit. | После вывода старого конструктора. |
| `content_task_template_id` | НОВЫЙ конструктор — активно. | Оставить, не легаси. |
| `notes`, `responsible_staff_id`, `roles`, `sort`, `start_time`, `end_time`, `title`, `date`, `shift_id` | НОВЫЙ конструктор — активно. | Оставить. |

## Пошаговый план будущей чистки (по убыванию безопасности)

1. **Вывести старый конструктор** `staff/plan.astro` + компоненты `smena/DayView`, `MatrixView`, `smena/admin.astro` (раз `/portal/smena` теперь новый конструктор). Убедиться, что на них никто не ссылается.
2. **Почистить `portalShift.ts`**: убрать `activity_type`, `activity_slug`, `group_color_id`, `staff_keys` из COLS-SELECT, `upsertEvent`, `duplicateEvent`. Обновить интерфейс `ShiftEvent`.
3. **Почистить `copy-day.ts`** от `activity_type`/`event_type`.
4. **external_id**: проверить, есть ли фото со старым external_id-путём. Если да — миграция путей или оставить колонку навсегда (она дёшева). Если нет — можно дропать.
5. **Только после 1–4** — миграция `ALTER TABLE shift_event DROP COLUMN ...` для подтверждённо мёртвых колонок. По одной, с бэкапом БД.

## Правила безопасности при чистке БД
- БД **общая dev=прод** — любой DROP сразу на боевых данных.
- Делать **бэкап таблицы** перед каждым DROP: `pg_dump -t shift_event`.
- DROP только колонок, на которые **0 ссылок в коде** (проверять `grep -rn` по всему src/).
- Колонки дёшевы — если сомнение, **оставить**. Чистка ради чистоты не стоит риска боевых данных.

## Вывод
Чистка колонок — НЕ отдельная мелкая задача, а финал большого выноса старого конструктора. Пока новый и старый конструкторы сосуществуют — колонки трогать нельзя.
