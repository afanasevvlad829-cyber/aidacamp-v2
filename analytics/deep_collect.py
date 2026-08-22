#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Deep conversion analysis — фаза 1: сбор данных.
Метрика (дневной ряд + по источникам), АльфаCRM (даты лидов), погода Москва,
Wordstat (спрос рынка), курс USD ЦБ. Всё в /opt/aidacamp-tools/analytics/deep/
"""
import os, json, urllib.request, urllib.parse, time, sys
import xml.etree.ElementTree as ET

OUT = "/opt/aidacamp-tools/analytics/deep"
os.makedirs(OUT, exist_ok=True)

with open("/opt/aidacamp-tools/etl/.env") as f:
    for line in f:
        if line.strip() and not line.startswith("#") and "=" in line:
            k, v = line.strip().split("=", 1)
            os.environ.setdefault(k, v.strip().strip('"'))

DATE1, DATE2 = "2026-01-01", "2026-07-11"
COUNTER = os.environ.get("METRIKA_COUNTER", "96499295")
MTOKEN = os.environ["METRIKA_TOKEN"]

def http_json(url, headers=None, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def save(name, obj):
    with open(f"{OUT}/{name}", "w") as f:
        json.dump(obj, f, ensure_ascii=False)
    print(f"[saved] {name}")

# ---------- 1. МЕТРИКА ----------
def metrika(dimensions, metrics, filters="", limit=10000):
    p = {"ids": COUNTER, "metrics": ",".join(metrics),
         "date1": DATE1, "date2": DATE2, "limit": limit, "accuracy": "full"}
    if dimensions: p["dimensions"] = ",".join(dimensions)
    if filters: p["filters"] = filters
    return http_json(
        f"https://api-metrika.yandex.net/stat/v1/data?{urllib.parse.urlencode(p)}",
        headers={"Authorization": f"OAuth {MTOKEN}"})

try:
    goals = http_json(
        f"https://api-metrika.yandex.net/management/v1/counter/{COUNTER}/goals",
        headers={"Authorization": f"OAuth {MTOKEN}"})["goals"]
    save("goals.json", goals)
    def gid(*words):
        for g in goals:
            n = g["name"].lower()
            if all(w in n for w in words): return g["id"]
        return None
    G = {"form": gid("заявк") or gid("form"),
         "phone": gid("phone") or gid("телефон"),
         "wa": gid("whatsapp"), "tg": gid("telegram")}
    print("goal ids:", G)
    gm = [f"ym:s:goal{v}reaches" for v in G.values() if v]
    base = ["ym:s:visits","ym:s:users","ym:s:bounceRate",
            "ym:s:avgVisitDurationSeconds","ym:s:pageDepth"]
    d = metrika(["ym:s:date"], base + gm)
    save("metrika_daily.json", {"goal_map": G, "query": d["query"]["metrics"], "data": d["data"]})

    # дневной ряд по источникам трафика (визиты + форма)
    d2 = metrika(["ym:s:date","ym:s:lastTrafficSource"],
                 ["ym:s:visits", f"ym:s:goal{G['form']}reaches"] if G['form'] else ["ym:s:visits"])
    save("metrika_daily_by_source.json", d2["data"])
except Exception as e:
    print("METRIKA ERROR:", e)

# ---------- 2. АЛЬФАCRM — даты лидов ----------
try:
    host = os.environ["ALFACRM_HOST"].rstrip("/")
    if not host.startswith("http"): host = "https://" + host
    auth = http_json(f"{host}/v2api/auth/login",
        headers={"Content-Type": "application/json"},
        data=json.dumps({"email": os.environ["ALFACRM_EMAIL"],
                         "api_key": os.environ["ALFACRM_API_KEY"]}).encode())
    token = auth["token"]
    branch = os.environ.get("ALFACRM_BRANCH_CAMP", "1")
    customers, page = [], 0
    while True:
        r = http_json(f"{host}/v2api/{branch}/customer/index",
            headers={"Content-Type": "application/json", "X-ALFACRM-TOKEN": token},
            data=json.dumps({"page": page, "count": 50, "is_study": 2}).encode())
        items = r.get("items", [])
        for c in items:
            customers.append({k: c.get(k) for k in
                ("id","created_at","updated_at","lead_status_id","study_status_id",
                 "lead_source_id","name","balance","paid_lesson_count","assigned_id","note")})
        print(f"crm page {page}: +{len(items)} (total {len(customers)})")
        if len(items) < 50: break
        page += 1
        time.sleep(0.3)
    save("crm_customers.json", customers)
except Exception as e:
    print("ALFACRM ERROR:", e)

# ---------- 3. ПОГОДА МОСКВА (open-meteo archive, без ключа) ----------
try:
    w = http_json("https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode({
        "latitude": 55.75, "longitude": 37.62,
        "start_date": DATE1, "end_date": DATE2,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,windspeed_10m_max,sunshine_duration",
        "timezone": "Europe/Moscow"}))
    save("weather_moscow.json", w["daily"])
except Exception as e:
    print("WEATHER ERROR:", e)

# ---------- 4. WORDSTAT — спрос рынка по неделям ----------
try:
    def wordstat(method, body):
        return http_json(f"https://api.wordstat.yandex.com/v2/{method}",
            headers={"Authorization": f"OAuth {os.environ['WORDSTAT_TOKEN']}",
                     "Content-Type": "application/json"},
            data=json.dumps(body).encode())
    dyn = wordstat("wordsByPhrasesDynamic", {
        "phrases": ["детский лагерь", "детский лагерь лето",
                    "it лагерь", "лагерь для детей на лето"],
        "regions": [213, 1],
        "granularity": "week",
        "dateFrom": "2025-07-01", "dateTo": "2026-07-06"})
    save("wordstat_dynamic.json", dyn)
except Exception as e:
    print("WORDSTAT ERROR:", e)

# ---------- 5. КУРС USD (ЦБ РФ) ----------
try:
    url = ("https://www.cbr.ru/scripts/XML_dynamic.asp?"
           "date_req1=01/01/2026&date_req2=11/07/2026&VAL_NM_RQ=R01235")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        root = ET.fromstring(r.read())
    usd = [{"date": rec.get("Date"),
            "rate": float(rec.find("Value").text.replace(",", "."))}
           for rec in root.findall("Record")]
    save("usd_rate.json", usd)
except Exception as e:
    print("USD ERROR:", e)

print("COLLECT DONE")
