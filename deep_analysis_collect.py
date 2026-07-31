#!/usr/bin/env python3
# Deep analysis data collector: Metrika daily series, Wordstat dynamics,
# weather (Open-Meteo), USD/RUB (CBR), entry-page intent mix.
import urllib.request, urllib.parse, json, os, csv, sys, time

OUT = "/opt/aidacamp-tools/deep_analysis"
os.makedirs(OUT, exist_ok=True)
COUNTER = os.environ.get("METRIKA_COUNTER", "96499295")
MTOKEN = os.environ["METRIKA_TOKEN"]

def http_json(url, headers=None, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def metrika(dimensions, metrics, date1, date2, filters="", limit=100000):
    p = {"ids": COUNTER, "metrics": ",".join(metrics), "date1": date1,
         "date2": date2, "limit": limit, "accuracy": "full"}
    if dimensions: p["dimensions"] = ",".join(dimensions)
    if filters: p["filters"] = filters
    return http_json("https://api-metrika.yandex.net/stat/v1/data?" +
                     urllib.parse.urlencode(p),
                     headers={"Authorization": f"OAuth {MTOKEN}"})

# ---------- 1. Goals ----------
goals = http_json(f"https://api-metrika.yandex.net/management/v1/counter/{COUNTER}/goals",
                  headers={"Authorization": f"OAuth {MTOKEN}"})["goals"]
json.dump(goals, open(f"{OUT}/goals.json", "w"), ensure_ascii=False, indent=1)
wanted = {}
for g in goals:
    n = g["name"].lower()
    for key in ["заявк", "form_submit", "phone_click", "whatsapp", "telegram_click",
                "shift_book", "scroll_50", "scroll_90", "age_select"]:
        if key in n:
            wanted.setdefault(key, g["id"])
print("goals matched:", wanted, flush=True)

# ---------- 2. Daily series: traffic + goals ----------
DATE1, DATE2 = "2025-03-01", "2026-07-11"
gids = list(wanted.values())
gm = [f"ym:s:goal{gid}reaches" for gid in gids]
base = ["ym:s:visits", "ym:s:users", "ym:s:bounceRate", "ym:s:pageDepth",
        "ym:s:avgVisitDurationSeconds"]
# metrics limit per request = 20; split if needed
rows = {}
for chunk in [base, gm[:10], gm[10:]]:
    if not chunk: continue
    d = metrika(["ym:s:date"], chunk, DATE1, DATE2)
    for item in d["data"]:
        dt = item["dimensions"][0]["name"]
        rows.setdefault(dt, {})
        for name, val in zip(chunk, item["metrics"]):
            rows[dt][name] = val
    time.sleep(0.4)

cols = base + gm
with open(f"{OUT}/daily_series.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["date"] + cols + ["goal_map=" + json.dumps(wanted)])
    for dt in sorted(rows):
        w.writerow([dt] + [rows[dt].get(c, 0) for c in cols])
print("daily_series.csv done", len(rows), "days", flush=True)

# ---------- 3. Daily lead-goal by traffic type ----------
lead_gid = wanted.get("заявк") or wanted.get("form_submit")
d = metrika(["ym:s:date", "ym:s:lastTrafficSource"],
            ["ym:s:visits", f"ym:s:goal{lead_gid}reaches"], DATE1, DATE2)
with open(f"{OUT}/daily_by_source.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["date", "source", "visits", "lead_reaches"])
    for item in d["data"]:
        w.writerow([item["dimensions"][0]["name"], item["dimensions"][1]["name"]] +
                   item["metrics"])
print("daily_by_source.csv done", flush=True)

# ---------- 4. Entry-page intent mix (last 3.5 months) ----------
d = metrika(["ym:s:startURL"],
            ["ym:s:visits", "ym:s:bounceRate", f"ym:s:goal{lead_gid}reaches"],
            "2026-04-01", "2026-07-11", limit=200)
with open(f"{OUT}/entry_pages.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["startURL", "visits", "bounceRate", "lead_reaches"])
    for item in d["data"]:
        w.writerow([item["dimensions"][0]["name"]] + item["metrics"])
print("entry_pages.csv done", flush=True)

# ---------- 5. Wordstat dynamics: demand + anxiety proxy ----------
WTOKEN = os.environ.get("WORDSTAT_TOKEN")
def wordstat(method, body):
    return http_json(f"https://api.wordstat.yandex.com/v2/{method}",
                     headers={"Authorization": f"OAuth {WTOKEN}",
                              "Content-Type": "application/json"},
                     data=json.dumps(body).encode())
demand_phrases = ["детский лагерь", "детский лагерь лето", "it лагерь",
                  "лагерь для детей на лето"]
anxiety_phrases = ["тревожность", "успокоительное", "как справиться с тревогой",
                   "панические атаки"]
for name, phrases, regions in [("demand", demand_phrases, [1, 213]),
                               ("anxiety", anxiety_phrases, [1, 213])]:
    try:
        resp = wordstat("wordsByPhrasesDynamic", {
            "phrases": phrases, "regions": regions, "granularity": "week",
            "dateFrom": "2024-07-01", "dateTo": "2026-07-06"})
        json.dump(resp, open(f"{OUT}/wordstat_{name}.json", "w"), ensure_ascii=False)
        print(f"wordstat_{name} done", flush=True)
    except Exception as e:
        print(f"wordstat_{name} FAILED: {e}", flush=True)
    time.sleep(0.5)

# ---------- 6. Weather (Open-Meteo archive, Moscow) ----------
try:
    wu = ("https://archive-api.open-meteo.com/v1/archive?latitude=55.75"
          "&longitude=37.62&start_date=2026-01-01&end_date=2026-07-11"
          "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,"
          "sunshine_duration&timezone=Europe%2FMoscow")
    json.dump(http_json(wu), open(f"{OUT}/weather.json", "w"))
    print("weather done", flush=True)
except Exception as e:
    print("weather FAILED:", e, flush=True)

# ---------- 7. USD/RUB daily (CBR XML) ----------
try:
    cu = ("https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=01/01/2026"
          "&date_req2=11/07/2026&VAL_NM_RQ=R01235")
    req = urllib.request.Request(cu, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        open(f"{OUT}/usdrub.xml", "wb").write(r.read())
    print("usdrub done", flush=True)
except Exception as e:
    print("usdrub FAILED:", e, flush=True)

print("ALL DONE")
