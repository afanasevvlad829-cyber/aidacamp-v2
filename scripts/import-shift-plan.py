#!/usr/bin/env python3
"""
Импорт текущего плана смены (/var/lib/aidacamp/shift-plan.json) в таблицы сетки смены.
Печатает один SQL DO-блок. Применять:

    python3 scripts/import-shift-plan.py | sudo -u postgres psql -d aidacamp

Мэппинг:
  plan.days[i]      -> shift_day (date = 2026-05-30 + i)
  plan.activities[] -> shift_event (+ checklist + event_checklist из inline-чек-листа)
  plan.anchors[type]-> ежедневные события распорядка (Обед/Ужин/Отбой...) без ролей
Роли: manager->rukovoditel, counselor->vozhaty, teacher->teacher.
Идемпотентно: удаляет прежнюю смену с тем же именем (каскад) и создаёт заново.
"""
import json, sys, datetime

PLAN = sys.argv[1] if len(sys.argv) > 1 else "/var/lib/aidacamp/shift-plan.json"
BASE = datetime.date(2026, 5, 30)          # день index 0
NAME = "Смена 30.05–08.06 2026"
ROLE = {"manager": "rukovoditel", "counselor": "vozhaty", "teacher": "teacher", "admin": "admin"}

def s(v):  # строка -> SQL-литерал
    return "'" + str(v or "").replace("'", "''") + "'"

def t(v):  # время '' -> NULL
    v = (v or "").strip()
    return s(v) if v else "NULL"

def arr(roles):  # список ролей -> text[]
    if not roles:
        return "ARRAY[]::text[]"
    return "ARRAY[" + ",".join(s(r) for r in roles) + "]"

def date_for(i):
    return (BASE + datetime.timedelta(days=int(i))).isoformat()

plan = json.load(open(PLAN, encoding="utf-8"))["shifts"][0]["plan"]
days = plan.get("days") or []
acts = plan.get("activities") or []
anchors = plan.get("anchors") or {}

out = []
out.append("DO $$")
out.append("DECLARE sid bigint; eid bigint; cid bigint;")
out.append("BEGIN")
out.append(f"  DELETE FROM shift WHERE name={s(NAME)};")
out.append(f"  INSERT INTO shift(name,start_date,end_date,status) VALUES({s(NAME)},'2026-05-30','2026-06-08','active') RETURNING id INTO sid;")

# дни
for i, d in enumerate(days):
    title = d.get("title") or {"arrival": "Заезд", "departure": "Выезд",
                               "study": "Учебный день", "defense": "Защита проектов"}.get(d.get("type"), "")
    out.append(f"  INSERT INTO shift_day(shift_id,date,title) VALUES (sid,{s(date_for(i))},{s(title)});")

# события из activities (+ inline-чек-листы)
for a in acts:
    di = a.get("day", 0)
    role = ROLE.get(a.get("role"), None)
    roles = [role] if role else []
    out.append(
        f"  INSERT INTO shift_event(shift_id,date,start_time,end_time,title,activity_type,roles,sort) "
        f"VALUES (sid,{s(date_for(di))},{t(a.get('start'))},{t(a.get('end'))},{s(a.get('title'))},"
        f"{s(a.get('type') or a.get('place'))},{arr(roles)},0) RETURNING id INTO eid;")
    cl = a.get("checklist") or []
    if cl:
        items = [{"id": f"i{j+1}", "text": (it.get("text") if isinstance(it, dict) else str(it))}
                 for j, it in enumerate(cl)]
        items_json = json.dumps(items, ensure_ascii=False).replace("'", "''")
        out.append(f"  INSERT INTO checklist(title,items) VALUES ({s(a.get('title'))},'{items_json}'::jsonb) RETURNING id INTO cid;")
        out.append(f"  INSERT INTO event_checklist(event_id,checklist_id,roles) VALUES (eid,cid,{arr(roles)});")

# anchors -> ежедневный распорядок (без ролей, общий)
for i, d in enumerate(days):
    for row in anchors.get(d.get("type"), []):
        st, en, title = (row + ["", "", ""])[:3]
        if not title:
            continue
        out.append(
            f"  INSERT INTO shift_event(shift_id,date,start_time,end_time,title,activity_type,roles,sort) "
            f"VALUES (sid,{s(date_for(i))},{t(st)},{t(en)},{s(title)},'распорядок',ARRAY[]::text[],-1);")

out.append("END $$;")
print("\n".join(out))
