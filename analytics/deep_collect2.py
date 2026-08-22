#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Фаза 1б: АльфаCRM (даты лидов) + Wordstat Cloud (спрос по неделям)."""
import os, json, urllib.request, urllib.parse, time

OUT = "/opt/aidacamp-tools/analytics/deep"
for envf in ("/opt/aidacamp-tools/etl/.env", "/opt/aidacamp-tools/mcp/.env"):
    with open(envf) as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ.setdefault(k, v.strip().strip('"'))

def http_json(url, headers=None, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def save(name, obj):
    with open(f"{OUT}/{name}", "w") as f:
        json.dump(obj, f, ensure_ascii=False)
    print(f"[saved] {name}")

# ---------- АЛЬФАCRM ----------
try:
    host = os.environ["ALFACRM_HOSTNAME"].replace("https://", "").rstrip("/")
    auth = http_json(f"https://{host}/v2api/auth/login",
        headers={"Content-Type": "application/json"},
        data=json.dumps({"email": os.environ["ALFACRM_EMAIL"],
                         "api_key": os.environ["ALFACRM_API_KEY"]}).encode())
    token = auth["token"]
    branch = os.environ.get("ALFACRM_BRANCH_AIDACAMP", "1")
    customers, page = [], 0
    while True:
        r = http_json(f"https://{host}/v2api/{branch}/customer/index",
            headers={"Content-Type": "application/json", "X-ALFACRM-TOKEN": token},
            data=json.dumps({"page": page, "count": 50, "is_study": 2}).encode())
        items = r.get("items", [])
        for c in items:
            customers.append({k: c.get(k) for k in
                ("id","created_at","updated_at","lead_status_id","study_status_id",
                 "lead_source_id","balance","paid_count","b_date")})
        if len(items) < 50: break
        page += 1
        time.sleep(0.25)
    print(f"crm total: {len(customers)}")
    save("crm_customers.json", customers)
except Exception as e:
    print("ALFACRM ERROR:", repr(e))

# ---------- WORDSTAT CLOUD ----------
try:
    KEY, FOLDER = os.environ["WORDSTAT_CLOUD_KEY"], os.environ["WORDSTAT_FOLDER_ID"]
    def ws_dyn(phrase):
        return http_json("https://searchapi.api.cloud.yandex.net/v2/wordstat/dynamics",
            headers={"Authorization": f"Api-Key {KEY}", "Content-Type": "application/json"},
            data=json.dumps({"folderId": FOLDER, "phrase": phrase,
                "regions": ["213", "1"], "period": "PERIOD_WEEKLY",
                "fromDate": "2025-07-01T00:00:00Z",
                "toDate": "2026-07-06T00:00:00Z"}).encode())
    out = {}
    for ph in ["детский лагерь", "детский лагерь лето", "it лагерь для детей",
               "лагерь для детей на лето", "айдакемп"]:
        try:
            out[ph] = ws_dyn(ph)
            print(f"ws ok: {ph}")
        except Exception as ee:
            print(f"ws fail {ph}: {repr(ee)}")
        time.sleep(0.5)
    save("wordstat_dynamic.json", out)
except Exception as e:
    print("WORDSTAT ERROR:", repr(e))

print("COLLECT2 DONE")
