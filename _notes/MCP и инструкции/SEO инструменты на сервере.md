# SEO-инструменты на сервере 159.194.223.55

Набор SEO-инструментов установлен отдельно от основного MCP `aidacamp-tools` — живёт **на удалённом сервере** и запускается через headless Claude Code (не локально на Mac).

**Дата установки:** 19 апреля 2026
**Где живёт:** `root@159.194.223.55`
**Для чего:** SEO-аудиты, keyword research, анализ поисковой выдачи, работа с GSC, Яндекс.Вебмастером и Wordstat.

---

## Как вызывать

```bash
# Интерактивно
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55
claude

# Headless (без TTY)
claude -p "/seo audit https://aidacamp.ru" --no-session-persistence --max-turns 30
```

При первом запуске `claude` потребует OAuth через браузер. Для крона — использовать `ANTHROPIC_API_KEY` в env.

---

## 1. Claude SEO (skill + 15 субагентов)

**Репо:** https://github.com/AgriciDaniel/claude-seo
**Версия:** v1.9.0
**Установлен:** `/opt/claude-seo` + `~/.claude/skills/` + `~/.claude/agents/`
**Python venv:** `/root/.claude/skills/seo/.venv`

**Команды (24 скилла):**

| Команда | Что делает |
|---|---|
| `/seo audit <url>` | Полный аудит сайта |
| `/seo page <url>` | Анализ одной страницы |
| `/seo schema <url>` | Проверка Schema.org микроразметки |
| `/seo technical <url>` | Technical SEO (краулинг, robots.txt, sitemap) |
| `/seo content <url>` | Контент + E-E-A-T |
| `/seo sitemap generate` | Генерация sitemap |
| `/seo geo <url>` | GEO/AEO — оптимизация под AI-поиск |
| `/seo local <url>` | Local SEO |
| `/seo maps <url>` | Maps Intelligence (Яндекс Карты, Google Maps) |
| `/seo cluster` | Семантическая кластеризация |
| `/seo backlinks <domain>` | Анализ ссылочного |
| `/seo competitor-pages` | Анализ конкурентов |
| `/seo images <url>` | Оптимизация картинок |
| `/seo image-gen` | Генерация картинок |
| `/seo hreflang <url>` | International SEO |
| `/seo sxo <url>` | Search Experience Optimization |
| `/seo drift <url>` | SEO drift monitoring |
| `/seo ecommerce <url>` | E-commerce SEO |
| `/seo programmatic` | Programmatic SEO |
| `/seo plan` | Стратегическое планирование |
| `/seo google <url>` | Google Search Console, PageSpeed, CrUX, GA4 |
| `/seo dataforseo` | Интеграция с DataForSEO |
| `/seo firecrawl <url>` | Краулинг через Firecrawl |

---

## 2. MCP-серверы (5 штук)

Конфиг: `~/.claude.json` (user scope). Проверка статуса: `claude mcp list`.

### 2.1. yandex-wordstat

**Репо:** https://github.com/altrr2/yandex-tools-mcp
**Назначение:** Keyword research через Яндекс Wordstat API — объём поиска, тренды, похожие запросы.
**Токен:** `YANDEX_WORDSTAT_TOKEN` (scope `direct:stat,direct:api-wordstat`)

### 2.2. yandex-webmaster

**Репо:** https://github.com/altrr2/yandex-tools-mcp
**Назначение:** Яндекс.Вебмастер — индексация, поисковые запросы, ошибки, sitemap, ИКС, мобильная версия.
**Токен:** `YANDEX_WEBMASTER_TOKEN` (тот же OAuth, что у Метрики/Директа — scope webmaster)

### 2.3. yandex-metrika

**Репо:** https://github.com/altrr2/yandex-tools-mcp
**Назначение:** Метрика — визиты, источники, цели, конверсии через API (данные запрашиваются через API).
**Токен:** `YANDEX_METRIKA_TOKEN` (подхватывается автоматически из существующего `/opt/mcp/.env`).

### 2.4. dataforseo

**Репо:** https://github.com/dataforseo/mcp-server-typescript (официальный)
**Назначение:** международный SEO — SERP API, Keywords Data, On-Page, Backlinks, Domain Analytics, Business Data, Content Analysis, AI Optimization.
**Логин:** `va@vroderabotaetno.store`
**Панель:** https://app.dataforseo.com/

Хорошо работает для:
- Анализ позиций в Google (не только Яндекс)
- Backlink-профиль
- Keyword difficulty, CPC, volume
- Конкурентная аналитика

### 2.5. gsc — Google Search Console

**Репо:** https://github.com/AminForou/mcp-gsc
**Назначение:** Google Search Console — запросы, клики, CTR, позиции, инспекция URL, sitemap.
**Авторизация:** Service account `codex-464@telegram-outreach.iam.gserviceaccount.com`
**Ключ:** `/root/.config/gsc-service-account.json`
**Доступ выдан в GSC:** `sc-domain:aidacamp.ru` (siteFullUser).

**Доступные tools (20 шт.):**
- `list_properties` — все свойства GSC
- `get_search_analytics` — топ запросов, страниц, CTR, позиции
- `compare_search_periods` — сравнение периодов
- `get_search_by_page_query` — запросы по конкретной странице
- `get_advanced_search_analytics` — фильтры по стране, устройству, запросу, странице
- `inspect_url_enhanced` — детальная инспекция URL (индексация)
- `batch_url_inspection` — до 10 URL за раз
- `check_indexing_issues` — проблемы с индексацией
- `list_sitemaps_enhanced` — sitemap'ы с ошибками и предупреждениями
- `manage_sitemaps` — submit/delete

---

## Не установлено (сознательно)

**yandex-search MCP** — слишком дорогой:
| Услуга | Цена за 1000 запросов (с НДС) |
|---|---|
| Дневные синхронные | 488 ₽ |
| Ночные синхронные | 366 ₽ |
| Синхронные с LLM-ответом | 5 083 ₽ |

Для поиска по выдаче используем **dataforseo** (Google) или **yandex-webmaster** (свои запросы).

---

## Управление MCP-серверами

```bash
# Список
claude mcp list

# Добавить (JSON-формат)
claude mcp add-json -s user <name> '{"command":"...","args":[...],"env":{...}}'

# Удалить
claude mcp remove -s user <name>
```

Конфиг хранится в `/root/.claude.json`.

---

## Связь с локальной машиной

Эти инструменты **НЕ дублируют** локальный MCP `aidacamp-tools`. Разделение ролей:

| Задача | Где делать |
|---|---|
| Управление VK Ads / Директ / Метрика | Локально — `aidacamp-tools` |
| SSH, фото, browser-agent, Clarity, PostgreSQL | Локально — `aidacamp-tools` |
| SEO-аудиты, DataForSEO, Wordstat, Webmaster, GSC | На сервере — `claude-seo` + MCP |

**Почему на сервере:** SEO-инструменты тяжёлые (Python deps, Playwright), и крон-запуски удобнее гонять там же, где сервер.
