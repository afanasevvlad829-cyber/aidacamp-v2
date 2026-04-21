# TOOLS — каталог инструментов АйДаКемп

**Читается агентом при загрузке.** Если добавил/переименовал/удалил инструмент — обнови этот файл в тот же коммит.

> **Канон на сервере:** `/opt/aidacamp-tools/` — все инструменты под этим корнем.
> **Канон локально:** `~/Aidacamp-cloude/scripts/` (сайто-специфичные) + `~/MCP/` (исходники MCP + локально-завязанные).
> **Архив (не используется, но может понадобиться):** `archive/` подпапки на сервере и локально.

_Last updated: 2026-04-19 (после Шага 3 миграции)_

> **📌 Миграция выполнена 2026-04-19.** Все серверные инструменты теперь под `/opt/aidacamp-tools/`. Старые пути `/opt/mcp`, `/opt/browser-agent`, `/opt/etl` — симлинки на новые (для обратной совместимости с systemd/cron). Локальные дубли `~/MCP/{yadisk,browser-agent}.sh` + устаревшие vk-/clarity-скреперы + `server.js` → `~/MCP/archive/`.

---

## 🌐 СЕРВЕР `159.194.223.55` (алиас: `aidacamp-prod`)

### `/opt/aidacamp-tools/mcp/` — MCP-сервер (`aidacamp-mcp.service`)
Главный инструмент для агентов: даёт через MCP-protocol ~21 функцию (SSH, stats, photos, browser, VK/Direct CRUD, Clarity, PageSpeed, image_edit и т.д.).

| Файл | Что | Как вызвать |
|---|---|---|
| `mcp-server.mjs` | MCP-сервер (исходник) | `systemctl status aidacamp-mcp` |
| `package.json` | Зависимости | — |

**Агент вызывает через:** инструменты `mcp__aidacamp-tools__*` (см. CLAUDE.md таблицу в проекте).

### `/opt/aidacamp-tools/browser-agent/` — Playwright (headless Chromium)
Скриншоты, скрапинг, краулинг, Lighthouse, HAR, PDF. Агент зовёт через SSH или обёртку `~/Aidacamp-cloude/scripts/browser-agent.sh`.

| Скрипт | Что делает |
|---|---|
| `screenshot.js` | Скриншот URL (desktop/mobile/full-page). **Основной** для проверки дев-сайта |
| `scrape.js` | Текст / HTML / ссылки / мета-теги страницы |
| `crawl.js` | Обход сайта до N страниц, JSON/urls |
| `readpage.js` | Mozilla Readability — читабельный текст статьи |
| `interact.js` | Multi-step сценарий (goto/click/fill/screenshot) по JSON |
| `lighthouse.js` | Lighthouse аудит (Performance/SEO/A11y/Best Practices) |
| `har.js` | HAR-трейс сетевых запросов + анализ |
| `pdf.js` | Страница → PDF (A4/landscape) |
| `diff.js` | Попиксельное сравнение двух скриншотов |
| `smoke-test.js` | Smoke-тесты формы лидов |

**Пример вызова (локально):**
```bash
ssh aidacamp-prod "cd /opt/aidacamp-tools/browser-agent && node screenshot.js https://aidacamp.ru /opt/browser-agent/output/x.png --mobile"
# Или через обёртку
./scripts/browser-agent.sh screenshot https://aidacamp.ru shot.png --mobile
```

### `/opt/aidacamp-tools/etl/` — Python ETL (cron)
Ежедневная загрузка рекламы/аналитики в postgres.

| Скрипт | Что делает | Частота |
|---|---|---|
| `etl-daily.py` | **Основной**: Директ + Метрика + VK → postgres | cron 6:15 |
| `gsc-sync.py` | Google Search Console → postgres | cron |
| `autoban.py` | Автобан мусорных площадок РСЯ | cron |
| `direct-status.py` | Статусы кампаний Директ | on-demand |
| `photo-enrich.py` | AI-описания фото через Gemini Vision | on-demand |
| `cm-v3-engine.py` + `cm-v3-run.sh` + `cm-v3-callback-bridge.sh` | Creative Manager v3 — генерация креативов | on-demand |

### `/opt/aidacamp-tools/scripts/` — Общие bash/shell
| Скрипт | Что делает |
|---|---|
| `stats.sh` | Аналитика из postgres (summary/direct/metrika/goals/placements/utm) по периоду |
| `yadisk.sh` | Поиск/выбор фото на Яндекс.Диске (9200 фото, Gemini-описания) |
| `browser-agent.sh` | Обёртка запуска browser-agent по SSH |

### `/opt/aidacamp-tools/browser-use-env/` — Python AI-агент
Библиотека `browser-use` + венв. Автономный AI навигирует по сайту (нужен API-ключ LLM).

### Системные сервисы на сервере
| Service | Что | Статус (on 2026-04-19) |
|---|---|---|
| `aidacamp-mcp.service` | MCP-сервер (mcp-server.mjs) | ✅ running |
| `aidacamp-fasttrack.service` | FastTrack API (lead-форма → CRM) | ✅ running |
| `aidacamp-dev.service` | SSR-нода dev.aidacamp.ru | ⚠️ activating auto-restart (в петле, знаем) |

### Нет в каноне `/opt/aidacamp-tools/` (оставлены отдельно)
| Путь | Почему отдельно |
|---|---|
| `/opt/aidacamp/` | Дев-сервер проекта (не инструмент) |
| `/opt/aidacamp-fasttrack/` | Прод-сервис (FastTrack API в systemd) |
| `/opt/claude-seo/` | Отдельный SEO-тулкит, не связан с aidacamp напрямую |
| `/opt/backups/`, `/opt/logs/` | Общесерверные |
| `/var/www/*` | Статика сайтов |

---

## 💻 ЛОКАЛЬНО (`~`, макбук)

### `~/Aidacamp-cloude/scripts/` — ТОЛЬКО сайто-специфичные
| Скрипт | Что | Когда вызывается |
|---|---|---|
| `deploy.sh` | Деплой сайта: rsync dist → сервер + restart service | `./scripts/deploy.sh dev` или `prod` |
| `guard-no-partytown.sh` | Pre-build guard — не допускает возврата Partytown (см. CLAUDE.md) | `npm run guard` |
| `cdp-session.mjs` | Chrome DevTools Protocol на локальном Chrome (для скрейпинга с авторизованной сессии) | on-demand |
| `direct-login-local.js`/`.mjs` | Логин в кабинет Директа на локальном Chrome | on-demand |
| `browser-agent.sh` | SSH-обёртка для `/opt/aidacamp-tools/browser-agent/` | `./scripts/browser-agent.sh screenshot ...` |
| `stats.sh` | SSH-обёртка для `/opt/aidacamp-tools/scripts/stats.sh` | `./scripts/stats.sh summary week` |
| `yadisk.sh` | SSH-обёртка для `/opt/aidacamp-tools/scripts/yadisk.sh` | `./scripts/yadisk.sh search "дети"` |
| `clarity-export.js` | Выгрузка сессий из Microsoft Clarity | on-demand (устарел, функция в MCP) |

### `~/MCP/` — исходники MCP-сервера + local-only
| Файл | Что | Где работает |
|---|---|---|
| `server.mjs` | Исходник MCP — правится локально, деплоится на сервер | dev |
| `deploy-mcp.sh` | Деплой `server.mjs` на сервер (rsync + restart aidacamp-mcp) | локально |
| `run.sh` | Запуск MCP локально (для отладки) | локально |
| `tg-export-watcher.sh` | Watches `~/Downloads/` на новые telegram-экспорты | локально (только mac) |
| `tg-import-messages.py` | Парсит telegram JSON → postgres | локально |
| `tg-export-import.py` | Экспорт → импорт в БД | локально |
| `tg-devtools.mjs` | Взаимодействие с локальным Telegram Desktop | локально |
| `photo-select.py` | Отбор фото (запросы к photo_catalog) | on-demand |
| `n8n-read-dialogs.js` / `n8n-normalize-save.js` | n8n-воркфлоу helpers | on-demand |
| `keep-awake.sh` | `caffeinate` — мак не засыпает во время долгих задач | локально (только mac) |
| `diagnose-idb.js` | Диагностика IndexedDB Telegram Web | on-demand |
| `export-deleted-tg.sh` | Экспорт удалённых сообщений | on-demand |

### `~/.claude/` — локальная оркестраторская память (gitignored)
| Файл | Что | Кто читает |
|---|---|---|
| `HOWTO.md` | Главный гайд «как мы работаем» для владельца | Vlad |
| `ORCHESTRATOR.md` | Системный промпт для оркестратора (этой сессии) | Оркестратор |
| `WORKER.md` | Системный промпт для агентов-работников | Агенты при старте |
| `AGENTS.md` | Кто сейчас активен, кто завершён | Оркестратор |
| `TASKS.md` | Очередь задач | Оркестратор + Vlad |
| `LOG.md` | Лог мержей/инцидентов | Оркестратор |
| **`TOOLS.md`** | **Этот файл — каталог всех инструментов** | **Все** |

### `~/.ssh/` — ключи к серверу (НЕ переносим)
- `aidacamp_prod` — полный доступ, использовать осторожно
- `aidacamp_dev` — только в `/var/www/aidacamp-dev/`

---

## 🗄 Архив (не используется, но могут понадобиться)

### `/opt/aidacamp-tools/archive/` (сервер) — создаётся при миграции
- `mcp-server.mjs.bak.*` (11 бэкапов из `/opt/mcp/`)
- `browser-agent/test-video{,2,3,4,-final}.js` (5 тест-скриптов)
- `browser-agent/debug-cal.js`, `age-select-test.js`

### `~/MCP/archive/` (локально) — создаётся при миграции
- `server.js` — старая JS-версия MCP (есть свежая `.mjs`)
- `vk-login.mjs`, `vk-scrape-all.mjs`, `vk-scrape-banners.mjs`, `vk-scrape-extended.mjs` — VK-скреперы, функция в MCP
- `clarity-login.mjs`, `clarity-debug.mjs`, `clarity-debug2.mjs`, `clarity-scrape-sessions.mjs`, `clarity-sessions.json` — заменены MCP-ом
- `n8n-*.js` — если не нужны в текущих n8n-воркфлоу

---

## 🔐 Секреты (после Шага 4 миграции, 2026-04-19)

### Сервер (runtime, канон)
| Файл | Что | Права | Использует |
|---|---|---|---|
| `/opt/aidacamp-tools/mcp/.env` | Конфиг MCP-сервера (3 ключа: MCP_PORT/SECRET/TRANSPORT) | `0600 root:root` | `aidacamp-mcp.service` |
| `/opt/aidacamp-tools/etl/.env` | 27 бизнес-токенов (VK, Direct, Metrika, Clarity, TG, ALFACRM, GreenAPI, OpenRouter, YaDisk, Pagespeed) | `0600 root:postgres` | `aidacamp-mcp.service`, cron ETL |

**Не объединяем** — нет пересечений ключей, разные scopes (конфиг процесса vs бизнес-токены), раздельный риск утечки.

### Локально (dev)
| Файл | Что | Права |
|---|---|---|
| `~/MCP/.env` | Дев-копия MCP/ETL токенов (17 ключей, имена отличаются от сервера) | `0600` |
| `~/MCP/.gsc-credentials.json` | OAuth credentials для `gsc-sync.py` с мака | `0600` |

### Архив
- `~/MCP/archive/legacy-mcp-state/yandex-direct-metrica-mcp.env` — от deprecated remote MCP (см. CLAUDE.md: «ЗАПРЕЩЕНО: удалённый MCP yandex-direct-metrica-mcp»)

### ⚠️ Техдолг по секретам
- **Naming convention divergence** между локальным `~/MCP/.env` и серверным `/opt/aidacamp-tools/etl/.env`:
  - `YANDEX_DIRECT_TOKEN` (local) vs `DIRECT_TOKEN` (server)
  - `VK_ADS_TOKEN` (local) vs `VK_TOKEN` (server)
  - `YANDEX_METRIKA_TOKEN` (local) vs `METRIKA_TOKEN` (server)
  - Локально есть `WEBMASTER_*` — на сервере нет
  - На сервере есть `ALFACRM_*`, `GREEN_API_*`, `OPENROUTER_KEY` — локально нет
  - **Следствие:** запуск MCP-сервера локально читает другие переменные, чем серверный. Может потребовать код-правок в `server.mjs` для унификации имён. Отдельная задача.
- **Ротация токенов** — не автоматизирована. Когда истекает VK_TOKEN (он динамический), — ручное обновление. Хорошо бы cron-автоматизацию.

---

## ☁️ Google Drive бэкапы (с 2026-04-19)

**Облако:** папка `AidaCamp-Backups` в личном Google Drive Влада (см. https://drive.google.com/drive/u/2/folders/1tarMC8J_sDAd49cW4-Jj_Hm3Rb5HC3RL)
**Auth:** OAuth, токен на сервере в `/root/.config/rclone/rclone.conf` (auto-refresh)
**Скрипт:** `/opt/aidacamp-tools/scripts/backup-to-gdrive.sh {hourly|daily|weekly}`
**Cron:** `/var/spool/cron/crontabs/root` — 3 задачи (ищи по `backup-to-gdrive`)
**Mac launchd:** `~/Library/LaunchAgents/com.aidacamp.claude-state-sync.plist` — rsync .claude/ → сервер каждые 30 мин
**Логи:** `/var/log/aidacamp-backup.log` (сервер), `~/.aidacamp-claude-sync.log` (мак)

| Что | Частота | Размер | Куда |
|---|---|---|---|
| `.claude/*.md` из мака | каждый час :00 | ~20 KB | `claude-state/YYYY-MM/claude-state-<ts>.tar.gz` |
| pg_dump aidacamp + photo_catalog | 03:15 ежедневно | ~2.5 MB | `db/aidacamp-YYYY-MM-DD.sql.gz`, `catalogs/` |
| browser-agent/output (скриншоты) | Sun 04:00 | переменный | `artifacts/screenshots-YYYY-MM-DD.tar.gz` |

**Ротация:** локально хранится 7 последних дампов БД (`$STAGING/db-dumps/`), на Drive — всё (чистка вручную в Google UI при необходимости).

---

## 📡 Git-ветки по инструментам

| Ветка | Что |
|---|---|
| `dev` / `main` | Сайт (Astro) |
| `tooling` | Orphan-ветка со скриптами для CI (quality-gate и т.п.) |
| `agent/*` | Рабочие ветки агентов |

---

## 🔄 Как обновлять этот файл

- При добавлении инструмента — добавить строку в соответствующую таблицу + в тот же коммит
- Раз в квартал — аудит «что не используется → в архив»
- `Last updated` наверху — обновлять
- Бэкап в Google Drive (по плану) — автоматом, не руками

---

## ⚠️ Известные проблемы

1. **`aidacamp-dev.service` в auto-restart loop** — SSR-нода падает, но статика работает. Не критично для разработки (rsync+nginx). Нужен отдельный разбор логов.
2. **`stats.sh` имеет 3 разные версии:**
   - `~/MCP/stats.sh` (**Apr 19 — свежая**, 4 новые команды: direct-status, tg-dump-status, tg-inventory-status, cm-v3)
   - `/opt/aidacamp-tools/mcp/stats.sh` (Apr 18 — чуть отстаёт)
   - `~/Aidacamp-cloude/scripts/stats.sh` (Apr 13 — сильно устаревший)
   Нужно: синхронизировать через `~/MCP/deploy-mcp.sh` (или ручной rsync). Отдельный mini-таск.
3. **Loose файлы в `/opt/`**: `tg-debug-server.py` + `.bak` в корне `/opt/`. Не классифицированы, надо решить — оставить/архивировать.
4. **`/opt/browser-agents/`** (множественное число) — возможно дубликат `browser-agent/`. Надо посмотреть содержимое.
5. **Секреты раскиданы** — решаем в Шаге 4 плана (отдельно).
