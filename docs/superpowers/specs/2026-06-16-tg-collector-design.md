# Telegram Collector — Дизайн (Фаза 1)

**Дата:** 2026-06-16  
**Статус:** Approved  
**Область:** Сбор постов из Telegram-канала в Postgres

---

## Цель

Собирать все посты из канала `@vroderabotaetno` в таблицу Postgres.  
Фаза 2 (не в этом спеке): паблишеры читают оттуда и публикуют на vc.ru, VK и др.

---

## Компоненты

### 1. `collector.py` — systemd-сервис

- Long polling через `getUpdates` (timeout=30)
- Фильтрует `channel_post` от канала `@vroderabotaetno`
- Сохраняет в таблицу `tg_posts` (INSERT OR IGNORE по `message_id`)
- При ошибке — пауза 5 сек, retry

**Что сохраняет:**
- `message_id` — ID сообщения в канале
- `channel` — `@vroderabotaetno`
- `posted_at` — UTC timestamp из Telegram
- `text` — текст поста (plain, сущности пока игнорируем)
- `photo_url` — URL фото если есть (через `getFile`)

### 2. Таблица `tg_posts`

```sql
CREATE TABLE IF NOT EXISTS tg_posts (
  id           SERIAL PRIMARY KEY,
  message_id   INTEGER NOT NULL,
  channel      TEXT NOT NULL,
  posted_at    TIMESTAMPTZ NOT NULL,
  text         TEXT,
  photo_url    TEXT,
  published_to TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, channel)
);
```

`published_to` — массив платформ (`'vcru'`, `'vk'`), заполняется в Фазе 2.

### 3. Деплой на сервере

**Расположение:** `/opt/tg-collector/`

```
/opt/tg-collector/
├── collector.py
├── requirements.txt    # psycopg2-binary
└── .env                # токены
```

**`.env`:**
```
TELEGRAM_BOT_TOKEN=<токен @Aidacamp2026bot из /opt/aidacamp-hub/.env>
TELEGRAM_CHANNEL=@vroderabotaetno
DATABASE_URL=<из /opt/aidacamp-hub/.env, ключ DATABASE_URL>
```

**systemd unit** `/etc/systemd/system/tg-collector.service`:
- `Restart=always`, `RestartSec=5`
- Запускается от непривилегированного пользователя

### 4. Предусловие

Бот `@Aidacamp2026bot` должен быть добавлен в канал `@vroderabotaetno` как администратор с правом "Просмотр сообщений".

---

## Фаза 2 (не в этом спеке)

Отдельный `publisher.py` (cron пн 9:55):
1. Читает `tg_posts` где `'vcru' != ALL(published_to)` и `posted_at` за текущий день
2. Группирует последовательные посты в одну статью
3. POST на `https://api.vc.ru/v1/entry/create`
4. Добавляет `'vcru'` в `published_to`

---

## Out of scope (Фаза 1)

- Форматирование Telegram entities → Osnova blocks
- Публикация на любую платформу
- Обработка видео, документов, опросов
- Редактирование/удаление постов (UPDATE/DELETE в БД)
