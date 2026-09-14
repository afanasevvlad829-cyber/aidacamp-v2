# Единый конвейер публикаций VK + LinkedIn — дизайн

Дата: 2026-09-14 (ревизия того же дня — после обнаружения `pub` и `agent-hq`, см. «История ревизий»)

## Проблема

На проде 4 независимых постера в VK/LinkedIn, каждый со своей копией логики очереди/аплоада фото и своим форматом файла:

- `content-poster.mjs` — очередь 96 (VK стена+группа), `queue.json`/`state.json`
- `backfill-poster.mjs` — репост старой стены (VK группа), `queue-backfill.json`/`state-backfill.json`
- `vk-poster.js` — статьи блога (VK+Дзен RSS), своя логика поверх `article_views`; очередь уже пуста, кандидат на архивацию отдельно от этого конвейера
- `linkedin-poster.mjs` — страницы компаний, ни разу не запускался (ждёт токен)

Инцидент 08-13.09.2026 (Flood control на личный VK-токен Дарьи) ударил по двум из них одновременно и вскрыл дублирование: `uploadPhoto`-логика с флуд-контролем правилась в двух местах (`vk-poster.js` и новый `vk-group.mjs`) параллельно.

## История ревизий (важно для понимания дизайна)

Первая версия этого спека (утро 14.09.2026) предполагала: единый конвейер на ВСЕ каналы (VK/LinkedIn/Telegram/Zernio), новые таблицы/колонки в `content_items`/`publications`, `UNIQUE(content_id, channel)`. При переходе к плану реализации выяснилось — до начала любых ALTER TABLE — что это неверная картина:

- **`publications` — НЕ пассивный реестр.** У неё уже есть `status` (CHECK: draft/scheduled/claimed/published/failed/unknown), `source_decision_id` (UNIQUE, ссылка на `decision_log` в agent-hq), `payload` (jsonb, текст+контекст), `claimed_at`. Это чужая, уже эволюционировавшая схема, а не пустой лист.
- **`pub`** (`~/MCP/social-poster/publisher/pub`, CLI на маке владельца, SSH+psql в прод) — живой ручной инструмент, публикует в Дзен/Zernio(FB/IG/LinkedIn/YouTube), пишет напрямую в `content_items`/`publications`. Использовался ЭТОЙ неделей (14.09).
- **`agent-hq`** (systemd на проде) — генерирует черновики постов для Telegram-канала через `decision_log` → `publications(channel='telegram', status='draft')` каждые 5 мин (`agent-hq-post-queue.timer`, enabled). Реальная отправка (`agent-hq-post-publish.timer`) собрана, но осознанно выключена — ждёт решения владельца о целевом канале.
- **`/opt/social-poster/queue/`** (Aug-19 scaffold, отдельная `publication_queue`) подтверждён мёртвым — таблицы физически нет.

**Вывод и решение владельца (14.09.2026):** не изобретать пятую систему. Zernio и Telegram уже покрыты (`pub`, `agent-hq`) — им не хватает только расписания/включения, не нового кода. Этот конвейер сужен до **VK (стена+группа) и LinkedIn** — единственного, что реально дублируется в четырёх местах без единого источника. Схема `content_items`/`publications` используется КАК ЕСТЬ, с реальными колонками, а не с придуманными.

## Цель

Общий диспетчер + адаптер для VK (заменяет `content-poster.mjs` + `backfill-poster.mjs`), задел под LinkedIn — вместо трёх копий логики очереди/аплоада. Используем существующие `content_items`/`publications` как третьего равноправного писателя рядом с `pub` и `agent-hq`, не ломая их данные и соглашения.

## Модель данных — используем как есть, без новых колонок

```sql
-- Единственное необходимое изменение: расширить допустимые status —
-- 'queued' там нет, а он нужен как «в очереди, диспетчер ещё не брал».
-- Аддитивно (только добавляет значение), не ломает existing constraint-checks
-- ни у pub, ни у agent-hq — они пишут свои значения (draft/scheduled/...), не queued.
ALTER TABLE publications DROP CONSTRAINT publications_status_check;
ALTER TABLE publications ADD CONSTRAINT publications_status_check
  CHECK (status IN ('queued','draft','scheduled','claimed','published','failed','unknown'));
```

Больше никаких ALTER — ни новых колонок, ни новых таблиц. Конкретно:

- **Текст поста** → `content_items.title` (уже так используется: `content_id=346`, title = полный текст поста «Дарья, с днём рождения!…» — не «заголовок» в бытовом смысле, а тело поста; это установленное соглашение, не моя придумка).
- **`content_items.type`** → `'post'` (уже существует в CHECK, уже 82 строки этого типа).
- **`content_items.path_or_slug`** (NOT NULL, UNIQUE с `type`) → для ЕЩЁ НЕ опубликованных постов (наш случай — очередь 96 и бэкфилл публикуются впервые) синтетический id `vk96-<n>` / `backfill-v3-<n>`, где `<n>` — номер из старого `queue.json`/`queue-backfill.json`. После публикации переименовывать в `vk-<owner>_<post_id>` (соглашение для УЖЕ опубликованных строк) — не обязательно, не блокирует функциональность.
- **Медиа** → `publications.payload` (jsonb, уже существует, уже используется `agent-hq` для текста+контекста черновиков): `{"media": [{"url": "...", "type": "photo"}]}`. Для бэкфилла фото не известны заранее (берутся с оригинала стены на момент публикации, как сейчас) — `payload` может быть пустым, адаптер фетчит на лету.
- **Канал** → `channel='vk'` (личная стена) и `channel='vk_group'` (группа) — **раздельные строки**, не одна как в старом (первом) варианте спека. Это уже установленная в реестре гранулярность (видно по историческим строкам `vk`/`vk_group` как разным значениям) и она честнее: стена может скипнуться (Flood control), группа — нет, это два независимых факта, не один флаг `wall_skipped` внутри одной записи.
- **Идемпотентность** — БЕЗ `UNIQUE(content_id, channel)`. В реальных данных 119 групп дублей (см. историю ревизий) — индекс физически не встанет, а чистка чужой истории не в объёме этой задачи. Вместо constraint — прикладная проверка перед вставкой (`SELECT 1 FROM publications WHERE content_id=$1 AND channel=$2 AND status NOT IN ('failed')`), тот же паттерн, что уже использует `pub` (подтверждено при расследовании — `pub` делает `SELECT id FROM publications WHERE content_id=... AND channel=...` перед записью).
- **`source_decision_id`** — не используем, остаётся NULL у наших строк (это поле принадлежит `agent-hq`).

### Каналы v1

| channel | Что делает | Каденс | Адаптер |
|---|---|---|---|
| `vk` | Личная стена Дарьи | ежедневно 10:00 UTC | `adapters/vk.mjs` (реюз `vk-group.mjs`/`vk-poster.js`) |
| `vk_group` | Группа aida_codit — и очередь 96, и бэкфилл целятся сюда | ежедневно 10:00 UTC (96) / 14:00 UTC (бэкфилл) | тот же `adapters/vk.mjs`, target разный |
| `linkedin_school` / `linkedin_camp` | Страницы компаний | пн/вт/чт/пт 13:00 МСК | `adapters/linkedin.mjs` (новый, реюз linkedin-poster.mjs; включать только после токена) |

Telegram и Zernio — **вне объёма этого конвейера**, см. «Не делаем».

## Диспетчер

`pipeline/publish-next.mjs --channel=<name>`, вызывается systemd-таймером per-channel. `target` — константа на канал (не хранится в БД): `vk`→`VK_OWNER_ID`, `vk_group`→`VK_GROUP_ID`, `linkedin_school`/`linkedin_camp`→свой `urn:li:organization:<id>` — те же константы, что уже зашиты в `vk-poster.js`/README LinkedIn.

Шаги:

1. Прикладная проверка идемпотентности (см. выше) — если для следующего кандидата уже есть незафейленная публикация в этот `channel`, пропустить его и взять следующий `content_item`.
2. `SELECT` следующий `content_items(type='post')` без такой строки в `publications` для `channel`, `ORDER BY id LIMIT 1`.
3. Нет кандидатов → лог и выход 0 (очередь пуста — не ошибка).
4. `INSERT INTO publications(content_id, channel, status='claimed', claimed_at=now())`.
5. Вызов `adapter.publish({ text: content_item.title, media: payload?.media, target })`.
6. Успех → `UPDATE publications SET status='published', published_at=now(), url=..., payload=payload||jsonb_build_object('external_id', ...)`.
7. Провал → `UPDATE ... SET status='failed', payload=payload||jsonb_build_object('error', ...)`, алерт в ТГ (как сейчас). Не удаляем строку, не пробуем следующий item в этом же прогоне — 1 таймер = 1 попытка, как сейчас.

`DRY_RUN=1` — не пишет в БД, не зовёт адаптер по-настоящему (тот же контракт, что у всех текущих постеров).

## Миграция очередей в полёте

Разовый скрипт `pipeline/migrate-legacy-queues.mjs`:

- `content-queue/queue.json` (96 шт) + `state.json` (7 сделано) → 89 новых `content_items(type='post', path_or_slug='vk96-<n>')`. Для каждого — по строке `publications(channel='vk')` и `publications(channel='vk_group')` (личный + кросспост, как сейчас). 7 уже вышедших → сразу `status='published', url=<из state.json>` (для тех, где стена была скипнута Flood control'ом — только строка `vk_group` published, `vk` не создаём вовсе, а не «published с пустым url»).
- `content-queue/queue-backfill.json` (109 шт) + `state-backfill.json` (5 сделано на 14.09) → 104 новых `content_items(type='post', path_or_slug='backfill-v3-<n>')` + по одной строке `publications(channel='vk_group')` каждому (бэкфилл никогда не трогает личную стену). 5 сделанных → `status='published'`.
- Идемпотентно: перед вставкой проверка `SELECT 1 FROM content_items WHERE type='post' AND path_or_slug=$1` (полагается на существующий `UNIQUE(type, path_or_slug)`, повторный запуск скрипта безопасен — `ON CONFLICT DO NOTHING`).
- Старые `queue.json`/`state.json`/`queue-backfill.json`/`state-backfill.json` → `/opt/social-poster/_archive/` **после** проверки, что новый диспетчер публикует то же самое (несколько дней параллельного наблюдения перед выключением старых таймеров).

## Порядок раскатки

1. `ALTER TABLE` (расширение `status` CHECK) + `pipeline/publish-next.mjs` + `pipeline/adapters/vk.mjs` (реюз `vk-group.mjs`, уже обкатанного вчерашним фиксом на Flood control). Миграция очереди 96, переключение таймера на `channel=vk`+`channel=vk_group` (10:00 UTC), несколько дней наблюдения.
2. Миграция бэкфилла, переключение таймера (`channel=vk_group`, 14:00 UTC).
3. LinkedIn — код `adapters/linkedin.mjs` можно готовить параллельно, включать только после токена (см. [[project-linkedin-company-poster]]).

## Риски и открытые вопросы

- **Не чистим 119 групп дублей** в исторических `publications` — они принадлежат `pub`/бэкфиллу реестра, не в объёме этой задачи; идемпотентность нового писателя не зависит от их состояния (см. «Модель данных»).
- **`ALTER TABLE ... DROP/ADD CONSTRAINT`** на живой таблице, которую параллельно пишут `pub` и `agent-hq` — аддитивное изменение (расширяет допустимые значения), но выполнять вне часов активности `agent-hq-post-queue.timer` (тикает каждые 5 мин) не обязательно technически, но разумно как процедурная предосторожность — делать через `ssh`+`psql`, проверить `\d publications` до и после.
- **LinkedIn** остаётся заблокирован на ревью Community Management API — код адаптера можно готовить, включить нельзя до токена.

## Не делаем

- **Telegram-канал** — уже есть `agent-hq` (генератор + очередь черновиков), не хватает только включения `agent-hq-post-publish.timer` — отдельная маленькая задача с владельцем о выборе канала, не часть этого конвейера.
- **Zernio (FB/IG/LinkedIn/YouTube)** — уже есть рабочий `pub zernio`, используется вручную. Если понадобится автоматизация — обернуть существующий `pub` в таймер, не переписывать адаптер заново.
- **Дзен** — `pub dzen` уже покрывает, плюс сам Дзен закрыл RSS-автоимпорт 13.09.2026 отдельно.
- Не строим UI/дашборд поверх очереди.
- Не трогаем `source_decision_id`/`decision_log` — это зона `agent-hq`.
- Не чистим и не переоткрываем существующие 476+195+... строк `publications` — только добавляем свои поверх.
