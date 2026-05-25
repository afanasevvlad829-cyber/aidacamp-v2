#!/usr/bin/env python3
"""
Засев сеток смен из реального плана (/var/lib/aidacamp/shift-plan.json).
Печатает SQL. Применять:  python3 scripts/import-shift-plan.py | sudo -u postgres psql -d aidacamp

Создаёт ДВЕ смены:
  Смена 1: 30.05–08.06 (10 дней, 08.06 = отъезд)
  Смена 2: 10.06–23.06 (14 дней)

Активности исходного плана группируются по ТИПУ дня (arrival/study/defense/departure)
и раскладываются на дни целевой смены по её паттерну типов. Anchors (распорядок) —
по типу дня. Чек-листы активностей переносятся как checklist + event_checklist (по роли).
Роли: manager->rukovoditel, counselor->vozhaty, teacher->teacher.
Идемпотентно: удаляет смены с теми же именами и создаёт заново.
"""
import json, sys, datetime
from collections import defaultdict

PLAN = sys.argv[1] if len(sys.argv) > 1 else "/var/lib/aidacamp/shift-plan.json"
ROLE = {"manager": "rukovoditel", "counselor": "vozhaty", "teacher": "teacher", "admin": "admin"}
TYPE_TITLE = {"arrival": "Заезд", "departure": "Отъезд", "study": "Учебный день", "defense": "Защита проектов"}

# Целевые смены: (имя, дата старта, паттерн типов дней)
SHIFTS = [
    ("Смена 1 · 30.05–08.06", datetime.date(2026, 5, 30),
     ["arrival", "study", "study", "study", "defense", "defense", "study", "study", "study", "departure"]),
    ("Смена 2 · 10.06–23.06", datetime.date(2026, 6, 10),
     ["arrival"] + ["study"] * 10 + ["defense", "defense", "departure"]),
]

def s(v):
    return "'" + str(v or "").replace("'", "''") + "'"

def tm(v):
    v = (v or "").strip()
    return s(v) if v else "NULL"

def arr(roles):
    return "ARRAY[" + ",".join(s(r) for r in roles) + "]" if roles else "ARRAY[]::text[]"

plan = json.load(open(PLAN, encoding="utf-8"))["shifts"][0]["plan"]
days = plan.get("days") or []
acts = plan.get("activities") or []
anchors = plan.get("anchors") or {}

# тип дня по индексу исходного плана
day_type = {i: (d.get("type") or "study") for i, d in enumerate(days)}
# активности, сгруппированные по типу дня
acts_by_type = defaultdict(list)
for a in acts:
    acts_by_type[day_type.get(a.get("day", 0), "study")].append(a)

out = ["DO $$", "DECLARE sid bigint; eid bigint; cid bigint;", "BEGIN"]

for name, start, pattern in SHIFTS:
    end = start + datetime.timedelta(days=len(pattern) - 1)
    out.append(f"  DELETE FROM shift WHERE name={s(name)};")
    out.append(f"  INSERT INTO shift(name,start_date,end_date,status) "
               f"VALUES({s(name)},{s(start.isoformat())},{s(end.isoformat())},'active') RETURNING id INTO sid;")
    for i, typ in enumerate(pattern):
        date = (start + datetime.timedelta(days=i)).isoformat()
        out.append(f"  INSERT INTO shift_day(shift_id,date,title) VALUES (sid,{s(date)},{s(TYPE_TITLE.get(typ, ''))});")
        # активности этого типа дня
        for a in acts_by_type.get(typ, []):
            role = ROLE.get(a.get("role"))
            roles = [role] if role else []
            out.append(
                f"  INSERT INTO shift_event(shift_id,date,start_time,end_time,title,activity_type,roles,sort) "
                f"VALUES (sid,{s(date)},{tm(a.get('start'))},{tm(a.get('end'))},{s(a.get('title'))},"
                f"{s(a.get('type') or a.get('place'))},{arr(roles)},0) RETURNING id INTO eid;")
            cl = a.get("checklist") or []
            if cl:
                items = [{"id": f"i{j+1}", "text": (it.get("text") if isinstance(it, dict) else str(it))}
                         for j, it in enumerate(cl)]
                ij = json.dumps(items, ensure_ascii=False).replace("'", "''")
                out.append(f"  INSERT INTO checklist(title,items) VALUES ({s(a.get('title'))},'{ij}'::jsonb) RETURNING id INTO cid;")
                out.append(f"  INSERT INTO event_checklist(event_id,checklist_id,roles) VALUES (eid,cid,{arr(roles)});")
        # распорядок дня (anchors)
        for row in anchors.get(typ, []):
            st, en, title = (list(row) + ["", "", ""])[:3]
            if not title:
                continue
            out.append(
                f"  INSERT INTO shift_event(shift_id,date,start_time,end_time,title,activity_type,roles,sort) "
                f"VALUES (sid,{s(date)},{tm(st)},{tm(en)},{s(title)},'распорядок',ARRAY[]::text[],-1);")

out.append("END $$;")
print("\n".join(out))
