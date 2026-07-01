# Аудит секретов в crontab и скриптах — общий сервер

**Дата:** 2026-07-01 · **Режим:** только чтение (на сервере ничего не менялось) ·
**Сервер:** 159.194.223.55 (общий для aidacamp / codims / icepartners / vlad-a) ·
**Дашборд:** https://dev.aidacamp.ru/reports-hub/#secrets-audit-crontab

> Значения секретов маскированы (последние 4 символа). Риск общий для всех 4 сайтов на сервере.

## Итог

- **15** plaintext-секретов · **6** сервисов · **3** critical · **13** `.env` с правами 644.
- Живые ключи/пароли лежат в исходниках `.py`/`.js` с правами 644 (читаемы любым локальным пользователем, включая `www-data`, `deploy`). Компрометация одного веб-процесса → утечка ключей ко всем проектам.
- Правильный паттерн (env + обёртки) уже применён в `restic-env.sh`, `ea-monitor`, `ai-proxy`, `aidacamp-hub` — надо распространить на остальные.

## Топ-3 критических риска

1. **CRIT — Anthropic API-ключ в открытом виде.** `/opt/monitoring/ai_analyst.py:14`, `ANTHROPIC_API_KEY="sk-ant-...jgAA"`, права 644.
2. **CRIT — пароль PostgreSQL в 4 JS-файлах.** `/opt/aidacamp-attribution/{server,seed-inline,update-crm,seed-codims}.js`, `password:'...2026'`, 644. БД `aidacamp` (лиды, атрибуция, диалоги).
3. **CRIT — Я.Метрика/Директ OAuth + Telegram-бот в plaintext.** `/opt/monitoring/hourly_traffic_quality.py` (`y0__...yVcH`, `8663...dhZ4`).

## 1. Секреты в cron

| Файл | Секрет | Сервис | Права | Серьёзность |
|---|---|---|---|---|
| `/etc/cron.d/aidacamp-penalty.disabled` | `X-Cron-Secret: ...65d4` в командной строке curl | внутренний API портала | 644 | HIGH |

Остальной cron (root + postgres) секретов в командной строке не держит — токены из `.env` через обёртки (restic, vk-token-refresh, etl). Файл `.disabled` неактивен, но открыт и попадает в бэкапы.

## 2. Захардкоженные секреты в скриптах

| Файл | Тип | Сервис | Хвост | Права | Серьёзн. |
|---|---|---|---|---|---|
| `/opt/monitoring/ai_analyst.py:14` | API-ключ | Anthropic | ...jgAA | 644 | CRIT |
| `/opt/aidacamp-attribution/*.js` (×4) | пароль БД | PostgreSQL `aidacamp` | ...2026 | 644 | CRIT |
| `/opt/monitoring/hourly_traffic_quality.py:18-19` | OAuth-токен | Я.Метрика + Я.Директ | ...yVcH | 755 | CRIT |
| `/opt/monitoring/negkw_patrol.py:13` | OAuth-токен | Я.Метрика | ...yVcH | 755 | HIGH |
| `/opt/monitoring/hourly_traffic_quality.py:21`, `search_quality_monitor.py:24` | bot-token | Telegram | ...dhZ4 | 644/755 | HIGH |
| `/opt/monitoring/kw_positions_check.py:10`, `/opt/ice-seo/wordstat_batch_v2.py:5`, `suggest_batch.py:4` | API-ключ | Arsenkin (SEO) | ...8ef0 | 644 | MED |

Скрипты `/opt/monitoring/*` и `/opt/ice-seo/*` не подключены к активному cron/systemd, но ключи в них живые.

## 3. .env с небезопасными правами (644 вместо 600)

| Файл | Что внутри | Права | Серьёзн. |
|---|---|---|---|
| `/opt/audit/.env` | ANTHROPIC_API_KEY | 644 root:root | CRIT |
| `/var/www/codims-prod/.env`, `/var/www/codims-dev/.env` | TELEGRAM_BOT_TOKEN, YADISK_TOKEN, ALPHACRM_TOKEN | 644 root:root | CRIT |
| `/var/www/codims-dev/repo/.env` | секреты codims | 644 www-data:www-data | CRIT |
| `/opt/.env` | YADISK_TOKEN, METRIKA_WRITE_TOKEN | 644 root:root | HIGH |
| `/opt/agent-tools/.env` | ELEVENLABS_API_KEY | 644 **UNKNOWN**:staff | HIGH |
| `/opt/immich/.env` | DB_PASSWORD | 644 root:root | MED |
| `/var/www/aidacamp/.env` | не-секретный, но 644 (читает `monitor-ssr.sh`) | 644 root:root | MED |
| `/var/www/icepartners-dev/repo/.env` | **корректно 600 deploy:deploy** (эталон) | 600 | — |

Приемлемо: `640 root:postgres` у `/etc/aidacamp-secrets.env` и `/opt/aidacamp-tools/etl/.env` (нужно postgres-cron). `docs/quality/*.env` и `node_modules/plyr/.env` — не секреты.

## 4. Секреты в опубликованных отчётах Reports Hub

| Файл | Секрет | Серьёзн. |
|---|---|---|
| `/opt/reports-hub/files/2026-05-1x-autopilot-dash-*.html` | `SECRET='aidacamp-autopilot-2026'` в клиентском JS (публично) | HIGH |
| `/opt/reports-hub/files/2026-05-27-vk-*.json` | VK `web_view_token` (×множество) | MED |
| `2026-05-07-incamp-camps.html` | Яндекс.Карты apikey (домен-ограниченный) | MED |

## План выноса (приоритизированный)

1. **Ротация (сегодня).** Ключи в git/бэкапах/отчётах = скомпрометированы: перевыпустить Anthropic-ключ, сменить пароль PG `aidacamp`, отозвать общий Я.OAuth, перевыпустить TG-бот-токен, сменить autopilot SECRET и penalty X-Cron-Secret.
2. **Права .env (5 мин, без ротации).** `chmod 600` на все 644-`.env` с секретами; для читаемых www-data/postgres — `640` + группа. Разобрать `UNKNOWN`-владельца `/opt/agent-tools/.env`.
3. **Вынос хардкодов в .env + обёртки** по образцу `/opt/etl/run_enrich_buyers.sh` и `restic-env.sh`: `/opt/monitoring/*`, `/opt/ice-seo/*`, `/opt/aidacamp-attribution/*`.
4. **Единый секрет-стор.** Свести проекты к var-vault (`aidacamp-hub` `getVarVault`) / `/etc/aidacamp-secrets.env`; убрать дубли токенов codims-prod/dev.
5. **Чистка Reports Hub.** Перегенерировать autopilot-дашборды и vk-json без токенов; фильтр секретов в `publish.sh`.
6. **Убрать мёртвый** `/etc/cron.d/aidacamp-penalty.disabled` (попадает в restic-бэкап).
