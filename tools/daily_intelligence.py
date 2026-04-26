#!/usr/bin/env python3
"""Daily Intelligence v2 — API-first, без ETL.

Данные рекламы берём НАПРЯМУЮ из API (не из БД):
  - Яндекс.Директ API v5  → активные кампании + расходы + клики
  - Яндекс.Метрика API    → визиты по UTM, заявки, отказы, время
  - VK Ads API            → расходы + клики

Из БД читаем только CRM-данные (решения, гипотезы, активные клиенты).

Usage:
  sudo /opt/aidacamp-tools/run_daily_intelligence.sh          # production
  sudo /opt/aidacamp-tools/run_daily_intelligence.sh --dry    # print, don't send
Деплой: /opt/aidacamp-tools/daily_intelligence.py
"""
import json, os, re, sys, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timedelta, date
import psycopg2, psycopg2.extras

# ── Загрузка токенов ──────────────────────────────────────────────────────────
def load_env():
    for path in ["/opt/aidacamp-tools/.env",
                 "/etc/systemd/system/crm-panel-api.service.d/env.conf"]:
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
ANTHROPIC_KEY   = (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_KEY", "")).strip()
OPENROUTER_KEY  = os.environ.get("OPENROUTER_KEY", "").strip()
BOT_TOKEN       = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
CHAT_ID         = os.environ.get("DAILY_DIGEST_CHAT_ID", "244314247").strip()

DRY      = "--dry"        in sys.argv
FORCE_OR = "--openrouter" in sys.argv

if not (ANTHROPIC_KEY or OPENROUTER_KEY):
    sys.stderr.write("no LLM key\n"); sys.exit(2)

ANTHROPIC_MODEL  = "claude-haiku-4-5"
OPENROUTER_MODEL = "anthropic/claude-3.5-haiku"

# ── Даты ─────────────────────────────────────────────────────────────────────
def msk_date(offset_days=0):
    return (datetime.utcnow() + timedelta(hours=3) - timedelta(days=offset_days)).strftime("%Y-%m-%d")

YESTERDAY  = msk_date(1)
DAY_BEFORE = msk_date(2)

# ── Яндекс.Директ API ─────────────────────────────────────────────────────────
def direct_request(method, body):
    req = urllib.request.Request(
        f"https://api.direct.yandex.com/json/v5/{method}",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {DIRECT_TOKEN}",
            "Client-Login": DIRECT_LOGIN,
            "Content-Type": "application/json; charset=utf-8",
            "Accept-Language": "ru",
        }
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_direct_campaigns():
    """Все кампании с пагинацией. Возвращает (активные, все)."""
    all_camps, offset = [], 0
    while True:
        resp = direct_request("campaigns", {
            "method": "get",
            "params": {
                "SelectionCriteria": {},
                "FieldNames": ["Id", "Name", "Status", "State", "DailyBudget"],
                "Page": {"Limit": 100, "Offset": offset}
            }
        })
        batch = resp.get("result", {}).get("Campaigns", [])
        all_camps.extend(batch)
        if len(batch) < 100: break
        offset += 100
    active = [c for c in all_camps if c.get("State") == "ON"]
    return active, all_camps

def get_direct_spend(date_from, date_to):
    """Расходы через Reports API. Возвращает (cost_rub, clicks)."""
    body = {"params": {
        "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
        "FieldNames": ["CampaignName", "Clicks", "Impressions", "Cost"],
        "ReportName": f"daily_intel_{date_from}_{date_to}",
        "ReportType": "CAMPAIGN_PERFORMANCE_REPORT",
        "DateRangeType": "CUSTOM_DATE",
        "Format": "TSV",
        "IncludeVAT": "NO",
        "IncludeDiscount": "NO",
    }}
    req = urllib.request.Request(
        "https://api.direct.yandex.com/json/v5/reports",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {DIRECT_TOKEN}",
            "Client-Login": DIRECT_LOGIN,
            "Content-Type": "application/json",
            "processingMode": "auto",
            "skipReportHeader": "true",
            "skipColumnHeader": "false",
            "skipReportSummary": "true",
        }
    )
    total_cost, total_clicks = 0, 0
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            lines = r.read().decode("utf-8").strip().split("\n")
        for line in lines[1:]:  # skip header
            parts = line.split("\t")
            if len(parts) >= 4:
                try:
                    total_cost   += int(parts[3]) // 1_000_000  # микрорубли → рубли
                    total_clicks += int(parts[1])
                except Exception:
                    pass
    except urllib.error.HTTPError as e:
        if e.code in (201, 202):
            return None, None  # отчёт ещё генерируется
    return total_cost, total_clicks

# ── Яндекс.Метрика API ────────────────────────────────────────────────────────
def metrika_get(params_dict):
    params = urllib.parse.urlencode(params_dict)
    req = urllib.request.Request(
        f"https://api-metrika.yandex.net/stat/v1/data?{params}",
        headers={"Authorization": f"OAuth {METRIKA_TOKEN}"}
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

def get_metrika_traffic(date):
    """Визиты по UTM-источнику + показатели качества."""
    try:
        data = metrika_get({
            "ids": METRIKA_COUNTER,
            "dimensions": "ym:s:UTMSource",
            "metrics": "ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:avgVisitDurationSeconds",
            "date1": date, "date2": date,
            "limit": 50,
        })
        result = {"total": 0, "by_source": {}, "bounce": 0, "duration": 0}
        for row in data.get("data", []):
            src    = (row["dimensions"][0].get("name") or "").lower() or "direct/none"
            vals   = row["metrics"]
            visits = int(vals[0]) if vals else 0
            result["total"] += visits
            result["by_source"][src] = visits
            if not result["bounce"] and len(vals) > 2:
                result["bounce"]   = round(float(vals[2]), 1)
                result["duration"] = int(float(vals[3])) if len(vals) > 3 else 0
        totals = data.get("totals", [])
        if totals and totals[0]:
            result["total"] = int(totals[0])
        return result
    except Exception as e:
        print(f"metrika traffic err: {e}")
        return {"total": 0, "by_source": {}, "bounce": 0, "duration": 0}

_METRIKA_GOALS_CACHE = None  # {name: goal_id}

# Hardcoded fallback — ID цели «Отправка заявки-new» для счётчика 96499295
_METRIKA_GOALS_FALLBACK = {
    "Отправка заявки-new": 541048197,
    "Выбор возраста-new":  541048270,
    "Клик в Telegram-new": 541048649,
}

def get_metrika_goal_ids():
    """Получить список целей счётчика (кэшируется на сессию).
    Fallback на hardcoded если management API недоступен.
    """
    global _METRIKA_GOALS_CACHE
    if _METRIKA_GOALS_CACHE is not None:
        return _METRIKA_GOALS_CACHE
    try:
        req = urllib.request.Request(
            f"https://api-metrika.yandex.net/management/v1/counter/{METRIKA_COUNTER}/goals",
            headers={"Authorization": f"OAuth {METRIKA_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        fetched = {g["name"]: g["id"] for g in data.get("goals", [])}
        _METRIKA_GOALS_CACHE = fetched if fetched else _METRIKA_GOALS_FALLBACK
    except Exception as e:
        print(f"metrika goals list err: {e} — using fallback")
        _METRIKA_GOALS_CACHE = _METRIKA_GOALS_FALLBACK
    return _METRIKA_GOALS_CACHE

def get_metrika_leads(date):
    """Заявки за дату — ym:s:goal<ID>reaches для цели «Отправка заявки-new»."""
    goal_ids = get_metrika_goal_ids()
    # Найти ID цели-заявки
    lead_id = None
    for name, gid in goal_ids.items():
        if "заявк" in name.lower() or "form" in name.lower():
            lead_id = gid
            break
    if not lead_id:
        return {}
    try:
        data = metrika_get({
            "ids": METRIKA_COUNTER,
            "metrics": f"ym:s:goal{lead_id}reaches",
            "date1": date, "date2": date,
            "limit": 1,
        })
        totals = data.get("totals", [0])
        goal_name = next((n for n, gid in goal_ids.items() if gid == lead_id), "Заявка")
        return {goal_name: int(totals[0])} if totals else {}
    except Exception as e:
        print(f"metrika leads err: {e}")
        return {}

# Алиас для совместимости с вызовами
def get_metrika_goals(date):
    return get_metrika_leads(date)

def pick_lead_goal(goals_dict):
    """Выбрать нужную цель — ищем «заявку»."""
    for key in goals_dict:
        if "заявк" in key.lower() or "form" in key.lower() or "submit" in key.lower():
            return key, goals_dict[key]
    if goals_dict:
        best = max(goals_dict, key=lambda k: goals_dict[k])
        return best, goals_dict[best]
    return "—", 0

# ── VK Ads API ────────────────────────────────────────────────────────────────
def get_vk_stats(date):
    """Статистика VK за дату. Возвращает (spend, clicks)."""
    if not VK_TOKEN or not VK_ACCOUNT_ID:
        return None, None
    params = urllib.parse.urlencode({
        "access_token": VK_TOKEN,
        "account_id":   VK_ACCOUNT_ID,
        "ids_type":     "account",
        "ids":          VK_ACCOUNT_ID,
        "period":       "day",
        "date_from":    date,
        "date_to":      date,
        "v":            "5.131",
    })
    try:
        with urllib.request.urlopen(
            f"https://api.vk.com/method/ads.getStatistics?{params}", timeout=20
        ) as r:
            data = json.loads(r.read())
        stats = data.get("response", [{}])[0].get("stats", [{}])
        s = stats[0] if stats else {}
        return int(float(s.get("spent", 0))), int(s.get("clicks", 0))
    except Exception as e:
        print(f"vk err: {e}")
        return None, None

# ── CRM данные из БД ──────────────────────────────────────────────────────────
SQL_CRM = """
WITH
recent_decisions AS (
  SELECT STRING_AGG(
    title || COALESCE(' — ' || rationale, '') || ' (' || made_at::date::text || ')',
    E'\\n' ORDER BY made_at DESC) AS txt
  FROM ai_decisions
  WHERE made_at >= NOW() - INTERVAL '14 days'
),
recent_hypotheses AS (
  SELECT STRING_AGG('• ' || COALESCE(title || ': ', '') || text,
    E'\\n' ORDER BY created_at DESC) AS txt
  FROM (
    SELECT title, text, created_at FROM ai_hypotheses
    WHERE status IN ('testing','proposed') ORDER BY created_at DESC LIMIT 5
  ) x
),
prefs AS (
  SELECT STRING_AGG(key || ': ' || value, E'\\n') AS txt
  FROM ai_user_preferences
),
hot_clients AS (
  SELECT json_agg(row_to_json(h)) AS data FROM (
    SELECT c.name, c.phone, MAX(d.ts) last_msg, COUNT(d.id) msg_count
    FROM ai_customers c
    JOIN ai_dialogs d ON d.customer_id = c.id
    WHERE d.ts >= NOW() - INTERVAL '3 days' AND d.direction = 'in'
    GROUP BY c.id, c.name, c.phone
    ORDER BY last_msg DESC LIMIT 5
  ) h
)
SELECT
  COALESCE(rd.txt, 'нет') AS recent_decisions,
  COALESCE(rh.txt, 'нет') AS active_hypotheses,
  COALESCE(pr.txt, 'нет') AS user_preferences,
  hc.data                  AS hot_clients
FROM recent_decisions rd, recent_hypotheses rh, prefs pr, hot_clients hc;
"""

def get_crm_context():
    try:
        conn = psycopg2.connect(dbname="aidacamp", user="postgres")
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(SQL_CRM)
        row = cur.fetchone()
        cur.close(); conn.close()
        return row or {}
    except Exception as e:
        print(f"crm db err: {e}")
        return {}

def budget_from_prefs(prefs_txt):
    b_direct, b_vk = 30000, 15000
    md = re.search(r"weekly_budget_direct:\s*(\d+)", prefs_txt or "")
    mv = re.search(r"weekly_budget_vk:\s*(\d+)", prefs_txt or "")
    if md: b_direct = int(md.group(1))
    if mv: b_vk     = int(mv.group(1))
    return b_direct, b_vk

# ── LLM ──────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Ты — операционный аналитик детского IT-лагеря АйДаКемп и школы программирования АйДаКодить.

Проекты:
- АйДаКемп (aidacamp.ru): летний лагерь, июнь-август, чек ~65 000₽, CAC цель ≤6 000₽
- АйДаКодить (codims.ru): школа программирования, сентябрь-май, чек ~15 000₽/мес

Данные рекламы — РЕАЛЬНЫЕ из API (не кэш, не БД). Если активных кампаний > 0 — они работают.

Правила:
1. Опирайся ТОЛЬКО на данные из блока ДАННЫЕ — не выдумывай
2. Если причина неясна → задай 1-2 коротких вопроса в "questions" (ответ за 5 сек)
3. Предлагай действия только когда уверен в причине
4. Будь краток: ≤25 строк

Формат — строго JSON:
{
  "summary": "1-2 предложения что происходит (факты, не оценки)",
  "signals": ["факт 1", "факт 2", "факт 3"],
  "actions": [
    {"title": "Название", "why": "Почему", "how": "Конкретно что сделать", "urgency": "сегодня|завтра|неделя"}
  ],
  "questions": ["вопрос только если причина неясна"]
}"""

def call_anthropic(user_msg):
    body = {"model": ANTHROPIC_MODEL, "max_tokens": 1024,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_msg}]}
    req = urllib.request.Request("https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "x-api-key": ANTHROPIC_KEY,
                 "anthropic-version": "2023-06-01"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())["content"][0]["text"]

def call_openrouter(user_msg):
    body = {"model": OPENROUTER_MODEL, "max_tokens": 1024,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT},
                         {"role": "user",   "content": user_msg}]}
    req = urllib.request.Request("https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {OPENROUTER_KEY}",
                 "HTTP-Referer": "https://aidacamp.ru"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]

def llm(user_msg):
    if FORCE_OR and OPENROUTER_KEY: return call_openrouter(user_msg)
    if not ANTHROPIC_KEY:           return call_openrouter(user_msg)
    try:
        return call_anthropic(user_msg)
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:400]
        if "credit balance" in body.lower() and OPENROUTER_KEY:
            return call_openrouter(user_msg)
        raise

# ── Утилиты форматирования ────────────────────────────────────────────────────
def delta(cur, prev):
    if not prev: return ""
    pct = round((cur - prev) / prev * 100)
    return f" (+{pct}%)" if pct > 0 else f" ({pct}%)"

def cpa(spend, leads):
    if not leads: return "—"
    return f"{round(spend / leads)}₽"

def fmt_dur(sec):
    if not sec: return "—"
    return f"{sec // 60}м {sec % 60}с"

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    yd = YESTERDAY
    db = DAY_BEFORE
    print(f"Daily Intelligence v2: {yd} vs {db}")

    # ── 1. Директ ──
    active_camps, all_camps = get_direct_campaigns()
    n_active = len(active_camps)
    print(f"Direct: {n_active} активных из {len(all_camps)}")

    cost_yd, clicks_yd = get_direct_spend(yd, yd)
    cost_db, clicks_db = get_direct_spend(db, db)
    print(f"Direct spend: вчера={cost_yd}₽ ({clicks_yd} кл), позавчера={cost_db}₽ ({clicks_db} кл)")

    # ── 2. Метрика — трафик ──
    traffic_yd = get_metrika_traffic(yd)
    traffic_db = get_metrika_traffic(db)
    print(f"Metrika visits: вчера={traffic_yd['total']}, позавчера={traffic_db['total']}")

    # ── 3. Метрика — заявки ──
    goals_yd = get_metrika_goals(yd)
    goals_db = get_metrika_goals(db)
    goal_name, leads_yd = pick_lead_goal(goals_yd)
    _,         leads_db = pick_lead_goal(goals_db)
    print(f"Metrika leads ({goal_name}): вчера={leads_yd}, позавчера={leads_db}")

    # ── 4. VK ──
    vk_spend_yd, vk_clicks_yd = get_vk_stats(yd)
    vk_spend_db, _            = get_vk_stats(db)
    print(f"VK spend: вчера={vk_spend_yd}₽ ({vk_clicks_yd} кл), позавчера={vk_spend_db}₽")

    # ── 5. CRM из БД ──
    crm        = get_crm_context()
    prefs_txt  = crm.get("user_preferences", "") or ""
    recent_dec = crm.get("recent_decisions", "нет") or "нет"
    active_hyp = crm.get("active_hypotheses", "нет") or "нет"
    hot_clients = crm.get("hot_clients") or []

    b_direct, b_vk = budget_from_prefs(prefs_txt)
    daily_plan = round((b_direct + b_vk) / 7)

    total_spend_yd = (cost_yd or 0) + (vk_spend_yd or 0)
    total_spend_db = (cost_db or 0) + (vk_spend_db or 0)

    # ── 6. Блок данных для Claude ──
    src        = traffic_yd.get("by_source", {})
    vis_yandex = src.get("yandex", src.get("direct", 0))
    vis_vk     = src.get("vk", src.get("vk_ads", 0))
    vis_organic = traffic_yd["total"] - vis_yandex - vis_vk

    hot_str = "—"
    if hot_clients:
        hot_str = "\n".join(
            f"  • {c.get('name') or c.get('phone','?')} — {c.get('msg_count',0)} сообщ"
            for c in hot_clients)

    camps_str = ", ".join(c.get("Name", "?") for c in active_camps[:5])
    if len(active_camps) > 5:
        camps_str += f" и ещё {len(active_camps)-5}"

    data_block = (
        f"ДАННЫЕ ЗА {yd} (реальные, из API):\n\n"
        f"📊 ЯНДЕКС.ДИРЕКТ:\n"
        f"  Активных кампаний: {n_active} из {len(all_camps)} ({camps_str or '—'})\n"
        f"  Расходы: {cost_yd}₽{delta(cost_yd or 0, cost_db or 0)} | Клики: {clicks_yd}{delta(clicks_yd or 0, clicks_db or 0)}\n"
        f"  CPC: {round((cost_yd or 0) / max(clicks_yd or 1, 1))}₽\n\n"
        f"📘 VK ADS:\n"
        f"  Расходы: {vk_spend_yd}₽{delta(vk_spend_yd or 0, vk_spend_db or 0)} | Клики: {vk_clicks_yd}\n\n"
        f"  Итого расход: {total_spend_yd}₽{delta(total_spend_yd, total_spend_db)} / план ~{daily_plan}₽/день\n\n"
        f"🌐 ТРАФИК (Метрика):\n"
        f"  Всего визитов: {traffic_yd['total']}{delta(traffic_yd['total'], traffic_db['total'])}\n"
        f"  Яндекс: {vis_yandex} | VK: {vis_vk} | Органика: {vis_organic}\n"
        f"  Отказы: {traffic_yd['bounce']}% | Время: {fmt_dur(traffic_yd['duration'])}\n\n"
        f"🎯 ЗАЯВКИ (цель «{goal_name}»):\n"
        f"  Вчера: {leads_yd}{delta(leads_yd, leads_db)} | CPA: {cpa(total_spend_yd, leads_yd)}\n\n"
        f"📬 АКТИВНЫЕ КЛИЕНТЫ (3 дня):\n{hot_str}\n\n"
        f"📋 КОНТЕКСТ:\n"
        f"Решения (14д):\n{recent_dec}\n\n"
        f"Гипотезы:\n{active_hyp}\n\n"
        f"Предпочтения:\n{prefs_txt}"
    )

    # ── 7. LLM ──
    raw = llm(data_block)
    j0, j1 = raw.find("{"), raw.rfind("}")
    if j0 == -1 or j1 == -1:
        print(f"LLM no JSON. Raw: {raw[:400]}", file=sys.stderr); sys.exit(3)
    analysis = json.loads(raw[j0:j1+1])

    summary   = analysis.get("summary", "")
    signals   = analysis.get("signals", [])
    actions   = analysis.get("actions", [])
    questions = analysis.get("questions", [])

    msg  = f"📊 *Дэйли {yd}*\n\n{summary}\n"
    if signals:
        msg += "\n*Сигналы:*\n" + "".join(f"• {s}\n" for s in signals)
    if actions:
        msg += "\n*Действия:*\n"
        for a in actions:
            urg = {"сегодня": "🔴", "завтра": "🟡", "неделя": "🟢"}.get(a.get("urgency",""), "🟢")
            msg += f"\n{urg} *{a.get('title','')}*\n_{a.get('why','')}_\n→ {a.get('how','')}\n"
    if questions:
        msg += "\n*❓ Уточни:*\n" + "".join(f"• {q}\n" for q in questions)
    msg += f"\n_Расход: {total_spend_yd}₽ | Заявок: {leads_yd} | Direct active: {n_active}_"

    keyboard = []
    for i, a in enumerate(actions):
        keyboard.append([
            {"text": f"✅ {i+1} Принято", "callback_data": f"fb:daily_{yd}:{i}:accept"},
            {"text": "❌ Не то",           "callback_data": f"fb:daily_{yd}:{i}:reject"},
        ])
    keyboard.append([{"text": "💬 Задать вопрос", "callback_data": f"fb:daily_{yd}:q:ask"}])

    if DRY:
        print("=== TELEGRAM MESSAGE ===")
        print(msg)
        print("\n=== DATA BLOCK ===")
        print(data_block)
        return

    # ── 8. Отправка в Telegram ──
    if BOT_TOKEN:
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            data=json.dumps({
                "chat_id": CHAT_ID, "text": msg, "parse_mode": "Markdown",
                "reply_markup": {"inline_keyboard": keyboard},
            }).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
            if not resp.get("ok"):
                print(f"Telegram err: {resp}", file=sys.stderr)

    # ── 9. Сохранение в БД ──
    try:
        conn = psycopg2.connect(dbname="aidacamp", user="postgres")
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO ai_conversations (thread_id, project, messages, status)
            VALUES (%s, 'aidacamp', %s::jsonb, 'open')
        """, (f"daily_{yd}", json.dumps([{
            "role": "system", "kind": "daily_digest",
            "report_date": yd, "analysis": analysis,
            "metrics_summary": {
                "total_spend": total_spend_yd,
                "direct_spend": cost_yd, "vk_spend": vk_spend_yd,
                "total_leads": leads_yd, "n_active_campaigns": n_active,
            },
        }], ensure_ascii=False)))
        conn.commit(); cur.close(); conn.close()
    except Exception as e:
        print(f"DB save err: {e}")

    print(f"✅ Daily digest sent for {yd}: {len(actions)} actions, {n_active} active campaigns")

if __name__ == "__main__":
    main()
