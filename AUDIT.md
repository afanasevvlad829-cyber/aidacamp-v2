# AUDIT — Полный аудит инструментов АйДаКемп
**Дата:** 2026-04-23  
**Статус:** живой документ, обновляется при изменениях

---

## 📦 ИСТОЧНИКИ ДАННЫХ

> Полная карта: откуда приходят данные → где хранятся → кто читает

### Внешние источники (первичные)

| Источник | Что даёт | Токен | Retention в источнике | Кто читает |
|---|---|---|---|---|
| **Яндекс.Директ API v5** | Кампании (статус, бюджет, State), расходы, клики, CPC, площадки РСЯ, поисковые запросы | `DIRECT_TOKEN` / login `kv145` | Статистика за 3 года | `daily_intelligence`, `critical_monitor`, `etl-daily`*, `autoban`*, `search-autoban`*, MCP `direct_*` |
| **Яндекс.Метрика API** | Визиты, уники, источники (UTM), цели (заявки), отказы, время на сайте | `METRIKA_TOKEN` / counter `96499295` | История за 3+ года | `daily_intelligence`, `critical_monitor`, `etl-daily`*, `vk-costs-to-metrika`, MCP `metrika_*` |
| **VK Ads API** | Кампании, группы, объявления, расходы, клики, показы, аудитории | `VK_TOKEN` / `VK_ACCOUNT_ID` | История за 2 года | `daily_intelligence`, `critical_monitor`, `vk-sync`*, `vk-monitor`, MCP `vk_*` |
| **Microsoft Clarity** | Сессии, rage-clicks, dead-clicks, карты прокрутки, страницы с проблемами | `CLARITY_TOKEN` | 30 дней в Clarity | `etl-daily`*, MCP `clarity` |
| **Google PageSpeed** | Core Web Vitals, LCP, CLS, FID, оценка mobile/desktop | `PAGESPEED_KEY` | Нет retention (live запрос) | MCP `pagespeed` |
| **Google Search Console** | Позиции ключевых слов, CTR, клики, показы по запросам | `GSC_CREDENTIALS_PATH` | 16 месяцев | `seo-positions-snapshot`, `gsc-sync` |
| **Яндекс.Вебмастер** | Позиции в Яндекс.Поиске по ключевым словам | `WEBMASTER_TOKEN` | 3 месяца | `seo-positions-snapshot` |
| **AlfaCRM API** | Клиенты (ФИО, телефон, статус, смены, уроки, оплаты) | `ALFACRM_API_KEY` / `ALFACRM_HOST` | Постоянно в AlfaCRM | `alfa_sync`, `refresh_enrolled`, MCP `direct_leads` |
| **Green-API (WhatsApp)** | Входящие/исходящие WA-сообщения клиентов | `GREEN_API_WA_ID_INSTANCE` / `GREEN_API_WA_TOKEN` | 24 ч в Green-API | `darya_feedback`, `morning_digest` |
| **Green-API (Telegram)** | Входящие/исходящие TG-сообщения (через WA-gateway) | `GREEN_API_TG_ID_INSTANCE` / `GREEN_API_TG_TOKEN` | 24 ч | `darya_feedback` |
| **Яндекс.Диск** | 9 200+ фото смен с AI-описаниями | `YADISK_TOKEN` | Постоянно | MCP `photos`, `yadisk.sh` |
| **OpenAI Embeddings** | Векторные представления диалогов и страниц сайта | `OPENAI_API_KEY` | — (stateless) | `rag_continuous`, `rag_backfill`, `knowledge_dialog_sync`, `knowledge_site_scraper` |
| **Anthropic Claude API** | LLM-анализ: дайджесты, рекомендации, обогащение контактов | `ANTHROPIC_API_KEY` | — (stateless) | `daily_intelligence`, `enrich_contacts`, `generate_next_actions` |
| **OpenRouter** | LLM-прокси (claude-haiku, gpt-4o, llama) | `OPENROUTER_KEY` | — (stateless) | `critical_monitor`, `daily_intelligence`, `darya_feedback`, `generate_next_actions` |
| **Telegram Bot API** | Исходящие сообщения, inline-кнопки, getUpdates | `TELEGRAM_BOT_TOKEN` / chat `244314247` | 24 ч | `daily_intelligence`, `critical_monitor`, `callback_listener`, `budget_pace`, `weekly_digest` |
| **mem0.ai** | Внешняя память агентов (сохранение контекста между сессиями) | `MEM0_API_KEY` | На серверах mem0 | `mem0_api.py` (статус неясен) |
| **DataForSEO** | SEO-данные, SERP, позиции конкурентов | `DATAFORSEO_LOGIN` / `DATAFORSEO_KEY` | — | Не используется в скриптах (зарезервировано) |
| **Kinescope** | Видеохостинг (embed, статистика просмотров) | `KINESCOPE_TOKEN` | На Kinescope | Не используется в скриптах (зарезервировано) |
| **Google Maps** | Геолокация, адрес лагеря | `GOOGLE_MAPS_KEY` | — | Фронтенд (JS) |

> *\* Отключён (ETL устранён 22.04.2026)*

---

### Внутренние хранилища данных

| Хранилище | Тип | Где | Что хранит | Кто пишет | Кто читает |
|---|---|---|---|---|---|
| **PostgreSQL `aidacamp`** | СУБД | Сервер, только localhost | CRM, диалоги, RAG, аналитика | Все скрипты-синхронизаторы | Все аналитические скрипты |
| **`crm_contacts`** | PG таблица | БД | Клиенты из AlfaCRM + флаги менеджеров | `alfa_sync` | `contacts_api`, `enrich_contacts`, `generate_next_actions` |
| **`crm_contact_contexts`** | PG таблица | БД | AI-резюме клиента: статус, тон, next-step, objections | `enrich_contacts` | `contacts_api`, `generate_next_actions` |
| **`crm_manager_notes`** | PG таблица | БД | Заметки менеджеров по клиентам | `contacts_api` (POST) | `contacts_api`, `generate_next_actions` |
| **`crm_coach_logs`** | PG таблица | БД | Логи AI-коуча (контекст разговоров с менеджером) | `contacts_api` | `contacts_api` |
| **`ai_dialogs`** | PG таблица | БД | Переписки WA + TG (все входящие/исходящие) | Green-API синхронизатор, tg-import | `contacts_api`, `rag_continuous`, `knowledge_dialog_sync`, `generate_next_actions` |
| **`ai_tg_users`** | PG таблица | БД | Маппинг телефон → TG peer_id | tg-import | `contacts_api` (поиск TG-переписки) |
| **`ai_customers`** | PG таблица | БД | Клиенты (расширенная модель): имя, телефон, статус, теги | `alfa_sync` | `morning_digest`, `generate_next_actions`, `fuzzy_link` |
| **`ai_dialog_rag`** | PG таблица | БД | Embeddings диалогов (pgvector) | `rag_continuous`, `rag_backfill` | RAG-поиск (в `/ask/` боте) |
| **`knowledge_chunks`** | PG таблица | БД | Embeddings страниц сайта + диалогов | `knowledge_site_scraper`, `knowledge_dialog_sync` | `/ask/` бот |
| **`ai_conversations`** | PG таблица | БД | История сессий агентов (дайджесты, решения, коучинг) | `daily_intelligence`, `darya_feedback`, `callback_listener` | `callback_listener`, аналитика |
| **`ai_next_actions`** | PG таблица | БД | Топ-12 клиентов с приоритетом и готовыми сообщениями | `generate_next_actions` | `morning_digest` |
| **`ai_feedback_log`** | PG таблица | БД | Реакции Влада на рекомендации (accept/reject кнопки) | `callback_listener` | Будущее ML-обучение |
| **`ai_decisions`** | PG таблица | БД | Зафиксированные решения (14-дневный контекст для агентов) | Ручной + `darya_feedback` | `daily_intelligence` |
| **`ai_hypotheses`** | PG таблица | БД | Активные гипотезы (testing/proposed) | Ручной | `daily_intelligence` |
| **`ai_user_preferences`** | PG таблица | БД | Настройки: бюджеты, предпочтения, правила | `callback_listener`, ручной | `daily_intelligence`, `budget_pace` |
| **`seo_position_snapshots`** | PG таблица | БД | Снэпшоты позиций 1-го и 15-го числа | `seo-positions-snapshot` | Аналитика (ручная) |
| **ETL-таблицы** (устарели) | PG таблицы | БД | Рекламная статистика Direct/VK/Metrika/Clarity | `etl-daily`*, `vk-sync`* | `weekly_digest`⚠️, `daily-digest`⚠️, `budget_pace`⚠️ |
| **`camp_enrolled.json`** | JSON файл | `/opt/aidacamp-tools/crm-panel/api/` | ID клиентов записанных на смены | `refresh_enrolled` | `contacts_api` (фильтр "уже записан") |
| **`contexts_cache.json`** | JSON файл | `/opt/aidacamp-tools/crm-panel/api/` | Кэш AI-контекстов клиентов | `enrich_contacts` (устаревший путь) | `contacts_api` (fallback если PG пуст) |
| **`etl/.env`** | ENV файл | `/opt/aidacamp-tools/etl/` | Все API-токены и настройки | Ручной | Все скрипты на сервере |

> *⚠️ Читают устаревшие данные — ETL отключён с 22.04.2026*

---

## 🔧 ИНСТРУМЕНТЫ — ПОЛНЫЙ КАТАЛОГ

### Внешние API / сервисы

| Сервис | Секрет (secretctl) | Env на сервере | Статус подключения | Где используется |
|---|---|---|---|---|
| Яндекс.Директ | `Yandex` | `DIRECT_TOKEN` | ✅ Активен | `daily_intelligence`, `critical_monitor`, MCP `direct_*` |
| Яндекс.Метрика (read) | `Metrika` | `METRIKA_TOKEN` | ✅ Активен | `daily_intelligence`, `critical_monitor`, MCP `metrika_*` |
| Яндекс.Метрика (write) | `merika_write` | `METRIKA_WRITE_TOKEN` | 🟡 Зарезервирован | `vk-costs-to-metrika` |
| Яндекс.Вебмастер | `WebMaster` | `WEBMASTER_TOKEN` | ✅ Активен | `seo-positions-snapshot` |
| Яндекс.Wordstat | `Wordstat` | `WORDSTAT_TOKEN` | 🟡 Зарезервирован | Не используется в скриптах |
| Яндекс.Диск | `Yandex_disk` | `YADISK_TOKEN` | ✅ Активен | MCP `photos`, `yadisk.sh` |
| VK Реклама | `VK-business` | `VK_TOKEN` / `VK_ACCOUNT_ID` | ✅ Активен | `daily_intelligence`, `critical_monitor`, MCP `vk_*` |
| VK личный | `VK-Pers` | `VK_PERS_TOKEN` | 🟡 Зарезервирован | Не используется |
| Google / YouTube | `Google-Youtube` | `GSC_CREDENTIALS_PATH` | ✅ Активен | `seo-positions-snapshot`, `gsc-sync` |
| Google Maps | `google_maps` | `GOOGLE_MAPS_KEY` | ✅ Активен | Фронтенд (JS embed) |
| Microsoft Clarity | `clarity` | `CLARITY_TOKEN` | ✅ Активен | MCP `clarity`, `etl-daily`* |
| Google PageSpeed | `PageSpeed` | `PAGESPEED_KEY` | ✅ Активен | MCP `pagespeed` |
| OpenRouter | `OpenRouter` | `OPENROUTER_KEY` | ✅ Активен | `critical_monitor`, `daily_intelligence`, `darya_feedback` |
| Anthropic Claude | `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | ✅ Активен | `daily_intelligence`, `enrich_contacts`, `generate_next_actions` |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_API_KEY` | ✅ Активен | RAG-скрипты, finetune |
| Google Gemini | `Gemini` | `GEMINI_API_KEY` | 🟡 Зарезервирован | Не используется |
| Groq | `Groq` | `GROQ_API_KEY` | 🟡 Зарезервирован | Не используется |
| DeepInfra | `deepinfra` | `DEEPINFRA_TOKEN` | 🟡 Зарезервирован | Не используется |
| VoyageAI | `voyageai` | `VOYAGE_API_KEY` | 🟡 Зарезервирован | Не используется |
| mem0.ai | `mem0` | `MEM0_API_KEY` | ❓ Неясно | `mem0_api.py` (статус неизвестен) |
| Telegram Bot | `Telegram-Token` | `TELEGRAM_BOT_TOKEN` | ✅ Активен | `daily_intelligence`, `critical_monitor`, `callback_listener`, `budget_pace` |
| AlfaCRM | `Alfacrm` | `ALFACRM_API_KEY` / `ALFACRM_HOST` | ✅ Активен | `alfa_sync`, `refresh_enrolled`, MCP `direct_leads` |
| Green-API WA | встроен в `.env` | `GREEN_API_WA_*` | ✅ Активен | `darya_feedback`, `morning_digest` |
| Green-API TG | `green-api-tg` | `GREEN_API_TG_*` | ✅ Активен | `darya_feedback` |
| DataForSEO | `dataforseo` | `DATAFORSEO_LOGIN` / `DATAFORSEO_KEY` | 🟡 Зарезервирован | Нет |
| Kinescope | `kinescope` | `KINESCOPE_TOKEN` | 🟡 Зарезервирован | Нет |
| n8n | `N8n` | — | ⚪ Docker :5678 | 7 workflows, все неактивны |
| SSH Prod | `SSH-PROD` | — | ✅ Активен | Подключение к серверу |
| SSH Dev | `SSH-DEV` | — | 🟡 Dev-сервер | Редко |

---

### Внутренние скрипты на сервере

#### 🟢 Активные (в cron / systemd)

| Скрипт | Что делает | Данные: откуда → куда | Расписание |
|---|---|---|---|
| `daily_intelligence.py` | Ежедневный AI-дайджест: реклама + трафик → анализ Claude → TG | Direct API + Metrika API + VK API + PG (CRM) → TG + `ai_conversations` | Ежедневно 20:55 UTC |
| `critical_monitor.py` | Мониторинг аномалий расходов/лидов | Direct API + Metrika API + VK API → TG (только аномалия) | Каждые 3 часа |
| `darya_feedback.py` | Разговорный агент Дарьи | Green-API + PG → PG (`ai_conversations`) | Каждую минуту |
| `callback_listener.py` | Обработка кнопок TG (accept/reject рекомендаций) | Telegram getUpdates → PG (`ai_feedback_log`, `ai_user_preferences`) | Каждую минуту |
| `morning_digest.py` | Топ-12 клиентов → WA Дарье | PG (`ai_next_actions`) → Green-API WA | 05:00 UTC (pipeline) |
| `generate_next_actions.py` | Генерация сообщений для HOT/WARM клиентов | PG + Claude/OpenRouter → PG (`ai_next_actions`) | 04:45 UTC (pipeline) |
| `alfa_sync.py` | Синхронизация AlfaCRM → БД | AlfaCRM API → PG (`ai_customers`, `crm_contacts`) | Каждые 6 часов |
| `rag_continuous.py` | Embeddings новых диалогов | PG `ai_dialogs` + OpenAI → PG `ai_dialog_rag` | Каждый час |
| `knowledge_dialog_sync.py` | Embeddings диалогов для /ask/-бота | PG `ai_dialogs` + OpenAI → PG `knowledge_chunks` | Каждый час |
| `knowledge_site_scraper.py` | Embeddings страниц сайта | aidacamp.ru + OpenAI → PG `knowledge_chunks` | Ежедневно 04:45 |
| `site_scraper.py` | То же (⚠️ дубль!) | aidacamp.ru + OpenAI → PG `knowledge_chunks` | Ежедневно 04:30 |
| `vk-monitor.py` | Мониторинг CPA VK | VK API → TG (алерт) | Каждые 30 мин |
| `budget_pace.py` | Темп расходования бюджетов | PG (ETL ⚠️) + `ai_user_preferences` → TG | Каждые 6 часов |
| `seo-positions-snapshot.py` | Снэпшот SEO-позиций | GSC + Вебмастер → PG `seo_position_snapshots` | 1-е и 15-е 07:00 UTC |
| `review-reminder.py` | Напоминания о сборе отзывов | PG (`ai_customers`) → TG | Ежедневно 10:00 UTC |
| `search-junk-digest.py` | Дайджест кандидатов в минус-фразы | Direct API → TG (без автозаписи) | Ежедневно 09:00 UTC |
| `excluded-rotator.py` | Очистка мёртвых площадок из ExcludedSites | Direct API (ExcludedSites) → Direct API (удаление) | Ежедневно 05:00 UTC |
| `cm-v3-*.py/.sh` | Сборщик событий v3 (неясное назначение) | ? → ? | Каждые 30 мин + 1 мин |

#### 🔴 Отключены (в crontab с #DISABLED)

| Скрипт | Почему отключён | Дата |
|---|---|---|
| `etl-daily.py` | ETL упразднён — данные берутся из API напрямую | 22.04.2026 |
| `vk-sync.py` | ETL упразднён | 22.04.2026 |
| `autoban.py` | Заменён ручным дайджестом (`search-junk-digest`) | 21.04.2026 |
| `search-autoban.py` | То же | 21.04.2026 |
| `direct-status.py` | Заменён `critical_monitor` | — |

#### ⚠️ Работают но на устаревших данных (читают ETL-таблицы)

| Скрипт | Проблема | Действие |
|---|---|---|
| `daily-digest.py` (etl/) | Читает `direct_campaign_stats`, `vk_ads_stats` — не обновляются с 22.04 | **Отключить** — дублирует `daily_intelligence.py` |
| `weekly_digest.py` | Читает те же ETL-таблицы | **Переписать** на API-first (аналогично `daily_intelligence`) |
| `budget_pace.py` | Читает `direct_campaign_stats` для расчёта темпа | **Переписать** на Direct Reports API |

#### 🗄 Инструменты (ручной запуск)

| Скрипт | Назначение |
|---|---|
| `enrich_contacts.py` | Пакетное AI-обогащение контактов → `crm_contact_contexts` |
| `refresh_enrolled.py` | Обновить список записавшихся на смену |
| `fuzzy_link.py` | Связать диалоги с клиентами по именам (difflib) |
| `finetune_prepare.py` | Подготовить датасет для файн-тюна gpt-4o-mini |
| `finetune_launch.py` | Запустить файн-тюн в OpenAI |
| `vk-costs-to-metrika.py` | Загрузить расходы VK в Метрику |

#### 📦 Устаревшие (можно архивировать)

Все в `/opt/aidacamp-tools/etl/archive/` или для архивирования:

```
b1-v3b.py, b1-v3.py, b1-v4.py, b1-v5.py, b1-v6.py  — разбор WA-истории (одноразовый)
gapi-wa-backfill-v1.py, v2.py, v3.py                  — бэкфилл WA через Green-API
gapi-wa-*.sh (несколько)                               — вспомогательные shell-скрипты бэкфилла
tg-import-desktop-export.py                            — импорт Telegram Desktop-дампа
tg-dump-check.py, tg-inventory-status.py               — вспомогательные TG-скрипты
tg-photos-enrich.py, tg-reimport-users-v4.py           — обогащение TG-пользователей
dossier-v2.py, dossier-v3.py, dossier-v4.py            — устаревшие версии построения досье
build-dossier.py, dossier-classifier.py, enrich-all.py — заменены enrich_contacts.py
comm-analysis-B.py                                     — одноразовый анализ коммуникаций
rag_backfill.py, rag_backfill_openai.py                — одноразовый бэкфилл RAG
search-stopwords-bootstrap.py                          — одноразовая загрузка стоп-слов
build_contexts.py (crm-panel/)                         — заменён enrich_contacts.py
```

---

### MCP-инструменты (mcp-server.mjs, порт 3010)

**Яндекс.Директ (25 инструментов):**
`direct_campaigns` · `direct_manage_campaign` · `direct_manage_adgroup` · `direct_manage_ad` · `direct_manage_keywords` · `direct_sitelinks` · `direct_vcards` · `direct_adimages` · `direct_adextensions` · `direct_audience_targets` · `direct_retargeting_lists` · `direct_bid_modifiers` · `direct_bids` · `direct_changes` · `direct_dictionaries` · `direct_dynamic_targets` · `direct_negative_keywords` · `direct_turbopages` · `direct_leads` · `direct_reports` · `direct_agency_clients` · `direct_creatives` · `direct_feeds` · `direct_businesses` · `direct_smart_targets`

**VK Реклама (27 инструментов):**
`vk_campaigns` · `vk_manage_campaign` · `vk_manage_ad_group` · `vk_manage_ad` · `vk_ads_stats` · `vk_urls` · `vk_content` · `vk_packages` · `vk_pads` · `vk_regions` · `vk_interests` · `vk_demographics` · `vk_pixels` · `vk_pixel_events` · `vk_audiences` · `vk_audience_sources` · `vk_lookalike` · `vk_remarketing_rules` · `vk_banner_preview` · `vk_stats_summary` · `vk_mass_action` · `vk_lead_forms` · `vk_leads` · `vk_faststat` · `vk_balance` · `vk_moderation` · `vk_stats_breakdown`

**Яндекс.Метрика (3 инструмента):**
`metrika_counters` · `metrika_goals` · `metrika_offline_conversions`

**Аналитика (3 инструмента):**
`clarity` · `pagespeed` · `image_edit`

**Файлы и система (6 инструментов):**
`ssh` · `stats` · `browser_agent` · `read_file` · `write_file` · `list_directory` · `create_directory` · `photos`

---

## 🔄 ДУБЛИРОВАНИЕ

| Дубль | Что задублировано | Решение |
|---|---|---|
| `site_scraper.py` + `knowledge_site_scraper.py` | Оба скрапят aidacamp.ru → `knowledge_chunks` через OpenAI, запуск 04:30 и 04:45 | Оставить один (`knowledge_site_scraper`), удалить `site_scraper` |
| `daily-digest.py` (etl/) + `daily_intelligence.py` | Оба шлют утренний TG-дайджест по рекламе | Отключить `daily-digest` — он на мёртвых ETL-данных |
| `build_contexts.py` + `enrich_contacts.py` | Оба строят контекст клиентов | Удалить `build_contexts.py` |
| Код Metrika в `daily_intelligence` + `critical_monitor` | Функция `_get_lead_goal_id` / `get_metrika_goal_ids` полностью одинакова | Вынести в `common/metrika.py` — общий модуль |
| `rag_continuous` + `knowledge_dialog_sync` | Оба векторизуют `ai_dialogs` | Разные таблицы назначения — OK, но расписание должно не пересекаться |
| Локальный `tools/*.py` vs серверный `/opt/aidacamp-tools/*.py` | Оба места хранения скриптов | Локальный = разработка, сервер = production. Деплой через `curl` из GitHub |

---

## 🗺 АРХИТЕКТУРА ПОТОКОВ ДАННЫХ

```
ВНЕШНИЕ API                    СЕРВЕР                        ВЫХОД
─────────────────────────────────────────────────────────────────────

Яндекс.Директ ──[live]──────→ daily_intelligence.py ───────→ Telegram
Яндекс.Метрика ──[live]─────→ critical_monitor.py ─────────→ Telegram
VK Ads ──[live]─────────────→ vk-monitor.py ───────────────→ Telegram

AlfaCRM ────────────────────→ alfa_sync.py ────────────────→ PostgreSQL
                                                              crm_contacts
                                                              ai_customers

Green-API (WA/TG) ──────────→ [сборщик сообщений] ────────→ PostgreSQL
                                                              ai_dialogs
                                                     ┌──────→ Telegram
                             darya_feedback.py ──────┘
                             (каждую минуту)          └──────→ Green-API WA

PostgreSQL ──────────────────→ generate_next_actions ──────→ ai_next_actions
                             → morning_digest ─────────────→ Green-API WA
                             → enrich_contacts ────────────→ crm_contact_contexts

ai_dialogs ─────────────────→ rag_continuous ──────────────→ ai_dialog_rag
                             → knowledge_dialog_sync ───────→ knowledge_chunks
aidacamp.ru ─────────────────→ knowledge_site_scraper ──────→ knowledge_chunks

contacts_api.py ─────────────→ [HTTP :6300] ───────────────→ Chrome Extension
```

---

## 🎯 ПРИОРИТЕТНЫЕ ЗАДАЧИ

| # | Задача | Приоритет | Почему |
|---|---|---|---|
| 1 | Отключить `daily-digest.py` (etl/) в cron | 🔴 Срочно | Шлёт устаревшие данные каждый день |
| 2 | Переписать `weekly_digest.py` на API-first | 🔴 Срочно | Читает ETL-таблицы без данных |
| 3 | Переписать `budget_pace.py` на Direct Reports API | 🟡 Важно | Темп бюджета считается по устаревшим данным |
| 4 | Удалить дубль `site_scraper.py` | 🟡 Важно | Двойные расходы OpenAI ежедневно |
| 5 | Вынести общий код Metrika в `common/metrika.py` | 🟢 Улучшение | DRY принцип |
| 6 | Разобраться с `cm-v3-*.py` — что делает, нужен ли | 🟡 Важно | Запускается каждые 30с, неясное назначение |
| 7 | Архивировать 25+ устаревших ETL-скриптов | 🟢 Улучшение | Чистота репозитория |
| 8 | Clarify `mem0_api.py` — активен или нет | 🟢 Улучшение | Неизвестный статус |
