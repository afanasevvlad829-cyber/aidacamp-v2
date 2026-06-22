# Сквозная атрибуция — Этапы 1-2 (фундамент) · План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Server-side фиксация первого касания каждого визита в PostgreSQL через неблокируемый first-party cookie `aid_visitor`, с автоклассификацией источника и линковкой к заявкам.

**Architecture:** Сайт статический → захват на nginx (`map` ставит cookie, JSON access-log). Python-воркер в `/opt/etl` парсит лог → `INSERT visits` (источник считает SQL-функция `fn_classify_source`). Astro `lead.ts`/`bind-lead.ts` читают cookie и проставляют `visitor_id` в `leads_log`/`pamyatka_bindings`.

**Tech Stack:** PostgreSQL 16 (`aidacamp`, партиции по месяцам), nginx, Python 3 (`/opt/etl`, systemd-timer), Astro 6 + `pg` (TS), vitest, pytest.

**Спека:** `docs/specs/2026-06-21-attribution-design.md` (§1-5, §10-12).

**Где что выполняется:** репо `~/Aidacamp-cloude` (SQL-миграции в `scripts/`, TS-правки в `src/`); сервер `159.194.223.55` (nginx `aidacamp.conf`, воркер `/opt/etl`, БД `aidacamp`). Применение SQL/nginx/воркера — на сервере через MCP `ssh`/`scp` (как portal-*-migration.sql).

---

## File Structure

| Файл | Создать/Изменить | Ответственность |
|---|---|---|
| `scripts/attribution-visits-migration.sql` | создать (репо) | `visits` (партиц.), партиция-хелпер, retention, `fn_classify_source`, ALTER `leads_log`/`pamyatka_bindings` +`visitor_id` |
| `/opt/etl/visits_ingest.py` | создать (сервер) | парс `attribution.log` → `INSERT visits`, дедуп визита (1/30мин), GeoIP опц. (имя без дефиса — Python-модуль) |
| `/opt/etl/test_visits_ingest.py` | создать (сервер) | pytest на парсер строки лога |
| `/etc/systemd/system/visits-ingest.{service,timer}` | создать (сервер) | запуск воркера каждую минуту |
| `scripts/nginx-attribution.snippet.conf` | создать (репо, референс) | директивы `map`/`log_format`/`access_log` для `aidacamp.conf` |
| `src/lib/attribution/cookie.ts` | создать (репо) | `readVisitorId(request)` — чтение cookie `aid_visitor` |
| `src/lib/attribution/cookie.test.ts` | создать (репо) | vitest на `readVisitorId` |
| `src/pages/api/lead.ts` | изменить (репо) | писать `visitor_id` в `leads_log` |
| `src/pages/api/bind-lead.ts` | изменить (репо) | писать `visitor_id` в `pamyatka_bindings` |

> **Объём (решение №4 спеки):** 1 строка на визит (вход/сессия), НЕ на каждый pageview — дедуп в воркере.

---

## Task 1: SQL-миграция — `visits`, классификатор, ALTER

**Files:** Create `scripts/attribution-visits-migration.sql`

- [ ] **Step 1: Написать миграцию**

```sql
-- scripts/attribution-visits-migration.sql
-- Сквозная атрибуция, этап 1-2. Применять: psql -d aidacamp -f этот_файл
BEGIN;

-- 1. Таблица visits (партиционирование по месяцам)
CREATE TABLE IF NOT EXISTS visits (
  id           bigint GENERATED ALWAYS AS IDENTITY,
  visitor_id   text        NOT NULL,
  ts           timestamptz NOT NULL DEFAULT now(),
  is_first     boolean     NOT NULL,
  landing_url  text, referer text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  yclid text, gclid text, ysclid text,
  ip inet, geo_city text, user_agent text, accept_lang text,
  ym_uid text, ym_blocked boolean,
  phone text, crm_id integer,
  source text,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

-- 2. Классификатор источника — единый источник правил (SQL §2.4/§5 спеки)
CREATE OR REPLACE FUNCTION fn_classify_source(
  p_yclid text, p_gclid text, p_ysclid text,
  p_utm_source text, p_referer text, p_landing text
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_yclid  IS NOT NULL AND p_yclid  <> '' THEN 'yandex_direct'
    WHEN p_gclid  IS NOT NULL AND p_gclid  <> '' THEN 'google_ads'
    WHEN lower(coalesce(p_utm_source,'')) = 'codims' THEN 'codims'
    WHEN (p_ysclid IS NOT NULL AND p_ysclid <> '') OR p_referer ~* 'yandex\.' THEN 'yandex_organic'
    WHEN p_referer ~* 'google\.'  THEN 'google_organic'
    WHEN p_referer ~* 'vk\.com'   THEN 'vk'
    WHEN coalesce(p_referer,'') = '' AND p_landing ~* '/shifts/' THEN 'referral_link'
    WHEN coalesce(p_referer,'') = '' AND coalesce(p_landing,'/') = '/' THEN 'direct'
    ELSE 'other'
  END;
$$;

-- 3. Хелпер: создать партицию на месяц (идемпотентно)
CREATE OR REPLACE FUNCTION fn_visits_ensure_partition(p_month date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  m date := date_trunc('month', p_month);
  pname text := 'visits_' || to_char(m, 'YYYY_MM');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = pname) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF visits FOR VALUES FROM (%L) TO (%L)',
      pname, m, (m + interval '1 month'));
    EXECUTE format('CREATE INDEX ON %I (visitor_id)', pname);
    EXECUTE format('CREATE INDEX ON %I (phone)', pname);
    EXECUTE format('CREATE INDEX ON %I (ym_uid)', pname);
    EXECUTE format('CREATE INDEX ON %I (ts)', pname);
  END IF;
END $$;

-- Текущий + следующий месяц
SELECT fn_visits_ensure_partition(now()::date);
SELECT fn_visits_ensure_partition((now() + interval '1 month')::date);

-- 4. Линковка существующих таблиц (без переписывания логики)
ALTER TABLE leads_log         ADD COLUMN IF NOT EXISTS visitor_id text;
ALTER TABLE pamyatka_bindings ADD COLUMN IF NOT EXISTS visitor_id text;
CREATE INDEX IF NOT EXISTS leads_log_visitor_id_idx ON leads_log (visitor_id);

COMMIT;
```

- [ ] **Step 2: Применить и проверить на сервере**

Run (через MCP ssh):
```bash
scp scripts/attribution-visits-migration.sql aidacamp-prod:/opt/etl/
sudo -u postgres psql -d aidacamp -f /opt/etl/attribution-visits-migration.sql
```
Expected: `BEGIN … COMMIT`, без ошибок.

- [ ] **Step 3: Проверить классификатор (тест-кейсы прямо в psql)**

Run:
```bash
sudo -u postgres psql -d aidacamp -tAc "
SELECT fn_classify_source('ABC',NULL,NULL,NULL,NULL,'/')                       -- yandex_direct
     , fn_classify_source(NULL,NULL,'xx',NULL,'https://yandex.ru/','/shifts/') -- yandex_organic
     , fn_classify_source(NULL,NULL,NULL,NULL,'','/shifts/shift-1/')           -- referral_link
     , fn_classify_source(NULL,NULL,NULL,NULL,'','/')                          -- direct
     , fn_classify_source(NULL,NULL,NULL,'codims','https://codims.ru/','/');   -- codims
"
```
Expected: `yandex_direct|yandex_organic|referral_link|direct|codims`

- [ ] **Step 4: Проверить партиции и ALTER**

Run:
```bash
sudo -u postgres psql -d aidacamp -tAc "SELECT tablename FROM pg_tables WHERE tablename LIKE 'visits_____\___' ORDER BY 1;"
sudo -u postgres psql -d aidacamp -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='leads_log' AND column_name='visitor_id';"
```
Expected: 2 партиции (текущий+след. месяц); `visitor_id`.

- [ ] **Step 5: Commit**

```bash
git add scripts/attribution-visits-migration.sql
git commit -m "feat(attribution): visits table, fn_classify_source, partition helper, link columns"
```

---

## Task 2: nginx — cookie `aid_visitor` + JSON-лог визитов

**Files:** Create `scripts/nginx-attribution.snippet.conf` (референс) → применить в `/etc/nginx/sites-enabled/aidacamp.conf`

- [ ] **Step 1: Написать сниппет**

```nginx
# scripts/nginx-attribution.snippet.conf
# (1) В http-контекст (nginx.conf) — ставим cookie если его нет:
map $cookie_aid_visitor $aid_set {
    ""      "aid_visitor=$request_id; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax";
    default "";
}
# (2) JSON-лог визитов (HTML-заходы). visitor = существующий cookie ИЛИ новый request_id.
log_format attribution escape=json '{'
  '"ts":"$time_iso8601","ip":"$remote_addr","uri":"$request_uri",'
  '"referer":"$http_referer","ua":"$http_user_agent","lang":"$http_accept_language",'
  '"aid_cookie":"$cookie_aid_visitor","request_id":"$request_id",'
  '"ym_uid":"$cookie__ym_uid","args":"$args"}';

# (3) В server-блок aidacamp.ru:
#   - в `location ~* .html$` и `location / { ... }` добавить:
#       add_header Set-Cookie $aid_set;
#       access_log /var/log/nginx/attribution.log attribution;
#   (ассеты .css/.js/.img НЕ логируем и cookie не ставим)
```

- [ ] **Step 2: Применить на сервере (с бэкапом + проверкой)**

Run (через MCP ssh, вручную вписать директивы по сниппету):
```bash
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak-$(date +%s)
cp /etc/nginx/sites-enabled/aidacamp.conf /etc/nginx/sites-enabled/aidacamp.conf.bak-attr-$(date +%s)
# вписать map+log_format (http), add_header+access_log (location / и .html)
nginx -t && systemctl reload nginx
```
Expected: `nginx: configuration file ... test is successful`.

- [ ] **Step 3: Проверить cookie и лог**

Run:
```bash
curl -sI 'https://aidacamp.ru/?utm_source=test&yclid=ABC' | grep -i set-cookie   # aid_visitor=...
ssh aidacamp-prod "tail -1 /var/log/nginx/attribution.log"
```
Expected: заголовок `Set-Cookie: aid_visitor=...`; в логе JSON со `"yclid"`-несущим `args=utm_source=test&yclid=ABC`, `aid_cookie:""`, `request_id` непустой.

- [ ] **Step 4: Commit**

```bash
git add scripts/nginx-attribution.snippet.conf
git commit -m "feat(attribution): nginx aid_visitor cookie + attribution JSON access log"
```

---

## Task 3: Воркер `visits-ingest` (парсинг лога → visits)

**Files:** Create `/opt/etl/visits-ingest.py`, `/opt/etl/test_visits_ingest.py`

- [ ] **Step 1: Написать падающий тест парсера**

```python
# /opt/etl/test_visits_ingest.py
import json
from visits_ingest import parse_line

def test_parse_first_visit_with_yclid():
    line = json.dumps({
        "ts":"2026-06-21T10:00:00+03:00","ip":"1.2.3.4","uri":"/?utm_source=yandex&yclid=ABC",
        "referer":"","ua":"Mozilla","lang":"ru","aid_cookie":"","request_id":"req123",
        "ym_uid":"","args":"utm_source=yandex&yclid=ABC"})
    r = parse_line(line)
    assert r["visitor_id"] == "req123"      # cookie пуст → берём request_id
    assert r["is_first"] is True            # cookie пуст → первое касание
    assert r["utm_source"] == "yandex"
    assert r["yclid"] == "ABC"
    assert r["landing_url"] == "/?utm_source=yandex&yclid=ABC"

def test_parse_repeat_visit():
    line = json.dumps({"ts":"2026-06-21T10:05:00+03:00","ip":"1.2.3.4","uri":"/ceny",
        "referer":"https://aidacamp.ru/","ua":"M","lang":"ru","aid_cookie":"req123",
        "request_id":"req999","ym_uid":"ym1","args":""})
    r = parse_line(line)
    assert r["visitor_id"] == "req123"      # есть cookie → он
    assert r["is_first"] is False
```

- [ ] **Step 2: Запустить — упадёт (нет модуля)**

Run: `cd /opt/etl && python3 -m pytest test_visits_ingest.py -q`
Expected: FAIL — `ModuleNotFoundError: visits_ingest`.

- [ ] **Step 3: Реализовать воркер**

```python
# /opt/etl/visits-ingest.py  (имя модуля: visits_ingest — симлинк/именование без дефиса)
import json, os, sys
from urllib.parse import parse_qs
import psycopg2

OFFSET_FILE = "/opt/etl/.visits-ingest.offset"
LOG = "/var/log/nginx/attribution.log"
DSN = os.environ.get("DB_DSN", "dbname=aidacamp user=postgres")

def parse_line(line: str) -> dict | None:
    try:
        d = json.loads(line)
    except Exception:
        return None
    q = parse_qs(d.get("args", ""))
    g = lambda k: (q.get(k) or [None])[0]
    aid = d.get("aid_cookie") or ""
    return {
        "visitor_id": aid or d.get("request_id"),
        "is_first": aid == "",
        "ts": d.get("ts"),
        "landing_url": d.get("uri"), "referer": d.get("referer") or None,
        "utm_source": g("utm_source"), "utm_medium": g("utm_medium"),
        "utm_campaign": g("utm_campaign"), "utm_content": g("utm_content"), "utm_term": g("utm_term"),
        "yclid": g("yclid"), "gclid": g("gclid"), "ysclid": g("ysclid"),
        "ip": d.get("ip") or None, "user_agent": d.get("ua") or None,
        "accept_lang": d.get("lang") or None, "ym_uid": d.get("ym_uid") or None,
    }

def insert(cur, r):
    # Дедуп: is_first всегда; повторный визит — не чаще 1/30мин на visitor (граница сессии)
    if not r["is_first"]:
        cur.execute("""SELECT 1 FROM visits WHERE visitor_id=%s AND ts > now()-interval '30 min' LIMIT 1""",
                    (r["visitor_id"],))
        if cur.fetchone():
            return
    cur.execute("""
      INSERT INTO visits (visitor_id, ts, is_first, landing_url, referer,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        yclid, gclid, ysclid, ip, user_agent, accept_lang, ym_uid, source)
      VALUES (%(visitor_id)s, %(ts)s, %(is_first)s, %(landing_url)s, %(referer)s,
        %(utm_source)s,%(utm_medium)s,%(utm_campaign)s,%(utm_content)s,%(utm_term)s,
        %(yclid)s,%(gclid)s,%(ysclid)s,%(ip)s,%(user_agent)s,%(accept_lang)s,%(ym_uid)s,
        fn_classify_source(%(yclid)s,%(gclid)s,%(ysclid)s,%(utm_source)s,%(referer)s,%(landing_url)s))
    """, r)

def main():
    off = int(open(OFFSET_FILE).read()) if os.path.exists(OFFSET_FILE) else 0
    if not os.path.exists(LOG): return
    size = os.path.getsize(LOG)
    if size < off: off = 0  # лог ротировался
    conn = psycopg2.connect(DSN); cur = conn.cursor()
    with open(LOG) as f:
        f.seek(off)
        for line in f:
            r = parse_line(line)
            if r and r.get("visitor_id"):
                try: insert(cur, r)
                except Exception as e: print("skip:", e, file=sys.stderr)
        new_off = f.tell()
    conn.commit(); cur.close(); conn.close()
    open(OFFSET_FILE, "w").write(str(new_off))

if __name__ == "__main__":
    main()
```

> Имя модуля для импорта в тесте — `visits_ingest`. Файл назвать `visits_ingest.py` (без дефиса), а в systemd звать его же.

- [ ] **Step 4: Запустить тест — пройдёт**

Run: `cd /opt/etl && python3 -m pytest test_visits_ingest.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: systemd timer (раз в минуту) + smoke**

```ini
# /etc/systemd/system/visits-ingest.service
[Service]
Type=oneshot
EnvironmentFile=/opt/etl/.env
ExecStart=/usr/bin/python3 /opt/etl/visits_ingest.py
User=postgres
```
```ini
# /etc/systemd/system/visits-ingest.timer
[Timer]
OnCalendar=*:0/1
[Install]
WantedBy=timers.target
```
Run:
```bash
systemctl daemon-reload && systemctl enable --now visits-ingest.timer
# smoke: сделать заход и проверить строку в visits
curl -s 'https://aidacamp.ru/?utm_source=yandex&yclid=SMOKE1' -o /dev/null
sleep 65
sudo -u postgres psql -d aidacamp -tAc "SELECT visitor_id,is_first,source,yclid FROM visits WHERE yclid='SMOKE1';"
```
Expected: строка `is_first=t, source=yandex_direct, yclid=SMOKE1`.

- [ ] **Step 6: Commit (референс-копия воркера в репо)**

```bash
# держим копию воркера в репо для истории (боевой — на сервере /opt/etl)
mkdir -p scripts/attribution
cp <с сервера> scripts/attribution/visits_ingest.py   # или воссоздать
git add scripts/attribution/visits_ingest.py
git commit -m "feat(attribution): visits-ingest worker (nginx log -> visits) + systemd timer"
```

---

## Task 4: Линковка заявки/CRM к визитору (`visitor_id`)

**Files:** Create `src/lib/attribution/cookie.ts`, `src/lib/attribution/cookie.test.ts`; Modify `src/pages/api/lead.ts`, `src/pages/api/bind-lead.ts`

- [ ] **Step 1: Падающий vitest на чтение cookie**

```ts
// src/lib/attribution/cookie.test.ts
import { describe, it, expect } from 'vitest';
import { readVisitorId } from './cookie';

describe('readVisitorId', () => {
  it('читает aid_visitor из Cookie-заголовка', () => {
    const req = new Request('https://x', { headers: { cookie: 'a=1; aid_visitor=req123; _ym_uid=9' } });
    expect(readVisitorId(req)).toBe('req123');
  });
  it('возвращает null если cookie нет', () => {
    expect(readVisitorId(new Request('https://x'))).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `npx vitest run src/lib/attribution/cookie.test.ts`
Expected: FAIL — нет `./cookie`.

- [ ] **Step 3: Реализовать**

```ts
// src/lib/attribution/cookie.ts
/** Достаёт значение first-party cookie aid_visitor из запроса (или null). */
export function readVisitorId(request: Request): string | null {
  const raw = request.headers.get('cookie') ?? '';
  const m = raw.match(/(?:^|;\s*)aid_visitor=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
```

- [ ] **Step 4: Запустить — пройдёт**

Run: `npx vitest run src/lib/attribution/cookie.test.ts`
Expected: PASS.

- [ ] **Step 5: Вписать в `lead.ts` (INSERT leads_log)**

В `src/pages/api/lead.ts`: импортировать `readVisitorId`, в начале `POST` взять `const visitorId = readVisitorId(request);`, добавить в SQL INSERT столбец `visitor_id` и значение `visitorId || null`. (Колонка добавлена в Task 1.)

```ts
import { readVisitorId } from '../../lib/attribution/cookie';
// ...внутри POST, перед pool.query:
const visitorId = readVisitorId(request);
// в INSERT leads_log: добавить ", visitor_id" в список колонок и ", $N" в VALUES со значением visitorId || null
```

- [ ] **Step 6: Вписать в `bind-lead.ts`** — аналогично проставить `visitor_id` в `INSERT pamyatka_bindings` (колонка из Task 1), значение из `readVisitorId(request)`.

- [ ] **Step 7: Сборка не падает**

Run: `npm run build` (или `npx astro check`)
Expected: без ошибок типов.

- [ ] **Step 8: Commit**

```bash
git add src/lib/attribution/cookie.ts src/lib/attribution/cookie.test.ts src/pages/api/lead.ts src/pages/api/bind-lead.ts
git commit -m "feat(attribution): link leads_log/pamyatka_bindings to aid_visitor via visitor_id"
```

---

## Task 5: Приёмка «слепая атрибуция» (тест C спеки) + мониторинг

**Files:** Create `scripts/attribution/acceptance-check.sql`

- [ ] **Step 1: 5 заходов разными путями (после деплоя Task 1-4)**

```bash
for q in "utm_source=yandex&yclid=ACC1" "utm_source=yandex" "" "utm_source=codims" ""; do
  curl -s "https://aidacamp.ru/?$q" -o /dev/null; done
curl -s "https://aidacamp.ru/shifts/shift-1/" -o /dev/null   # присланная ссылка
sleep 65
```

- [ ] **Step 2: Источник каждого определяется только по visits**

Run:
```bash
sudo -u postgres psql -d aidacamp -tAc "SELECT source, count(*) FROM visits WHERE ts>now()-interval '5 min' GROUP BY source ORDER BY 1;"
```
Expected: присутствуют `yandex_direct, yandex_organic, direct, codims, referral_link` — **5/5 классов автоматически** (критерий приёмки спеки §10.C).

- [ ] **Step 3: Запрос мониторинга (D спеки)**

```sql
-- scripts/attribution/acceptance-check.sql — доля визитов с источником ≠ other/direct, доля ym_blocked
SELECT
  round(100.0*count(*) FILTER (WHERE source NOT IN ('other'))/nullif(count(*),0),1) AS pct_classified,
  round(100.0*count(*) FILTER (WHERE ym_blocked)/nullif(count(*),0),1)            AS pct_ym_blocked,
  count(*) AS visits_24h
FROM visits WHERE ts > now() - interval '24 hours';
```

- [ ] **Step 4: Commit**

```bash
git add scripts/attribution/acceptance-check.sql
git commit -m "test(attribution): acceptance 'blind attribution' 5/5 + monitoring query"
```

---

## Definition of Done (этапы 1-2)
- [ ] `visits` создана (партиции тек.+след. месяц), `fn_classify_source` проходит 5 кейсов (Task 1.3).
- [ ] nginx ставит `aid_visitor`, пишет `attribution.log` (Task 2.3).
- [ ] Воркер импортирует визиты, smoke `SMOKE1` виден в `visits` с верным `source` (Task 3.5).
- [ ] Заявка (`leads_log`) и памятка (`pamyatka_bindings`) несут `visitor_id` (Task 4).
- [ ] Приёмка C: 5/5 источников по `visits` (Task 5.2).
- [ ] Первое касание не перезатирается (is_first ставится только при пустом cookie — Task 3 тест).

## Открытые пункты (вне 1-2, в следующие планы)
- Retention-job (DROP партиций >24 мес) — добавить cron в плане «эксплуатация» (или сюда отдельной задачей при желании).
- GeoIP `geo_city` — опционально (🟡), не блокер.
- Партиция-ротация: ежемесячный `SELECT fn_visits_ensure_partition(...)` повесить на cron (1-го числа).
- Этапы 3-6 (UserID-склейка, маяк ym_blocked, offline-оплаты, качество) — отдельные планы.

---

## Интеграция с существующим `client_attribution` (attribution.aidacamp.ru)

> Обнаружено 22.06: уже есть КЛИЕНТ-уровневая атрибуция — таблица `client_attribution`
> (`crm_id` PK, `phone`, `source`, `confidence`, `method`, `proof`, `ym_client_id`, `revenue`,
> `shift`, `is_spam`; ~179 строк, живая). Отдаёт `attribution.service`
> (node `/opt/aidacamp-attribution/server.js`, сейчас **FAILED**), данные из AlfaCRM
> (`/opt/alfacrm-exporter`). Наш `visits` = автоматический ВХОД для неё, **не дубль**.

### Task 6: visits → client_attribution (обогащение)
**Принцип:** НЕ ломать существующий populator. `visits` лишь ПОВЫШАЕТ точность — заполняет
`source`/`confidence`/`method='visits-first-touch'`/`proof` там, где есть server-side доказательство.
**Связка:** `client_attribution.crm_id` → `leads_log`(crm_id, phone, **visitor_id**) →
`visits.visitor_id` (или по `phone`/`ym_uid`) → строка first-touch.

- [ ] Шаг 1: ПЕРЕД реализацией прочитать `/opt/aidacamp-attribution/server.js` + экспортер —
      понять, как сейчас пишутся `source/confidence/method` (чтобы не конфликтовать).
- [ ] Шаг 2: SQL-реконсиляция (job): для `client_attribution` со слабым источником найти
      first-touch visit по `visitor_id`/`phone`/`ym_uid` и `UPDATE` source/confidence/method/proof —
      ТОЛЬКО если наша уверенность выше (yclid/gclid='high', utm/referer='medium').
- [ ] Шаг 3: правила confidence в SQL (`fn_confidence(...)` рядом с `fn_classify_source`).
- [ ] Шаг 4: повесить на то же расписание, что обновляет `client_attribution`.
- [ ] (Опц., отдельный инцидент) поднять упавший `attribution.service`.

Зависит от: `visits` с данными (этапы 1-2 на проде ✓ миграция) + маппинг phone→crm_id (есть в `leads_log`).
