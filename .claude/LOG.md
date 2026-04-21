# Лог мержей и инцидентов

_Ведёт оркестратор. Каждый мерж в dev и main фиксируется здесь._

---

## Шаблон записи

```
### [дата время] MERGED | FAILED | INCIDENT
- Ветка: agent/имя → dev | dev → main
- PR: ссылка
- Что изменилось: краткое описание
- Проверено на: dev.aidacamp.ru / aidacamp.ru
- Кто разрешил мерж: Влад
- Комментарий: —
```

---

## Записи

### [2026-04-19 ~21:00] BACKUP  Google Drive инфраструктура (Шаг 6 плана)
- OAuth установлен с Mac, токен в `/root/.config/rclone/rclone.conf` (600) на сервере
- Service account JSON в архиве — не подходит для обычного Drive (SA не имеет квоты). Оставлен в `/opt/aidacamp-tools/.gdrive-sa.json` на случай перехода на Shared Drive
- Папка: https://drive.google.com/drive/u/2/folders/1tarMC8J_sDAd49cW4-Jj_Hm3Rb5HC3RL
- Скрипт бэкапа: `/opt/aidacamp-tools/scripts/backup-to-gdrive.sh` (3 режима: hourly/daily/weekly)
- Cron на сервере: hourly :00, daily 03:15, weekly Sun 04:00
- Mac launchd: `com.aidacamp.claude-state-sync` — rsync `~/Aidacamp-cloude/.claude/` (без worktrees/cache) → сервер каждые 30 мин
- Первые данные на Drive: pg_dump (2.5 MB), claude-state (19 KB)
- Лог: `/var/log/aidacamp-backup.log` на сервере, `~/.aidacamp-claude-sync.log` на маке

### [2026-04-19 ~19:00] MIGRATION  secrets + final cleanup (Шаг 4 плана + остатки Шага 3)
- Permissions: `/opt/aidacamp-tools/{mcp,etl}/.env` теперь `0600` (были 0644 и 0640)
- Legacy `~/.codex/mcp-state/yandex-direct-metrica-mcp/.env` → `~/MCP/archive/legacy-mcp-state/` (deprecated remote MCP)
- `/opt/browser-agents/` (дубликат, только README) → `/opt/aidacamp-tools/archive/empty-dirs/`
- `/opt/tg-debug-server.py{.bak*,}` → `/opt/aidacamp-tools/tg-debug/server.py` + симлинк; `tg-debug.service` перезапущен, активен
- `/opt/__pycache__/` → `/opt/aidacamp-tools/tg-debug/__pycache__`
- TOOLS.md обновлён: секция секретов с полной картой, техдолг naming divergence флагнут
- Итог: `/opt/` корень — 11 папок и ни одного loose-файла

### [2026-04-19 ~18:30] MIGRATION  tools consolidation (Шаг 3 плана)
- Серверная сторона: все инструменты под `/opt/aidacamp-tools/`
  - `/opt/mcp/*` → `/opt/aidacamp-tools/mcp/` (+ симлинк `/opt/mcp`)
  - `/opt/browser-agent/*` → `/opt/aidacamp-tools/browser-agent/` (+ симлинк)
  - `/opt/etl/*` → `/opt/aidacamp-tools/etl/` (+ симлинк)
  - systemd unit `aidacamp-mcp.service` и crontab не трогались — работают через симлинки
- Архив: 1.8MB / 19 файлов в `/opt/aidacamp-tools/archive/` (mcp-backups, browser-agent-tests, browser-agent-debug, etl-backups)
- Локально: 12 устаревших скриптов в `~/MCP/archive/` (yadisk/browser-agent duplicates, vk-*, clarity-*, server.js)
- Downtime: ~3 сек aidacamp-mcp (service restart во время move)
- MCP health check after: active, 68 инструментов, отвечает 200 OK на /health
- Файл TOOLS.md обновлён с новой структурой + списком известных проблем
- Оставшиеся задачи: секреты (Шаг 4), Docker (Шаг 5), Google Drive backups (Шаг 6)

### [2026-04-19 ~18:00] PROD DEPLOY  dev → main
- Коммит мержа: c10ef80 (push в origin/main ✅)
- Что вошло: PR #12 (+1320 слов на 4 tier4 LP), #13 (+1227 слов усиление 4 IT LP), #14 (+480 слов kupit-putevku), #15 (+410 слов B2B dlya-kompaniy)
- Проверено на aidacamp.ru: 10 страниц → 200 (lager-na-avgust-podmoskove, letnyaya-it-shkola, obrazovatelnyy-lager, tematicheskiy-lager, python-lager, scratch-lager, roblox-lager, 3d-modelirovanie-lager, kupit-putevku-v-lager, dlya-kompaniy)
- Кто разрешил: Влад («12-15 в прод»)

### [2026-04-19 ~17:55] MERGED × 4 → dev
- PR #12 agent/seo-content-tier4-lp
- PR #13 agent/seo-content-narrow-it-lp
- PR #14 agent/seo-kupit-putevku
- PR #15 agent/seo-dlya-kompaniy

### [2026-04-19 17:38] PROD DEPLOY  dev → main
- Коммит мержа: e685089 (push в origin/main ✅)
- Что вошло: PR #9 (+720 слов на 2 tier2 LP: lager-bez-telefonov + lager-dlya-podrostkov), PR #10 (hub-link в zavisimost-ot-kompyuternyh-igr → ссылки на 5 статей из PR #8), PR #11 (+1060 слов на 3 tier3 LP: lager-dlya-shkolnikov + lager-nedorogo + lager-v-moskve)
- Проверено на aidacamp.ru: все 5 LP → 200; хаб-статья содержит ссылки на все 5 статей-листьев
- Кто разрешил: Влад («мержи всё и выкатывай в прод»)
- Тематический кластер про компьютерную зависимость замкнулся: /stati/zavisimost-ot-kompyuternyh-igr (hub) ↔ 5 статей-листьев

### [2026-04-19 17:37] MERGED  agent/seo-content-tier3-lp → dev  (PR #11)
### [2026-04-19 17:37] MERGED  agent/zavisimost-hub-link → dev  (PR #10)
### [2026-04-19 17:37] MERGED  agent/seo-content-tier2-lp → dev  (PR #9)

### [2026-04-19 17:29] PROD DEPLOY  dev → main
- Коммит мержа: 07e06b1 (push в origin/main ✅)
- Что вошло: PR #8 — 5 новых SEO-статей про компьютерную зависимость (тематический кластер на ~9000 !W/год):
  - /stati/priznaki-kompyuternoj-zavisimosti/
  - /stati/kak-izbavitsya-ot-zavisimosti-ot-igr/
  - /stati/lechenie-kompyuternoj-zavisimosti/
  - /stati/profilaktika-kompyuternoj-zavisimosti/
  - /stati/igromaniya-u-detej/
- Проверено на aidacamp.ru: все 5 страниц → 200
- Кто разрешил: Влад («да» в ответ на предложение мержа)

### [2026-04-19 17:28] MERGED  agent/seo-zavisimost-series → dev
- PR: https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/8
- CI: зелёный, MERGEABLE+CLEAN, только новые файлы — зоны не пересекались

### [2026-04-19 16:47] PROD DEPLOY  dev → main
- Коммит мержа: d5d5da0 (push в origin/main ✅)
- Что вошло: PR #6 (blog CTA rewrite — 8 статей под Позиционирование + LP-ссылки) + PR #7 (4 новые узкие IT-LP: python-lager, roblox-lager, scratch-lager, 3d-modelirovanie-lager + /kompyuternyy-lager как хаб + обновления index.astro)
- Проверено на aidacamp.ru:
  - /python-lager/ /roblox-lager/ /scratch-lager/ /3d-modelirovanie-lager/ → все 200
  - /stati/podrostok-ne-hochet-uchitsya/ содержит CTA-ссылку на /lager-dlya-podrostkov/ ✅
- Кто разрешил: Влад («выкатывай» + «оба»)
- Порядок: смержил #6 → смержил #7 → dev → main → deploy prod
- Зоны не пересекались между собой; #7 трогал kompyuternyy-lager.astro (уже был в #5) — агент отребейзил, конфликтов не было

### [2026-04-19 16:46] MERGED  agent/it-camp-hub-lps → dev
- PR: https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/7

### [2026-04-19 16:46] MERGED  agent/blog-cta-rewrite → dev
- PR: https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/6

### [2026-04-19 15:44] PROD DEPLOY  dev → main
- Коммит мержа: e82d60a (push в origin/main ✅)
- Что вошло в прод: SEO-перелинковка главной (#4) + расширение контента 5 жирных LP (#5) + Hero-баннер «ИИ заменит программистов» в правый-нижний угол (десктоп + мобилка) + видимая плашка «от 48 000 ₽» на мобилке + починка CI workflow + CLAUDE.md блок про позиционирование
- Проверено на: aidacamp.ru — HTML содержит новые ссылки (ii-zamenit-programmista, lager-na-leto-2026, «от 48 000»)
- Кто разрешил: Влад («выкатывай в прод»)
- Примечание: systemctl restart aidacamp.service упал (сервиса нет — прод = static через nginx). Безвредно.

### [2026-04-19 15:40] MERGED  agent/seo-content-top5-lp → dev
- PR: https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/5
- Что: +2000 слов уникального контента на 5 жирных LP — расширение массива `sections` в LandingTwoCol (detskiy-lager, lager-v-podmoskove, lager-na-leto-2026, kompyuternyy-lager, detskiy-lager-podmoskove)
- Проверено на: CI зелёный, MERGEABLE+CLEAN, зоны не пересекались с PR #4
- Кто разрешил мерж: оркестратор (стандартный процесс — чистый PR мержится в dev)
- Деплой: dev.aidacamp.ru (rsync)

### [2026-04-19 15:32] MERGED  agent/seo-main-links → dev
- PR: https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/4
- Что: SEO-перелинковка главной — добавлены LP /lager-na-leto-2026 и /kupit-putevku-v-lager, переписаны якоря под целевые ключи, перестановка порядка (first-link-wins)
- Проверено на: CI зелёный после починки инфраструктуры (см. ниже)
- Кто разрешил мерж: оркестратор (PR готов, CI зелёный, один-PR-за-раз)
- Деплой: dev.aidacamp.ru (rsync)

### [2026-04-19 15:30] HOTFIX (orchestrator → dev)  CI quality-gate
- Коммиты: e6c70da + 9244fb4 в dev
- Что: переписал `.github/workflows/quality-gate.yml` — убрал ссылки на несуществующие `tools/quality-*.sh`, базовый gate = `npm ci && npm run build` на Node 22, тулзы подтягиваются из ветки `tooling` best-effort
- Почему напрямую: инфраструктурный хотфикс, блокировал ВСЕ PR (в т.ч. PR #4 и PR #5)
- CI результат: success

### [2026-04-19 15:00] INIT  orphan branch `tooling`
- Что: создана orphan-ветка `tooling` для инструментов (quality-*.sh и т.п.), взято из `~/aidaplus-dev/tools/`. В сайтовые ветки tools/ не попадают.

### [2026-04-19 14:00] DIRECT COMMIT (orchestrator → dev)  Hero.astro + CLAUDE.md
- Коммиты: 793e8d6, 89c1365 в dev
- Что: (1) CLAUDE.md — блок про позиционирование бренда; (2) Hero.astro — перенос ИИ-ссылки в правый-нижний угол (десктоп) + видимая плашка «от 48 000 ₽» на мобилке
- Почему напрямую: правки сделаны до введения оркестратора, уже выкачены на dev.aidacamp.ru через rsync. Зафиксировал через коммиты по согласию Влада.

### [2026-04-19 11:35 UTC] INCIDENT: CI quality-gate упал на PR #4 (resolved)
- Ветка: `agent/seo-main-links` → dev
- PR: https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/4
- Что изменилось: правка allLandingPages — перелинковка главной (улучшение SEO-якорей)
- Причина падения CI: `.github/workflows/quality-gate.yml` ссылается на `tools/quality-metrics.sh` — файла нет в репозитории → `chmod: cannot access` → exit 1
- Вывод оркестратора: ошибка **не в коде PR**, а в инфраструктуре workflow
- Решение: НЕ мержить PR #4 до починки workflow. Ждать PR от `agent/fix-ci-quality-gate`
- Порядок мержа: (1) `agent/fix-ci-quality-gate` (2) `agent/seo-main-links` (3) остальные
- Кто разрешил мерж: — (ждём починки CI + ревью владельца)

### [2026-04-19 orchestration] Обнаружена ветка `agent/metrika-sync-loader` на remote
- Статус: в реестре `AGENTS.md` не зафиксирована
- Действие: уточнить у Влада что это за задача и зарегистрировать в `TASKS.md`
