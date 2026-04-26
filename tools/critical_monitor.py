#!/usr/bin/env python3
"""Critical Monitor v3 — API-first, без ETL.

Все данные берём напрямую из API:
  - Яндекс.Директ API v5  → статус кампаний + расходы
  - Яндекс.Метрика API    → лиды (цели)
  - VK Ads API            → расходы VK

Никакой локальной БД для рекламных данных — только live.

Cron: каждые 3 часа (см. crontab). Тихий режим 21:00–08:00 МСК.
Деплой: /opt/aidacamp-tools/critical_monitor.py
"""
import json, os, sys, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timedelta

try:
    from zoneinfo import ZoneInfo
    MSK = ZoneInfo("Europe/Moscow")
except Exception:
    MSK = None

# ── Конфиг ────────────────────────────────────────────────────────────────────
ENV_FILE = "/etc/systemd/system/crm-panel-api.service.d/env.conf"
def load_env():
    # Приоритет: etl/.env (канон токенов), затем systemd env
    for path in ["/opt/aidacamp-tools/.env", ENV_FILE]:
        try:
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"): continue
                    if line.startswith("Environment="):
                        payload = line[len("Environment="):].strip('"')
                        for kv in payload.split():
                            if "=" in kv:
                                k, v = kv.split("=", 1)
                                os.environ.setdefault(k, v)
                    elif "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k, v)
        except Exception:
            pass

load_env()

DIRECT_TOKEN    = os.environ.get("DIRECT_TOKEN", "")
DIRECT_LOGIN    = os.environ.get("DIRECT_LOGIN", "kv145")
METRIKA_TOKEN   = os.environ.get("METRIKA_TOKEN", "")
METRIKA_COUNTER = os.environ.get("METRIKA_COUNTER", "96499295")
VK_TOKEN        = os.environ.get("VK_TOKEN", "")
VK_ACCOUNT_ID   = os.environ.get("VK_ACCOUNT_ID", "")
BOT_TOKEN       = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID         = os.environ.get("DAILY_DIGEST_CHAT_ID", "244314247")
OPENROUTER_KEY  = os.environ.get("OPENROUTER_KEY", "")

DRY   = "--dry"   in sys.argv
FORCE = "--force" in sys.argv

QUIET_START, QUIET_END = 21, 8

def msk_hour():
    if MSK:
        return datetime.now(MSK).hour
    return (datetime.utcnow().hour + 3) % 24

def is_quiet(h):
    return h >= QUIET_START or h < QUIET_END

def yesterday():
    return (datetime.utcnow() + timedelta(hours=3) - timedelta(days=1)).strftime("%Y-%m-%d")

def day_before():
    return (datetime.utcnow() + timedelta(hours=3) - timedelta(days=2)).strftime("%Y-%m-%d")

# ── Direct API ────────────────────────────────────────────────────────────────
def direct_request(method, body):
    url = f"https://api.direct.yandex.com/json/v5/{method}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Bearer {DIRECT_TOKEN}",
        "Client-Login": DIRECT_LOGIN,
        "Content-Type": "application/json; charset=utf-8",
        "Accept-Language": "ru",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_active_campaigns():
    """Возвращает список активных кампаний (State=ON) с пагинацией."""
    all_camps = []
    offset = 0
    while True:
        resp = direct_request("campaigns", {
            "method": "get",
            "params": {
                "SelectionCriteria": {},
                "FieldNames": ["Id", "Name", "Status", "State"],
                "Page": {"Limit": 100, "Offset": offset}
            }
        })
        batch = resp.get("result", {}).get("Campaigns", [])
        all_camps.extend(batch)
        if len(batch) < 100:
            break
        offset += 100
    return all_camps

def get_direct_spend(date_from, date_to):
    """Расходы Директа за период через Reports API."""
    body = {
        "params": {
            "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
            "FieldNames": ["CampaignName", "Clicks", "Impressions", "Cost"],
            "ReportName": f"monitor_{date_from}",
            "ReportType": "CAMPAIGN_PERFORMANCE_REPORT",
            "DateRangeType": "CUSTOM_DATE",
            "Format": "TSV",
            "IncludeVAT": "NO",
            "IncludeDiscount": "NO",
        }
    }
    url = "https://api.direct.yandex.com/json/v5/reports"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Bearer {DIRECT_TOKEN}",
        "Client-Login": DIRECT_LOGIN,
        "Content-Type": "application/json",
        "processingMode": "auto",
        "skipReportHeader": "true",
        "skipColumnHeader": "false",
        "skipReportSummary": "true",
    })
    total_cost, total_clicks = 0, 0
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            lines = r.read().decode("utf-8").strip().split("\n")
        # header line first
        for line in lines[1:]:
            parts = line.split("\t")
            if len(parts) >= 4:
                try:
                    total_cost   += int(parts[3]) // 1_000_000  # микрорубли → рубли
                    total_clicks += int(parts[1])
                except Exception:
                    pass
    except urllib.error.HTTPError as e:
        if e.code in (201, 202):
            return None, None  # отчёт генерируется, пропускаем
    return total_cost, total_clicks

# ── Metrika API ───────────────────────────────────────────────────────────────
# Цели Метрики нельзя запрашивать через dimension goalName + metric reaches (400).
# Правильный способ: /management/v1/counter/{id}/goals → узнаём goal_id → ym:s:goal<id>reaches
LEAD_GOAL_NAME = "Отправка заявки-new"
LEAD_GOAL_ID   = None  # будет заполнен при первом вызове
# Hardcoded fallback — ID цели для счётчика 96499295
_LEAD_GOAL_ID_FALLBACK = 541048197

def _get_lead_goal_id():
    global LEAD_GOAL_ID
    if LEAD_GOAL_ID:
        return LEAD_GOAL_ID
    try:
        req = urllib.request.Request(
            f"https://api-metrika.yandex.net/management/v1/counter/{METRIKA_COUNTER}/goals",
            headers={"Authorization": f"OAuth {METRIKA_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        for g in data.get("goals", []):
            if g["name"] == LEAD_GOAL_NAME:
                LEAD_GOAL_ID = g["id"]
                return LEAD_GOAL_ID
        for g in data.get("goals", []):
            if "заявк" in g["name"].lower():
                LEAD_GOAL_ID = g["id"]
                return LEAD_GOAL_ID
    except Exception as e:
        print(f"metrika goal lookup err: {e} — using fallback id={_LEAD_GOAL_ID_FALLBACK}")
    LEAD_GOAL_ID = _LEAD_GOAL_ID_FALLBACK
    return LEAD_GOAL_ID

def get_metrika_leads(date):
    """Заявки за дату через goal-specific метрику ym:s:goal<ID>reaches."""
    goal_id = _get_lead_goal_id()
    if not goal_id:
        return None
    params = urllib.parse.urlencode({
        "ids": METRIKA_COUNTER,
        "metrics": f"ym:s:goal{goal_id}reaches",
        "date1": date, "date2": date,
        "limit": 1,
    })
    req = urllib.request.Request(
        f"https://api-metrika.yandex.net/stat/v1/data?{params}",
        headers={"Authorization": f"OAuth {METRIKA_TOKEN}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        totals = data.get("totals", [0])
        return int(totals[0]) if totals else 0
    except Exception as e:
        print(f"metrika leads err: {e}")
        return None

# ── VK API ────────────────────────────────────────────────────────────────────
def get_vk_spend(date):
    if not VK_TOKEN or not VK_ACCOUNT_ID:
        return None
    params = urllib.parse.urlencode({
        "access_token": VK_TOKEN,
        "account_id": VK_ACCOUNT_ID,
        "ids_type": "account",
        "ids": VK_ACCOUNT_ID,
        "period": "day",
        "date_from": date,
        "date_to": date,
        "v": "5.131",
    })
    url = f"https://api.vk.com/method/ads.getStatistics?{params}"
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            data = json.loads(r.read())
        stats = data.get("response", [{}])[0].get("stats", [{}])
        spent = stats[0].get("spent", 0) if stats else 0
        return int(float(spent))
    except Exception:
        return None

# ── Claude / OpenRouter ───────────────────────────────────────────────────────
def ask_claude(system, user_msg):
    body = json.dumps({
        "model": "anthropic/claude-3-5-haiku",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_msg},
        ],
        "max_tokens": 400,
        "temperature": 0.3,
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aidacamp.ru",
        }
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read())
    return resp["choices"][0]["message"]["content"].strip()

# ── Telegram ──────────────────────────────────────────────────────────────────
def tg_send(text):
    if DRY:
        print("DRY:", text)
        return
    body = json.dumps({"chat_id": CHAT_ID, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        data=body,
        headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"tg err: {e}")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    h = msk_hour()
    if is_quiet(h) and not FORCE:
        print(f"quiet hour {h}, skip")
        return

    yd = yesterday()
    db = day_before()

    print(f"Fetching data: yesterday={yd}, day_before={db}")

    # 1. Активные кампании — РЕАЛЬНЫЙ статус из API
    campaigns = get_active_campaigns()
    active = [c for c in campaigns if c.get("State") == "ON"]
    n_active = len(active)
    print(f"Direct: {n_active} активных кампаний из {len(campaigns)}")

    # 2. Расходы вчера и позавчера
    cost_yd, clicks_yd = get_direct_spend(yd, yd)
    cost_db, clicks_db = get_direct_spend(db, db)
    print(f"Direct spend: вчера={cost_yd}₽ ({clicks_yd} кл), позавчера={cost_db}₽ ({clicks_db} кл)")

    # 3. Лиды Метрика — через goal-specific метрику (без dimension)
    leads_yd = get_metrika_leads(yd)
    leads_db = get_metrika_leads(db)
    print(f"Metrika leads ({LEAD_GOAL_NAME}): вчера={leads_yd}, позавчера={leads_db}")

    # 4. VK расходы
    vk_yd = get_vk_spend(yd)
    vk_db = get_vk_spend(db)
    print(f"VK spend: вчера={vk_yd}₽, позавчера={vk_db}₽")

    # ── Собираем контекст для Claude ──────────────────────────────────────────
    def pct(a, b):
        if not b: return None
        return round((a - b) / b * 100)

    direct_pct  = pct(cost_yd or 0, cost_db or 1)
    leads_pct   = pct(leads_yd or 0, leads_db or 1) if leads_db else None
    vk_pct      = pct(vk_yd or 0, vk_db or 1) if vk_db else None

    data_block = f"""ДАННЫЕ (реальные, из API, не кэш):
Дата: {yd} vs {db}

Яндекс.Директ:
  Активных кампаний прямо сейчас: {n_active} (из {len(campaigns)} всего)
  Расходы вчера: {cost_yd}₽ | позавчера: {cost_db}₽ | Δ={direct_pct}%
  Клики вчера: {clicks_yd} | позавчера: {clicks_db}

Метрика (лиды):
  Вчера: {leads_yd} | позавчера: {leads_db} | Δ={leads_pct}%

VK Ads:
  Расходы вчера: {vk_yd}₽ | позавчера: {vk_db}₽ | Δ={vk_pct}%"""

    system_prompt = """Ты аналитик рекламы детского лагеря АйДаКемп.
Получаешь РЕАЛЬНЫЕ данные из API (не из БД, не кэш).

ПРАВИЛА:
1. Если активных кампаний > 0 — НИКОГДА не пиши «кампании остановлены» или «все в архиве»
2. Пиши ТОЛЬКО если есть реальная аномалия: расходы упали >50% И лиды упали >50%
3. Если всё в норме — верни пустую строку (ничего не слать)
4. Максимум 5 строк, только действия с глаголами
5. Формат: эмодзи + факт + конкретное действие
6. Без «проверьте», «возможно», «рекомендуется» — только конкретика"""

    user_msg = data_block + "\n\nЕсть ли реальные аномалии требующие действий? Если нет — пустая строка."

    try:
        reply = ask_claude(system_prompt, user_msg).strip()
    except Exception as e:
        print(f"Claude error: {e}")
        return

    print(f"Claude reply: {repr(reply)}")

    if reply:
        date_label = datetime.now().strftime("%Y-%m-%d %H:%M МСК")
        tg_send(f"📊 Мониторинг {date_label}\n\n{reply}")
        print("✅ sent")
    else:
        print("✅ no anomaly, silent")

if __name__ == "__main__":
    main()
