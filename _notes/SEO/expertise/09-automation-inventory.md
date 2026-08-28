# Инвентаризация SEO-автоматики на сервере — 2026-06-04

> Полный каталог всех SEO-скриптов на сервере `aidacamp` (159.194.223.55). Статус в кроне, назначение, потоки данных, пересечения.

---

## 🔴 КРИТИЧЕСКАЯ НАХОДКА: дублирование

**`seo_kaizen.py` уже умеет `action_type='create_page'`** — создаёт страницы под непокрытые ключи. Это **то же самое, что делает наша новая SEO-фабрика** (`/opt/seo-factory/seo-factory.js`).

- `seo_kaizen.py` — **ОТКЛЮЧЁН** (`#DISABLED_AUTOPILOT 0 9 * * 1-5`)
- Наша фабрика — активна (крон 07:00)

**Вопрос для разбора:** почему kaizen отключили? Если он создавал плохие страницы / попал под фильтр — это прямой урок для фабрики. Если просто перестали поддерживать — фабрика его заменяет. НЕ включать оба одновременно.

---

## Каталог скриптов

### Сбор данных (ETL позиций)

| Скрипт | Статус | Назначение |
|---|---|---|
| `etl/seo-arsenkin-etl.py` | 🟢 07:00 | Топ-130 ключей через Арсенкин (Яндекс Desktop, Москва) → `seo_position_snapshots` |
| `etl/seo-xmlstock-etl.py` | ⚪ не в кроне | SERP-позиции Яндекс+Google для всех ключей, конкуренты топ-3, aggregator_flag. Заменён Арсенкиным |
| `etl/seo-positions-snapshot.py` | ⚪ не в кроне | Снимок позиций (legacy) |
| `seo-etl/*` (etl_topvisor/webmaster/indexation/pagespeed/inlinks/crawl/wordcount, run_all.sh) | 🔴 ДЕКОММИШЕН 14.07.2026 | Крон пропал 17.06, владелец решил не восстанавливать. Папка удалена с сервера. Не предлагать чинить/восстанавливать. |

### Анализ и отчёты (читают данные → выводы)

| Скрипт | Статус | Назначение |
|---|---|---|
| `seo_advisor.py` | 🟢 08:00 вт | Снимок БД → Claude → план в Reports Hub |
| `seo_daily_brief.py` | 🟢 08:30 | Утренний брифинг в TG: KPI + задачи дня (Claude Haiku) |
| `seo_morning_pulse.js` | 🟢 07:30 | Утренний пульс позиций |
| `seo-watchdog.py` | 🟢 10:00 | Проверка позиций vs baseline, алерты о падениях >5, заморозки |
| `seo-health-report.sh` | 🟢 09:00 пн | Еженедельный дашборд здоровья SEO |
| `etl/seo-report-builder.py` | ⚪ не в кроне | Билдер HTML-отчётов (Яндекс+Google табы, CTR) |

### Генерация / изменение страниц (ПИШУТ в сайт)

| Скрипт | Статус | Назначение | Пересечение |
|---|---|---|---|
| **`/opt/seo-factory/seo-factory.js`** | 🟢 07:00 | НАША фабрика: кластеры → страницы → PR | ⚠️ дублирует kaizen |
| **`seo_kaizen.py`** | 🔴 ОТКЛЮЧЁН | create_page под непокрытые ключи + автоправки | ⚠️ дублирует фабрику |
| `seo_kaizen_deploy_listener.py` | ⚪ не в кроне | Авто-деплой kaizen-изменений через 6ч | связан с kaizen |
| `seo-etl/fix_missing_h1.js`, `seo-etl/etl_quickwin_sync.js` | 🔴 ДЕКОММИШЕН 14.07.2026 | Были частью seo-etl/run_all.sh — см. выше |

### Наша новая надстройка (2026-06-04)

| Скрипт | Статус | Назначение |
|---|---|---|
| `/opt/seo-factory/seo-factory.js` | 🟢 07:00 | Генерация страниц + чтение RAG (LSI, правила, perf) |
| `/opt/seo-factory/measure-performance.js` | 🟢 06:45 | Замер позиций сгенерированных страниц → seo_page_performance |
| `/opt/seo-factory/ingest-seo-reports.mjs` | разовый | 81 отчёт → RAG |
| `/opt/aidacamp-tools/obsidian_indexer.py` | 🟢 06:30 | Заметки → RAG (починен) |

---

## Потоки данных (как всё связано)

```
Источники → ETL → PostgreSQL → Анализ/Генерация → Действие
─────────────────────────────────────────────────────────
Арсенкин ──┐
Топвизор ──┼→ seo_positions, seo_keywords ──┐
Вебмастер ─┤  seo_queries (клики)           │
XMLStock ──┘  seo_position_snapshots        │
                                            ├→ seo_advisor → Reports Hub
                                            ├→ seo_daily_brief → TG
                                            ├→ seo-watchdog → алерты TG
                                            ├→ ФАБРИКА → страницы → PR
                                            │     ↑ читает RAG
                                            │     ↓ пишет
                                            └→ measure-performance → seo_page_performance
                                                  ↑ обратная связь в фабрику

knowledge_chunks (RAG) ← obsidian_indexer, ingest-reports, инсайты
```

---

## Дубли и конфликты (разобрать)

1. **Фабрика vs Kaizen** — обе создают страницы. Kaizen отключён. Решить: фабрика заменяет kaizen полностью, или взять из kaizen логику (он умел и автоправки, не только create_page).
2. **Арсенкин vs XMLStock vs Топвизор** — три источника позиций. Арсенкин активен, XMLStock отключён, Топвизор активен. Возможна рассинхронизация данных (`seo_positions` vs `seo_position_snapshots` — две разные таблицы!).
3. **Отчёты** — advisor, daily_brief, morning_pulse, watchdog, health-report = 5 отчётных скриптов. Возможно пересекаются по содержанию.

---

## Что проверить дальше

- [ ] Почему отключён `seo_kaizen.py` (дата `#DISABLED_AUTOPILOT`, причина) — урок для фабрики
- [ ] `seo_positions` vs `seo_position_snapshots` — какая таблица канон, не расходятся ли
- [ ] Не дублируют ли 5 отчётных скриптов друг друга
- [ ] Связать `measure-performance` с baseline из `seo-watchdog` (общая система мониторинга)

*Создано: 2026-06-04. Связано с [[00-seo-audit-consolidated]], [[07-session-insights-2026-06-03]].*
