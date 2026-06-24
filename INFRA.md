# INFRA — карта инфраструктуры (все сайты)

> **Читай ПЕРЕД любым деплоем или работой с сервером.**

Сервер: **159.194.223.55** (Beget VPS). SSH-ключ: `~/.ssh/aidacamp_prod`.

---

## Все сайты на одном сервере

| Домен | Папка на сервере | Деплой | Локальное репо |
|---|---|---|---|
| `aidacamp.ru` | `/var/www/aidacamp/current/` | `./scripts/deploy.sh` | `~/Aidacamp-cloude/` |
| `dev.aidacamp.ru` | `/var/www/aidacamp-dev/current/` | `./scripts/deploy.sh dev` | `~/Aidacamp-cloude/` |
| `codims.ru` | `/var/www/codims/` | push `main` → GH Actions | `~/codims/` |
| `dev.codims.ru` | `/var/www/codims-dev/` | push `dev` → GH Actions | `~/codims/` |
| `icepartners.ru` | `/var/www/icepartners/` | push `main` → GH Actions | `~/icepartners-git/` |
| `dev.icepartners.ru` | `/var/www/icepartners/` (тот же dist) | — | — |
| `vlad-a.ru` | `/var/www/vlad-a-prod/` | SSH напрямую | ❌ нет локального |
| `ai.aidacamp.ru` | `/opt/aistudio/` (docker compose) | `docker compose up -d` | `~/MCP/` |

---

## Карта: домен → nginx → сервис → папка → порт

| Домен / путь | systemd-сервис | Рабочая папка | Порт |
|---|---|---|---|
| `aidacamp.ru` (статика) | — (nginx отдаёт файлы) | `/var/www/aidacamp/current/` | — |
| **`aidacamp.ru/portal`** (SSR) | **`aidacamp-prod`** | `/var/www/aidacamp/current/` | **4185** |
| `dev.aidacamp.ru` (статика+SSR) | `aidacamp-dev` | `/var/www/aidacamp-dev/current/` | 4181 |
| `ai.aidacamp.ru` (whoami-авторизация) | ⚠️ пока `aidacamp-dev` (4181) | — | 4181 |

**База данных — ОДНА ОБЩАЯ** для прод и dev портала (`AIDAPLUS_PG_DSN` в
`.env`). Данные детей, смен, игровых рублей — единые. dev и прод портала
отличаются только КОДОМ, не данными.

---

## Деплой

```bash
# DEV (dev.aidacamp.ru) — меняет ТОЛЬКО dev, прод не трогает
./scripts/deploy.sh dev

# PROD (aidacamp.ru) — меняет прод, рестартует aidacamp-prod
MASTER_AGENT=1 ./scripts/deploy.sh prod
```

`deploy.sh` падает с exit 1, если сервис не нашёлся/не active после рестарта
(чтобы «успешный» деплой не оказался фиктивным — урок инцидента 31.05).

---

## История: инцидент 2026-05-31

**Симптом:** методички не появлялись на `aidacamp.ru/portal/metodichki` после
`deploy.sh prod`, хотя деплой рапортовал успех.

**Причина:** боевой `aidacamp.ru/portal` работал из DEV-инфраструктуры —
nginx слал `/portal/` на 4181 (`aidacamp-dev`, dev-папка). `deploy.sh prod`
клал код в `/var/www/aidacamp/current` (её портал не читал) и рестартовал
несуществующий сервис `aidacamp` → молчаливый «⚠️ не active».

**Решение:** создан отдельный сервис `aidacamp-prod` (порт 4185, прод-папка,
та же БД), nginx `/portal/` переключён на него. Скрипт миграции:
`scripts/migrate-portal-prod-split.sh` (с `--check` и `--rollback`).

**Правило:** портал — SSR, его рендерит node-процесс. Обновление статики ≠
обновление портала. Всегда проверять, что нужный СЕРВИС перезапущен и отдаёт
новый код (см. drift-check ниже).

---

## Защита (мониторинг)

- `scripts/health-monitor.sh` — проверяет оба портала, алерт в Telegram при падении (cron каждые 5 мин).
- `scripts/drift-check.sh` — сверяет задеплоенный SHA с тем, что отдаёт живой сервис.
- `deploy.sh` пишет `.deployed-sha` в папку деплоя для drift-проверки.
