# TOOLS — каталог инструментов АйДаКемп
**Канон на сервере:** `/opt/aidacamp-tools/TOOLS.md`  
**Последнее обновление:** 2026-04-22  

> Этот файл читается каждым агентом при старте.  
> **Принцип:** все данные берутся из API напрямую — не из локальной БД.  
> ETL упразднён. Исторические данные запрашиваются через API с нужными датами.

---

## 🔐 КАК ПОЛУЧАТЬ ТОКЕНЫ

### На сервере (скрипты через SSH)
Все токены лежат в `/opt/aidacamp-tools/etl/.env`.  
Скрипты читают их автоматически — агент ничего не спрашивает у пользователя.

```bash
# В bash-скрипте:
set -a && source /opt/aidacamp-tools/etl/.env && set +a && python3 script.py

# В python:
with open("/opt/aidacamp-tools/etl/.env") as f:
    for line in f:
        if line.strip() and not line.startswith("#") and "=" in line:
            k, v = line.strip().split("=", 1)
            os.environ.setdefault(k, v)
```

### Локально (Claude на маке)
Токены хранятся в **secretctl**. Агент вызывает `secret_run` — токен инжектится в команду, агент его не видит.

```
secretctl run -k <ИМЯ_СЕКРЕТА> -- <команда>
```

---

## 📋 ТАБЛИЦА ВСЕХ СЕКРЕТОВ

| Секрет в secretctl | Env var на сервере | Что это |
|---|---|---|
| `Yandex` | `DIRECT_TOKEN` | Яндекс.Директ API (+ Метрика read) |
| `Metrika` | `METRIKA_TOKEN` | Яндекс.Метрика (read) |
| `merika_write` | `METRIKA_WRITE_TOKEN` | Яндекс.Метрика (запись сегментов) |
| `WebMaster` | `WEBMASTER_TOKEN` | Яндекс.Вебмастер |
| `Wordstat` | `WORDSTAT_TOKEN` | Яндекс.Wordstat |
| `Yandex_disk` | `YADISK_TOKEN` | Яндекс.Диск (9 200+ фото) |
| `VK-business` | `VK_TOKEN` / `VK_ACCOUNT_ID` | VK Реклама (бизнес-кабинет) |
| `VK-Pers` | `VK_PERS_TOKEN` | VK личный токен |
| `Google-Youtube` | `GSC_CREDENTIALS_PATH` | Google Search Console / YouTube |
| `google_maps` | `GOOGLE_MAPS_KEY` | Google Maps API |
| `clarity` | `CLARITY_TOKEN` | Microsoft Clarity |
| `PageSpeed` | `PAGESPEED_KEY` | Google PageSpeed Insights |
| `OpenRouter` | `OPENROUTER_KEY` | OpenRouter (Claude, GPT, Llama и др.) |
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | Anthropic Claude напрямую |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | OpenAI |
| `OPENAI_BASE_URL` | `OPENAI_BASE_URL` | OpenAI-совместимый прокси |
| `Gemini` | `GEMINI_API_KEY` | Google Gemini Vision |
| `Groq` | `GROQ_API_KEY` | Groq (быстрый Llama inference) |
| `deepinfra` | `DEEPINFRA_TOKEN` | DeepInfra (embedding, LLM) |
| `voyageai` | `VOYAGE_API_KEY` | VoyageAI (embeddings) |
| `mem0` | `MEM0_API_KEY` | Mem0 (memory layer для агентов) |
| `Telegram-Token` | `TELEGRAM_BOT_TOKEN` / `TG_BOT_TOKEN` | Telegram Bot API |
| `Alfacrm` | `ALFACRM_API_KEY` / `ALFACRM_HOST` | АльфаCRM |
| `green-api-tg` | `GREEN_API_TG_*` | Green API (Telegram через WA-gateway) |
| `dataforseo` | `DATAFORSEO_LOGIN` / `DATAFORSEO_KEY` | DataForSEO (SEO данные) |
| `kinescope` | `KINESCOPE_TOKEN` | Kinescope (видеохостинг) |
| `N8n` | — | n8n (запущен на :5678) |
| `SSH-PROD` | — | SSH ключ продакшн сервера 159.194.223.55 |
| `SSH-DEV` | — | SSH ключ dev сервера |
| `aidacamp-ask` | — | Внутренний Q&A инструмент |
| `disk_open_router` | — | Яндекс.Диск через OpenRouter |

---

## 🌐 APIs — КАК ВЫЗЫВАТЬ

### Яндекс.Директ
**Токен:** `DIRECT_TOKEN`, логин: `DIRECT_LOGIN=kv145`  
**Документация:** https://yandex.ru/dev/direct/doc/ref-v5/  
**Базовый URL:** `https://api.direct.yandex.com/json/v5/`

```python
import urllib.request, json, os

def direct_api(method, params):
    body = json.dumps({"method": "get", "params": params}).encode()
    req = urllib.request.Request(
        f"https://api.direct.yandex.com/json/v5/{method}",
        data=body,
        headers={
            "Authorization": f"Bearer {os.environ['DIRECT_TOKEN']}",
            "Client-Login": os.environ.get("DIRECT_LOGIN", "kv145"),
            "Content-Type": "application/json",
        }
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# Активные кампании (с пагинацией)
def get_campaigns():
    all_camps, offset = [], 0
    while True:
        resp = direct_api("campaigns", {
            "SelectionCriteria": {},
            "FieldNames": ["Id", "Name", "Status", "State", "DailyBudget"],
            "Page": {"Limit": 100, "Offset": offset}
        })
        batch = resp.get("result", {}).get("Campaigns", [])
        all_camps.extend(batch)
        if len(batch) < 100: break
        offset += 100
    return [c for c in all_camps if c.get("State") == "ON"]

# Расходы за период (Reports API)
def get_spend(date_from, date_to):
    body = json.dumps({"params": {
        "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
        "FieldNames": ["CampaignName", "Clicks", "Cost"],
        "ReportName": f"spend_{date_from}",
        "ReportType": "CAMPAIGN_PERFORMANCE_REPORT",
        "DateRangeType": "CUSTOM_DATE",
        "Format": "TSV",
        "IncludeVAT": "NO",
    }}).encode()
    req = urllib.request.Request(
        "https://api.direct.yandex.com/json/v5/reports",
        data=body,
        headers={
            "Authorization": f"Bearer {os.environ['DIRECT_TOKEN']}",
            "Client-Login": os.environ.get("DIRECT_LOGIN", "kv145"),
            "Content-Type": "application/json",
            "processingMode": "auto",
            "skipReportHeader": "true",
            "skipReportSummary": "true",
        }
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        lines = r.read().decode().strip().split("\n")
    return lines  # TSV: CampaignName\tClicks\tCost(микрорубли)
```

---

### Яндекс.Метрика
**Токен:** `METRIKA_TOKEN`, счётчик: `METRIKA_COUNTER=96499295`  
**Документация:** https://yandex.ru/dev/metrika/doc/api2/api_v1/  

```python
import urllib.request, urllib.parse, json, os

def metrika_api(dimensions, metrics, date1, date2, limit=1000):
    params = urllib.parse.urlencode({
        "ids": os.environ["METRIKA_COUNTER"],
        "dimensions": ",".join(dimensions) if dimensions else "",
        "metrics": ",".join(metrics),
        "date1": date1,
        "date2": date2,
        "limit": limit,
    })
    url = f"https://api-metrika.yandex.net/stat/v1/data?{params}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"OAuth {os.environ['METRIKA_TOKEN']}"
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

# Лиды за вчера (все цели)
data = metrika_api(
    dimensions=["ym:s:goalName"],
    metrics=["ym:s:reaches"],
    date1="2026-04-21", date2="2026-04-21"
)
# Трафик по UTM
data = metrika_api(
    dimensions=["ym:s:UTMSource", "ym:s:UTMMedium"],
    metrics=["ym:s:visits", "ym:s:users", "ym:s:bounceRate"],
    date1="2026-04-21", date2="2026-04-21"
)
```

---

### VK Реклама
**Токен:** `VK_TOKEN`, аккаунт: `VK_ACCOUNT_ID`  
**Документация:** https://ads.vk.com/api/reference/  

```python
import urllib.request, urllib.parse, json, os

def vk_api(method, **params):
    params.update({
        "access_token": os.environ["VK_TOKEN"],
        "account_id": os.environ["VK_ACCOUNT_ID"],
        "v": "5.131",
    })
    url = f"https://api.vk.com/method/ads.{method}?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.loads(r.read()).get("response")

# Статистика за день
stats = vk_api("getStatistics", ids_type="account",
               ids=os.environ["VK_ACCOUNT_ID"],
               period="day", date_from="2026-04-21", date_to="2026-04-21")
# Кампании
campaigns = vk_api("getCampaigns")
```

---

### Microsoft Clarity
**Токен:** `CLARITY_TOKEN`  
**Через MCP:** `mcp__aidacamp-tools__clarity`  

```python
# Через MCP (предпочтительно):
# mcp__aidacamp-tools__clarity(action="sessions", numDays=7)

# Или напрямую:
import urllib.request, json, os

def clarity_api(num_days=7):
    url = "https://www.clarity.ms/api/v1/projects/metrics"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {os.environ['CLARITY_TOKEN']}"
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())
```

---

### Google PageSpeed
**Ключ:** `PAGESPEED_KEY`  
**Через MCP:** `mcp__aidacamp-tools__pagespeed`  

```python
# Через MCP:
# mcp__aidacamp-tools__pagespeed(url="https://aidacamp.ru", strategy="mobile")

# Напрямую:
url = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://aidacamp.ru&strategy=mobile&key={os.environ['PAGESPEED_KEY']}"
```

---

### OpenRouter (LLM)
**Ключ:** `OPENROUTER_KEY`  
**Модели:** `anthropic/claude-3-5-haiku`, `anthropic/claude-sonnet-4-5`, `openai/gpt-4o`, `meta-llama/llama-3-70b-instruct`  

```python
import urllib.request, json, os

def llm(system, user, model="anthropic/claude-3-5-haiku", max_tokens=500):
    body = json.dumps({
        "model": model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user",   "content": user}],
        "max_tokens": max_tokens,
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {os.environ['OPENROUTER_KEY']}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aidacamp.ru",
        }
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"].strip()
```

---

### Anthropic Claude (напрямую)
**Ключ:** `ANTHROPIC_API_KEY`  
**Модели:** `claude-sonnet-4-5`, `claude-haiku-4-5`, `claude-opus-4-5`  

```python
body = json.dumps({
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "..."}]
}).encode()
req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
    "x-api-key": os.environ["ANTHROPIC_API_KEY"],
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
})
```

---

### Яндекс.Диск (фото)
**Токен:** `YADISK_TOKEN`  
**9 200+ фото с AI-описаниями**  
**Через MCP:** `mcp__aidacamp-tools__photos`  

```python
# Через MCP (предпочтительно):
# mcp__aidacamp-tools__photos(query="дети программирование", limit=5)

# Напрямую:
import urllib.request, urllib.parse, json, os

def yadisk_ls(path="/"):
    url = f"https://cloud-api.yandex.net/v1/disk/resources?path={urllib.parse.quote(path)}&limit=100"
    req = urllib.request.Request(url, headers={
        "Authorization": f"OAuth {os.environ['YADISK_TOKEN']}"
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())
```

---

### Telegram Bot
**Токен:** `TELEGRAM_BOT_TOKEN` / `TG_BOT_TOKEN`  
**Основной чат:** `DAILY_DIGEST_CHAT_ID=244314247`  

```python
def tg_send(text, chat_id=None):
    chat_id = chat_id or os.environ.get("DAILY_DIGEST_CHAT_ID", "244314247")
    body = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{os.environ['TELEGRAM_BOT_TOKEN']}/sendMessage",
        data=body, headers={"Content-Type": "application/json"}
    )
    urllib.request.urlopen(req, timeout=10)
```

---

### АльфаCRM
**Ключи:** `ALFACRM_API_KEY`, `ALFACRM_HOST`, `ALFACRM_EMAIL`, `ALFACRM_X_APP_KEY`  
**Ветки:** `ALFACRM_BRANCH_CAMP`, `ALFACRM_BRANCH_KODIT`  
**Через MCP:** `mcp__aidacamp-tools__direct_leads` (и другие `direct_*` инструменты)  

---

### Green API (WhatsApp / Telegram gateway)
**Ключи:** `GREEN_API_WA_ID_INSTANCE`, `GREEN_API_WA_TOKEN` — WhatsApp  
`GREEN_API_TG_ID_INSTANCE`, `GREEN_API_TG_TOKEN` — Telegram  

```python
def green_send(phone, message, instance_id, token):
    url = f"https://api.green-api.com/waInstance{instance_id}/sendMessage/{token}"
    body = json.dumps({"chatId": f"{phone}@c.us", "message": message}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=15)
```

---

### DataForSEO
**Ключи:** `DATAFORSEO_LOGIN`, `DATAFORSEO_KEY`  
Позиции в поиске, SERP-данные, keyword research.

---

### Kinescope
**Токен:** `KINESCOPE_TOKEN`  
Видеохостинг — загрузка, получение embed-ссылок, статистика просмотров.

---

## 🛠 MCP ИНСТРУМЕНТЫ (`mcp__aidacamp-tools__*`)

Доступны всегда когда агент работает через Claude. Не требуют явного указания токенов.

| Инструмент | Что делает |
|---|---|
| `ssh` | Выполнить команду на сервере 159.194.223.55 |
| `stats` | Аналитика: Direct, Metrika, VK за период |
| `photos` | Поиск фото на Яндекс.Диске по описанию |
| `browser_agent` | Playwright: скриншот, скрапинг, PDF, HAR |
| `clarity` | Данные Microsoft Clarity (сессии, карты кликов) |
| `pagespeed` | Google PageSpeed аудит |
| `image_edit` | Редактирование изображений |
| `vk_campaigns` | Кампании VK Реклама |
| `vk_ads_stats` | Статистика VK Реклама |
| `vk_manage_ad` | Создание/изменение объявлений VK |
| `direct_campaigns` | Кампании Яндекс.Директ |
| `direct_reports` | Отчёты Директ |
| `direct_leads` | Лиды из АльфаCRM |
| `direct_manage_campaign` | Управление кампаниями Директ |
| `read_file` | Читать файл на сервере |
| `write_file` | Писать файл на сервере |
| `list_directory` | Список файлов |
| `diagnostics` | Диагностика сервера |

---

## 🗄 ЛОКАЛЬНАЯ БД PostgreSQL (только CRM-данные)

Хост: `localhost` (только с сервера), БД: `aidacamp`, пользователь: `postgres`  
**Что хранится:** контакты, переписки, заметки менеджеров — то чего нет во внешних системах.  
**Что НЕ хранится:** рекламная статистика (Direct, Metrika, VK) — берём из API.

```
crm_contacts          — клиенты из АльфаCRM
crm_contact_contexts  — AI-резюме клиентов (обогащение)
crm_manager_notes     — заметки менеджеров
crm_coach_logs        — логи AI-коуча
ai_dialogs            — переписки WA + TG
ai_tg_users           — маппинг телефон → TG peer_id
```

---

## 🖥 СЕРВЕР `159.194.223.55`

**Подключение через MCP:** `mcp__aidacamp-tools__ssh`  
**Прямо:** `ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55`  

| Сервис | Порт | Что |
|---|---|---|
| `aidacamp-mcp.service` | 3010 | MCP-сервер для агентов |
| `crm-panel-api.service` | 6300 | CRM панель реактивации |
| `aidacamp-fasttrack.service` | — | Форма лидов → АльфаCRM |
| `n8n` (docker) | 5678 | Автоматизация (n8n) |
| `nginx` | 80/443 | Прокси aidacamp.ru |
| `postgresql` | 5432 | БД (только localhost) |

Логи: `/var/log/`, `/opt/aidacamp-tools/*.log`, `/tmp/*.log`

---

## ⚠️ ПРАВИЛА ДЛЯ АГЕНТОВ

1. **Не спрашивай токены у пользователя** — бери с сервера из `etl/.env` или через secretctl
2. **Не говори "не могу подключиться"** — если нужна информация, вызови API или SSH
3. **Нет данных в БД** — это нормально, иди в API источника
4. **Direct API / Metrika хранят историю за годы** — запрашивай нужный период напрямую
5. **Ошибка API** — логируй, пробуй retry, только потом сообщай пользователю
6. **Новый скрипт на сервере** — сохраняй в `/opt/aidacamp-tools/`, не в `/tmp/`
