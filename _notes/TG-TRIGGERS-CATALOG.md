# Каталог служебных Telegram-триггеров

> Только серверные триггеры (cron, systemd). Триггеры сайта (API-эндпоинты Astro) — не здесь.
> Бот `8619240142:…` = `@aida_traf_bot` → chat `244314247` (Владимир).
> Актуально: 2026-06-14.

---

## SEO-таймеры (transient systemd)

Созданы через `systemd-run --on-calendar=...`. Все вызывают `/usr/local/bin/seo-reminder.sh` → `curl` → бот `8619240142` → chat `244314247`.

| Таймер | Когда (МСК) | Что пишет |
|--------|------------|-----------|
| `seo-measure-0617` | 17.06 12:30 | 🔔 aidacamp: замер волн Д-1/Д-2/П-1 + keep_home (выкат 10–11.06) |
| `seo-codims-waveb-0618` | 18.06 12:40 | 🔔 codims: замер волны B (2025→2026, 67 301-редиректов) |
| `seo-codims-waveac-0619` | 19.06 12:40 | 🔔 codims: замер волн A/C |
| `seo-ice-wave-0619` | 19.06 12:45 | 🔔 icepartners: замер волны П-ICE-1 |
| `seo-codims-index-0619` | 19.06 12:50 | 🔔 codims: замер индексации |
| `seo-phase0-gate` | 24.06 12:30 | 🔔 aidacamp: гейт Фазы 0 + решение по keep_home |

Смотреть: `systemctl list-timers | grep seo-`
Создавать: `systemd-run --on-calendar=... /usr/local/bin/seo-reminder.sh t "текст"`

---

## Cron-триггеры

### Ежедневные

| Время (UTC) | Скрипт | Канал | Кому | Что |
|-------------|--------|-------|------|-----|
| 02:00 | `vk_token_refresh.py --notify` | TG (`common/telegram`) | Владимир | Только при ошибке рефреша VK токена |
| 05:00 | `run_morning_pipeline.sh` → `morning_digest.py` | Green-API WhatsApp | Дарья (`2040464481`) | Топ-12 CRM-клиентов дня с оценками и next_actions |
| 05:00 | (внутри пайплайна) `budget_watchdog.py` | TG (`common/telegram`) | Владимир | Алерт если расход Директа > лимита |
| 07:30 | `seo_morning_pulse.js` | TG (`TELEGRAM_BOT_TOKEN`) | Владимир | Ежедневный SEO-пульс: позиции, страницы |
| 08:00 | `run_pamyatka_tg.sh` → `pamyatka_tg_sender.py` | Green-API WhatsApp (school) | Родители | Памятка за 7 дней до начала смены |
| 08:30 | `seo_daily_brief.py` | TG (бот `8619240142`) → chat `244314247` | Владимир | SEO KPI + задачи дня (Claude Haiku) |
| 09:00 | `token_health.py` | TG (`common/telegram`) | Владимир | Статус токенов и балансов API (Директ/VK/OpenRouter/Green-API). Алертит только при проблемах |
| 09:00 | `seo-watchdog.py` | TG (`TG_TOKEN`/`TG_CHAT`) | Владимир | Падения позиций > 5 за день + истекающие заморозки + сводка |
| 10:00 | `review-reminder.py` (/opt/etl/) | TG (`TG_TOKEN`/`TG_CHAT`) | Дарья | Напоминания об отзывах: дни +1/+3/+7 после окончания смены |

### Еженедельные

| Когда | Скрипт | Канал | Что |
|-------|--------|-------|-----|
| ПН 09:00 | `traffic_drop_alert.py` | TG (`common/telegram`) | Алерт если органика упала > 20% за неделю |
| ПН 09:30 | `seo-health-report.sh` | → reports-hub (HTML) | Еженедельный SEO-дашборд: страницы, позиции, CTR. TG не шлёт — только публикует HTML |
| ПН 10:00 | `serm_monitor.py` | TG (`common/telegram`) | Новые отзывы Яндекс.Карты + 2GIS за 7 дней + рейтинг |
| СР 06:00 | `hw_report.py` | Green-API WhatsApp (school) | Дайджест ДЗ для преподавателей АйДаКодить по группам |
| ПН 10:00 | `serm_monitor.py` | TG (`common/telegram`) | Новые отзывы Яндекс.Карты + 2GIS за 7 дней + рейтинг |

### Частые (каждые N минут)

| Частота | Скрипт | Канал | Что |
|---------|--------|-------|-----|
| каждые 5 мин | `tg-monitor/monitor.py` (08:00–21:00 МСК) | Green-API WhatsApp → Дарья | Сканирует мам-TG-публичные → пишет при релевантном запросе про лагерь |
| каждые 10 мин | `negkw_patrol.py` | TG (бот `8663835446`) → chat `244314247` | Только при добавлении новых минус-слов Директ (две кампании 708664426 + 709159717) |

---

## Постоянные сервисы (not timers)

| Сервис | Путь | Что делает |
|--------|------|-----------|
| `tg-max-sync.service` (порт 8443) | `/opt/telegram-max-sync/` | Webhook: получает сообщения от TG-бота → пересылает в VK MAX канал |
| `telegram-max-sync.service` | `/opt/telegram-max-sync/main.py` | Long-polling альтернатива (параллельно с webhook — проверить конфликт) |
| `ice-bot.service` | `/opt/ice-bot/relay.mjs` | Relay: TG-лиды ICE Partners → CRM |
| `tg-debug.service` | `/opt/tg-debug-server.py` | Коллектор дебаг-событий TG (user postgres) |

---

## Боты и чаты — справочник

| Бот-токен (prefix) | Назначение | Чат |
|--------------------|-----------|-----|
| `8619240142:AAE…` | SEO-брифинги, seo-reminder (владелец) | `244314247` |
| `8663835446:AAE…` | negkw_patrol (рекламный мониторинг) | `244314247` |
| Green-API `4100566778` (`GREENAPI_INSTANCE_ID`) | **Telegram** Дарьи (CRM-дайджест, tg-monitor) | `2040464481` |
| Green-API `4100613561` (`GREENAPI_SCHOOL_ID`) | **Telegram** школы АйДаКодить | Чаты преподавателей |
| Green-API `1105659052` (`GREENAPI_WA_*`) | **WhatsApp** Дарьи — реальный (`79688086455`); входящие клиентов → `ai_dialogs` | — |

> Общий env: `/opt/aidacamp-tools/common/telegram.py` — `tg_send()` — читает `TG_TOKEN`/`TG_CHAT` из env.
