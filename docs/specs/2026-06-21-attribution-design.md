# Дизайн: сквозная атрибуция клиентов АйДаКемп

**Дата:** 2026-06-21 · **Статус:** утверждена архитектура, спека на ревью
**Источник:** ТЗ «ФИНАЛЬНОЕ ТЗ: сквозная атрибуция клиентов АйДаКемп» (Vlad, 21.06.2026)
**Scope:** полный спек, этапы 1-6.

> Этот документ — НЕ копия ТЗ, а его привязка к реальному коду `~/Aidacamp-cloude` и серверу. ТЗ описывает «что», здесь — «как и где именно».

---

## 0. Проблема и цель (из ТЗ §0)
Источник терялся у трети клиентов смены 1: факт заявки пишет сервер, а источник — браузерный пиксель Метрики (блок/обрыв JS → заявка есть, источника нет). ClientID = браузер, не человек. Логи ротировались.

**Цель:** каждое обращение и заявка несут источник **первого касания**, склеенный server-side в PostgreSQL `aidacamp`, хранение 2 года. Источник виден даже при блокировщике, смене устройства, длинном цикле.

---

## 1. Факты о текущей системе (грунт под дизайн)

**Рендер:** Astro `output=static` (дефолт, `output` не задан). 352 страницы, SSR только 28 (`prerender=false`), остальное пререндер. → **Astro `src/middleware.ts` на лендингах в рантайме НЕ исполняется.**

**Раздача:** nginx `aidacamp.conf`: `root /var/www/aidacamp/current/`, `location /` → `try_files $uri $uri/ =404` (статика напрямую). Node-SSR `@astrojs/node` на **127.0.0.1:4185** проксируется только для `/api/`, `/portal/`, `/p/`. Дефолтный `access_log` = `combined_host` (без cookie/JSON).

**Что уже есть (переиспользуем, не дублируем):**
| Объект | Где | Роль в атрибуции |
|---|---|---|
| таблица `leads_log` | `src/pages/api/lead.ts` | заявка уже хранит `utm_*/yclid/ysclid/gclid/source` (server-side из POST-body) |
| `mapLeadSourceId(body)` | `lead.ts:204+` | частичный классификатор → AlfaCRM `lead_source_id` |
| таблица `pamyatka_bindings` | `src/pages/api/bind-lead.ts` | связка `crm_id ↔ ym_client_id` + ip/ua/utm/ym_first_visit |
| таблица `analytics_events` | `src/pages/api/track.ts` | события/цели с `client_id`, referrer, UA |
| Метрика `96499295` | `tracking.ts`, `Base.astro`, `Footer.astro` | пиксель; точка для `setUserID` и маяка |

**Вывод:** заявка-уровень атрибуции есть; нет **визит-уровня** (первое касание на каждый заход с неблокируемым first-party cookie). Это и есть дыра.

---

## 2. Архитектура

**Три ключа связки (ТЗ §1):** `phone` (главный) ↔ `aid_visitor` (cookie браузера) ↔ `ym_uid` (мост в Метрику).

**Решение №1 — слой захвата = nginx** (одобрено). Лендинги статические → cookie и запись визита ставит nginx (видит все 352 страницы, неблокируемо, до JS). Astro-middleware остаётся только для SSR-роутов и не трогается.

```
[браузер] →[nginx]→ статика /var/www/aidacamp/current/
               │      ├─ map ставит cookie aid_visitor (если нет)
               │      └─ JSON access-log attribution.log (utm/yclid/referer/landing/ip/ua/_ym_uid/aid_visitor)
               │            ↓
               │      [воркер visits-ingest] → INSERT visits (PostgreSQL aidacamp)
               ├─ /api/* /portal/* /p/* →[Node :4185]→ lead.ts/bind-lead.ts читают cookie aid_visitor,
               │                                         проставляют visitor_id в leads_log/pamyatka_bindings
               └─ /_beacon →[nginx 204 + лог]→ ym_blocked в visits (маяк §4)
[оплата] AlfaCRM «оплачено» → воркер → Метрика offline-конверсия (цель payment) по UserID=CRM_ID (§5)
```

---

## 3. Данные

### 3.1. Новая таблица `visits` (адаптация ТЗ §2.1)
```sql
CREATE TABLE visits (
  id           bigserial,
  visitor_id   text   NOT NULL,        -- значение cookie aid_visitor (= nginx $request_id; НЕ uuid — text)
  ts           timestamptz NOT NULL DEFAULT now(),
  is_first     boolean NOT NULL,       -- true если в запросе cookie aid_visitor отсутствовал
  landing_url  text, referer text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  yclid text, gclid text, ysclid text,
  ip inet, geo_city text, user_agent text, accept_lang text,
  ym_uid text, ym_blocked boolean,
  phone text, crm_id integer,          -- проставляются позже (заявка/CRM)
  source text                          -- результат классификатора §2 (денормализация для отчётов)
) PARTITION BY RANGE (ts);
-- ежемесячные партиции visits_YYYY_MM; индексы на (visitor_id),(phone),(ym_uid),(ts) на партициях
```
**Адаптации против ТЗ:** `visitor_id text` (nginx `$request_id` — 32-hex, не uuid); добавлено `source` (денормализация результата классификатора).

### 3.2. Изменения существующих таблиц (миграции, без переписывания логики)
- `ALTER TABLE leads_log ADD COLUMN visitor_id text;` — `lead.ts` читает cookie `aid_visitor` из запроса и пишет в `leads_log.visitor_id`.
- `ALTER TABLE pamyatka_bindings ADD COLUMN visitor_id text;` — `bind-lead.ts` аналогично.
- `is_test boolean DEFAULT false` в `leads_log` (§6).
- `email text` в `leads_log` (§6).

### 3.3. Хранение (ТЗ §8)
Партиции по месяцам; ежемесячный job `DROP` партиций старше 24 мес. IP храним 2 года (решение владельца) — **открытый пункт:** покрыть в политике конфиденциальности (§13).

---

## 4. Этап 1 — nginx-захват + воркер-ингест
**nginx (`aidacamp.conf`):**
- `map $cookie_aid_visitor $set_visitor { "" "aid_visitor=$request_id; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax"; default ""; }`
- `add_header Set-Cookie $set_visitor;` в `location ~* .html$` и `location /` (страницы; не на статике ассетов).
- `log_format attribution escape=json '{...}'` с полями: `$time_iso8601, $remote_addr, $request_uri, $http_referer, $http_user_agent, $http_accept_language, $cookie_aid_visitor, $request_id, $cookie__ym_uid, $args`.
- `access_log /var/log/nginx/attribution.log attribution;` на page-локациях (HTML), не на ассеты.

**Воркер `visits-ingest`** (Python в `/opt/etl`, systemd-timer как у ETL, или tail-сервис):
- Парсит `attribution.log` (только HTML-заходы), вычисляет `visitor_id = $cookie_aid_visitor || $request_id`, `is_first = ($cookie_aid_visitor == "")`, парсит utm/yclid/ysclid/gclid из `$args`, GeoIP по ip (опц.).
- Дедуп визита: 1 строка на ВХОД/сессию (не на каждый pageview) — напр. писать `is_first` всегда, а повторные — не чаще 1/30мин на visitor (контроль объёма, ТЗ-решение №4).
- `INSERT INTO visits`.

**Решение №3:** воркер — отдельный сервис на сервере (как ETL), не в Astro-рантайме.

---

## 5. Этап 2 — cookie визитора + классификатор источника
Cookie — из §4 (nginx map). **Классификатор** `classify(visit_row) → source` (ТЗ §2.4), общий модуль:
```
yclid→Яндекс Директ; gclid→Google Ads; utm_source=codims→школа;
ysclid||referer~yandex(без yclid)→органика Яндекс; referer~google→органика Google;
referer~vk.com→ВК; referer пуст & landing~/shifts/→присланная ссылка; referer пуст & landing=/→прямой.
```
**Единый источник правил — SQL-функция** `fn_classify_source(yclid,gclid,ysclid,utm_source,referer,landing) → text`. Воркер-ингест проставляет `visits.source` через неё; отчёты и `lead.ts` используют ту же функцию (`mapLeadSourceId()` остаётся тонкой обёрткой: source → AlfaCRM `lead_source_id`). Никакого дубля правил TS/Python.

---

## 6. Этап 3 — UserID: склейка устройств в Метрике
Как только известен CRM_ID:
```js
ym(96499295,'setUserID',String(CRM_ID)); ym(96499295,'userParams',{UserID:String(CRM_ID)});
```
- Вызов на сабмите формы (если CRM_ID известен) и на памятке `/p/[lid]` (`src/pages/p/[lid].astro` — уже SSR, проксируется на :4185).
- `bind-lead.ts` уже связывает `crm_id↔ym_client_id` — добавляем `visitor_id`, замыкая `visitor ↔ crm_id ↔ ym_client_id`.

---

## 7. Этап 4 — маяк-детект блокировщика
- nginx: `location = /_beacon { return 204; access_log /var/log/nginx/attribution.log attribution; }` (или отдельный лог) — принимает `?ym_blocked=&v=aid_visitor`.
- Скрипт в `Base.astro` (после счётчика Метрики): через 3с проверяет `typeof window.ym!=='function' || !document.cookie.match(/_ym_uid=/)` и шлёт `navigator.sendBeacon('/_beacon?ym_blocked=...&v='+aid_visitor)`.
- Воркер пишет `visits.ym_blocked` по `visitor_id`.
- Маяк на СВОЙ домен → адблок не режет. Даёт долю «слепой зоны» Метрики.

---

## 8. Этап 5 — offline-конверсии оплат → Метрика
- Триггер: статус «оплачено» в AlfaCRM (детект — поллинг/вебхук; см. `reference_alfacrm_api`, грабли с фильтром `{id}`).
- Действие: Метрика Offline Conversions API — цель `payment` (создать в Метрике), привязка по `UserID=CRM_ID`, передавать сумму.
- Воркер/крон в `/opt/etl` (рядом с ETL). Замыкает визит→заявка→**оплата**: какой канал даёт деньги, а не заявки.

---

## 9. Этап 6 — качество данных
- `is_test=true` + автофильтр паттернов (`+79991234567`, тест-имена, `+7999000XXXX` smoke — см. `reference_test_phones`). Все отчёты фильтруют `is_test`.
- Источник в CRM **из `visits`** по телефону (а не руками); ручное поле — fallback.
- Необязательное поле `email` в форму (сейчас email у 5/33).
- Повторники — метка источника «возврат», считать отдельно (retention ≠ привлечение).

---

## 10. Порядок сборки и зависимости
`1 → 2 → (3 ∥ 4) → 5 (после 3) → 6`. Этапы **1-2** = надёжная атрибуция источника за 3-4 дня — **включить ДО старта продаж смен 3-4** (иначе трафик теряется безвозвратно, ТЗ §8).

---

## 11. Тестирование (привязка ТЗ §10)
- **A1** первое касание: заход `?utm_source=yandex&yclid=TEST123` → в `visits` строка `is_first=true` с `yclid=TEST123` (не последняя внутр. страница).
- **A3 (ключевой)** заявка при uBlock: конверсии в Метрике нет, но в `visits` строка с `utm_source` и `ym_blocked=true`.
- **A4** `yclid→Директ`; **A5** прямая ссылка `/shifts/shift-1/` без реферера → «присланная ссылка»; **A2** UserID-склейка двух ClientID под `UserID=CRM_ID`; **A6** тест-оплата → цель `payment` в Метрике.
- **B** целостность: `visits ≥ заявки в боте`; дедуп по phone, first-touch не перезатёрт; тест-номера `is_test`.
- **C приёмка «слепая атрибуция»:** 5 тест-заявок разными путями, источник каждой определяется только по `visits`. **Критерий: 5/5 автоматически.**
- **D мониторинг:** доля заявок с источником >90%; с `crm_id` 100%; доля `ym_blocked`; расхождение «бот vs visits» = 0.

---

## 12. Definition of Done (ТЗ §11)
- [ ] `visits` (партиции, очистка >24 мес) · [ ] first-touch не перезатирается (A1,A3) · [ ] заявка фиксируется при блокировщике (A3) · [ ] yclid восстанавливает Директ (A4) · [ ] UserID склеивает устройства (A2) · [ ] маяк `ym_blocked` (A3) · [ ] offline-оплаты (A6) · [ ] приёмка C 5/5 · [ ] источник в CRM из visits · [ ] тест-заявки фильтруются · [ ] мониторинг D на дашборде.

---

## 13. Открытые вопросы / риски
1. **PII/152-ФЗ:** хранение IP 2 года → нужен пункт в политике конфиденциальности (цель: аналитика/качество). Отдельная мелкая задача, не блокер.
2. **Объём `visits`:** решение №4 (1 строка/визит, не/pageview) надо подтвердить на проде по факту трафика; партиции страхуют.
3. **Классификатор — единый**, как SQL-функция `fn_classify_source` (решено в §5), чтобы не повторить рассинхрон правил TS/Python (ср. инцидент Metrika ON CONFLICT 21.06).
4. **`/p/` уже на :4185** — setUserID на памятке вписывается без новой инфраструктуры.

---

## Приложение: бизнес-контекст (ТЗ)
Двигатель продаж смены 1 — база (школа Кодимс + повторники, 11/29 семей) и органика (5, ключи «айдакемп», «лагерь обнинск»). Яндекс Директ = 1 подтверждённая продажа из 33. Система нужна, чтобы такие выводы получались автоматически.
