# Единый конвейер публикаций (VK/LinkedIn/Telegram/Zernio) — дизайн

Дата: 2026-09-14

## Проблема

На проде 4 независимых постера в VK/LinkedIn, каждый со своей копией логики очереди/аплоада фото и своим форматом файла:

- `content-poster.mjs` — очередь 96 (VK стена+группа), `queue.json`/`state.json`
- `backfill-poster.mjs` — репост старой стены (VK группа), `queue-backfill.json`/`state-backfill.json`
- `vk-poster.js` — статьи блога (VK+Дзен RSS), своя логика поверх `article_views`; очередь уже пуста, кандидат на архивацию отдельно от этого конвейера
- `linkedin-poster.mjs` — страницы компаний, ни разу не запускался (ждёт токен)

Инцидент 08-13.09.2026 (Flood control на личный VK-токен Дарьи) ударил по двум из них одновременно и вскрыл дублирование: `uploadPhoto`-логика с флуд-контролем правилась в двух местах (`vk-poster.js` и новый `vk-group.mjs`) параллельно. Источника правды по контенту тоже нет — `content_items`/`publications` ([2026-07-09-content-registry-design.md](2026-07-09-content-registry-design.md)) существует, но это **пассивный исторический реестр без текста/медиа и без диспетчера** («Не строим движок... Не мигрируем JSON» — этот спек явно этого не предполагал).

## Цель

Один источник данных (Postgres, расширяем существующий `content_items`/`publications`) + один общий диспетчер-скрипт на канал вместо четырёх независимых копий логики. Каждый канал сохраняет свой таймер и каденс (как сейчас), но код диспетчера и адаптеров — общий.

## Модель данных

Расширяем существующие таблицы (не создаём новые — 241 строка `content_items` остаётся, история не переносится и не ломается):

```sql
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS text     TEXT,             -- текст поста (NULL у старых article/video-строк — у них текст не тут)
  ADD COLUMN IF NOT EXISTS media    JSONB,             -- [{ "url": "...", "type": "photo" }], NULL если без медиа
  ADD COLUMN IF NOT EXISTS channels TEXT[],             -- целевые каналы, напр. {'vk_content','linkedin_school'}; NULL у старых строк
  ADD COLUMN IF NOT EXISTS meta     JSONB;              -- произвольный контекст (org: school|camp, src_wall_post_id, и т.п.)

ALTER TABLE publications
  ALTER COLUMN published_at DROP NOT NULL,              -- у queued-строк ещё нет даты публикации
  ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('queued','claimed','published','failed','skipped')),
  ADD COLUMN IF NOT EXISTS target      TEXT,             -- id канала/группы/страницы
  ADD COLUMN IF NOT EXISTS external_id TEXT,             -- id поста у площадки — источник правды «ушло ли»
  ADD COLUMN IF NOT EXISTS error       TEXT,
  ADD COLUMN IF NOT EXISTS attempts    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_at  TIMESTAMPTZ;

-- Применять после проверки, что не конфликтует со старыми данными (см. «Риски»):
CREATE UNIQUE INDEX IF NOT EXISTS idx_publications_content_channel ON publications(content_id, channel);
```

Старые 241 строка `publications` получают `status='published'` по умолчанию — ничего не переоткрывается. `channel` остаётся свободным TEXT (без CHECK) — старые значения (`vk`, `zernio_fb`, `zernio_linkedin`...) и новые (`vk_content`, `linkedin_school`...) сосуществуют, старые никем не переобрабатываются.

Новые строки `content_items`, авторские для этого конвейера (не привязанные к отдельной статье/видео), получают `type='social_post'` — новое значение поля, не конфликтует со старыми `article`/`video`/`photo`. `path_or_slug` (NOT NULL UNIQUE(type, path_or_slug)) для них — синтетический идентификатор источника, например `vk96/7`, `backfill-v3/5`.

### Каналы v1 (не 1:1 с платформой — с реальным поведением)

| channel | Что делает | Каденс (OnCalendar) | Адаптер |
|---|---|---|---|
| `vk_content` | Личная стена Дарьи + кросспост в группу, грейсфул-скип стены | ежедневно 10:00 UTC | `adapters/vk-content.mjs` (реюз `vk-group.mjs`) |
| `vk_backfill_group` | Старые посты стены → только группа | ежедневно 14:00 UTC | `adapters/vk-content.mjs` (тот же адаптер, target=группа) |
| `linkedin_school` | Страница школы АйдаКодить | пн/вт/чт/пт 13:00 МСК | `adapters/linkedin.mjs` (новый, реюз logика linkedin-poster.mjs) |
| `linkedin_camp` | Страница лагеря АйДаКемп | пн/вт/чт/пт 13:00 МСК | `adapters/linkedin.mjs` |
| `telegram_channel` | Telegram-канал | TBD (нет прецедента — решить в плане реализации) | `adapters/telegram.mjs` (уже рабочий, `queue/adapters/telegram.mjs`) |
| `zernio_fb` / `zernio_ig` | FB algopb / IG aida_codit через Zernio API | TBD (старый батч исчерпан, новой каденции пока нет) | `adapters/zernio.mjs` (новый, на основе `/opt/social-poster/zernio/zernio_schedule.py`, перенесённого на сервер 14.09.2026) |

## Диспетчер

Один скрипт `pipeline/publish-next.mjs --channel=<name>`, вызывается таймером per-channel (как сейчас, ничего нового в scheduling — просто общий код вместо четырёх копий):

1. `SELECT` одну строку `content_items` без опубликованной/зафейленной `publications`-строки для этого `channel`, где `channel = ANY(channels)`, `ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`.
2. Нет строк → лог и выход 0 (очередь пуста, это не ошибка).
3. `INSERT publications(content_id, channel, status='claimed', target, claimed_at=now())`.
4. Вызов `adapter.publish({ text, media, target })`.
5. Успех → `UPDATE ... SET status='published', published_at=now(), external_id=...`.
6. Провал → `UPDATE ... SET status='failed', error=...`, алерт в ТГ (как сейчас у каждого постера), **не удаляем строку и не пробуем другой content_item в этом прогоне** — 1 таймер = 1 попытка, как сейчас.

`DRY_RUN=1` поддерживается на уровне диспетчера (не пишет в БД, не зовёт адаптер по-настоящему) — тот же контракт, что у всех текущих постеров.

## Payload-контракт медиа

`media: [{ "url": "...", "type": "photo" }]` — URL на `aidacamp-media` (единое хранилище, уже правило проекта). Адаптер сам решает: скачать и залить нативным методом (VK, LinkedIn) или передать URL напрямую (Zernio, Telegram `sendPhoto`).

## Миграция очередей в полёте

Разовый скрипт `pipeline/migrate-legacy-queues.mjs`:

- `content-queue/queue.json` (96 шт) + `state.json` (7 сделано) → 89 новых `content_items(channels=['vk_content'])` + 7 `publications(status='published', external_id=<wall/group id из state.json>)` для уже вышедших.
- `content-queue/queue-backfill.json` (109 шт) + `state-backfill.json` (5 сделано на 14.09) → 104 новых `content_items(channels=['vk_backfill_group'])` + 5 `publications(status='published')`.
- Идемпотентно (повторный запуск не дублирует — проверка по `meta->>'legacy_source_n'` перед вставкой).
- Старые `queue.json`/`state.json`/`queue-backfill.json`/`state-backfill.json` → `/opt/social-poster/_archive/` **после** проверки, что новый диспетчер публикует то же самое (несколько дней параллельного наблюдения перед выключением старых таймеров).

## Порядок раскатки

1. Схема (ALTER TABLE) + диспетчер + `adapters/vk-content.mjs` (самый обкатанный код — вчерашний фикс на Flood control уже в `vk-group.mjs`). Мигрируем `vk_content`, переключаем таймер, наблюдаем несколько дней.
2. `vk_backfill_group` — тот же адаптер, другой target. Переключаем таймер.
3. Новые каналы с нуля на общем диспетчере: Telegram (адаптер готов, нужен только target/каденс), LinkedIn (ждёт токен независимо от этого конвейера — код можно готовить параллельно), Zernio (адаптер на основе уже перенесённого на сервер `zernio_schedule.py`; новой каденции/контента пока нет — не таймерим, пока не появится контент-план).

## Риски и открытые вопросы (для плана реализации, не решаем здесь)

- **UNIQUE(content_id, channel)** нужно проверить на реальных 241 строках `publications` перед применением индекса — если есть дубли (например, статья публиковалась в один канал дважды с разным `note`), индекс не встанет. Проверочный `SELECT content_id, channel, count(*) ... HAVING count(*)>1` — первый шаг реализации.
- **Telegram-канал**: нет прецедента, какой именно канал/цель и с какой периodичностью — решить с владельцем в процессе реализации, не входит в этот спек.
- **Zernio-каденция**: старый батч (30 постов, июль-август) полностью исчерпан. Новой контент-партии нет — адаптер и перенос кода готовы, но таймер не создаём, пока владелец не подтвердит новый контент-план.
- **LinkedIn** остаётся заблокирован на ревью Community Management API — код адаптера можно готовить, включить нельзя до токена (см. [[project-linkedin-company-poster]] в памяти).

## Не делаем

- Не интегрируемся с agent-hq `decision_log` (недоделанный `queue/` от 19.08.2026 был заточен под это — новый конвейер использует прямой INSERT в БД скриптом/сессией, решение владельца от 14.09.2026).
- Не строим UI/дашборд поверх очереди — не входит в объём.
- Не трогаем Дзен (закрыт 13.09.2026) и `smena_photos`/фотоархив.
- Не переносим сам факт хранения старых 241 строк `publications` — только расширяем схему, история не меняется.
