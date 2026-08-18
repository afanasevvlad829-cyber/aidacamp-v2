# Архитектура АйДаКемп — процессы между модулями

> Документ описывает **только то, что подтверждено кодом или доками репо** (CLAUDE.md,
> DEV_PROTOCOL.md, AGENTS.md, INFRA.md, TOOLS.md, DESIGN_SYSTEM.md) и решениями
> из сессии ревью 17.07.2026 (номера PR указаны). Всё неподтверждённое — в разделе
> [«Открытые вопросы владельцу»](#открытые-вопросы-владельцу) в конце.
>
> Журнал архитектурных решений — [`docs/adr/`](adr/README.md).

---

## 1. Глоссарий домена

Только термины, реально встречающиеся в коде/доках репо, с указанием где живёт каждый.

| Термин | Значение | Где в коде |
|---|---|---|
| **Смена** | Заезд лагеря с датами, длительностью, ценой и вместимостью. Интерфейс `Shift` (id, dates, duration, price, free/occupied, startDate/endDate). | `src/data/shifts.ts` — интерфейс `Shift`, метаданные `SHIFT_META`, списки открытых к брони `mainShifts` / `shortShifts` |
| **Базовая цена и правило роста** | База (`price` в `shifts.ts`) + единое правило: до «старт − 30 дней» цена = базе; за 30 дней — разовый шаг +5 %; далее +500 ₽/день; на дату старта рост останавливается. Константы `RAMP_DAYS=30`, `STEP_PCT=0.05`, `DAILY_INC=500`. | `src/data/dynamicPrices.ts` — `getCurrentPrice(shiftId)`; данные берёт из `SHIFT_META` |
| **Путёвка** | Купленное место на смене. В коде фигурирует в текстах листа ожидания и правилах возврата («Возврат при отказе от путёвки, ФЗ №2300-1»). | `src/data/shifts.ts` — `WAITLIST_EXPLANATION` (строка ~70), комментарий блока возврата (строка ~202) |
| **Заявка / lead** | Отправка телефона+возраста+смены с любой формы сайта. Проходит клиентский сборщик контекста и серверный роут. | `src/scripts/form-submit.ts` → `src/pages/api/lead.ts`; бэкапы: `leads.jsonl` (ФС) и таблица `leads_log` (PG) |
| **Лист ожидания** | Режим брони распроданной смены: та же форма, помечена `form_id: shifts_book_waitlist`, CTA «Лист ожидания». | `src/data/shifts.ts` — `getBookingCta()`, `getAvailabilityLevel()`, `WAITLIST_EXPLANATION`; обработка в `api/lead.ts` (`isWaitlist`) |
| **Налоговый вычет** | 13 % × (цена − `EDU_RESID_PER_DAY` × дни), с капом `EDU_BASE_CAP`. ⚠️ Не путать константы: `EDU_RESID_PER_DAY = 3800` — проживание+питание по НК РФ (для вычета); `BYT_PER_DAY = 6100` — фактические расходы лагеря/день (для возвратов по ФЗ №2300-1). Одну цифру хардкодить нельзя (CLAUDE.md). | `src/data/shifts.ts` — `taxDeduction()`, `EDU_RESID_PER_DAY`, `BYT_PER_DAY`; `src/data/dynamicPrices.ts` — `getTaxDeduction(shiftId)` (от текущей растущей цены) |
| **Портал** | Раздел сайта для родителей/детей: лента, уроки, дисциплина и т.д. `/metodichki/` закрыт за портальной авторизацией. | `src/pages/portal/` (index, feed, lessons, discipline, login, metodichki…); концепт — `docs/PORTAL_CONCEPT.md` |
| **Отряд** | Группа детей внутри смены. В коде сайта отдельной сущности нет — термин встречается в текстах планировщика вожатых (задачи «Знакомство отряда», «дневник отряда»). | `src/scripts/pages/staff-index.ts` (строки задач), контент-упоминания в `src/data/reviews.ts` и др. |
| **Фортуна (колесо)** | Скидка на последние места: активна в последние 3 дня перед стартом и при ≤3 свободных местах (`FORTUNE_WINDOW_DAYS=3`, `FORTUNE_LAST_SPOTS=3`). | `src/data/dynamicPrices.ts` — `isFortuneActive()`, карта `FORTUNE` |
| **SEASON_YEAR** | Год текущего сезона для маркетинговой прозы; НЕ для ISO-дат смен и не для исторических фактов. | `src/data/shifts.ts` — константа `SEASON_YEAR` |

Термин **«ПФ»** в коде и доках этого репо не встречается — см. [открытые вопросы](#открытые-вопросы-владельцу).

---

## 2. Потоки между модулями

### 2.1. Цена/смены — эталонный поток

Один источник данных + одно правило роста; всё остальное выводится. Никаких хардкодов
цен/дат вне `shifts.ts` — это защищено стражами, роняющими билд.

```
src/data/shifts.ts                 ← ЕДИНСТВЕННОЕ место правки цен/дат/состава смен
  ├─ SHIFT_META                    базовая цена, startDate/endDate, длительность
  └─ mainShifts / shortShifts      какие смены открыты к брони
        │
        ▼
src/data/dynamicPrices.ts          правило роста поверх SHIFT_META
  └─ getCurrentPrice(shiftId)      база → +5 % за 30 дней → +500 ₽/день → фикс на старте
        │
        ├──▶ компоненты сайта      напр. src/components/SchemaOrg.astro
        │                          (импортирует mainShifts/shortShifts + getCurrentPrice —
        │                           SEO-разметка видит только открытые смены и живую цену)
        ├──▶ бот                   src/lib/ai/campData.ts: цены через getCurrentPrice(),
        │                          фильтр смен по mainShifts/shortShifts (BOOKABLE),
        │                          вычеты через getTaxDeduction() — без хардкодов
        └──▶ стражи                npm run check:prices (scripts/check-price-drift.sh),
                                   npm run check:dates (scripts/check-date-drift.sh) —
                                   входят в npm run guard, который входит в npm run build
```

Следствия (из CLAUDE.md, секция «Единый источник смен, дат и цен»):
- завершить/открыть смену = добавить/убрать её в `mainShifts`/`shortShifts` — одно место;
  бот и SEO фильтруются автоматически;
- менять правило роста = менять только константы `RAMP_DAYS`/`STEP_PCT`/`DAILY_INC`
  в `dynamicPrices.ts`;
- литерал цены/даты смены вне `shifts.ts` роняет билд (`check:prices`/`check:dates`).

### 2.2. Заявка (lead)

```
Формы (компоненты, импортируют form-submit):
  LeadForm.astro · MomStory.astro · ExitIntentPopup.astro · shifts/ShiftBookModal.astro
  (также LastMinuteWidget, SeasonPreRegister, ReturnBanner — grep по «form-submit»)
        │  submitLead({phone, age, shift, source, form, call_time})
        ▼
src/scripts/form-submit.ts (клиент)
  · цель Метрики form_submit (trackGoal)
  · collectContext(): UTM/yclid/ysclid/gclid (из URL, с сохранением в localStorage —
    переживает возврат через день), landing_url, referrer, device/browser,
    screen/viewport/language/tz, session_ms (старт сессии ставит Base.astro)
  · getYmClientId() — clientID Метрики (callback ≤300 мс, fallback cookie _ym_uid)
  · getUbtcuid()/getDomainUserId() — идентификаторы Andata (cookie ubtcuid, Snowplow _sp_id)
  · POST /api/lead → после успеха пиксель Mail.ru/VK (_tmr reachGoal 'lead')
        │
        ▼
src/pages/api/lead.ts (сервер, prerender=false) — по шагам:
  1. Валидация телефона (≥10 цифр) → иначе 400 invalid_phone
  2. saveLead() — ФС-бэкап: append в /var/www/aidacamp-dev/leads/leads.jsonl (best-effort)
  3. createCrmLead() — AlfaCRM (таймаут 8 с): auth/login → customer/create, филиал 5
     (branch_ids:[5]), lead_source_id по mapLeadSourceId() (UTM/реферер →
     20 Директ / 8 ВК / 17 WhatsApp / 10 Телеграм / 14 Поиск / 9 Сайт),
     note = buildCrmNote() (смена, UTM, URL, устройство, clientID Метрики),
     кастомные поля Andata (ubtcuid/domain_userid/ym_uid — если коды заданы в .env)
  4. saveLeadToPg() — INSERT в leads_log (PG): вся атрибуция + crm_id + ip/user_agent +
     visitor_id (first-party cookie aid_visitor через src/lib/attribution/cookie.ts)
  5. Andata order_new — fire-and-forget, только если CRM создал лид
     (order_id == customer_id, чтобы cron связал будущую оплату order_paid)
  6. Telegram sendMessage (таймаут 5 с) — buildTgText(); недоставка TG НЕ роняет ответ
     клиенту (заявка уже в ФС/CRM/PG → ok:true, tg:false)
```

Дедупликации заявок в коде `api/lead.ts` **нет** — см. открытые вопросы.

### 2.3. Ask-бот

```
src/pages/ask.astro (страница /ask/)
        │  <script> import '../scripts/pages/ask'
        ▼
src/scripts/pages/ask.ts (клиент, чат-UI)
  · fetch('/api/ask') — основной диалог
  · fetch('/api/ask-feedback') — оценка ответа
  · fetch('/api/contact-send'), fetch('/api/lead') — эскалация в контакт/заявку из чата
        │
        ▼
src/pages/api/ask.ts (сервер) — конвейер запроса:
  1. Параллельно: ragSearch(message) (src/lib/ai/rag.ts, PG) + classifyIntent(message)
     (src/lib/ai/intent_router.ts)
  2. buildSystemPrompt() (src/lib/ai/systemPrompt.ts) — факты лагеря из
     src/lib/ai/campData.ts (смены/цены — см. поток 2.1)
  3. PHOTO FAST-PATH: «фото <тема>» → findPhotos() (src/lib/ai/photoSearch.ts),
     ответ block_type:'gallery' БЕЗ вызова LLM
  4. ESCALATION ROUTER: 12 готовых шаблонов (src/lib/ai/escalation_templates.ts) —
     совпало → готовый ответ + контактные chips, БЕЗ генерации
  5. intentBoost по режимам: story (одна реальная история через pickRealStory,
     RAG-контекст отключается), fact_lookup, experience
  6. Anthropic messages.create: primary claude-sonnet-4-5 (A/B ?m=haiku и заголовок
     X-Audit форсируют Haiku), fallback на вторую модель; basePrompt кэшируется
     (prompt caching, cache_control ephemeral), volatile-суффикс — нет
  7. Парсинг JSON из ответа → zod-схема ResponseSchema (src/lib/ai/responseSchema.ts):
     text, block_type (smeny/prices/gallery/…), block_data, chips (≤4)
  8. validateBotResponse() (src/lib/ai/validator.ts) + logGuardFlag() — пост-проверка
     честности ответа
  9. logSession() — лог диалога в PG ai_ask_sessions (latency, модель, токены);
     при таймауте — TIMEOUT_FALLBACK с контактами Дарьи
```

### 2.4. Медиа

Источники: CLAUDE.md (секция «МЕДИА И ФАЙЛЫ — ЕДИНОЕ ХРАНИЛИЩЕ»), `scripts/deploy.sh`,
ADR-001/ADR-002, PR #1027.

```
/var/www/aidacamp-media/            ← единое хранилище на сервере (images/, videos/, docs/)
        │
        ├─ nginx alias: /images/ и /videos/ на prod И dev отдаются напрямую отсюда —
        │  залил один раз → видно на обоих окружениях, никакой синхронизации
        │  (snippet /etc/nginx/snippets/aidacamp-site-media.conf — PR #1027)
        │
        ├─ в рабочих копиях сайта images/, videos/ — симлинки на хранилище
        │  (scripts/deploy.sh: «images/, videos/ — симлинки на /var/www/aidacamp-media/,
        │   не трогаем»)
        │
        └─ новые картинки из репо (public/images/) доезжают в хранилище при деплое:
           deploy.sh, rsync --ignore-existing — серверная копия авторитетна
```

Репо держится без бинарей (тяжёлые медиа вынесены, −80 МБ — PR #1027).
⚠️ Префикс `/video/` целиком алиасить нельзя: под ним живут HTML-страницы
`src/pages/video/[slug].astro` и `index.astro` (подробно — ADR-002).

### 2.5. Деплой

Пересказ по DEV_PROTOCOL.md (раздел «Прод — автоматически, руками не катят») —
источник правды там, здесь только схема:

```
push/merge PR в dev  →  .github/workflows/deploy.yml:
  деплой dev → smoke dev → merge dev→main → деплой prod → smoke prod
                  ↓ красный                                  ↓ красный
              поезд встал                              авто-откат прода (backup-*)
```

Три рубежа защиты (DEV_PROTOCOL.md):
1. `quality-gate.yml` — `check:banned`, `check:prices`, `build`;
2. smoke на dev — прод не поедет, пока dev красный;
3. авто-откат на последний `backup-*`, если верификация или smoke прода провалились.

`main` **мержится**, а не ресетится (после инцидента 2026-07-07 с `reset --hard`).
Стоп-кран: выключить workflow `Deploy` в GitHub Actions либо `workflow_dispatch`
с галкой `skip_prod`. Ручной откат: `./scripts/rollback.sh prod [backup-…]`.
Запасной путь без Actions: `MASTER_AGENT=1 ./scripts/deploy.sh prod`.

---

## 3. Открытые вопросы владельцу

Что **не удалось подтвердить кодом или доками репо** — в документ выше не включено:

1. **«ПФ»** — термин из брифа глоссария в коде и доках этого репо не встречается
   (grep по CLAUDE.md/DEV_PROTOCOL.md/AGENTS.md/TOOLS.md и `src/` — пусто).
   Зафиксировать определение и место, где он живёт (внешний сервис?), или убрать
   из глоссария окончательно.
2. **Дедупликация заявок** — в `src/pages/api/lead.ts` кода дедупа нет (grep
   «dedup/дедуп» — пусто). Если дедуп существует — он вне этого репо (сервер? SQL?).
   Где именно — и надо ли отразить в потоке 2.2?
3. **ADR-002, «4 точечных файла» под `/video/`** — содержимое серверного snippet
   `/etc/nginx/snippets/aidacamp-site-media.conf` из репо не проверяется (конфиг
   живёт на сервере). Факт зафиксирован со слов сессии ревью 17.07.2026; наличие
   HTML-страниц `src/pages/video/[slug].astro` + `index.astro` кодом подтверждено.
4. **Формулировка промоута dev→main** — в постановке задачи фигурирует
   «ff-промоут dev→main»; DEV_PROTOCOL.md говорит «`main` мержится, а не ресетится»
   (шаг `merge dev→main` в deploy.yml). В документе взята формулировка
   DEV_PROTOCOL.md как источника в репо. Если реально ff-only — уточнить
   в DEV_PROTOCOL.md.
5. **«Отряд»** — в коде сайта нет отдельной сущности (только строки задач
   в staff-планировщике). Считать ли термин доменным для сайта, или он целиком
   уезжает в будущую CRM?
6. **Число лендингов в `src/data/landings/`** — CLAUDE.md пишет «уже 17 записей»;
   на дату этого документа в `index.ts` действительно 17 гео-конфигов, но цифра
   в CLAUDE.md будет протухать. Может, убрать конкретное число из CLAUDE.md?

---

*Создано 2026-07-17. При изменении потоков — обновлять этот файл и/или добавлять ADR.*
