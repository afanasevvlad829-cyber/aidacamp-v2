# Передача проекта: Бот-консультант АйДаКемп

> Дата документа: 2026-04-23  
> Статус: **рабочий, в продакшне** (dev.aidacamp.ru/ask + aidacamp.ru/ask)

---

## 1. Репозитории и запуск

### Два репозитория — не путать

| Репо | Путь | Ветка | Назначение |
|---|---|---|---|
| Сайт + бот | `~/Aidacamp-cloude` | `dev` → `main` | Весь фронтенд, страница /ask, API бота |
| MCP-инструменты | `~/MCP` | `main` | Инструменты агента: Direct, VK, SSH, статистика |

### Ветки сайта
- `dev` — рабочая ветка, деплоится на `dev.aidacamp.ru`
- `main` — прод, деплоится на `aidacamp.ru`
- `agent/<задача>` — параллельные агенты, мёрджит владелец

### Локальный запуск (сайт)
```bash
cd ~/Aidacamp-cloude
npm install
cp .env.example .env   # заполнить секреты
npm run dev            # http://localhost:4321
```

### Деплой на сервер
```bash
npm run build                   # собирает dist/
./scripts/deploy.sh dev         # → dev.aidacamp.ru
./scripts/deploy.sh prod        # → aidacamp.ru (только после подтверждения)
```

### .env переменные (все обязательны для бота)

| Переменная | Назначение |
|---|---|
| `ANTHROPIC_API_KEY` | Claude Haiku — генерация ответов |
| `OPENAI_API_KEY` | text-embedding-3-small — RAG embeddings |
| `DATABASE_URL` | PostgreSQL с pgvector — `postgresql://aidacamp:****@localhost:5432/aidacamp` |

### Сервер
- IP: `159.194.223.55`
- SSH-ключ: `~/.ssh/aidacamp_prod`
- Файлы сайта: `/var/www/aidacamp-dev/current/` (dev) и `/var/www/aidacamp-prod/current/` (prod)
- Живые данные смен: `/var/www/aidacamp-data/shifts.json` (обновляется cron'ом)
- .env на сервере: `/var/www/aidacamp-dev/.env`

---

## 2. Архитектура бота

### Поток запроса

```
Пользователь (браузер /ask)
    │ POST /api/ask  { message, history[] }
    ▼
src/pages/api/ask.ts
    ├─ getLivePrompt()           читает /var/www/aidacamp-data/shifts.json
    │                            или fallback → campData.ts
    ├─ ragContext(message, 4)    pgvector: top-4 релевантных чанка
    │                            OpenAI text-embedding-3-small
    ├─ buildSystemPrompt()       src/lib/ai/systemPrompt.ts
    │                            + RAG контекст в конце
    ▼
Anthropic claude-haiku-4-5-20251001
    max_tokens: 1024, cache_control: ephemeral (system prompt кэшируется)
    history: последние 10 сообщений
    ▼
JSON парсинг + zod валидация (ResponseSchema)
    ▼
{ state, text, block_type, block_data, chips }
    ▼
Браузер: renderBlock() в src/pages/ask.astro
```

### Ключевые файлы

| Файл | Назначение |
|---|---|
| `src/pages/ask.astro` | UI чата: интро, сообщения, renderBlock(), аврора |
| `src/pages/api/ask.ts` | API эндпоинт POST /api/ask |
| `src/lib/ai/systemPrompt.ts` | System prompt (~300 строк), маршрутизация block_type, факты |
| `src/lib/ai/campData.ts` | Данные смен и курсов (fallback если нет shifts.json) |
| `src/lib/ai/responseSchema.ts` | Zod-схема ответа, список block_type |
| `src/lib/ai/rag.ts` | RAG: embed запрос → pgvector → top-K чанков |
| `src/lib/ai/photoSearch.ts` | Подбор фото для block_type: "gallery" |

---

## 3. RAG / LLM конфигурация

### LLM
- **Модель:** `claude-haiku-4-5-20251001`
- **max_tokens:** 1024
- **История:** последние 10 сообщений из диалога
- **Кэш:** system prompt кэшируется через `cache_control: ephemeral` (экономия ~80% токенов)
- **Fallback:** при timeout → резервный JSON с контактами

### RAG (src/lib/ai/rag.ts)
- **Embedding модель:** `text-embedding-3-small` (OpenAI)
- **top_K:** 4 чанка
- **MIN_SCORE:** 0.4 (косинусное сходство)
- **Поиск:** чистый векторный (pgvector `<=>` оператор)
- **Без reranker** — порог MIN_SCORE как фильтр
- **При ошибке:** тихий fallback (бот работает без RAG)

### Chunking
- Исходники чанков: WhatsApp, Telegram, публикации, транскрипты видео
- Чанкинг ручной (скрипты ingest-*.mjs): ~500-1000 символов на чанк
- Разделение по абзацам/блокам в исходных текстах

### Маршрутизация block_type (в systemPrompt.ts)
| Запрос | block_type |
|---|---|
| Смены/даты | `smeny` |
| Возраст/курсы | `courses` |
| Распорядок дня | `day_schedule` |
| Условия целиком | `conditions` |
| Цены | `prices` |
| Как добраться | `location` |
| Фото | `gallery` |
| Видео | `video_player` |
| Отзывы/что говорят | `youtube_comment` |
| Налоговый вычет | `tax_calculator` |
| Всё остальное | `null` |

### Fallback "не знаю"
- Если факта нет в ФАКТАХ и нет в КОНТЕКСТЕ → бот должен ответить "уточните у менеджера" + chip contact_request
- Прописано в системном промпте: ЗАПРЕЩЕНО ДОРИСОВЫВАТЬ ЛОГИЧНЫЕ ДЕТАЛИ

---

## 4. База данных

### Подключение
```
postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp
```

### Таблица knowledge_chunks (RAG)
```sql
CREATE TABLE knowledge_chunks (
  id        SERIAL PRIMARY KEY,
  source    TEXT NOT NULL,        -- источник: wa_*, tg_*, darya_story_*, etc.
  text      TEXT NOT NULL,        -- текст чанка (с семантическим префиксом)
  embedding vector(1536)          -- OpenAI text-embedding-3-small
);
CREATE INDEX ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);
```

### Состав базы знаний (22 074 чанка, апрель 2026)

| Категория | Source prefix | Чанков | Содержание |
|---|---|---|---|
| Истории Дарьи | `darya_story_*` | 3 | Реальные истории из лагеря |
| Видео Дарьи | `darya_video_*` | 56 | Транскрипты видеороликов |
| Аудио ответы | `audio_*` | 32 | Устные ответы на вопросы о лагере |
| Публикации | `pub*`, `publication_*` | 282 | Посты в соцсетях, статьи |
| Отзывы | `otzyvy` | 36 | Реальные отзывы с Яндекс.Карт, 2ГИС |
| Страницы сайта | `site:*` | 2 071 | Контент посадочных страниц |
| Статьи | `article*` | 194 | Блог-статьи |
| Telegram чаты | `tg_*` | 9 162 | Переписка в Telegram (родители+менеджеры) |
| WhatsApp чаты | `wa_*` | 6 812 | Переписка в WhatsApp (родители+менеджеры) |
| Прочее | другие | 3 426 | Договор, методические материалы, посадочные |

### Семантические префиксы (для лучшего RAG-поиска)
- `darya_story_*` → "История из лагеря АйДаКемп — рассказывает Дарья Афанасьева, основатель."
- `darya_video_*` → "Дарья Афанасьева, основатель АйДаКемп, о теме: ..."
- `audio_*` → "Дарья Афанасьева, основатель АйДаКемп, отвечает на вопросы о лагере:"
- `otzyvy` → "Отзыв родителя об АйДаКемп:"
- `publication_*` → "Публикация Дарьи Афанасьевой, основателя АйДаКемп (из блога/соцсетей):"

### Где факты о ценах/сменах
- **Живые данные** (приоритет): `/var/www/aidacamp-data/shifts.json` — обновляется cron'ом
- **Fallback**: `src/lib/ai/campData.ts` — захардкоженные данные, нужно обновлять вручную

---

## 5. Голосовой ввод

- **STT**: Web Speech API браузера (`SpeechRecognition`), клиентский
- **Язык**: `ru-RU`
- **Реализация**: в `src/pages/ask.astro` (client-side JS, секция голосового ввода)
- **Нормализация**: не реализована — ошибки распознавания попадают напрямую в запрос
- **TTS**: нет
- **Ограничения**: работает только в Chrome/Edge, не работает в Safari без разрешения

---

## 6. Интеграции

| Интеграция | Назначение | Где |
|---|---|---|
| Anthropic API | LLM (Claude Haiku) | ask.ts |
| OpenAI API | Embeddings (text-embedding-3-small) | rag.ts |
| PostgreSQL + pgvector | RAG-база знаний | rag.ts, сервер |
| Яндекс.Диск | Фотоархив ~9200 фото | /api/photo.ts, photos MCP |
| Яндекс.Метрика | Аналитика конверсий, goal 541048270 | layout компоненты |
| Microsoft Clarity | Тепловые карты, запись сессий | layout |

### Cron на сервере
- `6:15` ежедневно — ETL скрипт обновляет данные из Директ/Метрики в PostgreSQL
- `shifts.json` — предположительно тоже обновляется cron'ом (уточнить)

### API эндпоинты бота

| Метод | URL | Назначение |
|---|---|---|
| POST | `/api/ask` | Главный эндпоинт бота |
| GET | `/api/photo` | Прокси к Яндекс.Диску |
| POST | `/api/lead` | Заявки (форма бронирования) |

**POST /api/ask — Request:**
```json
{
  "message": "Сколько стоит смена?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**POST /api/ask — Response:**
```json
{
  "state": "ok",
  "text": "HTML-строка с акцентами",
  "block_type": "smeny" | "courses" | ... | null,
  "block_data": { ... } | null,
  "chips": [
    { "label": "Смены 2026", "query": "смены" },
    { "label": "Забронировать", "action": "book" }
  ]
}
```

---

## 7. Эксплуатация

### Серверы и доступы
| Ресурс | Данные |
|---|---|
| Сервер | `root@159.194.223.55`, ключ `~/.ssh/aidacamp_prod` |
| БД | `postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp` |
| Dev-сайт | `dev.aidacamp.ru` |
| Прод-сайт | `aidacamp.ru` |
| Скриншоты | `https://dev.aidacamp.ru/screenshots/` |

### Мониторинг
- Логи SSR-сервера: `pm2 logs` на сервере
- Ошибки ask.ts: `console.error` → в pm2 логи
- Аналитика: Яндекс.Метрика + Microsoft Clarity
- RAG качество: ручное тестирование (62-вопросный тест-сет)

### Rollback
```bash
ssh aidacamp
cd /var/www/aidacamp-dev
ls -la   # смотрим current/ и предыдущие папки
# Если нужен откат — поменять symlink current → предыдущая версия
```

---

## 8. Известные проблемы и техдолг

### Реестр известных галлюцинаций

| ID | Сценарий | Проблема | Статус | Фикс |
|---|---|---|---|---|
| HAL-001 | "Расскажи историю" | Бот придумывал детей/ситуации | **Исправлен** | Запрет в промпте + загружены 3 реальные истории |
| HAL-002 | "Как подбирают соседей" | "Ребята знают друг друга по фото в Telegram" | **Исправлен** | Правило "не дорисовывать" в промпте |
| HAL-003 | "Как добраться" | "Трансфер от м. Солнцево включён" | **Исправлен** | Везде исправлено: через партнёров, доп. оплата, НЕ входит в стоимость |
| HAL-004 | Вопрос "возвращаемость" | Бот думал про возврат денег | **Исправлен** | Явное правило в промпте |
| HAL-005 | "Что говорят родители" | Пустой ответ | **Исправлен** | Маршрутизация → youtube_comment |
| HAL-006 | Возраст | Не триггерил courses block | **Исправлен** | Расширены паттерны в routing |
| HAL-007 | Любой ответ | Эмодзи в тексте | **Исправлен** | Запрет в промпте |

### Техдолг

| Приоритет | Проблема | Описание |
|---|---|---|
| HIGH | `campData.ts` устаревает | Цены/даты дублируются — основной источник `shifts.json`, но `campData.ts` не синхронизируется автоматически |
| HIGH | Трансфер в `campData.ts` | `transfer`, `transferTime`, `included` содержат ложную инфу про трансфер от Солнцево. Уточнить у Дарьи и исправить |
| MEDIUM | RAG без reranker | При релевантности около MIN_SCORE возможны нерелевантные чанки. Нет BM25/hybrid |
| MEDIUM | STT без нормализации | Ошибки голосового распознавания попадают напрямую в запрос |
| MEDIUM | Нет логирования запросов | Нельзя анализировать что спрашивают и где бот ошибается |
| LOW | WhatsApp/Telegram (16К чанков) | Большая часть — переписка менеджеров с родителями. Качество неоднородное, есть нерелевантные диалоги |
| LOW | Нет диалоговой памяти между сессиями | История только в рамках одной вкладки |

---

## 9. Тест-кейсы и качество

### 62-вопросный тест-сет (последний прогон: апрель 2026)
Категории:
1. Галлюцинации — проверка придумывания фактов
2. Маршрутизация block_type — правильный визуальный блок
3. Edge cases — граничные случаи
4. Аватары мам — 4 типа пользователей

После каждого набора правок — прогонять тест вручную через /ask.

### Метрики (субъективные, апрель 2026)
- Hallucination rate: ~3% (снизился с ~15% после фиксов)
- Block routing accuracy: ~90%
- Fallback rate: <5%
- STT recognition errors: ~20% запросов с искажениями (ложные срабатывания "медиацена", "абцена" и т.п.)

---

## 10. Ingestion скрипты (загрузка в RAG)

Все скрипты запускаются **на сервере** из `/var/www/aidacamp-dev/repo/scripts/`:

```bash
# Загрузка контента сайта (SEO-страницы, отзывы, FAQ)
node scripts/ingest-site-content.mjs

# Загрузка 3 реальных историй Дарьи
node scripts/ingest-stories.mjs

# Загрузка видео-транскриптов (из папки /tmp/aidacamp-transcripts/)
node scripts/ingest-transcripts.mjs

# Переразметка чанков (добавление семантических префиксов + пересчёт embeddings)
node scripts/relabel-rag.mjs
```

### Как добавить новый контент в RAG
1. Подготовить текст (чистый, без HTML)
2. Добавить в ingest-скрипт с правильным source-тегом
3. Запустить скрипт на сервере
4. Проверить: `SELECT source, COUNT(*) FROM knowledge_chunks GROUP BY source ORDER BY 2 DESC LIMIT 5;`

---

## ⚠️ Критические запреты (из CLAUDE.md)

1. **НЕ использовать @astrojs/partytown** — ломает Яндекс.Метрику и Директ (инцидент апрель 2026, ~60К₽ потерь)
2. **НЕ деплоить в прод без явного подтверждения** владельца — всегда сначала dev
3. **НЕ редактировать `src/styles/icons.css` вручную** — auto-generated, только через `npm run icons`
4. **НЕ использовать эмодзи в UI** — только Bootstrap Icons (`bi-*`)
5. **НЕ коммитить в main напрямую** — только через merge из dev
