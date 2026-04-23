# TOOLS — каталог инструментов АйДаКемп
**Канон на сервере:** `/opt/aidacamp-tools/TOOLS.md`  
**Последнее обновление:** 2026-04-23  

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

---

### Яндекс.Директ
**Токен:** `DIRECT_TOKEN`, логин: `DIRECT_LOGIN=kv145`  
**Документация:** https://yandex.ru/dev/direct/doc/ref-v5/  
**Базовый URL:** `https://api.direct.yandex.com/json/v5/`  
**MCP:** `mcp__aidacamp-tools__direct_*` (25 инструментов)

#### Базовая функция
```python
import urllib.request, json, os

def direct_api(method, action="get", params={}):
    body = json.dumps({"method": action, "params": params}).encode()
    req = urllib.request.Request(
        f"https://api.direct.yandex.com/json/v5/{method}",
        data=body,
        headers={
            "Authorization": f"Bearer {os.environ['DIRECT_TOKEN']}",
            "Client-Login": os.environ.get("DIRECT_LOGIN", "kv145"),
            "Content-Type": "application/json; charset=utf-8",
        }
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())
```

#### Кампании (campaigns)
```python
# Читать (все, с пагинацией)
def get_campaigns(state_filter="ON"):
    all_camps, offset = [], 0
    while True:
        resp = direct_api("campaigns", params={
            "SelectionCriteria": {},
            "FieldNames": ["Id","Name","Status","State","DailyBudget","Type","Statistics"],
            "Page": {"Limit": 100, "Offset": offset}
        })
        batch = resp.get("result", {}).get("Campaigns", [])
        all_camps.extend(batch)
        if len(batch) < 100: break
        offset += 100
    return [c for c in all_camps if not state_filter or c.get("State") == state_filter]

# Создать кампанию
direct_api("campaigns", "add", {"Campaigns": [{
    "Name": "Новая кампания",
    "StartDate": "2026-05-01",
    "ClientInfo": "АйДаКемп",
    "TextCampaign": {
        "BiddingStrategy": {
            "Search": {"BiddingStrategyType": "AVERAGE_CPC", "AverageCpc": {"AverageCpc": 50000000}},
            "Network": {"BiddingStrategyType": "SERVING_OFF"},
        }
    }
}]})

# Приостановить / возобновить кампании
direct_api("campaigns", "suspend", {"SelectionCriteria": {"Ids": [123456]}})
direct_api("campaigns", "resume",  {"SelectionCriteria": {"Ids": [123456]}})

# Архивировать / разархивировать
direct_api("campaigns", "archive",   {"SelectionCriteria": {"Ids": [123456]}})
direct_api("campaigns", "unarchive", {"SelectionCriteria": {"Ids": [123456]}})

# Удалить
direct_api("campaigns", "delete", {"SelectionCriteria": {"Ids": [123456]}})
```

#### Группы объявлений (adgroups)
```python
# Читать группы кампании
resp = direct_api("adgroups", params={
    "SelectionCriteria": {"CampaignIds": [123456]},
    "FieldNames": ["Id","Name","CampaignId","Status","RegionIds","NegativeKeywords"],
})
groups = resp["result"]["AdGroups"]

# Создать группу
direct_api("adgroups", "add", {"AdGroups": [{
    "Name": "Группа лагерь Москва",
    "CampaignId": 123456,
    "RegionIds": [213],  # 213 = Москва
    "NegativeKeywords": ["бесплатно", "скачать"],
}]})

# Изменить (update)
direct_api("adgroups", "update", {"AdGroups": [{"Id": 789, "Name": "Новое имя"}]})
```

#### Объявления (ads)
```python
# Читать объявления
resp = direct_api("ads", params={
    "SelectionCriteria": {"CampaignIds": [123456]},
    "FieldNames": ["Id","AdGroupId","Status","State"],
    "TextAdFieldNames": ["Title","Title2","Text","Href","DisplayUrlPath"],
})
ads = resp["result"]["Ads"]

# Создать текстовое объявление
direct_api("ads", "add", {"Ads": [{
    "AdGroupId": 789,
    "TextAd": {
        "Title": "Лагерь АйДаКемп 2026",
        "Title2": "IT-лагерь для детей",
        "Text": "Программирование, робототехника, игровой дизайн. Запись открыта!",
        "Href": "https://aidacamp.ru",
        "DisplayUrlPath": "aidacamp.ru/лагерь",
    }
}]})

# Остановить / запустить объявления
direct_api("ads", "suspend", {"SelectionCriteria": {"Ids": [101, 102]}})
direct_api("ads", "resume",  {"SelectionCriteria": {"Ids": [101, 102]}})
```

#### Ключевые слова (keywords)
```python
# Читать ключи группы
resp = direct_api("keywords", params={
    "SelectionCriteria": {"AdGroupIds": [789]},
    "FieldNames": ["Id","Keyword","Status","Bid","ContextBid","AdGroupId","CampaignId"],
})

# Добавить ключи
direct_api("keywords", "add", {"Keywords": [
    {"AdGroupId": 789, "Keyword": "детский лагерь программирование", "Bid": 50000000},
    {"AdGroupId": 789, "Keyword": "it лагерь москва лето"},
]})

# Изменить ставки
direct_api("keywords", "update", {"Keywords": [
    {"Id": 555, "Bid": 70000000}  # 70₽ (в микрорублях × 1_000_000)
]})

# Удалить ключи
direct_api("keywords", "delete", {"SelectionCriteria": {"Ids": [555, 556]}})
```

#### Минус-фразы и исключения
```python
# Общие списки минус-фраз (shared sets)
resp = direct_api("negativekeywordsharedsets", params={
    "SelectionCriteria": {},
    "FieldNames": ["Id","Name","NegativeKeywords"],
})
sets = resp["result"]["NegativeKeywordSharedSets"]

# Добавить минус в shared set
direct_api("negativekeywordsharedsets", "update", {"NegativeKeywordSharedSets": [{
    "Id": sets[0]["Id"],
    "NegativeKeywords": sets[0]["NegativeKeywords"] + ["новая минус фраза"],
}]})

# Исключённые площадки РСЯ
resp = direct_api("adimages", params={})  # не то
# Площадки — через excludedsites (специальный endpoint):
body = json.dumps({"method": "add", "params": {
    "ExcludedSites": [{"CampaignId": 123456, "Sites": ["bad-site.ru"]}]
}}).encode()
```

#### Reports API — статистика
```python
# Расходы и клики за период (ACCOUNT_PERFORMANCE_REPORT = весь аккаунт)
def get_spend(date_from, date_to, report_type="ACCOUNT_PERFORMANCE_REPORT"):
    body = json.dumps({"params": {
        "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
        "FieldNames": ["CampaignName","Impressions","Clicks","Cost","Ctr","AvgCpc"],
        "ReportName": f"report_{date_from}",
        "ReportType": report_type,  # CAMPAIGN_PERFORMANCE_REPORT / SEARCH_QUERY_PERFORMANCE_REPORT
        "DateRangeType": "CUSTOM_DATE",
        "Format": "TSV",
        "IncludeVAT": "NO",
        "IncludeDiscount": "NO",
    }}).encode()
    req = urllib.request.Request(
        "https://api.direct.yandex.com/json/v5/reports",
        data=body,
        headers={
            "Authorization": f"Bearer {os.environ['DIRECT_TOKEN']}",
            "Client-Login": os.environ.get("DIRECT_LOGIN", "kv145"),
            "Content-Type": "application/json",
            "processingMode": "auto",     # auto | offline | online
            "skipReportHeader": "true",
            "skipColumnHeader": "false",
            "skipReportSummary": "true",
        }
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        lines = r.read().decode("utf-8").strip().split("\n")
    # lines[0] = заголовок, lines[1:] = данные, Cost в микрорублях (÷1_000_000)
    return lines

# Типы отчётов:
# ACCOUNT_PERFORMANCE_REPORT         — весь аккаунт
# CAMPAIGN_PERFORMANCE_REPORT        — по кампаниям
# ADGROUP_PERFORMANCE_REPORT         — по группам
# AD_PERFORMANCE_REPORT              — по объявлениям
# KEYWORD_PERFORMANCE_REPORT         — по ключам
# SEARCH_QUERY_PERFORMANCE_REPORT    — поисковые запросы
# PLACEMENT_PERFORMANCE_REPORT       — площадки РСЯ (URL/app)

# Поля (FieldNames) — полный список:
# CampaignId, CampaignName, AdGroupId, AdGroupName, AdId
# Impressions, Clicks, Cost (микрорубли), Ctr, AvgCpc
# BounceRate, AvgPageviews, AvgEffectiveBid
# Date, Week, Month, Quarter, Year
# Device (DESKTOP/MOBILE/TABLET), LocationOfPresenceName, Gender, Age
# Query (для SEARCH_QUERY), Placement (для PLACEMENT)
```

#### Ставки и стратегии
```python
# Установить ставки для ключей
direct_api("bids", "set", {"Bids": [
    {"KeywordId": 555, "Bid": 50000000, "ContextBid": 30000000}
]})

# Модификаторы ставок (устройства, регионы, пол/возраст)
direct_api("bidmodifiers", "add", {"BidModifiers": [{
    "CampaignId": 123456,
    "MobileAdjustment": {"BidModifier": 80},  # -20% для мобильных
}]})
```

---

### Яндекс.Метрика
**Токен:** `METRIKA_TOKEN`, счётчик: `METRIKA_COUNTER=96499295`  
**Документация:** https://yandex.ru/dev/metrika/doc/api2/  
**MCP:** `mcp__aidacamp-tools__metrika_*`

> ⚠️ **Важно:** `ym:s:reaches` с dimension `ym:s:goalName` возвращает HTTP 400.  
> Правильно: сначала получить ID цели, затем использовать `ym:s:goal{ID}reaches`.

#### Базовая функция
```python
import urllib.request, urllib.parse, json, os

COUNTER = os.environ.get("METRIKA_COUNTER", "96499295")
TOKEN   = os.environ["METRIKA_TOKEN"]

def metrika(dimensions, metrics, date1, date2, filters="", limit=1000):
    p = {"ids": COUNTER, "metrics": ",".join(metrics), "date1": date1, "date2": date2, "limit": limit}
    if dimensions: p["dimensions"] = ",".join(dimensions)
    if filters:    p["filters"] = filters
    req = urllib.request.Request(
        f"https://api-metrika.yandex.net/stat/v1/data?{urllib.parse.urlencode(p)}",
        headers={"Authorization": f"OAuth {TOKEN}"}
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())
```

#### Список целей (обязательно перед запросом конверсий)
```python
# GET /management/v1/counter/{counterId}/goals
req = urllib.request.Request(
    f"https://api-metrika.yandex.net/management/v1/counter/{COUNTER}/goals",
    headers={"Authorization": f"OAuth {TOKEN}"}
)
with urllib.request.urlopen(req, timeout=20) as r:
    goals = json.loads(r.read())["goals"]
# goals = [{"id": 541048197, "name": "Отправка заявки-new", "type": "action"}, ...]
LEAD_GOAL_ID = 541048197  # хардкод для счётчика 96499295
```

#### Статистика — ключевые запросы
```python
# 1. Заявки (конверсии) за период
data = metrika([], [f"ym:s:goal{LEAD_GOAL_ID}reaches"], "2026-04-16", "2026-04-22")
leads = int(data["totals"][0])

# 2. Визиты по UTM-источнику
data = metrika(
    ["ym:s:UTMSource"], ["ym:s:visits","ym:s:users","ym:s:bounceRate","ym:s:avgVisitDurationSeconds"],
    "2026-04-22", "2026-04-22"
)
# data["data"] = [{"dimensions": [{"name": "yandex"}], "metrics": [301.0, 245.0, 42.1, 89.0]}, ...]

# 3. Трафик по устройствам
data = metrika(["ym:s:deviceCategory"], ["ym:s:visits","ym:s:bounceRate"], "2026-04-22", "2026-04-22")

# 4. Поисковые фразы (ТОП-20 по визитам)
data = metrika(["ym:s:searchPhrase"], ["ym:s:visits"], "2026-04-16", "2026-04-22", limit=20)

# 5. Страницы входа
data = metrika(["ym:s:startURL"], ["ym:s:visits","ym:s:bounceRate"], "2026-04-22", "2026-04-22", limit=20)

# 6. География (регионы)
data = metrika(["ym:s:regionName"], ["ym:s:visits"], "2026-04-16", "2026-04-22", limit=15)

# 7. Несколько целей за неделю (одним запросом)
goal_ids = [541048197, 541048270, 541048649]  # заявка, возраст, telegram
metrics_str = ",".join(f"ym:s:goal{gid}reaches" for gid in goal_ids)
data = metrika([], [metrics_str], "2026-04-16", "2026-04-22")
# data["totals"] = [5.0, 12.0, 3.0]

# 8. Когортный анализ — возвращаемость
data = metrika(["ym:s:visitNumberInSession"], ["ym:s:visits"], "2026-04-01", "2026-04-22")

# 9. Офлайн-конверсии (загрузка данных о звонках/оплатах)
# POST /management/v1/counter/{id}/offline_conversions/upload
```

#### Ключевые метрики (справочник)
```
Трафик:
  ym:s:visits                       — визиты
  ym:s:users                        — уники
  ym:s:newUsers                     — новые
  ym:s:bounceRate                   — отказы %
  ym:s:avgVisitDurationSeconds      — время на сайте (сек)
  ym:s:pageDepth                    — глубина просмотра

Конверсии:
  ym:s:goal{ID}reaches              — достижения цели (ПРАВИЛЬНЫЙ способ)
  ym:s:goal{ID}conversionRate       — конверсия цели %

Реклама:
  ym:s:adNetworkType                — тип сети (SEARCH/AD)
  ym:s:directClickOrder             — кампания

Ключевые dimensions:
  ym:s:UTMSource / UTMMedium / UTMCampaign / UTMContent / UTMTerm
  ym:s:searchPhrase                 — поисковый запрос
  ym:s:startURL / exitURL           — страница входа/выхода
  ym:s:regionName                   — регион
  ym:s:deviceCategory               — DESKTOP / MOBILE / TABLET
  ym:s:gender                       — MALE / FEMALE
  ym:s:ageGroup                     — 18-24 / 25-34 / 35-44 / 45+
  ym:s:goalName                     — имя цели (только для display, НЕ для метрик reaches!)
```

---

### VK Реклама
**Токен:** `VK_TOKEN`, аккаунт: `VK_ACCOUNT_ID`  
**Документация:** https://dev.vk.com/ru/reference/ads  
**MCP:** `mcp__aidacamp-tools__vk_*` (27 инструментов)

#### Базовая функция
```python
import urllib.request, urllib.parse, json, os

def vk_ads(method, **params):
    params.update({
        "access_token": os.environ["VK_TOKEN"],
        "account_id":   os.environ["VK_ACCOUNT_ID"],
        "v": "5.131",
    })
    with urllib.request.urlopen(
        f"https://api.vk.com/method/ads.{method}?" + urllib.parse.urlencode(params), timeout=20
    ) as r:
        resp = json.loads(r.read())
    if "error" in resp:
        raise RuntimeError(f"VK error {resp['error']['error_code']}: {resp['error']['error_msg']}")
    return resp.get("response")
```

#### Структура: аккаунт → кампании → группы → объявления
```python
# Кампании
campaigns = vk_ads("getCampaigns", include_deleted=0)
# [{"id":123, "name":"...", "status":1, "day_limit":"1000", "all_limit":"0"}, ...]

# Создать кампанию
new_camp = vk_ads("createCampaigns", data=json.dumps([{
    "name": "Лагерь 2026 — поиск",
    "type": "normal",
    "day_limit": 1500,
    "all_limit": 0,
    "status": 1,  # 1=активна, 0=остановлена
}]))

# Изменить кампанию
vk_ads("updateCampaigns", data=json.dumps([{"id": 123, "status": 0}]))  # остановить

# Группы объявлений
groups = vk_ads("getAds", campaign_ids=json.dumps([123]))

# Создать объявление (формат: promoted_posts / carousel / text / html5)
new_ad = vk_ads("createAds", data=json.dumps([{
    "campaign_id": 123,
    "ad_format": 9,          # 9=promoted post
    "cost_type": 1,          # 1=CPM, 0=CPC
    "cpm": 150,              # ставка в копейках (150 = 1.50₽)
    "impressions_limit": 1,
    "link_url": "https://aidacamp.ru",
    "name": "Лагерь_промо_апрель",
    "approved": 0,
}]))
```

#### Статистика
```python
# Статистика аккаунта за день
stats = vk_ads("getStatistics",
    ids_type="account", ids=os.environ["VK_ACCOUNT_ID"],
    period="day", date_from="2026-04-22", date_to="2026-04-22"
)
# stats[0]["stats"][0] = {"day":"2026-04-22", "spent":"234.50", "clicks":45, "impressions":8200, "reach":6100}

# Статистика по кампаниям
stats = vk_ads("getStatistics",
    ids_type="campaign", ids=json.dumps([123, 124]),
    period="day", date_from="2026-04-16", date_to="2026-04-22"
)

# Статистика по объявлениям
stats = vk_ads("getStatistics",
    ids_type="ad", ids=json.dumps([456, 457]),
    period="overall", date_from="2026-04-01", date_to="2026-04-22"
)

# period: day | month | year | overall

# Демография аудитории
demo = vk_ads("getDemographics",
    ids_type="campaign", ids=json.dumps([123]),
    period="day", date_from="2026-04-22", date_to="2026-04-22"
)
```

#### Аудитории и ретаргетинг
```python
# Списки ретаргетинга
audiences = vk_ads("getRetargetingGroups")

# Создать аудиторию из сайта (пиксель)
new_aud = vk_ads("createRetargetingGroup",
    name="Посетители сайта 30д",
    lifetime=30,              # дней хранения
    is_audience=1,
)

# Lookalike на основе существующей аудитории
lookalike = vk_ads("createLookalikeRequest",
    source_type="retargeting_group",
    retargeting_group_id=789,
)

# Интересы (таргетинг)
categories = vk_ads("getCategories")  # список всех категорий интересов
```

#### Управление бюджетом
```python
# Баланс аккаунта
balance = vk_ads("getBudget")  # {"amount": "5000.00", "currency": "RUR"}

# Изменить лимит кампании
vk_ads("updateCampaigns", data=json.dumps([{"id": 123, "day_limit": 2000}]))
```

---

### Яндекс.Диск
**Токен:** `YADISK_TOKEN`  
**Документация:** https://yandex.ru/dev/disk/api/  
**9 200+ фото с AI-описаниями**  
**MCP:** `mcp__aidacamp-tools__photos` (предпочтительно для поиска)

#### Базовая функция
```python
import urllib.request, urllib.parse, json, os

def yadisk(method, path="", **params):
    p = {"path": path, **params} if path else params
    url = f"https://cloud-api.yandex.net/v1/disk/{method}?{urllib.parse.urlencode(p)}"
    req = urllib.request.Request(url, headers={"Authorization": f"OAuth {os.environ['YADISK_TOKEN']}"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())
```

#### Операции с файлами и папками
```python
# Список файлов в папке
items = yadisk("resources", "disk:/Фото/2025", limit=50, sort="modified")
files = items["_embedded"]["items"]  # [{name, path, type, modified, size}, ...]

# Получить информацию о файле
info = yadisk("resources", "disk:/Фото/2025/photo.jpg")

# Скачать файл (получить ссылку)
dl = yadisk("resources/download", "disk:/Фото/2025/photo.jpg")
download_url = dl["href"]  # временная ссылка для скачивания

# Получить публичную ссылку (publish)
req = urllib.request.Request(
    f"https://cloud-api.yandex.net/v1/disk/resources/publish?path=disk:/Фото/2025/photo.jpg",
    method="PUT",
    headers={"Authorization": f"OAuth {os.environ['YADISK_TOKEN']}"}
)
urllib.request.urlopen(req, timeout=20)
info = yadisk("resources", "disk:/Фото/2025/photo.jpg")
public_url = info["public_url"]

# Создать папку
req = urllib.request.Request(
    f"https://cloud-api.yandex.net/v1/disk/resources?path=disk:/Новая+папка",
    method="PUT",
    headers={"Authorization": f"OAuth {os.environ['YADISK_TOKEN']}"}
)
urllib.request.urlopen(req, timeout=20)

# Загрузить файл
upload_info = yadisk("resources/upload", "disk:/Путь/файл.jpg", overwrite="true")
upload_url = upload_info["href"]
with open("local_file.jpg", "rb") as f:
    req = urllib.request.Request(upload_url, data=f.read(), method="PUT")
    urllib.request.urlopen(req, timeout=60)

# Копировать / переместить
req = urllib.request.Request(
    "https://cloud-api.yandex.net/v1/disk/resources/copy?" +
    urllib.parse.urlencode({"from": "disk:/Источник/файл.jpg", "path": "disk:/Цель/файл.jpg"}),
    method="POST",
    headers={"Authorization": f"OAuth {os.environ['YADISK_TOKEN']}"}
)
urllib.request.urlopen(req, timeout=20)

# Удалить (в корзину)
req = urllib.request.Request(
    f"https://cloud-api.yandex.net/v1/disk/resources?path=disk:/ненужный-файл.jpg&permanently=false",
    method="DELETE",
    headers={"Authorization": f"OAuth {os.environ['YADISK_TOKEN']}"}
)
urllib.request.urlopen(req, timeout=20)

# Поиск файлов по имени
results = yadisk("resources/files", limit=100, media_type="image", sort="modified")
all_images = results["items"]

# Плоский список всех файлов (без структуры папок)
all_files = yadisk("resources/files", limit=1000, fields="items.name,items.path,items.modified")
```

---

### Яндекс.Wordstat
**Токен:** `WORDSTAT_TOKEN`  
**Документация:** https://yandex.ru/dev/wordstat/doc/  
**API URL:** `https://api.wordstat.yandex.com/v2/`

> Wordstat API 2.0 (JSON) — частотность запросов, похожие фразы, сезонность.  
> Лимит: 30 запросов/сек, 500 000 фраз/месяц.

```python
import urllib.request, json, os

def wordstat(method, body):
    req = urllib.request.Request(
        f"https://api.wordstat.yandex.com/v2/{method}",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"OAuth {os.environ['WORDSTAT_TOKEN']}",
            "Content-Type": "application/json",
        }
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# 1. Частотность фраз (wordStat) — базовый запрос
resp = wordstat("wordsByPhrases", {
    "phrases": ["детский лагерь программирование", "it лагерь москва", "лагерь кодинг"],
    "regions": [213, 1],  # 213=Москва, 1=Санкт-Петербург (пустой=[]=все регионы)
})
# resp = {"phrases": [{"phrase": "...", "shows": 12345, "words": [...]}, ...]}

# 2. Похожие фразы (подбор ключей)
resp = wordstat("phrasesByWord", {
    "phrase": "it лагерь",
    "regions": [],
    "limit": 50,
})
suggestions = resp["phrases"]  # [{phrase, shows}, ...]

# 3. Динамика по месяцам (seasonality)
resp = wordstat("wordsByPhrasesDynamic", {
    "phrases": ["детский лагерь"],
    "regions": [],
    "granularity": "month",  # month | week
    "dateFrom": "2025-01-01",
    "dateTo": "2026-04-01",
})
# resp = {"phrases": [{"phrase": "...", "dynamic": [{"date": "2025-01", "shows": 8000}, ...]}]}

# 4. Частотность с операторами (как в интерфейсе Wordstat)
# "!лагерь !программирование" — точная форма
# "[лагерь программирование]" — точный порядок
resp = wordstat("wordsByPhrases", {
    "phrases": ["!детский !лагерь", "[лагерь программирование]"],
    "regions": [213],
})

# Практический пример: топ запросов для анализа семантики
def get_keywords_frequency(keywords_list, regions=[213]):
    chunks = [keywords_list[i:i+100] for i in range(0, len(keywords_list), 100)]
    results = {}
    for chunk in chunks:
        resp = wordstat("wordsByPhrases", {"phrases": chunk, "regions": regions})
        for item in resp.get("phrases", []):
            results[item["phrase"]] = item["shows"]
    return results
```

---

### DataForSEO
**Ключи:** `DATAFORSEO_LOGIN`, `DATAFORSEO_KEY`  
**Документация:** https://docs.dataforseo.com/  
**API URL:** `https://api.dataforseo.com/v3/`

> REST API с Basic Auth. Асинхронные задачи: POST task → GET results.  
> Позиции, SERP, keyword data, backlinks, на-page SEO.

```python
import urllib.request, urllib.parse, json, os, base64

def dfs_auth():
    creds = f"{os.environ['DATAFORSEO_LOGIN']}:{os.environ['DATAFORSEO_KEY']}"
    return "Basic " + base64.b64encode(creds.encode()).decode()

def dfs_post(endpoint, body):
    req = urllib.request.Request(
        f"https://api.dataforseo.com/v3/{endpoint}",
        data=json.dumps(body).encode(),
        headers={"Authorization": dfs_auth(), "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def dfs_get(endpoint):
    req = urllib.request.Request(
        f"https://api.dataforseo.com/v3/{endpoint}",
        headers={"Authorization": dfs_auth()}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# 1. SERP — позиции в Google по ключевым словам (асинхронный)
resp = dfs_post("serp/google/organic/task_post", [{
    "keyword": "детский лагерь программирование",
    "location_code": 2643,    # 2643=Russia, 1012840=Москва
    "language_code": "ru",
    "device": "desktop",
    "depth": 10,              # сколько позиций проверить
}])
task_id = resp["tasks"][0]["id"]

# Получить результат (через ~10-30 сек)
result = dfs_get(f"serp/google/organic/task_get/advanced/{task_id}")
positions = result["tasks"][0]["result"][0]["items"]
# [{rank_group, rank_absolute, url, title, description}, ...]

# 2. SERP — мгновенный Live (дороже, но без ожидания)
resp = dfs_post("serp/google/organic/live/advanced", [{
    "keyword": "it лагерь москва 2026",
    "location_code": 1012840,
    "language_code": "ru",
    "device": "mobile",
    "depth": 20,
}])
items = resp["tasks"][0]["result"][0]["items"]

# 3. Keyword data — объём запросов через Google Keyword Planner
resp = dfs_post("keywords_data/google_ads/search_volume/live", [{
    "keywords": ["детский лагерь", "it лагерь", "программирование для детей"],
    "location_code": 2643,
    "language_code": "ru",
    "date_from": "2025-05-01",
    "date_to": "2026-04-01",
}])
kw_data = resp["tasks"][0]["result"]
# [{"keyword":"...", "search_volume":12000, "competition":0.45, "cpc":2.5, "monthly_searches":[...]}]

# 4. Related keywords (семантические подсказки)
resp = dfs_post("keywords_data/google_ads/keywords_for_keywords/live", [{
    "keywords": ["it лагерь"],
    "location_code": 2643,
    "language_code": "ru",
}])

# 5. Позиции нашего сайта (Domain rank tracker)
resp = dfs_post("serp/google/organic/task_post", [{
    "keyword": "айдакемп",
    "location_code": 2643,
    "language_code": "ru",
    "depth": 100,
}])

# 6. On-page SEO аудит
resp = dfs_post("on_page/task_post", [{
    "target": "aidacamp.ru",
    "max_crawl_pages": 100,
    "enable_javascript": True,
}])
task_id = resp["tasks"][0]["id"]
# Позже:
audit = dfs_get(f"on_page/pages?id={task_id}&limit=20")

# 7. Backlinks
resp = dfs_post("backlinks/summary/live", [{
    "target": "aidacamp.ru",
    "include_subdomains": True,
}])
backlink_summary = resp["tasks"][0]["result"][0]
# {total_count, external_links_count, referring_domains, rank}
```

---

### Microsoft Clarity
**Токен:** `CLARITY_TOKEN`  
**MCP:** `mcp__aidacamp-tools__clarity` (предпочтительно)

```python
# Через MCP:
# mcp__aidacamp-tools__clarity(action="sessions", numDays=7)
# mcp__aidacamp-tools__clarity(action="pages", numDays=30)
# mcp__aidacamp-tools__clarity(action="heatmap", url="https://aidacamp.ru")

# Напрямую (Clarity API v1):
import urllib.request, json, os

BASE = "https://www.clarity.ms/api/v1"

def clarity(endpoint, params={}):
    url = f"{BASE}/{endpoint}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {os.environ['CLARITY_TOKEN']}"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

# Ключевые метрики проекта
metrics = clarity("projects/metrics")

# Страницы с наибольшим rage-click
pages = clarity("projects/pages", {"numDays": 30, "sortBy": "rageClicks"})

# Сессии с фильтрами
sessions = clarity("projects/sessions", {
    "numDays": 7,
    "device": "mobile",
    "minScrollDepth": 50,  # прокрутили хотя бы 50%
})
```

---

### Google PageSpeed
**Ключ:** `PAGESPEED_KEY`  
**MCP:** `mcp__aidacamp-tools__pagespeed`

```python
# Через MCP:
# mcp__aidacamp-tools__pagespeed(url="https://aidacamp.ru", strategy="mobile")

import urllib.request, urllib.parse, json, os

def pagespeed(url, strategy="mobile"):
    params = urllib.parse.urlencode({
        "url": url,
        "strategy": strategy,  # mobile | desktop
        "key": os.environ["PAGESPEED_KEY"],
        "category": "performance",  # + accessibility, seo, best-practices
    })
    with urllib.request.urlopen(
        f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?{params}", timeout=30
    ) as r:
        data = json.loads(r.read())

    lhr = data["lighthouseResult"]
    cats = lhr["categories"]
    audits = lhr["audits"]
    return {
        "score": round(cats["performance"]["score"] * 100),
        "lcp": audits["largest-contentful-paint"]["displayValue"],
        "fid": audits["max-potential-fid"]["displayValue"],
        "cls": audits["cumulative-layout-shift"]["displayValue"],
        "fcp": audits["first-contentful-paint"]["displayValue"],
        "ttfb": audits["server-response-time"]["displayValue"],
    }

# Использование:
mobile  = pagespeed("https://aidacamp.ru", "mobile")
desktop = pagespeed("https://aidacamp.ru", "desktop")
```

---

### OpenRouter (LLM)
**Ключ:** `OPENROUTER_KEY`  
**Модели:** `anthropic/claude-3-5-haiku`, `anthropic/claude-sonnet-4-5`, `openai/gpt-4o`, `meta-llama/llama-3-3-70b-instruct`

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

### Telegram Bot
**Токен:** `TELEGRAM_BOT_TOKEN`  
**Основной чат:** `DAILY_DIGEST_CHAT_ID=244314247`

```python
import urllib.request, json, os

def tg_send(text, chat_id=None, parse_mode="HTML", keyboard=None):
    chat_id = chat_id or os.environ.get("DAILY_DIGEST_CHAT_ID", "244314247")
    payload = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
    if keyboard:
        payload["reply_markup"] = {"inline_keyboard": keyboard}
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{os.environ['TELEGRAM_BOT_TOKEN']}/sendMessage",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    urllib.request.urlopen(req, timeout=10)

def tg_photo(photo_url, caption="", chat_id=None):
    chat_id = chat_id or os.environ.get("DAILY_DIGEST_CHAT_ID", "244314247")
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{os.environ['TELEGRAM_BOT_TOKEN']}/sendPhoto",
        data=json.dumps({"chat_id": chat_id, "photo": photo_url, "caption": caption}).encode(),
        headers={"Content-Type": "application/json"}
    )
    urllib.request.urlopen(req, timeout=15)
```

---

### АльфаCRM
**Ключи:** `ALFACRM_API_KEY`, `ALFACRM_HOST`, `ALFACRM_EMAIL`, `ALFACRM_X_APP_KEY`  
**Ветки:** `ALFACRM_BRANCH_CAMP`, `ALFACRM_BRANCH_KODIT`  
**MCP:** `mcp__aidacamp-tools__direct_leads` и другие `direct_*` инструменты

---

### Green API (WhatsApp / Telegram gateway)
**Ключи:** `GREEN_API_WA_ID_INSTANCE` / `GREEN_API_WA_TOKEN` (WA), `GREEN_API_TG_ID_INSTANCE` / `GREEN_API_TG_TOKEN` (TG)

```python
def green_send(phone, message, instance_id, token, channel="wa"):
    chat_id = f"{phone}@c.us" if channel == "wa" else f"{phone}@telegram.org"
    url = f"https://api.green-api.com/waInstance{instance_id}/sendMessage/{token}"
    body = json.dumps({"chatId": chat_id, "message": message}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())
```

---

### Kinescope (видеохостинг)
**Токен:** `KINESCOPE_TOKEN`  
**Документация:** https://kinescope.io/api/

```python
import urllib.request, json, os

def kinescope(method, path, body=None):
    req = urllib.request.Request(
        f"https://api.kinescope.io/v1/{path}",
        data=json.dumps(body).encode() if body else None,
        method=method,
        headers={
            "Authorization": f"Bearer {os.environ['KINESCOPE_TOKEN']}",
            "Content-Type": "application/json",
        }
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

# Список видео
videos = kinescope("GET", "videos?per_page=50")

# Получить embed-ссылку
video = kinescope("GET", "videos/{video_id}")
embed_url = f"https://kinescope.io/{video['id']}"  # iframe src

# Статистика просмотров
stats = kinescope("GET", f"videos/{video_id}/statistics")

---

## 📸 КАТАЛОГ ФОТ0 (Яндекс.Диск + Gemini Vision)

**Скрипт:** `tools/sync_photos_catalog.py` (на сервере)  
**БД:** PostgreSQL таблица `photos_catalog`  
**Обновление:** ручное по требованию (не cron) — `python3 sync_photos_catalog.py`

### Структура источника (Яндекс.Диск)
```
Лучшие фото/
  ├── горизонтальные/     (154 фото)
  └── вертикальные/       (212 фото)
```

### Таблица photos_catalog (PostgreSQL)
```sql
id              SERIAL PRIMARY KEY
filename        VARCHAR(255)        — имя файла
disk_path       TEXT               — путь на Яндекс.Диске
format          VARCHAR(20)        — 'vertical' | 'horizontal'
size_kb         INTEGER            — размер в KB
ai_description  TEXT               — описание от Яндекса
gemini_description TEXT            — анализ Gemini Vision
tags            TEXT[]             — теги: дети, спорт, программирование, эмоции…
use_cases       TEXT[]             — применение: website, ads, social, print
download_url    TEXT               — публичная ссылка
created_at      TIMESTAMP          — дата добавления
updated_at      TIMESTAMP          — дата последнего обновления
```

### Поиск фото в коде
```python
# Из скрипта Python
import psycopg2
conn = psycopg2.connect("dbname=aidacamp_prod user=postgres host=localhost")
cur = conn.cursor()

# По формату
cur.execute("SELECT * FROM photos_catalog WHERE format = %s LIMIT 10", ("vertical",))

# По тегам (array overlap)
cur.execute("SELECT * FROM photos_catalog WHERE tags && %s", (["дети", "спорт"],))

# По use_cases
cur.execute("SELECT * FROM photos_catalog WHERE use_cases && %s", (["website", "ads"],))

# Случайное фото
cur.execute("SELECT * FROM photos_catalog ORDER BY RANDOM() LIMIT 1")

results = cur.fetchall()
conn.close()
```

### Обогащение через Gemini Vision
Анализ каждого фото через `google/gemini-1.5-flash` (OpenRouter):
- **Описание:** что изображено, контекст, эмоции, ценность для лагеря
- **Теги:** автоматически определяются по содержимому
- **Use cases:** рекомендации для применения (веб, реклама, соцсети, печать)
- **Format:** определяется по имени папки (горизонтальная/вертикальная)

**Требуемые окружение переменные:**
- `YADISK_TOKEN` — для доступа к файлам на Яндекс.Диске
- `OPENROUTER_KEY` — для вызова Gemini Vision API

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
