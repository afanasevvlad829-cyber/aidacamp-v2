# Aidacamp Hub — Централизованная база данных

Централизованная система для агрегации данных из Яндекс.Метрика, Яндекс.Директ, VK Ads и AlfaCRM с REST API и MCP инструментами для Claude.

## Архитектура

```
PostgreSQL 14+ (aidacamp_hub)
    ├── variables_vault     # API ключи и токены
    ├── projects            # Проекты (aidacamp, codims)
    ├── kb_entries          # База знаний с pgvector (1536-dim embeddings)
    ├── metrics_stats       # Данные Яндекс.Метрика
    ├── direct_stats        # Данные Яндекс.Директ
    ├── vk_stats            # Данные VK Ads
    ├── crm_clients         # Данные AlfaCRM
    └── sync_log            # Лог синхронизаций

Express API (порт 3001)
    ├── /api/projects       # Управление проектами
    ├── /api/variables      # Просмотр переменных (токены скрыты)
    ├── /api/kb             # CRUD базы знаний + семантический поиск
    ├── /api/metrics/*      # Метрика, Директ, VK, CRM статистика
    └── /api/sync/*         # Статус и запуск синхронизации

MCP Server (9 инструментов)
    ├── kb_search           # Полнотекстовый поиск в базе знаний
    ├── kb_search_semantic  # Семантический поиск через pgvector
    ├── kb_add              # Добавить запись в базу знаний
    ├── metrics_summary     # Сводка Яндекс.Метрика
    ├── metrika_stats       # Детальная статистика Метрики по целям
    ├── direct_stats        # Статистика Яндекс.Директ
    ├── vk_stats            # Статистика VK Ads
    ├── crm_clients         # Список клиентов AlfaCRM
    └── sync_status         # Статус синхронизации
```

## Быстрый старт

### 1. Конфигурация

```bash
cp .env.example .env
# Отредактируй .env — заполни DB_PASSWORD, HUB_API_SECRET, API ключи
```

### 2. Установка

```bash
npm install
```

### 3. Инициализация БД

```bash
# Миграции
psql -U aidacamp_app -d aidacamp_hub -f db/migrations/001_variables_vault.sql
psql -U aidacamp_app -d aidacamp_hub -f db/migrations/002_projects.sql
# ... остальные миграции

# Сидеры
psql -U aidacamp_app -d aidacamp_hub -f db/seeders/001_projects_seed.sql
```

### 4. Инвентаризация токенов

```bash
DB_PASSWORD=... node scripts/inventory-tokens.js
```

### 5. Запуск API

```bash
HUB_API_SECRET=my-secret npm start
# API доступен на http://localhost:3001
```

### 6. Установка systemd сервиса

```bash
ssh root@159.194.223.55 "bash /opt/aidacamp-hub/scripts/install-service.sh"
systemctl start aidacamp-hub
```

### 7. Регистрация cron синков

```bash
ssh root@159.194.223.55 "bash /opt/aidacamp-hub/scripts/setup-cron.sh"
```

## REST API

Все запросы требуют заголовок: `Authorization: Bearer <HUB_API_SECRET>`

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/health` | GET | Статус сервера (без авторизации) |
| `/api/projects` | GET | Список проектов |
| `/api/projects/:id` | GET | Детали проекта с конфигом |
| `/api/variables` | GET | Список переменных (токены скрыты) |
| `/api/variables/:key` | GET | Одна переменная |
| `/api/kb` | GET | Поиск в базе знаний |
| `/api/kb/:id` | GET | Запись базы знаний |
| `/api/kb` | POST | Добавить запись |
| `/api/kb/search-semantic` | POST | Семантический поиск |
| `/api/kb/:id` | PUT | Обновить запись |
| `/api/metrics` | GET | Данные Метрики |
| `/api/metrics/summary` | GET | Сводка Метрики |
| `/api/metrics/direct` | GET | Данные Директа |
| `/api/metrics/vk` | GET | Данные VK Ads |
| `/api/metrics/crm` | GET | Клиенты CRM |
| `/api/sync/status` | GET | Статус синков |
| `/api/sync/history` | GET | История синков |
| `/api/sync/:tool/run` | POST | Запустить синк |

## MCP Инструменты

Зарегистрированы в `~/.claude/mcp-servers.json`. Доступны в новых диалогах Claude.

```bash
# Проверить загрузку инструментов
node /opt/aidacamp-hub/mcp/mcp-server.mjs
```

## Cron расписание

| Синк | Расписание | Таблица |
|------|-----------|---------|
| sync-metrica.js | `0 * * * *` (ежечасно) | metrics_stats |
| sync-direct.js | `5 * * * *` (ежечасно) | direct_stats |
| sync-vk.js | `10 * * * *` (ежечасно) | vk_stats |
| sync-crm.js | `0 0 * * *` (ежедневно) | crm_clients |

Логи: `/var/log/aidacamp/{metrica,direct,vk,crm}.log`

## Мониторинг

```bash
# Статус сервиса
systemctl status aidacamp-hub

# Логи API
journalctl -u aidacamp-hub -f

# Статус синков в БД
psql -U aidacamp_app -d aidacamp_hub -c \
  "SELECT tool_name, status, records_inserted, started_at FROM sync_log ORDER BY started_at DESC LIMIT 10;"

# Тест системы
bash /opt/aidacamp-hub/scripts/test-integration.sh
```

## Переменные окружения

| Переменная | Описание | Обязательная |
|-----------|----------|-------------|
| `DB_HOST` | Хост PostgreSQL | Нет (default: 159.194.223.55) |
| `DB_PASSWORD` | Пароль БД | Да |
| `HUB_API_SECRET` | Bearer токен для API | Да |
| `API_PORT` | Порт API сервера | Нет (default: 3001) |
| `OPENAI_API_KEY` | Ключ для семантического поиска | Нет |
| `TELEGRAM_BOT_TOKEN` | Бот для алертов | Нет |
| `TELEGRAM_CHAT_ID` | Chat ID для алертов | Нет |

## Устранение неполадок

**API не отвечает:**
```bash
systemctl status aidacamp-hub
journalctl -u aidacamp-hub --since "1 hour ago"
```

**Синк падает с ошибкой токена:**
```bash
# Проверить токены в vault
psql -U aidacamp_app -d aidacamp_hub -c \
  "SELECT key, test_result, last_tested FROM variables_vault WHERE instrument IS NOT NULL;"
```

**Семантический поиск не работает:**
- Убедись что `OPENAI_API_KEY` задан в .env
- Проверь что записи в kb_entries имеют ненулевой embedding
```bash
psql -U aidacamp_app -d aidacamp_hub -c \
  "SELECT COUNT(*) as with_embedding FROM kb_entries WHERE embedding IS NOT NULL;"
```

**pgvector не установлен:**
```bash
ssh root@159.194.223.55 "apt-get install -y postgresql-14-pgvector"
psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```
