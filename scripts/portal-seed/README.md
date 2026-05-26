# Seed для портала АйДаКэмп

Все данные для импорта в БД при инициализации смены лежат здесь как JSON-файлы.

## Структура

```
seed/
├── canonical/
│   ├── checklists.json              — шаблоны чек-листов, часть 1
│   ├── checklists_part2.json        — часть 2
│   ├── checklists_part3.json        — часть 3
│   ├── content_tasks.json           — пул контент-заданий, meal
│   ├── content_tasks_part2.json     — lesson, pool
│   ├── content_tasks_part3.json     — free_time, evening, transit
│   └── content_tasks_part4.json     — housing, ceremony, departure
├── shift_2026_05_30.json            — манифест смены: shift, staff, days
└── events_2026_05_30/
    ├── day_-1.json                  — день приёмки номеров
    ├── day_1_part1.json             — день заезда (часть 1)
    ├── day_1_part2.json             — день заезда (часть 2)
    ├── day_7_hackathon.json         — день хакатона
    ├── day_8_ceremony.json          — день защиты и зефирок
    ├── day_10_departure.json        — день отъезда
    ├── regular_day_template_part1.json — шаблон типового дня (части 1, 2, 3)
    ├── regular_day_template_part2.json
    └── regular_day_template_part3.json
```

## Порядок импорта (для seed-скрипта)

1. **Канонические сущности** (`canonical/`) — загружаются один раз и переиспользуются всеми сменами:
   - сначала все `checklists*.json` (мерж по полю `checklists`)
   - затем все `content_tasks*.json` (мерж по полю `content_task_templates`)

2. **Манифест смены** (`shift_2026_05_30.json`):
   - создаётся `shift`
   - создаётся `portal_staff` для каждого человека
   - создаются `shift_day` записи

3. **События смены** (`events_2026_05_30/`):
   - читаются все файлы `day_*.json` — создаются события с указанным `id` как `external_id`
   - читается `regular_day_template_*.json` — для каждого дня с `type=regular` (дни 2-6, 9) клонируется шаблон:
     - `event.id` формируется как `ev-d{N}-{id_suffix}` где `N` — `day_number`
     - `responsible: ["counselor_duty"]` резолвится в конкретного вожатого по правилу: нечётные дни — `counselor_1`, чётные — `counselor_2`
     - если `day.pool_day = true` — событие с `event_type=pool_or_alt` получает `checklists_if_pool` и `content_task_template_if_pool`, иначе — `null` (альтернатива заполняется отдельно)

## Семантические ID

Все `event.id` — семантические, на латинице, с префиксом дня. Идемпотентны: при повторном импорте записи с тем же `external_id` обновляются, новые создаются, отсутствующие в JSON помечаются `is_deleted=true` (физически не удаляются — может быть привязка archive_photo).

## Что отсутствует в seed и доделывается отдельно

- **Имена сотрудников** (`staff[].name`, `telegram_id`) — TBD, заполнить до 28 мая
- **Сценарий знакомства в автобусе** (`ev-d1-bus-trip.notes`) — методист дополняет
- **Расписание занятий по парам** — какая активность на какой паре, по дням 2-7
- **Бассейн** — `pool_day` в `days[]` сейчас стоит на чётных, согласовать с санаторием
- **День 9** — сейчас `regular`, может стать буферным/расслабляющим — уточнить
- **`checklist.room_check_after`** — отдельный чек-лист отъезда, оформить
- **Список комнат** — берётся из существующей таблицы расселения, в seed не дублируется

## Как менять расписание

1. Открыть нужный JSON-файл в редакторе
2. Поменять время, добавить/удалить событие, поменять `content_task_template`
3. Прогнать `npm run portal:seed:dry-run -- shift_2026_05_30.json` — посмотреть diff
4. Если ок — `npm run portal:seed -- shift_2026_05_30.json`

Галочки и фото за уже прошедшие события сохранятся.
