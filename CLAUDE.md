# АйДаКемп — Project Rules

## ВАЖНО: Используй только aidacamp-tools MCP

**НЕ используй** Kapture, Desktop Commander, Chrome MCP, Claude in Chrome, удалённый MCP `5967f77d` (yandex-direct-metrica-mcp). Они либо зависают, либо отключены.

**Все инструменты доступны через единый MCP-сервер `aidacamp-tools`.**
Загрузи схемы: `ToolSearch` с запросом `+aidacamp`.

### Полный список инструментов aidacamp-tools (21 шт.)

| Инструмент | Что делает | Пример вызова |
|---|---|---|
| `ssh` | Команды на сервере 159.194.223.55 | `ssh(host: "aidacamp", command: "ls /var/www")` |
| `stats` | Аналитика Директ/Метрика из PostgreSQL | `stats(command: "summary", period: "week")` |
| `photos` | Поиск фото на Яндекс.Диске (9200 фото) | `photos(command: "search", query: "дети код")` |
| `browser_agent` | Headless браузер: скриншоты, скрапинг, Lighthouse | `browser_agent(action: "screenshot", url: "https://aidacamp.ru")` |
| `clarity` | Microsoft Clarity: поведение на сайте | `clarity(report: "summary", period: "week")` |
| `pagespeed` | Google PageSpeed: аудит скорости, SEO, доступности | `pagespeed(url: "https://aidacamp.ru")` |
| `image_edit` | Обработка фото: яркость, контраст, насыщенность, cinematic | `image_edit(input: "photo.avif", cinematic: true)` |
| `read_file` | Чтение локальных файлов | `read_file(path: "/Users/.../file.txt")` |
| `write_file` | Запись в файлы | `write_file(path: "...", content: "...")` |
| `list_directory` | Список файлов в папке | `list_directory(path: "/Users/...")` |
| `create_directory` | Создание папок | `create_directory(path: "/Users/.../new")` |
| `vk_campaigns` | Список кампаний VK Ads | `vk_campaigns(status: "active")` |
| `vk_manage_campaign` | CRUD кампаний VK | `vk_manage_campaign(action: "create", name: "...")` |
| `vk_manage_ad_group` | CRUD групп объявлений VK | `vk_manage_ad_group(action: "list", campaign_id: 123)` |
| `vk_manage_ad` | CRUD объявлений VK | `vk_manage_ad(action: "create", ad_group_id: 456, ...)` |
| `vk_ads_stats` | Статистика VK Ads | `vk_ads_stats(period: "week", level: "campaign")` |
| `direct_campaigns` | Список кампаний Яндекс Директ | `direct_campaigns(status: "active")` |
| `direct_manage_campaign` | CRUD кампаний Директ | `direct_manage_campaign(action: "create", name: "...")` |
| `direct_manage_adgroup` | CRUD групп Директ | `direct_manage_adgroup(action: "list", campaign_id: 708664426)` |
| `direct_manage_ad` | CRUD объявлений Директ | `direct_manage_ad(action: "create", ad_group_id: ..., title: "...")` |
| `direct_manage_keywords` | CRUD ключевых слов Директ | `direct_manage_keywords(action: "add", ad_group_id: ..., keyword: "...")` |

### Известные кампании
- **Яндекс Директ:** 708664426 (Поиск), 708698819 (РСЯ)

## Фотоархив AidaCamp

Проиндексированный каталог ~9200 фотографий с AI-описаниями (Gemini Vision). Подробная документация: **[PHOTOS.md](PHOTOS.md)**

Быстрый доступ через скрипт или MCP:

```bash
# Поиск по описанию/тегам
./scripts/yadisk.sh search "дети программирование"

# Лучшие фото по сцене (сортировка: сайт → соцсети → архив)
./scripts/yadisk.sh best занятие 5

# Список сцен с количеством
./scripts/yadisk.sh scenes
```

MCP-инструмент `photos`: `photos(command: "search", query: "...")`, `photos(command: "best", query: "занятие", count: 5)`

### Скачивание фото без токена — `/api/photo`

Агентам **не нужен YADISK_TOKEN**. Токен хранится на сервере, фото отдаются через прокси:

```bash
# Одно фото — редирект на временную ссылку Яндекс.Диска
curl -L "https://dev.aidacamp.ru/api/photo?path=disk:/Медиа/2024/Фото/Прочее/IMG_1234.jpg"

# Превью (уменьшенное)
curl -L "https://dev.aidacamp.ru/api/photo?path=disk:/...&preview=1"

# Проксирование через сервер (без редиректа)
curl "https://dev.aidacamp.ru/api/photo?path=disk:/...&mode=proxy"

# Пакетно (до 20 фото) — POST, возвращает JSON с URL
curl -X POST https://dev.aidacamp.ru/api/photo \
  -H "Content-Type: application/json" \
  -d '{"paths": ["disk:/Медиа/2024/Фото/...", "disk:/Медиа/2023/Фото/..."]}'
```

Данные: `scripts/photo_catalog.json`, `scripts/photo_catalog_summary.json`, `scripts/disk_index.json`

## Полная инструкция для агентов по всем каналам аналитики

Подробное описание ВСЕХ таблиц, полей, SQL-запросов и MCP-инструментов для работы с данными Яндекс.Директ, Яндекс.Метрика, VK Реклама, Microsoft Clarity и A/B-тестов: **[AGENT_INSTRUCTIONS.md](/Users/vladimirafanasev/MCP/AGENT_INSTRUCTIONS.md)**

## Stack
- Astro 6.x + Tailwind CSS v4 (utility classes only, no custom CSS)
- @astrojs/node adapter (SSR for /api/ routes, static for pages)
- Communication language: Russian

## Deploy
See memory for full deploy commands. Short version:
- **Always deploy to dev first** (`dev.aidacamp.ru`), never overwrite prod without explicit confirmation
- Build: `npm run build`
- Deploy static: `dist/client/` (NOT `dist/`!)

## Browser Agent (remote headless Chromium)

Headless Chromium + Playwright установлен на сервере 159.194.223.55 в `/opt/browser-agent/`.
Используй для скриншотов, скрапинга, краулинга сайтов **вместо локального браузера**.

### Быстрый вызов через SSH

```bash
# Скриншот (desktop)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node screenshot.js 'https://URL' '/opt/browser-agent/output/NAME.png' --full"

# Скриншот (mobile)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node screenshot.js 'https://URL' '/opt/browser-agent/output/NAME.png' --mobile --full"

# Скрапинг текста / мета / ссылок
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node scrape.js 'https://URL' meta"

# Краулинг сайта (до N страниц)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node crawl.js 'https://URL' 20 json"

# Извлечение читабельного текста статьи
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node readpage.js 'https://URL' readable"

# Многошаговая автоматизация (загрузить JSON-скрипт и выполнить)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node interact.js /tmp/script.json"
```

### Обёртка (wrapper)
```bash
./scripts/browser-agent.sh screenshot <url> [filename] [--full] [--mobile]
./scripts/browser-agent.sh scrape <url> [text|html|links|meta]
./scripts/browser-agent.sh crawl <url> [max_pages] [json|urls]
./scripts/browser-agent.sh readpage <url> [readable|save]
./scripts/browser-agent.sh interact <script.json>
./scripts/browser-agent.sh pdf <url> [filename] [--landscape]
./scripts/browser-agent.sh har <url> [filename] [--summary]
./scripts/browser-agent.sh lighthouse <url> [--mobile] [--html --output file]
./scripts/browser-agent.sh diff <img1> <img2> [output]
./scripts/browser-agent.sh list
./scripts/browser-agent.sh fetch <filename>
```

### Скриншоты доступны по URL
`https://dev.aidacamp.ru/screenshots/<filename>.png`

### Доступные скрипты на сервере

| Скрипт | Назначение |
|---|---|
| `screenshot.js` | Скриншот URL (desktop/mobile, full page) |
| `scrape.js` | Извлечение текста, HTML, ссылок, мета-тегов |
| `crawl.js` | Краулинг сайта — обход всех внутренних ссылок |
| `readpage.js` | Извлечение читабельного текста статьи (Mozilla Readability) |
| `interact.js` | Многошаговая автоматизация: goto → click → fill → screenshot |
| `pdf.js` | Сохранение страницы в PDF (A4/landscape) |
| `har.js` | Запись HAR-трейса сетевых запросов с анализом |
| `lighthouse.js` | Аудит Lighthouse (Performance, SEO, Accessibility, Best Practices) |
| `diff.js` | Попиксельное сравнение двух скриншотов |

### interact.js — формат скрипта
```json
[
  { "action": "goto", "url": "https://example.com" },
  { "action": "wait", "ms": 2000 },
  { "action": "click", "selector": "#login-btn" },
  { "action": "fill", "selector": "input[name=email]", "value": "test@test.com" },
  { "action": "screenshot", "path": "/opt/browser-agent/output/result.png" },
  { "action": "text", "selector": ".result" },
  { "action": "evaluate", "code": "document.title" }
]
```

### Когда использовать
- **Скриншоты сайтов** — screenshot.js (вместо локального Chrome)
- **SEO-аудит** — scrape.js meta + crawl.js
- **Анализ конкурентов** — readpage.js + scrape.js
- **Проверка деплоя** — screenshot.js до/после + diff.js для сравнения
- **Автоматизация веб-форм** — interact.js
- **PageSpeed аудит** — lighthouse.js (без сторонних сервисов)
- **Анализ загрузки** — har.js --summary (медленные запросы, размеры по типам)
- **Сохранение страниц** — pdf.js для PDF, readpage.js save для HTML

## Дополнительные браузерные агенты на сервере

Помимо /opt/browser-agent/ (наш Playwright), на сервере установлены ещё 3 браузерных инструмента. Агент может использовать их через SSH — экран и GUI не нужны, всё работает headless.

### agent-browser (Vercel Labs) — быстрый Rust CLI
```bash
# Accessibility tree (оптимально для AI-анализа страницы)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser snapshot 'https://URL'"

# Скриншот
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser screenshot 'https://URL' '/tmp/shot.png'"

# Клик, заполнение форм
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser open 'https://URL'"
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser click '#submit-btn'"
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser fill 'input[name=email]' 'test@test.com'"
```

### dev-browser (SawyerHood) — Playwright API в sandbox
```bash
# Полный Playwright API в изолированном QuickJS
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "dev-browser --headless <<'EOF'
const page = await browser.newPage();
await page.goto('https://URL');
console.log(await page.title());
const buf = await page.screenshot();
await saveScreenshot(buf, 'result.png');
EOF"

# AI-снимок страницы (структура DOM для анализа)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "dev-browser --headless <<'EOF'
const page = await browser.newPage();
await page.goto('https://URL');
const snap = await page.snapshotForAI();
console.log(snap.full);
EOF"
```

### browser-use (Python AI-агент)
```bash
# AI-агент, который сам решает что кликать/вводить
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "/opt/browser-use-env/bin/python3 -c \"
from browser_use import Agent
# Требует API-ключ LLM (ANTHROPIC_API_KEY или OPENAI_API_KEY)
\""
```

### Когда что использовать
- **Простые задачи** (скриншот, скрапинг, lighthouse) → `/opt/browser-agent/` (наш Playwright)
- **Accessibility tree для AI** → `agent-browser snapshot`
- **Сложная автоматизация с Playwright API** → `dev-browser --headless`
- **AI-управляемая навигация** → `browser-use` (Python, нужен API-ключ)

## Аналитика: stats.sh (основной способ)

Статистика по рекламе и трафику хранится в PostgreSQL на сервере. Данные обновляются ежедневно cron-скриптом в 6:15.
**Используй `./scripts/stats.sh` как основной способ получения статистики.** Не нужен MCP, не нужны API-токены — просто bash.

### Команды stats.sh

```bash
./scripts/stats.sh summary [period]         # Сводка: Direct + Metrika + Goals
./scripts/stats.sh direct [period]          # Статистика кампаний Директа
./scripts/stats.sh direct-daily [period]    # Директ по дням
./scripts/stats.sh metrika [period]         # Трафик Метрики по источникам
./scripts/stats.sh metrika-daily [period]   # Метрика по дням
./scripts/stats.sh goals [period]           # Конверсии по целям
./scripts/stats.sh utm [period]             # UTM-разметка
./scripts/stats.sh placements [period] [N]  # Топ площадок по расходу
./scripts/stats.sh query "SELECT ..."       # Произвольный SQL
./scripts/stats.sh tables                   # Список таблиц и кол-во строк
./scripts/stats.sh etl [date] [date_to]     # Ручной запуск ETL
```

### Периоды

`today`, `yesterday`, `week`, `month`, `quarter`, `year`, `YYYY-MM-DD`, `YYYY-MM-DD:YYYY-MM-DD`

### Таблицы в БД (aidacamp)

| Таблица | Что хранит |
|---|---|
| `direct_campaign_stats` | Клики, показы, CTR, расход, конверсии по кампаниям/дням |
| `direct_placements` | Площадки показа (РСЯ) по кампаниям/дням |
| `metrika_traffic` | Визиты, пользователи, отказы по источникам/дням |
| `metrika_goals` | Конверсии по целям и источникам |
| `metrika_utm` | Статистика по UTM-меткам |
| `vk_ads_stats` | Статистика VK рекламы |
| `clarity_daily` | Данные Microsoft Clarity (агрегат за день) |
| `clarity_pages` | Clarity: метрики по URL (сессии, scroll depth, dead/rage clicks) |

### Когда использовать stats.sh vs MCP

- **stats.sh** — для любых отчётов, сводок, анализа. Работает всегда, быстро, не зависает.
- **MCP** — только если нужно что-то, чего нет в БД (управление кампаниями, создание объявлений).

## ЗАПРЕЩЕНО: удалённый MCP yandex-direct-metrica-mcp (5967f77d)

**НЕ используй** инструменты с префиксом `mcp__5967f77d`. Этот удалённый MCP-сервер отключён.
Все его функции перенесены в локальный `aidacamp-tools` (см. таблицу выше).

Токены API хранятся в `~/.codex/mcp-state/yandex-direct-metrica-mcp/.env`.
