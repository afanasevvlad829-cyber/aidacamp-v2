# Реестр контента (история публикаций) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать историю «что публиковали, куда, когда» в двух таблицах PostgreSQL (`content_items`, `publications`) и разово наполнить их данными из уже существующих источников — без движка автоматизации, просто исторический слой для ручных решений.

**Architecture:** Две таблицы в существующей БД `aidacamp` на сервере (доступна только с `localhost` сервера — все SQL-операции идут через `ssh root@159.194.223.55` + `psql`). Наполнение — Python-скрипт, который читает `content_plan.json` (30 статей) и генерирует идемпотентный `backfill.sql`; данные по 9 роликам ОТР и по 12 найденным-но-неопубликованным статьям зашиты в скрипт литералами (их источники — сессионный scratchpad и ручной grep по репозиторию — не персистентны, полагаться на них нельзя).

**Tech Stack:** PostgreSQL 14+ (существующий сервер), Python 3 (стандартная библиотека, без внешних зависимостей — psycopg2 не нужен, весь SQL идёт файлом через `psql -f`), SSH.

**Важное уточнение относительно спека:** в спеке (`docs/superpowers/specs/2026-07-09-content-registry-design.md`) таблица `publications` описана с `published_at TIMESTAMPTZ NOT NULL`. В реальности часть данных (7 статей опубликованы в VK ещё до появления `content_plan.json` — точная дата публикации нигде не сохранена; 30 Дзен-статей существуют как черновики без даты публикации вообще) не имеет даты. План делает `published_at` нулевым (`NULL` допустим) и добавляет колонку `status TEXT NOT NULL` (`'draft' | 'scheduled' | 'published'`), которой не было в схеме спека — без неё непонятно, относится ли строка к прошлому (реально опубликовано) или к будущему (запланировано через Zernio на даты после сегодняшнего дня, 2026-07-09). Это минимальное уточнение, не меняющее общую идею спека.

**Второе уточнение:** спек называет отдельным источником захардкоженный список `VK_PUBLISHED` (8 слагов из кода `make_report_v2.py`). Проверка показала, что все статьи из `content_plan.json` с `vk_status == 'опубликовано'` — это ровно тот же список (7 из 8 слагов `VK_PUBLISHED` присутствуют в текущих 30 статьях плана, восьмой — старый слаг, которого больше нет в плане). План не заводит `VK_PUBLISHED` отдельным источником — это было бы 100%-но избыточным кодом, который на каждом прогоне ничего не вставлял бы (из-за `NOT EXISTS`-проверки). Факт публикации этих статей в VK учтён через `vk_status` внутри основного цикла по `content_plan.json` (Task 2).

---

## Task 1: Схема БД

**Files:**
- Create: `~/MCP/social-poster/content-registry/schema.sql`

- [ ] **Step 1: Написать DDL**

Файл `~/MCP/social-poster/content-registry/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS content_items (
  id            SERIAL PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('article', 'video', 'photo')),
  title         TEXT NOT NULL,
  path_or_slug  TEXT NOT NULL,
  topic         TEXT,
  tags          TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, path_or_slug)
);

CREATE TABLE IF NOT EXISTS publications (
  id             SERIAL PRIMARY KEY,
  content_id     INTEGER NOT NULL REFERENCES content_items(id),
  channel        TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'published')),
  published_at   TIMESTAMPTZ,
  url            TEXT,
  note           TEXT
);

CREATE INDEX IF NOT EXISTS idx_publications_content_id ON publications(content_id);
CREATE INDEX IF NOT EXISTS idx_content_items_topic ON content_items(topic);
```

- [ ] **Step 2: Создать директорию и записать файл на Маке**

```bash
mkdir -p ~/MCP/social-poster/content-registry
```

Записать содержимое из Step 1 в `~/MCP/social-poster/content-registry/schema.sql`.

- [ ] **Step 3: Скопировать на сервер**

```bash
scp -i ~/.ssh/aidacamp_prod ~/MCP/social-poster/content-registry/schema.sql root@159.194.223.55:/tmp/content_registry_schema.sql
```

Expected: файл скопирован без ошибок (никакого вывода при успехе).

- [ ] **Step 4: Применить схему**

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "psql -U postgres -d aidacamp -f /tmp/content_registry_schema.sql"
```

Expected output:
```
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
```

- [ ] **Step 5: Проверить, что таблицы создались**

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "psql -U postgres -d aidacamp -c '\d content_items' -c '\d publications'"
```

Expected: вывод описания обеих таблиц с колонками `id, type, title, path_or_slug, topic, tags, created_at` и `id, content_id, channel, status, published_at, url, note` соответственно.

- [ ] **Step 6: Commit**

```bash
cd ~/MCP
git add social-poster/content-registry/schema.sql
git commit -m "feat: схема реестра контента (content_items, publications)"
```

---

## Task 2: Скрипт генерации backfill-данных

**Files:**
- Create: `~/MCP/social-poster/content-registry/generate_backfill.py`

- [ ] **Step 1: Написать скрипт**

Файл `~/MCP/social-poster/content-registry/generate_backfill.py`:

```python
#!/usr/bin/env python3
"""
Разовый бэкфилл реестра контента (content_items + publications).
Читает content_plan.json (30 статей) + литералы по 9 роликам ОТР и
12 статьям, ни разу не публиковавшимся в соцсетях. Генерирует backfill.sql —
идемпотентный (безопасно запускать повторно), применяется на сервере через
`psql -U postgres -d aidacamp -f backfill.sql`.
"""
import json
import os

CONTENT_PLAN_PATH = os.path.expanduser(
    '~/MCP/social-poster/zen-batch/content_plan.json'
)
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backfill.sql')

# 9 роликов ОТР — источник (scratchpad сессии, где собирались) не персистентен,
# поэтому данные зашиты литералом.
OTR_VIDEOS = [
    {'slug': 'otr-01-telefon-valyuta', 'title': 'Внутренняя валюта = телефонное время',
     'topic': 'экраны', 'schedule_date': '2026-07-20',
     'video_url': 'https://aidacamp.ru/videos/otr-shorts/otr-01-telefon-valyuta.mp4'},
    {'slug': 'otr-02-za-smenu-nichemu', 'title': 'Чему научит IT-смена + ИИ',
     'topic': 'ит-лагерь', 'schedule_date': '2026-07-22',
     'video_url': 'https://aidacamp.ru/videos/otr-shorts/otr-02-za-smenu-nichemu.mp4'},
    {'slug': 'otr-03-giperopeka', 'title': 'Хрустальный колпак / гиперопека',
     'topic': 'психология', 'schedule_date': '2026-07-24',
     'video_url': 'https://aidacamp.ru/videos/otr-shorts/otr-03-giperopeka.mp4'},
    {'slug': 'otr-04-tri-chasa-za-kompom', 'title': 'Вредно ли за компьютером',
     'topic': 'экраны', 'schedule_date': '2026-07-27',
     'video_url': 'https://aidacamp.ru/videos/otr-shorts/otr-04-tri-chasa-za-kompom.mp4'},
    {'slug': 'otr-05-zaberite-menya', 'title': 'Преодоление / история дочери',
     'topic': 'психология', 'schedule_date': '2026-07-29',
     'video_url': 'https://aidacamp.ru/videos/otr-shorts/otr-05-zaberite-menya.mp4'},
    {'slug': 'otr-06-kakoy-lager', 'title': 'Виды тематических лагерей',
     'topic': 'выбор', 'schedule_date': '2026-07-31',
     'video_url': 'https://aidacamp.ru/videos/otr-shorts/otr-06-kakoy-lager.mp4'},
    {'slug': 'otr-07-mesta-zakonchatsya', 'title': 'Дефицит тематических смен',
     'topic': 'выбор', 'schedule_date': '2026-08-03',
     'video_url': 'https://aidacamp.ru/videos/otr-shorts/otr-07-mesta-zakonchatsya.mp4'},
    {'slug': 'otr-08-bez-roditeley', 'title': 'Самостоятельность / профильные = будущее',
     'topic': 'психология', 'schedule_date': '2026-08-05',
     'video_url': 'https://aidacamp.ru/videos/otr-shorts/otr-08-bez-roditeley.mp4'},
    {'slug': 'otr-09-a-ty-znaesh-chto', 'title': 'Любопытство / открытие делают наставники',
     'topic': 'психология', 'schedule_date': '2026-08-07',
     'video_url': 'https://aidacamp.ru/videos/otr-shorts/otr-09-a-ty-znaesh-chto.mp4'},
]

# Статьи, найденные на сайте (src/pages/stati/), но ни разу не участвовавшие
# ни в одном потоке публикации — мотивирующий пример для всего реестра.
UNPUBLISHED_ARTICLES = [
    {'slug': 'lagerya-v-neobychnykh-mestakh',
     'title': 'Лагеря в необычных местах: пещеры, пустыни, корабли и джунгли', 'topic': 'необычное'},
    {'slug': 'neobychnye-detskie-lagerya-v-mire',
     'title': 'Топ необычных детских лагерей в мире: шпионы, акулы, зомби и каскадёры', 'topic': 'необычное'},
    {'slug': 'samye-dorogie-lagerya-v-mire',
     'title': 'Самые дорогие детские лагеря в мире: что входит в цену', 'topic': 'необычное'},
    {'slug': 'artek-i-sovetskie-lagerya',
     'title': 'Артек и советские лагеря: как это было на самом деле', 'topic': 'необычное'},
    {'slug': 'istoriya-detskogo-lagerya',
     'title': 'История детского лагеря: 165 лет в пути', 'topic': 'необычное'},
    {'slug': 'gde-v-rossii-net-lagerey',
     'title': 'Где в России нет ни одного детского лагеря — и почему', 'topic': 'необычное'},
    {'slug': 'it-lagerya-bez-interneta',
     'title': 'IT-лагеря в странах без интернета: дети, которые изобрели мир без Wi-Fi', 'topic': 'необычное'},
    {'slug': 'lager-gde-zapreshcheno-vse',
     'title': 'Лагерь где запрещено всё: правда о wilderness camps', 'topic': 'необычное'},
    {'slug': 'finlyandiya-deti-v-lesu',
     'title': 'Финляндия: почему дети учатся в лесу — наука за 2 часами на улице', 'topic': 'необычное'},
    {'slug': 'ekonomika-detskogo-lagerya',
     'title': 'Почему детский лагерь стоит столько, сколько стоит: экономика изнутри', 'topic': 'экономика'},
    {'slug': 'skolko-stoit-detskiy-lager',
     'title': 'Сколько стоит детский лагерь в 2026 году', 'topic': 'экономика'},
    {'slug': 'nedorogoy-lager',
     'title': 'Недорогой лагерь: из чего складывается цена и что за ней стоит', 'topic': 'экономика'},
]


def esc(s):
    """SQL-строка с экранированием одинарных кавычек, либо NULL для None."""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"


def ts(date_str, time_str='00:00:00'):
    """'2026-07-20' -> "'2026-07-20T00:00:00'::timestamptz" либо NULL."""
    if date_str is None:
        return 'NULL'
    return f"'{date_str}T{time_str}'::timestamptz"


def content_item_insert(type_, title, slug, topic):
    return (
        f"INSERT INTO content_items (type, title, path_or_slug, topic)\n"
        f"VALUES ({esc(type_)}, {esc(title)}, {esc(slug)}, {esc(topic)})\n"
        f"ON CONFLICT (type, path_or_slug) DO NOTHING;"
    )


def publication_insert(type_, slug, channel, status, published_at_sql, url, note):
    """published_at_sql — уже готовое SQL-выражение (результат ts()), не строка даты."""
    return (
        f"INSERT INTO publications (content_id, channel, status, published_at, url, note)\n"
        f"SELECT ci.id, {esc(channel)}, {esc(status)}, {published_at_sql}, {esc(url)}, {esc(note)}\n"
        f"FROM content_items ci WHERE ci.type = {esc(type_)} AND ci.path_or_slug = {esc(slug)}\n"
        f"AND NOT EXISTS (\n"
        f"  SELECT 1 FROM publications p WHERE p.content_id = ci.id\n"
        f"  AND p.channel = {esc(channel)} AND p.status = {esc(status)}\n"
        f"  AND p.published_at IS NOT DISTINCT FROM {published_at_sql}\n"
        f");"
    )


def build():
    lines = []

    plan = json.load(open(CONTENT_PLAN_PATH, encoding='utf-8'))
    for p in plan:
        lines.append(content_item_insert('article', p['title'], p['slug'], p['topic']))

        if p['vk_status'] == 'опубликовано':
            lines.append(publication_insert(
                'article', p['slug'], 'vk', 'published', 'NULL', None,
                'дата публикации не сохранена в источнике'))
        else:
            lines.append(publication_insert(
                'article', p['slug'], 'vk', 'scheduled', ts(p['vk_date']), None, None))

        for channel in ('zernio_fb', 'zernio_ig', 'zernio_linkedin'):
            lines.append(publication_insert(
                'article', p['slug'], channel, 'scheduled', ts(p['zernio_date']), None, None))

        lines.append(publication_insert(
            'article', p['slug'], 'dzen', 'draft', 'NULL', None,
            'черновик собран в студии, не опубликован'))

    for v in OTR_VIDEOS:
        lines.append(content_item_insert('video', v['title'], v['slug'], v['topic']))
        lines.append(publication_insert(
            'video', v['slug'], 'zernio_ig', 'scheduled',
            ts(v['schedule_date'], '10:00:00'), v['video_url'], None))

    for a in UNPUBLISHED_ARTICLES:
        lines.append(content_item_insert('article', a['title'], a['slug'], a['topic']))

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        f.write('BEGIN;\n\n')
        f.write('\n\n'.join(lines))
        f.write('\n\nCOMMIT;\n')

    print(f"написано {len(lines)} SQL-операторов -> {OUT_PATH}")


if __name__ == '__main__':
    build()
```

- [ ] **Step 2: Запустить скрипт**

```bash
cd ~/MCP/social-poster/content-registry
python3 generate_backfill.py
```

Expected output: `написано 210 SQL-операторов -> /Users/vladimirafanasev/MCP/social-poster/content-registry/backfill.sql`

(210 = 30 статей × 6 операторов (1 content_item + 1 vk + 3 zernio + 1 dzen) + 9 роликов × 2 (1 content_item + 1 zernio_ig) + 12 неопубликованных статей × 1 (только content_item) = 180 + 18 + 12 = 210).

- [ ] **Step 3: Проверить, что файл создался и не пустой**

```bash
wc -l ~/MCP/social-poster/content-registry/backfill.sql
head -20 ~/MCP/social-poster/content-registry/backfill.sql
```

Expected: файл на несколько сотен строк, начинается с `BEGIN;` и первого `INSERT INTO content_items`.

- [ ] **Step 4: Commit**

```bash
cd ~/MCP
git add social-poster/content-registry/generate_backfill.py
git commit -m "feat: скрипт генерации backfill.sql для реестра контента"
```

(файл `backfill.sql` — сгенерированные данные, в git не коммитим — см. Task 4, Step 1 добавление в `.gitignore`)

---

## Task 3: Применить backfill на сервере

**Files:**
- Modify: `~/MCP/.gitignore`

- [ ] **Step 1: Добавить сгенерированный SQL в .gitignore**

Открыть `~/MCP/.gitignore`, добавить в конец:

```
social-poster/content-registry/backfill.sql
```

- [ ] **Step 2: Commit .gitignore**

```bash
cd ~/MCP
git add .gitignore
git commit -m "chore: игнорировать сгенерированный backfill.sql"
```

- [ ] **Step 3: Скопировать backfill.sql на сервер**

```bash
scp -i ~/.ssh/aidacamp_prod ~/MCP/social-poster/content-registry/backfill.sql root@159.194.223.55:/tmp/content_registry_backfill.sql
```

Expected: без ошибок.

- [ ] **Step 4: Применить**

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "psql -U postgres -d aidacamp -f /tmp/content_registry_backfill.sql"
```

Expected: длинный список `INSERT 0 1` (по одному на каждый успешно вставленный ряд; для `ON CONFLICT DO NOTHING` без реальной вставки — `INSERT 0 0`), в конце `COMMIT`. Ошибок (`ERROR:`) быть не должно — если есть, разобрать первую же ошибку и не продолжать (типичная причина — несовпадение кавычек при экранировании; поправить `generate_backfill.py`, перегенерировать, повторить с начала Task 3).

---

## Task 4: Проверка результата

**Files:** нет изменений в файлах — только SQL-запросы для проверки.

- [ ] **Step 1: Проверить количество content_items по типам**

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "psql -U postgres -d aidacamp -c \"SELECT type, count(*) FROM content_items GROUP BY type ORDER BY type;\""
```

Expected:
```
  type   | count
---------+-------
 article |    42
 video   |     9
```

- [ ] **Step 2: Проверить publications по каналам и статусам**

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "psql -U postgres -d aidacamp -c \"SELECT channel, status, count(*) FROM publications GROUP BY channel, status ORDER BY channel, status;\""
```

Expected (порядок строк может отличаться, суммы должны сойтись):
```
     channel      |  status   | count
-------------------+-----------+-------
 dzen              | draft     |    30
 vk                | published |     7
 vk                | scheduled |    23
 zernio_fb         | scheduled |    30
 zernio_ig         | scheduled |    39
 zernio_linkedin   | scheduled |    30
```
(`zernio_ig` = 30 статей + 9 роликов = 39)

- [ ] **Step 3: Точечно проверить, что статьи без публикаций видны — сам смысл реестра**

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "psql -U postgres -d aidacamp -c \"SELECT ci.title FROM content_items ci LEFT JOIN publications p ON p.content_id = ci.id WHERE p.id IS NULL ORDER BY ci.title;\""
```

Expected: ровно 12 строк — заголовки статей из `UNPUBLISHED_ARTICLES` (про необычные лагеря и экономику лагеря), и больше ничего.

- [ ] **Step 4: Проверить идемпотентность — повторный прогон backfill не создаёт дублей**

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "psql -U postgres -d aidacamp -f /tmp/content_registry_backfill.sql -c \"SELECT count(*) FROM publications;\""
```

Запустить ещё раз тот же файл (Step 3 из Task 3), затем:

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "psql -U postgres -d aidacamp -c \"SELECT count(*) FROM publications;\" -c \"SELECT count(*) FROM content_items;\""
```

Expected: те же числа, что и после первого прогона (39+30+30+30+23+7=159 в `publications`, 51 в `content_items`) — повторный запуск не добавил ни одной новой строки.

---

## Итог

После выполнения всех тасков: две таблицы в PostgreSQL с полной историей публикаций 30 статей контент-плана, 9 роликов ОТР и явным списком 12 статей, которые существуют на сайте, но ни разу не публиковались ни в одном канале. Дальнейшее наполнение (новые публикации) — вручную, по мере появления, отдельными `INSERT`-ами по образцу `generate_backfill.py` (движок автоматизации — не в этом плане, будет отдельным спеком при необходимости).
