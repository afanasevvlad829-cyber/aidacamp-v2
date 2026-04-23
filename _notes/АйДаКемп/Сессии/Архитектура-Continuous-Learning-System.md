# Continuous Learning System — архитектура

> Описание для стороннего инженера: как устроена самообучающаяся диалоговая
> система менеджера в АйДаКемп / АйДаКодить. Цель документа — позволить
> повторить архитектуру у себя или сравнить со своим решением.

Дата актуальности: 2026-04-22

---

## 0. Контекст бизнеса

**АйДаКемп** — детский летний IT-лагерь.
**АйДаКодить** (codims.ru) — школа программирования (учеба сентябрь–май).

**Боль**: один владелец-маркетолог (Влад) + один менеджер (Дарья).
В CRM накоплено 965 клиентов, 60k сообщений переписки. Большинство «уснувших»
клиентов реактивируются при правильном касании, но времени на ручной анализ
истории по каждому нет.

**Цель**: автоматическая система, которая каждое утро говорит менеджеру
«сегодня напиши этим 12 клиентам, вот готовые тексты в твоём стиле», умеет
вести диалог с менеджером (text/voice), учится на её feedback.

---

## 1. Общая архитектура

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ИСТОЧНИКИ (continuous)                            │
├─────────────────────────────────────────────────────────────────────────┤
│ • AlfaCRM      — школьная CRM (sync каждые 6ч)                          │
│ • Telegram     — Chrome-extension scrapes user accounts → ai_dialogs    │
│ • WhatsApp     — Green-API webhook → ai_dialogs                         │
│ • Сайты        — daily scrape с sitemap.xml + recursive crawl           │
│ • Метрика/Direct/VK Ads — REST API (daily snapshots)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       POSTGRES (single source of truth)                 │
├─────────────────────────────────────────────────────────────────────────┤
│ Operational tables:                                                     │
│   ai_customers, ai_dialogs, ai_customer_scores, ai_next_actions         │
│   ai_user_preferences, ai_decisions, ai_hypotheses, ai_context_items    │
│   ai_conversations (thread memory с менеджером)                         │
│   ai_feedback_log (все клики/ответы менеджера)                          │
│                                                                         │
│ Vector tables (pgvector, dim=1536, OpenAI embedding-3-small):           │
│   ai_dialog_rag    — пары (client_msg, manager_reply) с embeddings      │
│   ai_customer_brief — короткие саммари по каждому клиенту               │
│   ai_site_rag      — chunks страниц сайтов                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       LLM-агенты (cron-driven)                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Daily Intelligence (23:55 MSK)  — анализ дня для владельца              │
│ Critical Monitor (каждые 3ч)    — кратко DoD-аномалии Direct/VK         │
│ Budget Pace (каждые 6ч)         — расход vs план                        │
│ Morning Pipeline (08:00 MSK):                                           │
│   ├─ fuzzy-link новых dialogs                                           │
│   ├─ rescore 965 клиентов по 5 осям                                     │
│   ├─ generate next_actions для HOT/WARM (с RAG)                         │
│   └─ digest менеджеру: 12 клиентов с готовыми текстами                  │
│ Darya Feedback Agent (каждую минуту):                                   │
│   ├─ poll Green-API, ловит text/voice от менеджера                      │
│   ├─ voice → OpenAI Whisper API (fallback: local faster-whisper)        │
│   ├─ Claude разговорный агент с thread memory                           │
│   └─ применяет mark/propose_rule/apply_rule, отвечает менеджеру         │
│ Continuous Ingest (каждый час)  — embed новых dialog pairs + briefs     │
│ Site Scraper (04:30 UTC)        — refresh sitemap + recrawl             │
│ AlfaCRM Sync (каждые 6ч)        — upsert клиентов                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       ИНТЕРФЕЙСЫ                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ • Telegram Bot      → owner (digest, аномалии, daily intelligence)      │
│ • Green-API TG      → manager (digest клиентов, conversational)         │
│ • Chrome ext        → AlfaCRM briefing (планируется)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Slой обучения — три механизма

Система комбинирует **3 разных способа обучения**, каждый имеет свою нишу.

### 2.1. Rule-based (явные правила в БД)

**Где живёт**: `ai_user_preferences (key, value, weight)`
**Как пополняется**: менеджер во время диалога говорит боту
«не присылай таких» → Claude парсит, формулирует правило, спрашивает
подтверждения, после `apply_rule` — INSERT в БД.

**Используется**: подаётся в каждый системный промпт (в блоке
«АКТИВНЫЕ ПРАВИЛА»). LLM учитывает при генерации.

**Сильно**: явный, аудитируемый, мгновенно меняется, обратимо.
**Слабо**: обновление только по явному feedback менеджера.

### 2.2. RAG (in-context retrieval из embeddings)

**Где живёт**: `pgvector` индексы, dim=1536 (OpenAI text-embedding-3-small)
- `ai_dialog_rag` — реальные пары «клиент написал X → менеджер ответил Y»
  (3 886 пар на старте, растёт каждый час)
- `ai_customer_brief` — 1-2 предложения о каждом клиенте
- `ai_site_rag` — chunks страниц сайтов (цены, программы, FAQ)

**Как пополняется**: cron `rag_continuous` каждый час забирает новые
пары из `ai_dialogs` (где `customer_id IS NOT NULL`) → embed → INSERT.
Сайты — daily scrape с разностной перезаписью.

**Используется**: при генерации `next_actions` для клиента — embed его
последнего сообщения, retrieve top-5 похожих кейсов, кладём в промпт
как «вот как мы отвечали в похожих случаях». LLM мимикрирует стиль.

**Сильно**: всегда свежая база, retrieval по смыслу, дёшево
($0.004 за 4k embeddings, <100ms на запрос).
**Слабо**: знание не «в крови» модели, надо подавать в каждый запрос
→ длинный промпт.

### 2.3. Fine-tuning (стиль в весах модели)

**Где живёт**: custom модель на OpenAI, наследник `gpt-4o-mini`,
`ft:gpt-4o-mini:aidacamp:dialog:xxx`
**Как создаётся**:
1. Извлекаем из `ai_dialogs` ~3 000 quality pairs (filtered by length,
   no spam)
2. Форматируем в OpenAI jsonl chat-completions формат:
   ```json
   {"messages": [
     {"role":"system","content":"Ты менеджер АйДаКодить..."},
     {"role":"user","content":"<сообщение клиента>"},
     {"role":"assistant","content":"<реальный ответ Дарьи>"}
   ]}
   ```
3. Upload файла + создание fine-tune job через REST API
4. ~3 часа training на GPU кластере OpenAI, ~$18 для нашего объёма
5. На выходе — модель которая «впитала» стиль, обороты, цены, факты

**Используется**: после деплоя — заменяет/комплементирует Haiku
в генерации. Промпт укорачивается (не нужно пихать примеры — модель
их «помнит»).

**Сильно**: естественная мимикрия стиля, ниже latency, ниже стоимость
inference.
**Слабо**: устаревает (надо retrain раз в месяц-два), может зазубрить
конкретные имена/цифры (privacy concern), 3ч на цикл.

### 2.4. Сочетание трёх

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Rules    │     │ RAG          │     │ FT       │
│          │     │              │     │          │
│ "Не шли  │     │ "В похожем   │     │ "Стиль   │
│ активных │     │ случае мы    │     │ Дарьи    │
│ платящих"│     │ отвечали:..." │     │ зашит    │
│          │     │              │     │ в веса"  │
└─────┬────┘     └───────┬──────┘     └─────┬────┘
      │                  │                  │
      └────────────┬─────┴──────────────────┘
                   ↓
        Финальный системный промпт:
        - SYSTEM: «Ты менеджер...» (для FT — короче)
        - RULES: <активные правила>
        - RAG: <5 похожих диалогов>
        - CONTEXT: <карточка клиента>
        - USER: <последнее сообщение>
                   ↓
        ft:gpt-4o-mini-aidacamp генерит ответ
                   ↓
        Менеджер видит → reply (text/voice) → loop замыкается
```

---

## 3. Конкретные технологии

| Слой | Что |
|---|---|
| OS / runtime | Ubuntu 22 на Beget VPS (Linux, 29GB SSD, без GPU) |
| База | PostgreSQL 14 + расширение **pgvector** (HNSW индекс) |
| Voice in | OpenAI **whisper-1** (primary), local **faster-whisper small** (fallback) |
| LLM operational | Anthropic **Claude 3.5 Haiku** через **OpenRouter** |
| LLM custom | Fine-tuned **gpt-4o-mini** на 2 971 наших пар |
| Embeddings | OpenAI **text-embedding-3-small** (1536 dims, $0.02/1M) |
| Бот для владельца | Telegram Bot API (long-poll каждую минуту) |
| Бот для менеджера | Green-API (TG instance, +79854492780) |
| Оркестрация | Обычный crontab (без n8n / Airflow / Celery) |
| Языки | Python 3.12 (cron scripts) + bash wrappers + SQL |

**Принципиально не используется**:
- Никаких отдельных vector-БД (pgvector в основной Postgres)
- Никакого LangChain / LlamaIndex (raw HTTP к LLM API)
- Никакого Docker per-service (только контейнер для прежнего n8n,
  отключён)
- Никаких message-брокеров (cron + БД достаточны при нашем масштабе)

---

## 4. Поток обработки одного клиента

Прохождение одного «утреннего касания» end-to-end:

```
1. CRON 08:00 MSK → run_morning_pipeline.sh
   ├─ run fuzzy_link.py
   │  └─ JOIN ai_customers ↔ ai_dialogs по phone/tg_username/fuzzy name
   ├─ psql -f materialize_scores.sql
   │  └─ scoring 5 dimensions (engagement, recency, fit, payments, signals)
   │     INSERT INTO ai_customer_scores
   ├─ run_next_actions.sh
   │  └─ для каждого WHERE score >= 50:
   │     ├─ fetch customer_card + last 10 dialogs
   │     ├─ RAG: embed last_in_text → top-5 from ai_dialog_rag
   │     ├─ LLM call (Haiku via OpenRouter):
   │     │   system: "Ты менеджер..."
   │     │   context: scoring + dialogs + RAG hits + active rules
   │     │   ask: "сформулируй 3 варианта сообщения"
   │     ├─ parse JSON, INSERT ai_next_actions
   │     │   (action_type, priority, script_variants jsonb)
   │     └─ next customer
   └─ run_morning_digest.sh
      ├─ SELECT top-12 from ai_next_actions ORDER BY priority DESC
      ├─ форматировать каждый в Telegram message:
      │   • имя, score, платежи, телефон
      │   • 3 варианта текста
      │   • инструкция «не подходит? ответь голосом или текстом»
      └─ Green-API sendMessage → менеджер

2. Менеджер открывает Telegram, видит 12 клиентов
   копирует один из 3 вариантов → отправляет клиенту в WA/TG

3. Менеджер отвечает боту (на конкретное сообщение клиента)
   ├─ голос: «Этого до сентября отложи»
   └─ или текст «Активный, не присылай таких»

4. CRON каждую минуту → run_darya_feedback.sh
   ├─ Green-API getChatHistory → новые incoming
   ├─ если voice → OpenAI Whisper → текст
   ├─ найти связанный customer:
   │   ├─ через quotedMessage.idMessage = ai_next_actions.sent_idmessage
   │   ├─ или recursively через thread_idms[]
   │   └─ или LLM-search по имени из transcription
   ├─ загрузить thread из ai_conversations (last 8 turns по этому клиенту)
   ├─ LLM call:
   │   system: разговорный prompt (action JSON schema)
   │   context: customer card + active rules + thread history
   │   user: новое сообщение Дарьи
   │   → returns {reply_text, action, mark|rule}
   ├─ применить action:
   │   ├─ mark   → UPDATE ai_next_actions.status, cooldown_until
   │   ├─ propose_rule → reply содержит «Применить?» (ждёт ответа)
   │   ├─ apply_rule  → INSERT ai_user_preferences (на будущее!)
   │   └─ none → просто ответ
   ├─ thread.append(user, assistant), save в ai_conversations
   └─ Green-API sendMessage → менеджер видит подтверждение

5. CRON каждый час → rag_continuous.py
   ├─ SELECT новые quality pairs WHERE NOT IN ai_dialog_rag
   ├─ embed batch (OpenAI), INSERT
   └─ briefs для новых HOT/WARM

6. CRON 04:30 UTC → site_scraper.py
   ├─ для каждого base URL:
   │   ├─ fetch sitemap.xml (или crawl главную)
   │   ├─ для каждой страницы: fetch + html→text + chunk(500 words)
   │   └─ embed batch → INSERT ai_site_rag (delete old first)
   └─ страницы стали актуальные на сегодня
```

---

## 5. Тонкости и не-очевидные решения

### 5.1. Почему cron, а не Airflow/Prefect

При наших 10 cron-задач × несколько минут каждая — оверхед оркестратора
больше чем экономия. Bash-wrappers + psql/python/curl покрывают всё.
Когда количество задач превысит ~30 — рефакторинг. Не раньше.

### 5.2. Почему pgvector, а не Pinecone/Weaviate

- Та же БД где живут операционные данные → JOIN'ы между структурой и
  семантикой (например «top-5 RAG hits для этого клиента и WHERE
  customer_id = X»)
- HNSW индекс даёт <100ms на запрос для 4k-50k векторов
- Бесплатно (только дисковое место)
- Один backup — вся система

### 5.3. Почему 3 модели (Haiku + Whisper + ft:4o-mini), а не одна

Каждая на своей нише:
- **Haiku** — дешёвая разговорная модель (короткие ответы, $0.80/1M tokens)
- **Whisper** — speech-to-text, специализирована
- **ft:4o-mini** — стиль менеджера в весах, экономия токенов в промпте

Универсальной выгоднее не бывает.

### 5.4. Почему no fine-tune Claude

Anthropic закрыл fine-tune под Enterprise (~$50k/год). Поэтому FT идёт
через OpenAI на gpt-4o-mini (доступно за $25/1M training tokens).
RAG-слой остаётся на Claude через OpenRouter — он лучший в JSON-output.

### 5.5. Three-way thread linking для conversations

Менеджер может:
1. Reply на конкретное digest-сообщение → находим через
   `ai_next_actions.sent_idmessage`
2. Reply на наш бот-ответ → находим через
   `ai_next_actions.thread_idms[]` (массив)
3. Просто написать сообщение с упоминанием имени → Claude ищет похожих
   по `ai_next_actions` за сегодня (LLM-driven matching)

Если ничего из трёх не сработало — бот говорит «Не понял к какому клиенту,
сделай reply на конкретный блок».

### 5.6. Voice в feedback-loop

OpenAI Whisper-1 как primary (~1с, $0.006/мин), faster-whisper small
как fallback (~3с, бесплатно, offline). Lazy-load модели при первом
вызове, держится в памяти процесса до перезапуска cron.

### 5.7. Privacy

Fine-tuning **может зазубрить конкретные имена/цифры**. Для production
датасет надо anonymize:
- Имена → `[CLIENT_NAME]`
- Телефоны → `[PHONE]`
- Конкретные суммы → `[AMOUNT]₽`
- Адреса → `[ADDRESS]`

Это удаляет identifiable PII из весов. Для нашей текущей итерации
(MVP, не публичная) допустимо без anonymization, но перед commercial
deploy — обязательно.

---

## 6. KPI системы

| Метрика | Цель | Как измеряется |
|---|---|---|
| Reactivated клиентов / месяц | 5-10 | DELTA paid_count для COLD→HOT за период |
| Среднее время Дарьи в day-to-day | -50% | manual self-report + handle counter |
| Accept-rate на digest-варианты | >70% | `ai_feedback_log.verdict='accept'` / total |
| % правил, которые срабатывают | >50% | applied_count в ai_user_preferences |
| Latency utility ответа боту | <5с | tail_latency в darya_feedback.log |
| Стоимость инфраструктуры | <$10/мес | OpenAI/OpenRouter billing |

---

## 7. Известные ограничения и roadmap

### Сейчас работает
✅ Daily digest менеджеру с 12 клиентами + готовыми текстами
✅ Conversational feedback (text + voice) с применением действий
✅ Auto-extension правил через диалог
✅ RAG из реальных диалогов в next_actions
✅ Continuous embedding новых dialogs (hourly)
✅ Site scraping (sitemap-based)
✅ Customer briefs (auto-generated)
✅ Fine-tune training launched (in progress)

### Запланировано
- Подключение fine-tuned модели в A/B vs Haiku
- TTS (бот отвечает голосом если входящее голос)
- Active learning loop (бот сам предлагает правила раз в неделю)
- Style profile learning (отдельные правила для тона)
- Rule auto-pruning (мёртвые правила удаляются)
- Anonymization pipeline для privacy
- Chrome AlfaCRM extension (briefing при открытии карточки)

### Сознательно НЕ делаем
- ❌ Fine-tune для Claude (нет публичного API)
- ❌ Self-host больших моделей (overkill)
- ❌ Migration на n8n/LangChain (cron + bash достаточно)

---

## 8. Стоимость

| Статья | $ /мес |
|---|---:|
| OpenAI Embeddings (3-small) | ~$1 |
| OpenAI Whisper-1 | ~$0.50 |
| OpenAI fine-tune training (1 раз/мес) | $18 |
| OpenAI fine-tune inference | $1-2 |
| Anthropic Claude Haiku via OpenRouter | $1-2 |
| Green-API (TG/WA instances) | уже оплачено |
| VPS (Beget) | уже оплачено |
| **TOTAL** | **~$25-30 / мес** |

При масштабе сейчас (1 менеджер, ~150 HOT/WARM, ~500 LLM calls/день).

---

## 9. Воспроизведение системы у себя

Минимальный путь:

```bash
# 1. Postgres + pgvector
sudo apt install postgresql-14 postgresql-14-pgvector
createdb mydb
psql mydb -c "CREATE EXTENSION vector;"

# 2. Schema (см. файлы в репо)
psql mydb < schema.sql  # ai_customers, ai_dialogs, ai_*

# 3. Загрузить свои данные (CRM + dialogs)
python3 my_crm_sync.py       # клиенты
python3 my_dialog_import.py  # переписки

# 4. Backfill RAG
OPENAI_API_KEY=... python3 rag_backfill.py

# 5. Подготовить fine-tune
python3 finetune_prepare.py   # → /tmp/dataset.jsonl
python3 finetune_launch.py /tmp/dataset.jsonl

# 6. Cron'ы для continuous-loop
crontab -e
# */1 * * * *   /opt/run_feedback.sh
# 10 * * * *    /opt/run_continuous_rag.sh
# 0 5 * * *     /opt/run_morning_pipeline.sh
# 30 4 * * *    /opt/run_site_scraper.sh
# 0 */6 * * *   /opt/run_crm_sync.sh
```

Полный код — в `/opt/aidacamp-tools/` и `_notes/АйДаКемп/Сессии/`.

---

_Документ обновляется по факту изменений. Контакт автора: Влад Афанасьев._
