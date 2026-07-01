#!/usr/bin/env python3
"""Обогащение клиентов из AlfaCRM → таблица client_enrichment + бэкфилл client_attribution.phone.
Идемпотентно (UPSERT), недеструктивно (никогда не затирает уже заполненный phone в attribution).
По умолчанию обогащает ВСЕХ из client_attribution (лиды+клиенты).

Стратегия:
  1) fetch_bulk — постраничный съём обоих филиалов по is_study∈{0,1}×removed∈{0,1} → id->record (быстро).
  2) fetch_one — точечный добор ТОЛЬКО реально отсутствующих (перебор removed 0..3 × оба филиала),
     под общим лимитом: --max-fetch-one N и --time-budget SEC. Что не успели — логируется как "осталось добрать".

Флаги:
  --buyers          обогащать только купивших (revenue>0), а не всех
  --no-fetch-one    пропустить точечный добор архивных (быстрый daily-прогон, только bulk)
  --max-fetch-one N максимум N клиентов добирать через fetch_one (по умолчанию 40)
  --time-budget S   максимум S секунд на фазу fetch_one (по умолчанию 90)

Креды AlfaCRM из /opt/alfacrm-exporter/.env (или из окружения, проброшенного обёрткой)."""
import json, os, requests, time, sys
import psycopg2, psycopg2.extras

DSN = "dbname=aidacamp user=postgres"

def argval(name, default):
    for i, a in enumerate(sys.argv):
        if a == name and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith(name + "="):
            return a.split("=", 1)[1]
    return default

def load_env(p="/opt/alfacrm-exporter/.env"):
    e={}
    try:
        for ln in open(p):
            ln=ln.strip()
            if not ln or ln.startswith("#") or "=" not in ln: continue
            k,v=ln.split("=",1); v=v.strip()
            if len(v)>=2 and v[0]==v[-1] and v[0] in "'\"": v=v[1:-1]
            e[k.strip()]=v
    except PermissionError:
        pass
    for k in ("ALFACRM_HOSTNAME","ALFACRM_EMAIL","ALFACRM_API_KEY","ALFACRM_BRANCH_AIDACAMP","ALFACRM_BRANCH_CODIMS"):
        if os.environ.get(k): e[k]=os.environ[k]
    return e

E=load_env()
HOST=E["ALFACRM_HOSTNAME"]; EMAIL=E["ALFACRM_EMAIL"]; KEY=E["ALFACRM_API_KEY"]
BRANCHES=[E.get("ALFACRM_BRANCH_AIDACAMP","5"), E.get("ALFACRM_BRANCH_CODIMS","1")]
S=requests.Session()
TOKEN=S.post(f"https://{HOST}/v2api/auth/login", json={"email":EMAIL,"api_key":KEY}, timeout=(15,60)).json()["token"]
H={"X-ALFACRM-TOKEN":TOKEN,"Content-Type":"application/json"}

def lead_sources():
    out={}
    for br in BRANCHES:
        r=S.post(f"https://{HOST}/v2api/{br}/lead-source/index", headers=H, json={"limit":200}, timeout=(15,60))
        for it in (r.json().get("items") or []):
            out[it["id"]]=it.get("name")
    return out
LS=lead_sources()

def fetch_bulk():
    out={}
    for br in BRANCHES:
        for st in (0,1):
            for rm in (0,1):
                page=0
                while True:
                    r=S.post(f"https://{HOST}/v2api/{br}/customer/index", headers=H,
                             json={"is_study":st,"removed":rm,"page":page,"limit":100}, timeout=(15,120))
                    items=r.json().get("items") or []
                    for c in items:
                        c["_branch"]=br; c["_removed"]=rm; out[c["id"]]=c
                    if len(items)<100: break
                    page+=1; time.sleep(0.1)
    return out

def fetch_one(cid):
    for br in BRANCHES:
        for rm in (0,1,2,3):
            r=S.post(f"https://{HOST}/v2api/{br}/customer/index", headers=H,
                     json={"id":cid,"removed":rm,"limit":1}, timeout=(15,60))
            items=r.json().get("items") or []
            if items:
                c=items[0]; c["_branch"]=br; c["_removed"]=rm; return c
    return None

def first(v):
    if isinstance(v,list): return v[0] if v else None
    return v or None

def row(cid,c):
    return {
        "crm_id":cid, "branch":int(c["_branch"]), "removed":c.get("_removed"),
        "child_name":c.get("name"), "parent_name":(c.get("legal_name") or "").strip() or None,
        "phone":first(c.get("phone")), "phones":", ".join(c.get("phone") or []) or None,
        "email":first(c.get("email")), "dob":c.get("dob") or None, "gender":c.get("gender"),
        "address":c.get("addr") or None, "district":c.get("custom_rayonprozhivaniya") or None,
        "ym_uid":c.get("custom_custom_ym_uid") or None,
        "domain_userid":c.get("custom_custom_domain_userid") or None,
        "ubtcuid":c.get("custom_custom_ubtcuid") or None,
        "lead_source_id":c.get("lead_source_id"),
        "lead_source_name":LS.get(c.get("lead_source_id")),
        "balance":c.get("balance"), "paid_count":c.get("paid_count"),
        "note":c.get("note") or None,
    }

def main():
    no_fetch_one = "--no-fetch-one" in sys.argv
    max_fetch_one = int(argval("--max-fetch-one", "40"))
    time_budget = float(argval("--time-budget", "90"))

    conn=psycopg2.connect(DSN); cur=conn.cursor()
    only_buyers = "--buyers" in sys.argv
    cur.execute("SELECT crm_id FROM client_attribution" + (" WHERE coalesce(revenue,0)>0" if only_buyers else ""))
    ids=[r[0] for r in cur.fetchall()]

    cur.execute("""
      CREATE TABLE IF NOT EXISTS client_enrichment (
        crm_id int PRIMARY KEY, branch int, removed int,
        child_name text, parent_name text, phone text, phones text, email text,
        dob text, gender int, address text, district text,
        ym_uid text, domain_userid text, ubtcuid text,
        lead_source_id int, lead_source_name text, balance numeric, paid_count int,
        note text, updated_at timestamptz DEFAULT now())""")
    conn.commit()

    t0=time.time()
    bulk=fetch_bulk()
    rows=[]; absent=[]
    for cid in ids:
        c=bulk.get(cid)
        if c is not None:
            rows.append(row(cid,c))
        else:
            absent.append(cid)
    print(f"bulk: matched {len(rows)}/{len(ids)}  absent(need fetch_one): {len(absent)}  [{time.time()-t0:.1f}s]")

    missing=[]
    if no_fetch_one:
        missing=list(absent)
        print(f"fetch_one: SKIPPED (--no-fetch-one), осталось добрать: {len(missing)} -> {missing}")
    else:
        t1=time.time(); done=0
        for cid in absent:
            if done>=max_fetch_one or (time.time()-t1)>time_budget:
                break
            c=fetch_one(cid); done+=1
            if c is None:
                missing.append(cid)
            else:
                rows.append(row(cid,c))
        not_tried=absent[done:]
        missing.extend(not_tried)
        print(f"fetch_one: tried {done}/{len(absent)} за {time.time()-t1:.1f}s "
              f"(лимит max={max_fetch_one}, time={time_budget}s); "
              f"осталось добрать: {len(missing)} -> {missing}")

    if rows:
        cols=list(rows[0].keys())
        upd=",".join(f"{c}=EXCLUDED.{c}" for c in cols if c!="crm_id")
        psycopg2.extras.execute_values(cur,
            f"INSERT INTO client_enrichment ({','.join(cols)}) VALUES %s "
            f"ON CONFLICT (crm_id) DO UPDATE SET {upd}, updated_at=now()",
            [[r[c] for c in cols] for r in rows], template="("+",".join(["%s"]*len(cols))+")")

    cur.execute("""
      UPDATE client_attribution ca SET phone=e.phone
      FROM client_enrichment e
      WHERE e.crm_id=ca.crm_id AND coalesce(ca.phone,'')='' AND coalesce(e.phone,'')<>''""")
    ph_filled=cur.rowcount
    conn.commit()

    cur.execute("SELECT count(*) FROM client_enrichment")
    enr_total=cur.fetchone()[0]
    print(f"enriched this run: {len(rows)}/{len(ids)}  client_enrichment total rows: {enr_total}")
    print(f"missing crm_id ({len(missing)}): {missing}")
    print(f"client_attribution.phone backfilled: {ph_filled}")
    cur.close(); conn.close()

if __name__=="__main__":
    main()
