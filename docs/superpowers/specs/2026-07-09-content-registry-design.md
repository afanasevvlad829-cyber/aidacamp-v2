# Реестр контента (история публикаций) — дизайн

Дата: 2026-07-09

## Проблема

Контент (статьи, ролики, фото) и их публикации в соцсети раскиданы по отдельным JSON-файлам в разных папках (`content_plan.json`, `production.json`, ad-hoc списки вроде `VK_PUBLISHED` прямо в коде скриптов). Нет единого места, где видно: что за контент существует, куда и когда он публиковался. Из-за этого часть контента (например, 8+ «необычных» статей про лагеря, 3 статьи про экономику лагеря) осталась вне всех потоков публикации — просто потому что про неё забыли, её не было в едином списке.

## Цель

Собрать историческую базу — что публиковали, куда, когда — чтобы было видно всю картину сразу. Без автоматизации на этом этапе: решения о том, что публиковать дальше, принимаются вручную (пользователем или в сессии с Claude), опираясь на данные из базы.

## Хранилище

Две новые таблицы в существующем PostgreSQL (та же БД, где `leads_log`, `ai_dialogs`). Не создаём отдельную БД/файл — используем то, что уже есть и доступно через `mcp__aidacamp-tools__run(service="ssh", ...)` / прямой psql.

## Схема

```sql
CREATE TABLE content_items (
  id            SERIAL PRIMARY KEY,
  type          TEXT NOT NULL,        -- 'article' | 'video' | 'photo'
  title         TEXT NOT NULL,
  path_or_slug  TEXT NOT NULL,        -- URL статьи / имя файла видео / путь фото
  topic         TEXT,                 -- тема (напр. 'экраны', 'документы', 'экономика')
  tags          TEXT[],               -- свободные теги
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, path_or_slug)
);

CREATE TABLE publications (
  id             SERIAL PRIMARY KEY,
  content_id     INTEGER NOT NULL REFERENCES content_items(id),
  channel        TEXT NOT NULL,       -- 'vk' | 'dzen' | 'zernio_fb' | 'zernio_ig' | 'zernio_linkedin' | 'zernio_youtube'
  published_at   TIMESTAMPTZ NOT NULL,
  url            TEXT,                -- ссылка на живой пост, если есть
  note           TEXT                 -- свободный текст: хук, почему выбрали, что сработало
);

CREATE INDEX idx_publications_content_id ON publications(content_id);
CREATE INDEX idx_content_items_topic ON content_items(topic);
```

Один `content_item` может иметь много строк в `publications` (одна и та же статья — в VK, потом в Дзен, потом в Zernio).

## Наполнение (backfill, разово)

Разовый Python-скрипт, который читает существующие источники и заливает историю:

- `~/MCP/social-poster/zen-batch/content_plan.json` — 30 статей → `content_items` (type='article') + строки в `publications` для `vk_date`/`zernio_date` (там где статус не «в план», а фактически опубликовано) и для всех «✓ черновик» Дзен-статей
- `~/MCP/social-poster/otr-shorts/production.json` — 9 роликов → `content_items` (type='video') + запланированные `publications` (channel='zernio_ig', возможно 'zernio_youtube' после подключения канала)
- Захардкоженный список `VK_PUBLISHED` (сейчас живёт в коде `make_report_v2.py`) → строки `publications` (channel='vk')
- Фото из `photo-pool` не заводим как отдельные `content_items` на этом этапе (у них нет самостоятельной публикационной истории — используются как приложение к статьям/постам, не как отдельная единица контента). Если понадобится отдельный учёт фото — это отдельная задача позже.

Скрипт идемпотентен: `UNIQUE (type, path_or_slug)` + `ON CONFLICT DO NOTHING` для `content_items`; для `publications` — не дублировать, если уже есть строка с тем же `content_id`+`channel`+`published_at::date`.

## Что дальше (не в этом спеке)

- Ручное/скриптовое добавление новых строк по мере публикаций (никакой автоматики/движка рекомендаций)
- Возможный дашборд в Reports Hub поверх этих таблиц — отдельная задача, когда будет накоплена история
- Учёт фото как отдельных content_items — если возникнет реальная потребность

## Не делаем

- Не строим движок рекомендаций «что публиковать дальше»
- Не мигрируем существующие JSON-файлы (`content_plan.json` и т.д.) — они остаются рабочими файлами для текущих скриптов, база — это исторический слой поверх них
- Не трогаем `smena_photos`/`photos` тулзу и архив 9200 фото
