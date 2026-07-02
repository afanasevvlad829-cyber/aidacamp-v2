#!/usr/bin/env python3
# Ежедневный самообучающийся прогноз: валидация когорты + добор топ-N + обновление портрета.
import urllib.request, urllib.parse, json, subprocess, datetime, re, sys
COUNTER='96499295'; TOPN=25; DEADLINE_DAYS=7; WINDOW_DAYS=7
GOALS=['541048197','545216440','556953501','556953493']
today=datetime.date.today()
d1=(today-datetime.timedelta(days=WINDOW_DAYS)).isoformat(); d2=today.isoformat()
deadline=(today+datetime.timedelta(days=DEADLINE_DAYS)).isoformat()
tok=None
for l in open('/opt/mcp/.env'):
    if l.startswith('METRIKA_TOKEN='): tok=l.strip().split('=',1)[1]
def metrika(params):
    params={**params,'ids':COUNTER}
    url='https://api-metrika.yandex.net/stat/v1/data?'+urllib.parse.urlencode(params)
    req=urllib.request.Request(url,headers={'Authorization':'OAuth '+tok})
    return json.load(urllib.request.urlopen(req,timeout=120))
def psql(sql):
    subprocess.run(['psql','-U','postgres','-d','aidacamp','-c',sql],capture_output=True,text=True)
def rows(sql):
    o=subprocess.run(['psql','-U','postgres','-d','aidacamp','-t','-A','-F','|','-c',sql],capture_output=True,text=True).stdout.strip()
    return [x.split('|') for x in o.split('\n') if x]
gm='+'.join(f'ym:s:goal{g}reaches' for g in GOALS)
def main():
    psql("CREATE TABLE IF NOT EXISTS buyer_portrait(id serial primary key, run_date date, n_converters int, med_visits numeric, med_pages numeric, med_seconds numeric, note text);")
    pr=rows("SELECT med_visits,med_pages,med_seconds FROM buyer_portrait ORDER BY run_date DESC, id DESC LIMIT 1")
    PV,PP,PS=(float(pr[0][0]),float(pr[0][1]),float(pr[0][2])) if pr else (3,9,880)
    def tp(v,pg,sec):
        if v>=2 and sec>=1800: return 'hot',0.45
        if v>=2 and pg>=PP and sec>=PS: return 'warm',0.25
        return 'cold',0.12
    # A) валидация
    un=rows("SELECT client_id, deadline::text FROM cohort_forecast WHERE converted IS NULL")
    unids=[r[0] for r in un]; hit=set()
    for i in range(0,len(unids),18):
        b=unids[i:i+18]; flt=' OR '.join(f"ym:s:clientID=='{c}'" for c in b)
        try:
            r=metrika({'metrics':gm,'dimensions':'ym:s:clientID','date1':(today-datetime.timedelta(days=25)).isoformat(),'date2':d2,'filters':flt,'limit':'500','accuracy':'full'})
            for row in r['data']:
                if sum(row['metrics'])>0: hit.add(row['dimensions'][0]['name'])
        except Exception as e: print('valid err',str(e)[:60])
    crm=set()
    for n in rows("SELECT raw->>'note' FROM ai_customers WHERE raw->>'note' LIKE '%ymCid:%'"):
        for m in re.findall(r'ymCid:(\d{8,})', n[0] or ''): crm.add(m)
    conv_now=0
    for cid,dl in un:
        via='metrika_goal' if cid in hit else ('alfacrm' if cid in crm else None)
        if via: psql(f"UPDATE cohort_forecast SET converted=true,converted_at='{d2}',conv_via='{via}' WHERE client_id='{cid}'"); conv_now+=1
        elif dl<d2: psql(f"UPDATE cohort_forecast SET converted=false WHERE client_id='{cid}'")
    # B) добор топ-25 новых
    ex=set(r[0] for r in rows("SELECT client_id FROM cohort_forecast"))
    r=metrika({'metrics':f'ym:s:visits,ym:s:pageviews,ym:s:avgVisitDurationSeconds,{gm}','dimensions':'ym:s:clientID','date1':d1,'date2':d2,'filters':'ym:s:visits>1','sort':'-ym:s:pageviews','limit':'10000','accuracy':'full'})
    cands=[]
    for row in r['data']:
        cid=row['dimensions'][0]['name']; m=row['metrics']
        v=int(m[0]); pg=int(m[1]); sec=int(m[2]*m[0]); leads=sum(m[3:])
        if leads>0 or cid in ex: continue
        cands.append((v+pg*0.5+sec/120, cid, v, pg, sec, round(pg/v,1) if v else 0))
    cands.sort(reverse=True); top=cands[:TOPN]; added=0
    if top:
        vals=[]
        for sc,cid,v,pg,sec,dp in top:
            t,p=tp(v,pg,sec); vals.append(f"('{d2}','{cid}','{d2}',{v},{pg},{sec},{dp},'{t}',{p},'{deadline}')")
        psql("INSERT INTO cohort_forecast(cohort_run,client_id,captured_at,visits,pageviews,seconds,page_depth,tier,prob,deadline) VALUES "+",".join(vals)+" ON CONFLICT (cohort_run,client_id) DO NOTHING;")
        added=len(top)
    # C) обновление портрета из подтверждённых
    cv=rows("SELECT visits,pageviews,seconds FROM cohort_forecast WHERE converted=true")
    if len(cv)>=5:
        vs=sorted(int(x[0]) for x in cv); ps=sorted(int(x[1]) for x in cv); ss=sorted(int(x[2]) for x in cv)
        md=lambda a:a[len(a)//2]
        psql(f"INSERT INTO buyer_portrait(run_date,n_converters,med_visits,med_pages,med_seconds,note) VALUES ('{d2}',{len(cv)},{md(vs)},{md(ps)},{md(ss)},'auto')")
    t=rows("SELECT count(*),count(*) FILTER(WHERE converted=true),count(*) FILTER(WHERE converted IS NULL) FROM cohort_forecast")[0]
    print(f"{d2}: +{added} новых, валид.сегодня +{conv_now} конв | всего {t[0]}, куплено {t[1]}, ждём {t[2]}")
try: main()
except Exception as e:
    print('FATAL', repr(e)); sys.exit(1)
