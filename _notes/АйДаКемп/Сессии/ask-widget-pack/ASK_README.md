# `/ask/` widget — чат-бот на сайте АйДаКемп

> **Статус (2026-04-23):** ✅ Задеплоено на `dev.aidacamp.ru`
> - FastAPI бэкенд работает на порту 8001 (`ask-api.service`)
> - nginx маршрутизирует `/api/ask*` → FastAPI (только на dev; прод ждёт команду «выкатываем»)
> - 3 таблицы созданы и заполнены: 5 FAQ + 12 программ (6 смен + 6 курсов)
> - Лиды пишутся в `ai_customers` + `ai_dialogs` → утренний пайплайн Дарьи
> - Astro-фронтенд: работает на Claude Haiku (текущий `/api/ask` в Astro)
> - FastAPI (GPT-4o-mini) — параллельный бэкенд, переключение через nginx-конфиг

## Что это

FastAPI бэкенд для публичного чат-виджета на сайтах codims.ru / aidacamp.ru.
Использует существующую инфру (Postgres, pgvector, OpenAI) — добавляет только
2-3 свои таблицы.

## Архитектура (минимум)

```
┌────────────────────────────────────────┐
│ ai_faq_rag       — курированные FAQ    │  ← новая таблица
│ ai_program_facts — точные цены/расп.   │  ← новая таблица
│ ai_ask_sessions  — лог сессий          │  ← новая таблица
└──────┬─────────────────────────────────┘
       │
       │ JOIN/SHARE с CLS:
       ▼
┌────────────────────────────────────────┐
│ ai_site_rag      — chunks сайтов       │  ← общая (CLS scraper обновляет)
│ ai_dialogs       — все переписки        │  ← общая (лиды от /ask/ сюда)
│ ai_customers     — клиенты              │  ← общая (новые лиды сюда)
└────────────────────────────────────────┘
```

## Файлы в пакете

| Файл | Что |
|---|---|
| `ask_widget_schema.sql` | DDL для 3 новых таблиц + 5 базовых FAQ |
| `ask_api.py`            | FastAPI скелет с 2 endpoints (`/api/ask`, `/api/ask/lead`) |
| `ASK_README.md`         | Этот файл |

## Установка (уже выполнено на сервере)

```bash
# ✅ Таблицы созданы (схема из ask_widget_schema.sql)
# ✅ FastAPI установлен: /opt/aidacamp-tools/venv/bin/pip install fastapi uvicorn psycopg2-binary
# ✅ Бэкенд: /opt/aidacamp-tools/ask_api.py

# ✅ env-файл (без секретов в тексте сервиса):
# /opt/aidacamp-tools/ask-api.env  ← OPENAI_API_KEY + DB_DSN

# ✅ systemd unit: /etc/systemd/system/ask-api.service
#    EnvironmentFile=/opt/aidacamp-tools/ask-api.env
#    ExecStart=...uvicorn ask_api:app --host 127.0.0.1 --port 8001 --workers 2

# ✅ nginx dev.aidacamp.ru: location ^~ /api/ask { proxy_pass http://127.0.0.1:8001; }
# ⏳ nginx aidacamp.ru (прод): не добавлено — ждёт команды «выкатываем»

# ✅ Права БД: aidacamp-пользователь имеет SELECT/INSERT/UPDATE на все нужные таблицы
#    (ai_faq_rag, ai_program_facts, ai_ask_sessions, ai_customers, ai_dialogs, ai_site_rag)

# Smoke test
curl https://dev.aidacamp.ru/api/ask/health
curl -X POST https://dev.aidacamp.ru/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"Сколько стоит лагерь?","project":"CAMP"}'
```

### Важные отличия от исходного шаблона

| Параметр | В шаблоне | Как реально |
|---|---|---|
| DB user | `user=postgres` (peer auth → ошибка) | `user=aidacamp password=aidacamp2026` |
| Секреты в сервисе | `Environment=KEY=value` inline | `EnvironmentFile=/opt/.../ask-api.env` |
| FAQ embeddings | заполнять вручную | автоматически при старте сервиса (`@app.on_event("startup")`) |

## API контракт

### POST `/api/ask`
**Запрос:**
```json
{
  "session_id": "optional-cookie-uuid",
  "question": "Сколько стоит Python для подростка?",
  "project": "KODIT",
  "history": [
    {"role":"user","content":"А с какого возраста?"},
    {"role":"assistant","content":"С 10 лет на базовом, с 12 на PRO."}
  ],

  "_comment_level1": "Откуда пришёл пользователь — собирает frontend, отправляет при каждом вопросе",
  "current_url":   "https://codims.ru/python",
  "referrer":      "https://google.com/search?q=курсы+программирования+москва",
  "utm_source":    "yandex",
  "utm_campaign":  "kids_python_summer",

  "_comment_level2": "Что делал в рамках этой сессии",
  "page_path":         ["/", "/python", "/prices", "/python"],
  "time_on_site_sec":  187,

  "_comment_state": "Что пользователь уже выбрал в UI (фильтры, возраст и т.д.)",
  "page_state": {
    "selected_age":     11,
    "selected_program": "Python базовый"
  }
}
```

> **Все новые поля опциональны.** Старый клиент (без этих полей) работает без изменений.

**Что бот делает с этим контекстом:**
- Если `page_state.selected_age = 11` → бот пишет «Вижу, вы смотрите на программы для детей около 11 лет — ...» и фильтрует релевантные программы.
- Если пользователь говорит «нет, я ошибся» → бот игнорирует `page_state` для этого и последующих ответов (правило 7 в системном промпте).
- `page_path` типа `/ → /python → /prices` → бот понимает что человек уже изучал цены и не пересказывает базовое.
- `utm_source=vk` → бот может сказать «рады что нашли нас ВКонтакте» (если захотите добавить в промпт).
**Ответ:**
```json
{
  "session_id": "abc-123-uuid",
  "answer": "Python базовый — 15 000 ₽/мес, 4 урока. Расписание Сб 14:00 или Вс 12:00.",
  "suggest_lead": false,
  "sources": [
    {"type":"faq","q":"Сколько стоит занятие?","sim":0.84},
    {"type":"site","url":"https://codims.ru/python","sim":0.76}
  ]
}
```

### POST `/api/ask/lead`
**Запрос:** (вызывает frontend когда пользователь оставляет телефон)
```json
{
  "session_id": "abc-123-uuid",
  "phone": "+7 999 123 4567",
  "name": "Анна",
  "project_interest": "KODIT",
  "note": "Сын 11 лет, интересуется Python"
}
```
**Эффект:**
- Создаёт/находит клиента в `ai_customers` (status=lead)
- Сохраняет полный transcript в `ai_dialogs` (source=ask_widget)
- Помечает `ai_ask_sessions.led_to_lead=true`
- **На следующее утро** Дарья видит этого лида в digest CLS — и связывается лично

## Frontend: как собирать и отправлять контекст

### Готовый сниппет (вставить в `<script>` перед виджетом)

```javascript
// ── ask-widget-context.js ─────────────────────────────────────────
// Вставить ОДИН РАЗ на каждую страницу сайта до подключения виджета.
// Совместим с любым фреймворком (vanilla JS, Vue, React, Next.js).

const ASK_SESSION_KEY = 'ask_ctx';

(function initAskContext() {
  const stored = JSON.parse(sessionStorage.getItem(ASK_SESSION_KEY) || '{}');

  // ── Level 1: откуда пришёл (берём один раз при первой загрузке) ──
  if (!stored.session_start) {
    stored.session_start  = Date.now();
    stored.referrer       = document.referrer || null;

    // UTM из URL
    const sp = new URLSearchParams(window.location.search);
    stored.utm_source     = sp.get('utm_source')   || null;
    stored.utm_medium     = sp.get('utm_medium')   || null;
    stored.utm_campaign   = sp.get('utm_campaign') || null;
  }

  // ── Level 2: история навигации (добавляем каждую страницу) ───────
  const path = window.location.pathname;
  const hist = stored.page_path || [];
  if (hist[hist.length - 1] !== path) {   // не дублируем одну страницу подряд
    hist.push(path);
    if (hist.length > 20) hist.shift();   // храним последние 20 страниц
  }
  stored.page_path    = hist;
  stored.current_url  = window.location.href;

  sessionStorage.setItem(ASK_SESSION_KEY, JSON.stringify(stored));
})();

// ── Хелпер для виджета: собирает payload для POST /api/ask ──────────
window.askGetContext = function(pageState) {
  const s = JSON.parse(sessionStorage.getItem(ASK_SESSION_KEY) || '{}');
  return {
    current_url:      s.current_url   || window.location.href,
    referrer:         s.referrer      || null,
    utm_source:       s.utm_source    || null,
    utm_campaign:     s.utm_campaign  || null,
    page_path:        s.page_path     || [window.location.pathname],
    time_on_site_sec: s.session_start
                        ? Math.floor((Date.now() - s.session_start) / 1000)
                        : null,
    page_state:       pageState || null,   // передаёт виджет (см. ниже)
  };
};
```

### Как подключить к виджету

```javascript
// В вашем виджете при отправке вопроса:

async function sendQuestion(question, history) {
  // page_state — что сейчас выбрано в UI этой страницы
  const pageState = {
    selected_age:     ageSlider?.value     ?? null,   // число (лет)
    selected_program: programSelect?.value ?? null,   // строка
    selected_shift:   shiftPicker?.value   ?? null,   // "Смена 1" / null
    // можно добавлять свои поля — бот увидит их в контексте
  };

  const ctx = window.askGetContext(pageState);   // из сниппета выше

  const body = {
    session_id: getOrCreateSessionId(),   // uuid в cookie
    question,
    project:   detectProject(),           // "CAMP" | "KODIT" | "BOTH"
    history:   history.slice(-6),         // последние 3 пары
    ...ctx,                               // spread Level 1 + 2 + page_state
  };

  const res = await fetch('/api/ask', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json();
}
```

### Сценарий: пользователь выбрал возраст, потом передумал

```
1. Мама выбирает в слайдере «10 лет» → page_state.selected_age = 10
2. Пишет в чат: «Сколько стоит?»
   → Бот: «Вижу, вы смотрите на программы для детей 10 лет — Python базовый
            стоит 15 000 ₽/мес, 4 урока...»

3. Мама: «Ой, я нажала не то, ему 13»
   → Бот принимает поправку, отвечает про возраст 13
     (правило 7 системного промпта: «если человек говорит что ошибся — прими»)

4. Слайдер на странице теперь 13 → page_state.selected_age = 13
   → Следующий вопрос уже приходит с правильным age
```

> **Важно:** виджет всегда передаёт `page_state` исходя из *текущего* состояния UI.
> Если пользователь передвинул слайдер — следующий запрос автоматически несёт
> новый возраст, никакой логики в боте для этого не нужно.

---

## Работа с FAQ — где брать данные

3 источника (в порядке приоритета):

### 1. Manual curation (start)
Заполняйте `ai_faq_rag` руками 50-100 типичных вопросов:
```sql
INSERT INTO ai_faq_rag (project, question, answer, tags, status)
VALUES ('KODIT', 'Можно ли заниматься онлайн?',
        'Да, у нас есть онлайн-формат для тех кто не из Москвы. Тот же преподаватель, та же программа, занятия в zoom-комнате.',
        ARRAY['format','online'], 'active');
```

### 2. Из реальных диалогов (best signal)
В `ai_dialog_rag` уже 3 886 пар (клиент → ответ Дарьи). Можно вытащить
самые частые типы вопросов через clustering, ANONYMIZE, проверить
руками, перенести в `ai_faq_rag`. Скрипт-помощник:
```sql
-- Топ-50 паттернов вопросов клиентов
SELECT client_msg, manager_reply, COUNT(*) OVER () AS total
FROM ai_dialog_rag
WHERE LENGTH(client_msg) BETWEEN 30 AND 150
ORDER BY embedding <=> (SELECT embedding FROM ai_dialog_rag WHERE id=1)
LIMIT 50;
```

### 3. Из реальных запросов на /ask/
Каждые 1-2 недели:
```sql
SELECT user_q, COUNT(*) AS n
FROM ai_ask_sessions
WHERE bot_a LIKE '%оставьте телефон%'      -- бот не смог ответить
GROUP BY user_q ORDER BY n DESC LIMIT 30;
```
Эти вопросы — gap в FAQ. Найти ответы → INSERT.

## Что считается «не нужно» делать

- ❌ Не использовать `ai_customer_scores` / `ai_next_actions` — это про 
  существующих клиентов CRM, не про анонимных посетителей
- ❌ Не подключать voice/Whisper — сайт = текст
- ❌ Не делать fine-tune под публичный бот — RAG + хороший промпт хватит
- ❌ Не давать боту доступ к `ai_dialog_rag` напрямую — там реальные имена/
  номера. Использовать только anonymized → `ai_faq_rag`.
- ❌ Не хранить PII в `ai_ask_sessions` сверх анонимного uuid

## Bridge с CLS — как работает воронка

```
1. Аноним заходит на codims.ru → виджет /ask/ → задаёт вопросы
2. Бот отвечает из ai_faq_rag + ai_site_rag + ai_program_facts
3. Если уверенности нет ИЛИ человек проявил интерес:
   виджет показывает форму «оставьте телефон»
4. Пользователь оставляет → POST /api/ask/lead
5. Backend:
   - INSERT INTO ai_customers (status='lead', source='ask_widget')
   - INSERT INTO ai_dialogs (full transcript)
   - UPDATE ai_ask_sessions SET led_to_lead=true
6. Завтра 08:00 MSK CLS morning_pipeline:
   - rescore — этот лид появится с relevant сигналами (свежий, активный)
   - generate next_action — Claude видит transcript из /ask/, формирует личный текст для Дарьи
   - digest — Дарья видит «Анна — сын 11 лет, спрашивала про Python вчера на сайте»
7. Дарья пишет лично через WA, конвертирует в платящего
```

## KPI и мониторинг

В дашборде следить:
```sql
-- Конверсия /ask/ в лиды
SELECT date_trunc('day', ts) AS day,
       COUNT(*) AS sessions,
       COUNT(*) FILTER (WHERE led_to_lead) AS leads,
       ROUND(100.0 * COUNT(*) FILTER (WHERE led_to_lead) / COUNT(*), 1) AS conv_pct
FROM ai_ask_sessions
GROUP BY 1 ORDER BY 1 DESC LIMIT 14;
```

```sql
-- Самые частые вопросы где бот не справился (= нужны новые FAQ)
SELECT user_q, COUNT(*) n
FROM ai_ask_sessions
WHERE bot_a ILIKE '%оставьте телефон%' OR bot_a ILIKE '%не уверен%'
GROUP BY user_q ORDER BY n DESC LIMIT 20;
```

## Стоимость

- Embeddings (per query): ~$0.000001 (text-embedding-3-small, 1 запрос/вопрос)
- LLM (per query): gpt-4o-mini ~$0.0002 (input + output)
- При 100 диалогов/день: ~$1/мес OpenAI

= в пределах общего лимита CLS.

## Расширения, если позже понадобится

| Что | Когда добавлять |
|---|---|
| Streaming ответов (SSE) | Когда ответы > 200 символов и лежат >2с |
| Multi-language (en/ar) | Когда придут международные посетители |
| Voice in (audio recording в виджете) | Если 30%+ мобильного трафика, и метрика покажет что текстом не справляются |
| TTS (озвучка ответа) | Низкий приоритет — на сайте текст быстрее |
| Цитирование sources в UI | Сразу как фронт готов — повышает доверие |
| Throttling/CAPTCHA | После первого abuse-incident |
| A/B тест двух промптов | Через 2-4 недели когда соберётся baseline |

---

## UI-блоки Astro-фронтенда (ask.astro)

Бот может вернуть `block_type` — фронтенд рендерит интерактивный блок под текстом.

| block_type | Что показывает | Данные |
|---|---|---|
| `smeny` | Карточки смен с датами, ценами, заполненностью | из campData / shifts.json |
| `courses` | Программы обучения, фильтр по возрасту | `{"age": N}` опционально |
| `day_schedule` | Распорядок дня по часам | статика |
| `conditions` | Проживание, безопасность, питание | статика |
| `prices` | Разбивка стоимости + налоговый вычет | статика |
| `location` | Как добраться, трансфер | статика |
| `gallery` | 3 фото из лагеря по теме запроса | `{"photos": [...]}` от findPhotos() |
| `video_player` | Kinescope-видео по теме | `{"video_id":"...", "title":"..."}` |
| `youtube_comment` | Карточка реального комментария с YouTube | нет данных, контент захардкожен |

### youtube_comment — социальное доказательство

Показывается **не чаще 1 раза за диалог**, только когда человек выражает интерес к записи.
Ссылается на ролик: https://youtube.com/shorts/nw2xsVt31JU
Комментарий: *«мне 21, херачу на заводе, но всё равно хочу к вам в лагерь»* — @AntonPatrakov

Задача блока — мягкое социальное доказательство без давления. Не отзыв родителя, 
а живая эмоция случайного человека: продукт настолько хорош, что даже взрослые хотят.

## Идеи для WOW-эффекта (не реализованы)

- **smeny**: прогресс-бар заполненности с анимацией; огонь на самой популярной смене
- **prices**: калькулятор вычета — сумма «отсчитывается» вниз как на табло
- **day_schedule**: timeline с stagger-анимацией, текущее время подсвечено
- **gallery**: masonry + lightbox при тапе
- **chips**: пульсирующая точка на «Последние места»; easter egg конфетти на «хочу в лагерь»
- Библиотека: **Satori+resvg-js** (PNG-карточки смен без браузера) или **GSAP** для анимаций

---

**Контакт по интеграции**: пиши в общий чат, на сервере уже есть всё нужное —
никаких дополнительных ключей или серверов не требуется.
