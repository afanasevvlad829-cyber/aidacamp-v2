# TOOLS_AND_ACCESS.md

Карта всех инструментов, интеграций и доступов проекта aidacamp-v2. Документ создан аудитором 2026-04-21 на основе чтения кода, заметок и SSH-инспекции сервера.

---

## 1. ИНФРАСТРУКТУРА

### Сервер

| Параметр | Значение |
|---|---|
| IP | 159.194.223.55 |
| SSH alias | `aidacamp` (настроен в `~/.ssh/config`) |
| SSH ключ prod | `~/.ssh/aidacamp_prod` (полный доступ) |
| SSH ключ dev | `~/.ssh/aidacamp_dev` (только `/var/www/aidacamp-dev/`) |
| ОС | Ubuntu (nginx 1.24, systemd) |

### Пути деплоя

| Окружение | Web-root | URL |
|---|---|---|
| Dev | `/var/www/aidacamp-dev/current/` | dev.aidacamp.ru |
| Prod | `/var/www/aidacamp/current/` | aidacamp.ru |
| Статика | `dist/client/` → rsync | — |
| SSR-сервер | `dist/server/` → rsync | — |

```bash
# Деплой на dev
npm run build
rsync -avz --delete -e 'ssh -i ~/.ssh/aidacamp_prod' \
  dist/client/ root@159.194.223.55:/var/www/aidacamp-dev/current/
rsync -avz -e 'ssh -i ~/.ssh/aidacamp_prod' \
  dist/server/ root@159.194.223.55:/var/www/aidacamp-dev/current/server/
ssh aidacamp "systemctl restart aidacamp-dev"

# Деплой на prod — только с явного разрешения Влада
# Используй ./scripts/deploy.sh prod (есть подтверждение + backup)
```

**Всегда сначала dev, потом prod.** Скрипт `deploy.sh prod` создаёт backup прода перед деплоем.

### Другие сервисы на сервере

- `/var/www/codims-dev/` — сайт Codims (стейджинг), уже есть директория
- `/var/www/html/` — дефолтный nginx root

### MCP-сервер

| Параметр | Значение |
|---|---|
| Путь | `/opt/mcp/mcp-server.mjs` |
| systemd unit | `aidacamp-mcp` |
| Env | `/opt/mcp/.env` |
| Transport | HTTP, порт 3457 |
| Статус | active (running), автозапуск при старте |

```bash
# Перезапуск MCP-сервера
systemctl restart aidacamp-mcp

# Если systemd недоступен из SSH-сессии:
nohup bash /tmp/restart-mcp.sh &>/dev/null &
```

### Репозиторий

| Параметр | Значение |
|---|---|
| GitHub | `afanasevvlad829-cyber/aidacamp-v2` |
| Main branch | `main` (прод) |
| Staging | `dev` (стейджинг) |
| Рабочие | `agent/*` → PR → dev |
| Инструменты | `tooling` (orphan, не мержится) |

**Правила веток:**
- Оркестратор (главная сессия Клода) — пишет в `dev` напрямую
- Агенты — только в `agent/*`, PR в `dev`
- В `main` — только через `git merge dev` с явного разрешения Влада
- В `main` напрямую — запрещено

---

## 2. АНАЛИТИКА

### Яндекс Метрика

| Параметр | Значение |
|---|---|
| ID счётчика | `96499295` |
| Доступ | браузер / MCP `aidacamp-tools:stats` |

**Цели:**

| Имя цели | GoalID | Ценность | Где навешана |
|---|---|---|---|
| `form_submit` | 541048197 | 6 750₽ | `LeadForm.astro` → POST `/api/lead` |
| `age_select` | 541048270 | — (авто) | `LeadForm.astro` кнопки возраста |
| `phone_click` | 545216440 | 3 375₽ | `PhoneDropdown.astro` |
| `telegram_click` | н/д¹ | 3 375₽ | `PhoneDropdown.astro`, `Contacts.astro` |
| `whatsapp_click` | н/д¹ | уточнить | `PhoneDropdown.astro`, `Contacts.astro` |
| `shift_book_click` | н/д¹ | 500₽ | `Shifts.astro` |
| `scroll_25` | н/д¹ | — | `Base.astro` (`initScrollTracking()`) |
| `scroll_50` | н/д¹ | — | `Base.astro` |
| `scroll_75` | н/д¹ | — | `Base.astro` |
| `scroll_90` | н/д¹ | — | `Base.astro` |

¹ **Числовые GoalID в коде не хранятся** — они нужны только для поля `GoalId` в Яндекс.Директ. Сами цели работают через строковый идентификатор: `ym(96499295, 'reachGoal', 'telegram_click')`. Числовые ID смотреть в интерфейсе Метрики: «Цели» → название цели → ID в адресной строке.

**Ключевая цель для автостратегий Директ:** `age_select` (GoalID 541048270) — 175 событий/нед, зелёная зона обучения. `form_submit` (4/нед) — слишком редкая для автостратегий.

**window.trackGoal(id, params)** — глобальная функция, определена в `Base.astro`. Вызывать из любого компонента.

### Google Search Console

| Параметр | Значение |
|---|---|
| Доступ | браузер |
| Лимит индексирования | ~10 URL/день |
| Статус апрель 2026 | 14 URL отправлены, статус «В очереди» |

### Яндекс Вебмастер

| Параметр | Значение |
|---|---|
| Доступ | браузер |
| Статус апрель 2026 | 17 URL отправлены |

### Microsoft Clarity

| Параметр | Значение |
|---|---|
| ID | `w8yoykmszl` |
| Доступ | браузер + MCP `aidacamp-tools:clarity` |
| Норма dead clicks | <5% |
| Текущий показатель | 22% (апрель 2026) — требует работы |

**MCP команды:**

```bash
clarity(report: "summary", period: "week")
clarity(report: "pages", period: "month")
```

### Leadfeeder

| Параметр | Значение |
|---|---|
| ID | `YEgkB8lbGVx4ep3Z` |
| Назначение | B2B-идентификация компаний (кто смотрит сайт) |
| Скрипт | async в `Base.astro` |

---

## 3. РЕКЛАМА

### Яндекс Директ

| Параметр | Значение |
|---|---|
| Логин | `kv145` |
| Доступ | браузер + MCP `aidacamp-tools:direct_*` |

**Активные кампании:**

| ID | Название | Тип | Статус | Бюджет/день |
|---|---|---|---|---|
| 708698819 | РСЯ | Медийная сеть | Активна | 4 000₽ |
| 708664426 | Поиск | Поиск | Активна | 2 500₽ |
| 708615379 | Ретаргет | РСЯ+Ретаргет | Активна | 500₽ |

**Правила для новых кампаний/групп (нарушать нельзя):**

```
✅ Регионы: ТОЛЬКО [1, 213] (Москва + МО). ID 2 (СПб) — запрещён
✅ Автотаргетинг: удалить немедленно при создании кампании
✅ Широкие/альтернативные фразы: отключить сразу
✅ Временной таргетинг РСЯ: НЕ показывать до 11:00 МСК
✅ Лучший день: четверг. Худший: воскресенье
✅ Android: корректировка -35%; планшеты: -100%; мужчины 25-44: -100%
✅ Женщины 35-44: +20%; Женщины 45-54: +20%
```

**Стратегия обучения (порядок шагов):**

| Этап | Стратегия | Условие перехода |
|---|---|---|
| 1. Разгон | OPTIMIZE_CLICKS | 10-15 кликов + 3-5 конв в нед |
| 2. Основной | OPTIMIZE_CONVERSIONS | 10+ конв/нед стабильно |
| 3. Продвинутый | PAY_FOR_CONVERSION | 10+ конв/нед минимум 3 нед подряд |

Минимальный бюджет разгона: **10 000₽/нед**. PAY_FOR_CONVERSION при <10 конв/нед → кампании «замерзают», 0 показов.

**Autoban площадок:**

| Параметр | Значение |
|---|---|
| Скрипт | `/opt/etl/autoban.py` |
| Запуск | каждые 3 минуты (cron) |
| Правило LEVEL 2 | расход >80₽ И кликов >3 И не в whitelist |
| Лог | `/var/log/direct-autoban.log` |
| Лимит Яндекса | 1000 слотов, держим запас 50 |

**MCP-инструменты:**

```bash
direct_campaigns(status: "active")
direct_manage_campaign(action: "create", name: "...")
direct_manage_adgroup(action: "list", campaign_id: 708664426)
direct_manage_ad(action: "create", ...)
direct_manage_keywords(action: "add", ...)
```

### VK Реклама

| Параметр | Значение |
|---|---|
| VK Account ID | `29700362` |
| Пиксель Top.Mail.Ru ID | `3755202` |
| Счётчик Top.Mail.Ru | `639085` |
| Доступ | MCP `aidacamp-tools:vk_*` |

**Ключевые события пикселя:**

| Событие | ID | Назначение |
|---|---|---|
| `lead` | 77499... | Основная конверсия |
| `micro_age_select` | 7761900 | Микроконверсия (47/7 дней) |
| `Переход в мессенджер` | 7717530 | **Цель для обучения кампаний** |

**Правила VK:**

```
✅ Цель для обучения алгоритма: "Переход в мессенджер" (ID 7717530)
❌ НЕ использовать micro_age_select как priced_goal — неправильная атрибуция
✅ Окно атрибуции: 7 дней post-click
✅ Минимум для обучения: ~30 событий/нед
✅ Размещения: ВКонтакте + Одноклассники (CTR +2.3%)
✅ Демография: женщины 35-54
```

**Статус воронки апрель 2026:**
- CTR ~2.3-2.4%, CPC ~10-11₽ ✅
- 131 клик → ~1 age_select ❌ (ожидалось >10)
- Причина: сломан popup выбора возраста в `Base.astro`

**MCP-инструменты:**

```bash
vk_campaigns(status: "active")
vk_manage_campaign(action: "create", ...)
vk_manage_ad_group(action: "list", campaign_id: 123)
vk_manage_ad(action: "create", ...)
vk_ads_stats(period: "week", level: "campaign")
```

**Протокол анализа VK — КРАСИВОЕ (кодовое слово «К»):**
Ежедневный анализ по чек-листу: Кампании → Ретаргет → Аудитории → Статистика → Итого → Выводы → Оптимизация → Ещё раз.

---

## 4. CRM И КОММУНИКАЦИИ

### AlfaCRM

| Параметр | Значение |
|---|---|
| Конфигурация | env `ALFACRM_*` в `/opt/mcp/.env` |
| Код интеграции | `src/pages/api/lead.ts` |
| База лидов | ~1500 интересовавшихся |
| База клиентов | ~989 учащихся (школа) |

**Что передаём при заявке:**
- Телефон (очищен от нецифр)
- Имя: `«Лид {age}»`
- UTM параметры (source, medium, campaign, content, term)
- yclid, gclid, ym_client_id
- Примечание: смена/курс, referrer, landing_url

**Pending (не реализовано):**
- Аудитории Директ и VK из базы CRM не загружены → приоритет

### Telegram-уведомления о лидах

| Параметр | Значение |
|---|---|
| Конфигурация | env `TG_BOT_TOKEN`, `TG_CHAT_ID` в `/opt/mcp/.env` |
| Код | `src/pages/api/lead.ts` |
| Время ответа | 10 мин (11:00-20:00 МСК) |

**Формат rich-нотификации (секции):**

```
🎯 [Заголовок: обычная] / 🎁 [Заголовок: реферальная]

📞 КОНТАКТ
  Телефон: +79991234567
  Возраст: 10-12 лет
  Смена: Лето-1

🔗 ИСТОЧНИК
  UTM: yandex / cpc / summer_camp / hero
  yclid: ...
  Реферер: https://yandex.ru/search?...

👁 ПОВЕДЕНИЕ
  Страница: "АйДаКемп — IT-лагерь"
  URL: https://aidacamp.ru
  Время на сайте: 45 сек

📱 УСТРОЙСТВО
  Экран: 390x844
  Viewport: 390x844
  Язык: ru / Europe/Moscow

🔑 IDs
  Метрика: 123456789.987654321
  CRM ID: 12345
```

### Контакты кампании (aidacamp.ru)

| Канал | Значение |
|---|---|
| Телефон 1 | +7(968)808-64-55 |
| Телефон 2 | +7(495)128-44-29 |
| WhatsApp | wa.me/79688086455 |
| Telegram | t.me/Progaschool |
| Email | hello@codims.ru (единый для лагеря и школы, `src/data/contacts.ts`) |

---

## 5. КОНТЕНТ И МЕДИА

### Фото (Яндекс Диск)

| Параметр | Значение |
|---|---|
| Кол-во фото | ~9 200 с AI-описаниями (Gemini Vision) |
| Каталог | `scripts/photo_catalog.json` |
| MCP | `aidacamp-tools:photos` |
| Прокси (без токена) | `https://dev.aidacamp.ru/api/photo?path=disk:/...` |

**Команды MCP:**

```bash
photos(command: "search", query: "дети программирование")
photos(command: "best", query: "занятие", count: 5)
photos(command: "scenes")  # список сцен
photos(command: "url", path: "disk:/Медиа/2024/...")
```

**Основные сцены:** занятие, хакатон, эмоции, спорт, территория, столовая, вожатые, награждение, бассейн, комнаты, прочее.

**Пакетный запрос (до 20 фото):**

```bash
curl -X POST https://dev.aidacamp.ru/api/photo \
  -H "Content-Type: application/json" \
  -d '{"paths": ["disk:/Медиа/2024/Фото/...", "..."]}'
```

### Видео (Kinescope)

**API-токен не нужен** — видео публично доступны через embed-URL без авторизации. Если понадобится управление через Kinescope API (загрузка, аналитика просмотров) — токен нужно будет запросить в личном кабинете kinescope.io.

**Маркетинговые видео (для сайта):**

| ID | Название |
|---|---|
| `qmLxu2S7uaS44CKkhoV1Jj` | IT-лагерь — это не «сидеть за компьютером» |
| `tJAaAnvCYYJ5vRz7uyUepj` | За неделю в лагере он меняется больше, чем за год дома |
| `naDfzrei9duApz3AnaencH` | Не хочу в лагерь… Через 3 дня: хочу ещё |
| `eTmCgZHcwhcWQQs3HLCz1S` | Ребёнок сам откажется от телефона за 3 дня |
| `s1SCYKqLx6C94fMRumitHF` | Зачем детям копить деньги в лагере |

**Проектные видео (работы учеников):**

| ID | Название |
|---|---|
| `g2S7xxtEUP4S2E3WXYFNqZ` | Игра «Моя ферма» |
| `2ULnxEqqC4ssLNYCh5YPvo` | Программирование дронов |
| `iFCF2uprpHLxx9VgJ1M7SP` | Игра на Unity |
| `0Vs3qPMJr7Kvz13MWsxcbc` | Игра «Исследователь» |
| `w1eZLPX8mqdC7dMniPaBWT` | Игра «Луиджи» |

**Паттерн встраивания** (`Videos.astro`):
```html
<!-- poster + кнопка play → при клике подставляется iframe -->
<iframe src="https://kinescope.io/embed/{id}?autoplay=1"></iframe>
```
Lazy-активация через Intersection Observer — iframe не грузится до появления в viewport.

---

## 6. РАЗРАБОТКА И СКРИПТЫ

### Локальная разработка

```bash
# Активация Node 22
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22

# Проект
cd ~/Aidacamp-cloude

# Команды
npm run dev      # dev-сервер localhost:4321
npm run build    # сборка (guard → icons → astro → sitemap → critical-css)
npm run preview  # превью собранного билда

# Добавить Bootstrap-иконку
# 1. Добавить имя в src/data/icons-manifest.json
# 2. npm run icons
# 3. Закоммитить оба файла
```

### ETL-скрипты на сервере (`/opt/etl/`)

| Скрипт | Что делает | Расписание cron |
|---|---|---|
| `run-etl.sh` | Полный ETL: Direct + Metrika + Clarity → PostgreSQL | каждый час 6-21 |
| `vk-sync.py` | Статистика VK Ads → PostgreSQL | каждый час 6-21 (05 мин) |
| `autoban.py` | Бан РСЯ площадок (>80₽, >3 кликов) | каждые 3 мин |
| `search-autoban.py` | Бан поисковых площадок | каждые 3 мин |
| `search-junk-digest.py` | Дайджест мусорных запросов | 9:00 ежедневно |
| `excluded-rotator.py` | Ротация минус-площадок | 5:00 ежедневно |
| `daily-digest.py` | Ежедневный дайджест статистики | 6:00 ежедневно |
| `direct-status.py` | Алерты Директ (бюджет, статусы) | каждые 30 мин 6-22 |
| `cm-v3-engine.py` | Critical Monitor v3 (AI-анализ) | каждые 30 мин |
| `cm-v3-callback-bridge.sh` | Мост коллбэков CM v3 | каждую минуту |
| `vk-monitor.py` | Мониторинг VK Ads | каждые 30 мин |
| `seo-positions-snapshot.py` | Снимок SEO-позиций | 7:00 1-го и 15-го |
| `gapi-wa-*.sh` | WhatsApp рассылки B1-реактивация | по требованию |
| `backup-to-gdrive.sh` | Бэкап в Google Drive | hourly + daily(3:15) + weekly(4:00 вс) |

### Таблицы PostgreSQL (`aidacamp` БД)

| Таблица | Что хранит |
|---|---|
| `direct_campaign_stats` | Клики, показы, CTR, расход, конверсии по кампаниям/дням |
| `direct_placements` | Площадки показа РСЯ по кампаниям/дням |
| `metrika_traffic` | Визиты, пользователи, отказы по источникам/дням |
| `metrika_goals` | Конверсии по целям и источникам |
| `metrika_utm` | Статистика по UTM-меткам |
| `vk_ads_stats` | Статистика VK рекламы |
| `clarity_daily` | Агрегат Clarity за день |
| `clarity_pages` | Clarity метрики по URL (scroll depth, dead/rage clicks) |

**Быстрый доступ к статистике:**

```bash
./scripts/stats.sh summary week      # сводка за неделю
./scripts/stats.sh direct today      # Direct сегодня
./scripts/stats.sh goals month       # конверсии за месяц
./scripts/stats.sh query "SELECT ..."  # произвольный SQL
```

### Playwright / CDP (автоматизация)

Используется для задач, которые Директ API v5 не поддерживает (например, загрузка карусельных объявлений через интерфейс).

```bash
# Паттерн запуска с сохранением сессии
/tmp/session-google.json
/tmp/session-yandex.json

# Кредиты через secretctl (не хранить в коде!)
secretctl get yandex-password | playwright ...
```

### Надёжные паттерны работы с сервером

```bash
# Долгий процесс в фоне через SSH
nohup bash /tmp/script.sh &>/dev/null &

# Патч файла на сервере (Python heredoc через SSH)
ssh aidacamp "python3 - <<'EOF'
import re
content = open('/path/to/file').read()
content = content.replace('OLD', 'NEW')
open('/path/to/file', 'w').write(content)
EOF"

# Резервный канал когда SSH MCP нестабилен: Apple Notes
```

---

## 7. СТАТУСЫ ДОСТУПОВ

| Инструмент | Логин/ID | Где хранится | Статус | Примечание |
|---|---|---|---|---|
| SSH сервер | root@159.194.223.55 | `~/.ssh/aidacamp_prod` | ✅ рабочий | alias `aidacamp` |
| Яндекс Директ | kv145 | браузер | ✅ рабочий | MCP: `direct_*` |
| VK Реклама | 29700362 | `/opt/mcp/.env` | ✅ рабочий | MCP: `vk_*` |
| Яндекс Метрика | 96499295 | браузер / MCP | ✅ рабочий | `aidacamp-tools:stats` |
| Microsoft Clarity | w8yoykmszl | браузер / MCP | ✅ рабочий | `aidacamp-tools:clarity` |
| AlfaCRM | — | `/opt/mcp/.env` (ALFACRM_*) | ✅ рабочий | интеграция в lead.ts |
| Kinescope | — | не требуется | ✅ рабочий | embed без токена: `kinescope.io/embed/{id}` |
| Яндекс Диск (фото) | — | сервер-прокси | ✅ рабочий | `aidacamp-tools:photos` |
| Google Search Console | — | браузер | ✅ рабочий | лимит ~10 URL/день |
| Яндекс Вебмастер | — | браузер | ✅ рабочий | ручная отправка URL |
| GitHub | afanasevvlad829-cyber | браузер / git | ✅ рабочий | repo: aidacamp-v2 |
| Google Drive (бэкап) | — | сервис-аккаунт на сервере | ✅ рабочий | `/opt/etl/backup-to-gdrive.sh` |
| Telegram бот (лиды) | — | `/opt/mcp/.env` (TG_BOT_TOKEN, TG_CHAT_ID) | ✅ рабочий | нотификации в lead.ts |
| Leadfeeder | YEgkB8lbGVx4ep3Z | Base.astro скрипт | ✅ рабочий | B2B идентификация компаний |
| WhatsApp API (B1) | — | `/opt/etl/gapi-wa*.sh` | ⚠️ уточнить | рассылки реактивации |
| Top.Mail.Ru пиксель | 3755202 | Base.astro скрипт | ✅ рабочий | VK атрибуция |
| n8n | — | — | ❌ не развёрнут | в планах |

---

*Документ актуален на 2026-04-21. При изменении доступов или добавлении новых сервисов — обновлять статус в таблице.*
