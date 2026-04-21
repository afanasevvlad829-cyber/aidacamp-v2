# Архитектура n8n + LLM — состояние на 18.04.2026

> Где что крутится, какие задачи решает, что работает, что нет.
> Главная боль: текущие Telegram-сообщения «близко к реальности, но бесполезны для решений».

---

## 1. Где живёт

| Где | Что |
|---|---|
| Хост | `aidacamp.ru` (Beget VPS, Москва) |
| Контейнер | `docker exec n8n` (image `n8nio/n8n:latest`) |
| Порт | `:5678` (через `docker-proxy`, не пробрасывается через nginx) |
| БД | SQLite внутри контейнера: `/home/node/.n8n/database.sqlite` |
| Postgres для бизнес-данных | тот же `aidacamp` Postgres (peer auth от user `postgres`) |
| Workflows | хранятся в SQLite, экспорт через `docker cp` + `sqlite3` |

**Чтобы посмотреть workflows:**
```bash
docker cp n8n:/home/node/.n8n/database.sqlite /tmp/n8n.db
sqlite3 /tmp/n8n.db "SELECT id, name, active FROM workflow_entity WHERE active=1;"
sqlite3 /tmp/n8n.db "SELECT nodes FROM workflow_entity WHERE id='<wf_id>';" > /tmp/wf_<id>.json
```

---

## 2. 7 активных workflow

### 2.1 Critical Monitor v2 (каждые 3 часа)
**ID:** `qLzbNwCEv4kQH4Wq`
**Триггер:** Schedule (3h interval)
**Поток:**
```
Schedule Trigger
  → Postgres «Collect & Analyze» (UNION direct_campaign_stats / vk_ads_stats / metrika_utm за 7 дней)
  → Code «Detect Anomalies» (порог >30% день-к-дню, >50% vs 7d avg)
  → IF «Has Alerts?»
      ├─ Postgres «Save Alerts» (insert в metric_alerts)
      ├─ Code «Prepare Prompt» (формирует промпт для Claude)
      ├─ HTTP «Claude Diagnosis» (POST api.anthropic.com/v1/messages)
      ├─ Code «Format Telegram»
      └─ Telegram «Send Telegram»
```

**Что в промпте сейчас:**
> «Ты — ведущий аналитик performance-маркетинга. Проведи корневой анализ причин аномалий…»
> Контекст: «AidaCamp — детский IT-лагерь, бюджет 30 000 ₽/нед Direct + 15 000 ₽/нед VK»
> Просит JSON: summary / root_causes / correlations / recommendations / severity / confidence

**Главные проблемы:**
- ❌ Бюджеты **захардкожены** (30k/нед Direct, 15k/нед VK) — реальность другая
- ❌ Контекст не читает из Context Store (нет последних решений / открытых гипотез)
- ❌ LLM выдумывает «5 root causes» когда мы уже знаем единственную (например AdNet-слив 17.04)
- ❌ Базовые показатели > +30% от 0/малых чисел дают +9000% «spikes» — мат-артефакт
- ❌ Рекомендации общие («проверить логи кампаний») а не конкретные действия

### 2.2 Daily Context Aggregation (23:55 ежедневно)
**ID:** `f0O0GVy3hTLaeQw9`
**Триггер:** Cron `55 23 * * *`
**Поток:**
```
Schedule Trigger
  → Code «Load & Deduplicate» (читает /data/obsidian-notes/_system/hourly/{date}.json)
  → IF «Has Data»
      ├─ Code «Prepare JSON»
      ├─ LangChain Anthropic «Daily Intelligence LLM» (Haiku 4.5)
      ├─ Code «Render & Write»
      └─ Telegram «Telegram Notify»
```

**Промпт:**
> «Проанализируй массив записей за день. Сформируй управленческую картину.»
> Возвращает JSON: executive_summary / key_changes / growth_points / open_loops / project_state

**Главные проблемы:**
- ❌ Источник данных = **только** Obsidian-заметки (диалоги Claude). НЕ читает: Метрику, Direct, VK Ads, AlfaCRM
- ❌ Промпт без KPI-норм и без бизнес-контекста
- ❌ Нет долгой памяти (каждый день начинает с нуля)
- ❌ Возвращает «обобщения» без actionable шагов

### 2.3 Hourly Dialog Collector (каждый час)
**ID:** `isswOJTMDAwV99rG`
**Поток:**
```
Schedule Trigger (каждый час)
  → Code «Read Dialogs» (читает экспорт диалогов)
  → IF «Has Data»
      ├─ Code «Chunk Splitter»
      ├─ LangChain Anthropic «Analyze with Haiku»
      └─ Code «Normalize & Save» (пишет в _system/hourly/{date}.json)
```

**Промпт:** извлекает значимое: growth_point / not_done / decision / update / task_signal с importance 1-10.

### 2.4 Weekly Digest (вс 23:00)
**ID:** `s9lX1AqcqKzKDSsT`
JS-логика без LLM, генерит еженедельный отчёт из накопленных hourly/not_done.

### 2.5 Budget Pace Monitor (каждые 6 часов)
**ID:** `fK5I6I8LbrliCNSq`
Считает реальный расход vs план, шлёт в Telegram (Direct/VK).
Та же проблема: «бюджет 35038₽/30000₽ +104% 🔴 Прогноз 61317₽/нед» — без рекомендации что делать.

### 2.6 Manual Collect (webhook)
**ID:** `Tfu8hUYT83K5s4gI`
Ручной триггер через webhook для force-сбора.

### 2.7 Feedback API (webhook)
**ID:** `niMZQkG9TCpwVLQy`
Принимает feedback (POST /webhook/feedback). Используется минимально.

---

## 3. Цель и боль (что должно быть)

### Что есть сейчас
**Broadcast-режим:** workflow рендерит метрики → отправляет в Telegram → user читает → действие в голове.

### Что должно быть
**Continuous dialog:**
1. Workflow видит аномалию + знает контекст (последние решения, открытые гипотезы, KPI-нормы)
2. Шлёт в Telegram **3 конкретных действия** + кнопки `[✅ Принято] [💬 Вопрос] [✍️ Поправь]`
3. User отвечает в треде Telegram → новый Claude-запрос с историей треда
4. User-правки сохраняются в `ai_user_preferences` → влияют на будущие генерации

---

## 4. Архитектура целевая (Context Store + новые workflows)

```
┌─────────────────────────────────────────────────────────────┐
│ Context Store (Postgres, та же что у n8n)                  │
│                                                             │
│ ai_context_items   — факты/гипотезы/правила/инсайты         │
│ ai_hypotheses      — активные гипотезы (status, verify_by)  │
│ ai_decisions       — решения с rationale + effect_observed  │
│ ai_user_preferences — «CAC ≤10k», «не Сеть VK», «кратко»   │
│ ai_metrics_snapshots — daily KPI per project                │
│ ai_customers / scores / next_actions                        │
│ ai_dialogs / ai_chats — переписки                           │
│ ai_conversations   — треды Telegram-бота                    │
└──────────────┬──────────────────────────────────────────────┘
               │
               ↓ читают/пишут все агенты
   ┌───────────┴───────────┬──────────────┬──────────────────┐
   ↓                       ↓              ↓                  ↓
n8n workflows          Claude Code     Telegram bot     Chrome extensions
(critical monitor,    (мои сессии     (диалог с        (briefing для
 daily aggreg,         через MCP)      user)            менеджеров в CRM)
 budget pace,
 research scout)
```

---

## 5. Что сделано на сегодня

### ✅ Готово
- Postgres 11 таблиц `ai_*` создано (см. 2026-04-18-полная-сессия.md)
- AlfaCRM синхронизирован — 219 клиентов в `ai_customers`
- AlfaCRM reject-справочники — 32 строки в `ai_reject_categories`
- Telegram capture extension v1.2 (workflow для extension отдельно — см. Архитектура-extension)
- БД-схема для контекста, диалогов, scoring, next_actions
- Эмпирически найдено: какие endpoints VK Ads / Метрика / Direct / AlfaCRM работают
- Документ ВК-2.0 + РАДАР-2.1 + Конкуренты подготовлены (но не мигрированы в БД)

### ⏳ В процессе
- Полный прогон Telegram автопилота на ночь — НЕ запущен (висит на тестировании v1.2 scrollChatToBeginning)

### ❌ НЕ сделано (главное)
1. **Existing workflows НЕ переделаны** — продолжают слать «бесполезные» сообщения
2. **Источники не подключены** — Daily Context Aggregation НЕ читает Метрику/Direct/VK Ads/AlfaCRM (только Obsidian)
3. **Long memory** — workflows НЕ читают `ai_context_items`/`ai_decisions`/`ai_hypotheses` в system prompt
4. **Actionable формат** — промпт не переписан на «3 конкретных действия»
5. **Inline-кнопки в Telegram** — нет, броадкаст без feedback
6. **Reply-thread конверсация** — нет
7. **Multi-project** — workflow только под AidaCamp, AidaКодить (codims.ru, branch=1) НЕ обслуживается
8. **Research Scout** — workflow для еженедельного сбора гипотез (Telegram Ads, Sber Ads, конкуренты) НЕ существует
9. **Customer Intelligence процессор** — диалоги собираются, но скоринга нет
10. **Webhook /customer/briefing** — для Chrome extension AlfaCRM Max — нет

---

## 6. План перехода (что делать в новом чате)

### Шаг 1 — Daily-workflow на актуальные данные (1-2 часа)
Переделать `Daily Context Aggregation`:
- Postgres-узел читает за 24ч: `ai_metrics_snapshots` + `direct_campaign_stats` + `vk_ads_stats` + `metrika_utm`
- Postgres читает `ai_decisions` за последние 7 дней
- Postgres читает `ai_hypotheses` со status=testing
- Postgres читает `ai_user_preferences` (все)
- Всё это формирует `system_message` для Claude
- `human_message` = аномалии + изменения за 24ч
- Output JSON: `actions: [{title, why, how, urgency, channel}]` (топ-3)

### Шаг 2 — Actionable формат + inline кнопки в Telegram (1 час)
- Telegram Send Message с `reply_markup.inline_keyboard`
- Каждое действие → 3 кнопки: `[✅ Принято] [💬 Вопрос] [❌ Не то]`
- callback_data сохраняется в `ai_user_preferences`

### Шаг 3 — Reply-thread конверсация (2 часа)
Новый workflow `Telegram Reply Listener`:
- Webhook слушает Telegram update'ы
- Если reply на наше сообщение → достаём thread_id из `ai_conversations`
- Собираем историю треда + контекст
- Claude генерирует ответ
- Шлём в тот же тред

### Шаг 4 — Multi-project (1 час)
Workflow принимают `project_id` параметр.
Postgres-запросы фильтруют по project (`aidacamp` / `aidakodit`).
Telegram сообщение получает префикс `[CAMP]` / `[KODIT]`.

### Шаг 5 — Research Scout (3 часа, weekly)
Новый workflow:
- Cron — пн 09:00
- Список тем в `ai_context_items` с tag=`research_topic`
- Для каждой → WebSearch (через Anthropic API tools)
- LLM формирует 3-5 testable гипотез
- Каждая → запись в `ai_hypotheses` со status=proposed
- В Telegram карточки с кнопками `[📝 Запустить] [🗓 Отложить] [❌ Отклонить]`

### Шаг 6 — Customer Intelligence процессор (2-3 часа)
Workflow `Customer Score & Next Action Daily`:
- Каждый день в 06:00
- Читает `ai_dialogs` за 7 дней
- Маппит peer_id/username → `ai_customers` (по AlfaCRM phone/tg)
- Считает 5 dimensions скоринга (engagement, recency, fit, payments, signals)
- Пишет в `ai_customer_scores`
- LLM генерирует `ai_next_actions` (3 варианта сообщения для каждого hot/warm клиента)

### Шаг 7 — `/customer/briefing` webhook (1 час)
Для Chrome extension AlfaCRM Max:
- GET `/customer/briefing?phone=...` → JSON с score + variants + why_now + history
- Используется в существующем extension `ALFACRM Max Contact Link`

---

## 7. Известные ограничения

- **n8n SQLite** — не масштабируется, при росте workflows (>50) тормозит. Когда будет много — переезжать на Postgres-backed n8n
- **n8n не пробрасывается через nginx** — webhooks не доступны извне без отдельной настройки. Сейчас обходимся самописным `tg-debug-server.py` на порту 9099
- **Нет CI/CD для workflows** — изменения через UI n8n, экспорт в Git вручную
- **Anthropic API key** уже в n8n credentials — не дублировать

---

## 8. Полезные команды

```bash
# Посмотреть active workflows
docker cp n8n:/home/node/.n8n/database.sqlite /tmp/n8n.db
sqlite3 /tmp/n8n.db "SELECT id, name FROM workflow_entity WHERE active=1;"

# Конкретный workflow целиком (JSON)
sqlite3 /tmp/n8n.db "SELECT nodes FROM workflow_entity WHERE id='<wf_id>';" > /tmp/wf.json
python3 -m json.tool /tmp/wf.json | less

# Логи n8n
docker logs --tail 100 n8n

# Вебхук Feedback API
curl -X POST https://aidacamp.ru:5678/webhook/feedback -d '{}'  # только из локалки
```
