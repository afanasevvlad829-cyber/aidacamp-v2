# АйДаКемп — Project Rules

## 🧠 ОБЯЗАТЕЛЬНО при каждом запуске сессии

**Прочитай эти файлы ПЕРВЫМИ, до любых действий (в таком порядке):**

1. **[CHANGELOG.md](CHANGELOG.md) — ПЕРВЫМ ДЕЛОМ, последние 10 записей!**
   - Там видишь что нового добавилось (новые модули, скрипты, API, credential)
   - Например: `yaxml.py` (24.04.2026) для поиска через Яндекс XML и Google
   - Без этого ты не будешь знать о новых инструментах

2. **[KNOWLEDGE.md](KNOWLEDGE.md)** — полная карта системы: Obsidian, PostgreSQL, боты, скрипты, порты, common/ библиотека, ключевые числа. Без этого агент работает вслепую.
   - Раздел 9 (tools/common/) — точный список всех модулей и функций
   - Раздел 8 (серверные скрипты) — что запущено в cron

3. **[_notes/АйДаКемп/Memory.md](_notes/АйДаКемп/Memory.md)** — главный контекст о бизнесе, текущем статусе, приоритетах.

**Дополнительные справочники (читать по задаче):**
- `_notes/АйДаКемп/Маркетинг/UTM-справочник.md` — при создании кампаний, посадочных страниц, ссылок
- `_notes/АйДаКемп/Маркетинг/Цели-и-стоимость.md` — при работе с аналитикой, целями, CPA
- `_notes/АйДаКемп/Сайт/Подмены H1.md` — при работе с UTM-подменами на сайте

---

## 🔍 Как найти инструмент или модуль

**Всё прямо в KNOWLEDGE.md раздел 9** — там список ВСЕХ Python-модулей в `tools/common/`:

| Что ищешь | Где найти |
|---|---|
| **Список всех модулей** (direct.py, vk.py, yaxml.py и т.д.) | KNOWLEDGE.md раздел 9 — таблица `tools/common/` |
| **Функции в модуле** (что вернёт, какие параметры) | KNOWLEDGE.md раздел 9.1, 9.2 и т.д. — раскрытие каждого модуля |
| **Примеры использования** | KNOWLEDGE.md раздел 9.X — код в `\`\`\`python\`\`\`` блоках |
| **Недавно добавленные инструменты** | CHANGELOG.md последние 5-10 записей (дата 2026-04-XX) |
| **Все серверные скрипты** (cron, что делают) | KNOWLEDGE.md раздел 8 — таблицы активных скриптов |
| **Устаревшие модули** (deprecated) | KNOWLEDGE.md раздел 8.3 — папка `tools/deprecated/` |

**Алгоритм поиска инструмента:**

1. **Нужен модуль (type: функция)** → `KNOWLEDGE.md раздел 9` (common/)
   - Если там — читай пример использования, функции, параметры
   - Если нет → создай предложение в KNOWLEDGE_DRAFT.md или скажи пользователю

2. **Нужен скрипт (type: cron работа)** → `KNOWLEDGE.md раздел 8` (серверные)
   - Там список всех запущённых скриптов, время запуска, что делают
   - Если скрипт нужно создать — пиши в CHANGELOG.md

3. **Недавно добавили что-то?** → `CHANGELOG.md последние записи`
   - Датированные записи за последние дни
   - Там видно что нового (например, `yaxml.py` добавили 24.04.2026)

**ВАЖНО:** Каждый новый модуль → обновляется KNOWLEDGE.md раздел 9 автоматически. Ты должен прочитать CHANGELOG последние записи перед стартом, чтобы знать что добавилось.

**При каждом запросе "создай инструмент для Х":**
1. Проверь KNOWLEDGE.md раздел 9 — может уже есть
2. Проверь CHANGELOG последние 20 строк — может только что добавили
3. Если нет — создавай новый модуль в `tools/common/новое_имя.py`
4. После создания → обновляй CHANGELOG.md и KNOWLEDGE.md раздел 9

---

## 📋 Протокол обновления справочников

**Главный принцип: агент предлагает везде. Разница — кто применяет изменение.**

### ✅ Агент применяет СРАЗУ и САМ

Фактические/структурные изменения, которые уже произошли в коде или системе:

| Что сделал | Куда записать |
|---|---|
| Добавил/изменил/удалил скрипт в `tools/` | KNOWLEDGE.md раздел 8 |
| Добавил/удалил модуль в `tools/common/` | KNOWLEDGE.md раздел 9 |
| Добавил новый API / сервис / порт | KNOWLEDGE.md раздел 7 + AUDIT.md |
| Изменил cron-расписание | KNOWLEDGE.md раздел 8 |
| Любое из вышеперечисленного | + одна строка в CHANGELOG.md |

### 📝 Агент пишет предложение в KNOWLEDGE_DRAFT.md — Влад отвечает «применить» или «нет»

**Всё остальное** — агент не молчит, а формулирует предложение. Нашёл расхождение между реальностью и документом — пиши. Видишь что стратегия устарела — пиши. Считаешь что правило рекламы нужно дополнить — пиши.

Примеры когда надо писать в DRAFT:
- Стратегия или Memory.md расходятся с тем что делается по факту
- Правило в Библиотеке знаний противоречит результатам кампаний
- KPI-цифры в Цели-и-стоимость.md уже не актуальны
- UTM-схема требует добавления новой кампании
- Обнаружена новая аудитория, которой нет в Аудитории.md
- Любое «я бы обновил X потому что Y»

**Формат предложения в KNOWLEDGE_DRAFT.md:**
```
### ГГГГ-ММ-ДД · [название файла]

**Что изменить:** <конкретная формулировка — готовый текст для вставки>
**Почему:** <факт или наблюдение которое привело к предложению>
**Откуда данные:** <источник: API / сессия / аудит / инцидент>
**Срочность:** высокая / средняя / низкая
```

Влад просматривает KNOWLEDGE_DRAFT.md и говорит «применить» — агент применяет и переносит в CHANGELOG.

### 🤖 Автоматическая синхронизация (sync_knowledge.py)

Скрипт `tools/sync_knowledge.py` запускается в cron **каждый понедельник 08:00 UTC**:
- Проходит по `tools/`, `_notes/`, PostgreSQL, systemd
- Обновляет счётчики и списки файлов в KNOWLEDGE.md (AUTO)
- Обнаруженные смысловые расхождения → добавляет в KNOWLEDGE_DRAFT.md
- TG-отчёт: что изменилось, что ждёт решения

Агенты не дублируют работу sync_knowledge — структурные счётчики (числа в шапке) не трогать вручную.

---

## 🎯 Позиционирование бренда — читай ПЕРЕД любой коммуникацией с клиентом

**Любой текст для сайта, креативов, рассылок, постов, скриптов звонков — ДОЛЖЕН
соответствовать позиционированию.** Источники:

- **`_notes/АйДаКемп/Маркетинг/Позиционирование бренда.md`** — образ Дарьи, tone of voice, красные линии
- **`_notes/АйДаКемп/Клиенты/Портрет клиента.md`** — глубинная мотивация, страхи

**Главный принцип (кратко):** Мы продаём маме ощущение "я хорошая", а не
пользу для детей. Продукт = социально-одобряемая вещь, которой можно
похвастаться подругам + закрыть чувство вины за недостаток времени с ребёнком.

**🚫 Запрещено в коммуникации:**
- Нотации родителям ("вы не уделяете внимание")
- Конфронтация с амбициями ("ваши психотравмы через детей")
- Педагогические термины ("soft-skills", "формирование фундамента")
- Серьёзный тон "эксперта в очках"
- Шок-контент, сравнение с конкурентами в лоб

**✅ Работает:** лёгкий тон подруги, красивые фото с улыбками, социальное
подтверждение (отзывы/Яндекс.Карты), налоговый вычет, образ Дарьи как
Instagram-успешной мамы-идеала.

**Перед любым текстом задать 5 вопросов (из `Позиционирование бренда.md`):**
1. Смогла бы мама похвастаться этим в чате с подругами?
2. Не обвиняю ли я её в этой фразе?
3. Понятны ли слова на уровне Instagram, не преподаёт ли текст?
4. Виден ли лёгкий путь наверх к Дарье?
5. Фото — захотела бы она показать это в своём профиле?

Если хоть один «нет» — переписываем.

---

## 📚 Библиотека знаний по каналам (читай перед работой с Директом/VK/SEO)

Живая база правил, инцидентов и best practices. **Обязательно открывать перед любой задачей по рекламе или SEO** — в ней уже записаны грабли, чтобы не наступать повторно.

- **[_notes/Библиотека знаний/](_notes/Библиотека%20знаний/README.md)** — корневой индекс
  - [Яндекс.Директ — основные правила.md](_notes/Библиотека%20знаний/Яндекс.Директ%20—%20основные%20правила.md)
  - [VK Ads — основные правила.md](_notes/Библиотека%20знаний/VK%20Ads%20—%20основные%20правила.md)
  - [SEO — основные правила.md](_notes/Библиотека%20знаний/SEO%20—%20основные%20правила.md)

**Правило:** любой инсайт из сессии, аудита или инцидента — фиксировать в соответствующий файл в разделе «Best practices из нашего опыта» с датой и структурой **Симптом / Причина / Решение / Правило**. Разовые ошибки агента повторяются именно потому, что выводы не записаны.

---

## 🎨 UI-правила (критично)

### Иконки — только Bootstrap Icons, НЕ эмодзи

**✅ Всегда** используй `<i class="bi bi-*">` с `aria-hidden="true"`:
```astro
<i class="bi bi-laptop text-[24px] text-white" aria-hidden="true"></i>
<i class="bi bi-patch-check-fill text-[12px]" aria-hidden="true"></i>
<i class="bi bi-telegram text-[15px]" aria-hidden="true"></i>
```

**❌ Никогда** не используй эмодзи в UI (кнопки, заголовки, карточки, плашки, badges):
```astro
<!-- ЗАПРЕЩЕНО -->
<span>🖥️ Ноутбук не нужен</span>
<span>📞 Позвонить</span>
<span>⚡ Быстро</span>
<span>🎯 Цель</span>
```

### Карта замены частых эмодзи → bi-иконки

| Эмодзи | bi-icon | Применение |
|---|---|---|
| 🖥️ 💻 | `bi-laptop` | ноутбук, устройство |
| 📞 ☎️ | `bi-telephone-fill` | звонок |
| 💬 | `bi-chat-dots-fill` | сообщения |
| ✈️ 📨 | `bi-send-fill` | отправить |
| ⚡ | `bi-lightning-charge-fill` | скорость, энергия |
| 🔄 ♻️ | `bi-arrow-repeat` | обновление, цикл |
| ✅ ✔️ | `bi-check-lg` / `bi-check-circle-fill` | подтверждение |
| ❌ | `bi-x-lg` | закрыть, отмена |
| 🔒 | `bi-lock-fill` / `bi-shield-lock-fill` | закрыто, безопасность |
| 📹 🎥 | `bi-camera-video-fill` | видео |
| ❤️ | `bi-heart-fill` / `bi-heart-pulse-fill` | сердце, здоровье |
| 🏆 🥇 | `bi-trophy-fill` | награда |
| ⭐ | `bi-star-fill` | рейтинг (можно оставить `★` как typography) |
| 🔥 | `bi-fire` | популярное |
| 📷 | `bi-camera-fill` | фото |
| 🛡 | `bi-shield-fill` / `bi-patch-check-fill` | защита, лицензия |
| 💰 | `bi-cash-coin` / `bi-currency-ruble` | деньги |
| 🎯 | `bi-bullseye` | цель |
| 📋 | `bi-clipboard-check` | список |
| ⚠️ | `bi-exclamation-triangle-fill` | внимание |
| 🔔 | `bi-bell-fill` | уведомление |

### Исключения (не эмодзи, допустимо как typography)
- `★` (U+2605), `✓` (U+2713), `•` — это typography symbols, не эмодзи. Можно оставить в тексте.
- Внутри текста статьи (blog) эмодзи как часть цитаты — допустимо.

### ⚠️ ОБЯЗАТЕЛЬНО: доступные иконки

**Используй ТОЛЬКО иконки из `src/data/icons-manifest.json`** (74 штуки на 2026-04-21). Если иконки там нет — добавь её через манифест.

```bash
# Быстро проверить есть ли иконка в проекте:
node -e "const m=require('./src/data/icons-manifest.json'); console.log(m.includes('ICONNAME') ? '✓ есть' : '✗ НЕТ — добавь в manifest')"
```

Если поставишь `bi-lightning-charge-fill` а в манифесте только `bi-lightning-charge` — получишь чёрный квадрат. Это критический баг.

### ⚠️ НИКОГДА не редактируй `src/styles/icons.css` вручную

`icons.css` — **AUTO-GENERATED** файл. Ручные правки будут перезаписаны при следующем `npm run icons`.

**Как добавить иконку:**
1. Найди имя на https://icons.getbootstrap.com/ (~2000 иконок)
2. Добавь имя в `src/data/icons-manifest.json` (просто строка в JSON-массиве)
3. Если иконки нет в bootstrap-icons — положи SVG в `src/styles/custom-icons/<name>.svg`
4. Запусти `npm run icons` — скрипт перегенерирует `icons.css`
5. Закоммить оба файла: `icons-manifest.json` + `icons.css`

**Почему так устроено:** параллельные агенты конфликтовали при ручных правках icons.css (verbose vs compact форма). JSON-манифест мерджится без конфликтов. Один агент добавляет одну строчку в JSON — конфликта нет.

### Частые ловушки для агентов (из аудита 2026-04-21)

| Ситуация | Неправильно | Правильно |
|---|---|---|
| fill-вариант иконки | `bi-lightning-charge-fill` (нет в манифесте) | `bi-lightning-charge` |
| Галочка в кружке | `<span>✓</span>` | `<i class="bi bi-check-lg">` |
| Toast-уведомления (nudge.ts) | `🔥 Текст` | `Текст` (plain text, bi-* недоступны) |
| relatedPages icon | `emoji: "🔍"` | `icon: "search"` |
| Cookie баннер | `🍪` | `<i class="bi bi-info-circle">` |
| Документ/файл | `📄` | `<i class="bi bi-file-earmark-text">` |
| Календарь/дата | `📅` | `<i class="bi bi-calendar-event">` |
| Исключение | admin-страницы `/src/pages/admin/` | можно оставить символы ✓ ✗ в разметке |

### Проверка перед PR

Перед каждым коммитом запускай аудит эмодзи:
```bash
python3 -c "
import os, re
emoji_re = re.compile(r'[\U0001F000-\U0001FFFF\U00002600-\U000027BF]')
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if 'admin' not in root]
    for f in files:
        if f.endswith('.astro'):
            path = os.path.join(root, f)
            for i, line in enumerate(open(path, errors='ignore'), 1):
                if emoji_re.search(line) and not any(x in line for x in ['//','<!--','статьи','article']):
                    print(f'{path}:{i}: {line.strip()[:100]}')
"
```
Если нашло — замени на bi-иконки или убери.

## 📝 Брендовые правила для текстов

- **Дарья Афанасьева** — основатель АйДаКемп, **мама ДОЧЕРИ-подростка** (не сына!). Все цитаты от её лица должны быть согласованы по роду: «у дочери», «она сама», «я слышала от неё» — а НЕ «у сына», «он сам».
- Общий тон цитат Дарьи — подруга, а не эксперт. Простые конкретные наблюдения мамы-к-маме.

---

## 🚫 ЗАПРЕЩЁННЫЕ ЗАВИСИМОСТИ (критично — читай ДО любых правок)

**Запрещено использовать в проекте:**

### `@astrojs/partytown` — НИКОГДА не возвращайте
Не добавляйте в `package.json`, не импортируйте в `astro.config.mjs`, не используйте `<script type="text/partytown">` в компонентах. Билд упадёт на `scripts/guard-no-partytown.sh` (вызывается автоматически через `npm run build`).

**Почему запрет:** Partytown переносит Метрика-скрипт в Web Worker и подменяет `window.ym` на proxy. Proxy падает с `TypeError: Cannot read properties of undefined (reading 'apply')` в `blob:https://...` при любом `ym('reachGoal', ...)`. Из-за этого:
- Метрика-цель `541048270` age_select перестаёт писать reaches
- Яндекс.Директ с PAY_FOR_CONVERSION стратегией и `GoalId=541048270` видит 0 конверсий
- Алгоритм Direct снижает ставки до нуля → показов 0

**Инцидент 16-18 апреля 2026:** Partytown два дня блокировал пайплайн конверсий, все три активные Direct-кампании (пакет 707632923 + Search 708664426) встали, потеря = ~3 дня × ~20К₽/день = ~60К₽. Повторился 18.04 вечером из-за merge-конфликта.

**Если Метрика нужна в worker** — используйте **обычный асинхронный тег Яндекса** (стандартный код из Метрика-справки). Partytown-аналоги в Web Worker не использовать ни для одного из:
- Yandex.Metrika
- VK Top.Mail.Ru pixel
- Clarity (хотя на неё влияние минимальное)

### Также ЗАПРЕЩЕНО
- Скрипт с флагом `permanently=true` на Яндекс.Диск API (использовать только `permanently=false` — удаление через корзину). Причина: инцидент удаления папок `/Медиа/2020-2026` коллегой через `flatten_archive.py` — 9000+ фото утеряны навсегда.

---

## СТАРТ КАЖДОЙ СЕССИИ (проверить первым делом)

**Два отдельных репозитория — не путать:**

| Задача | Репо | Ветка |
|---|---|---|
| Сайт (вёрстка, компоненты, деплой) | `~/Aidacamp-cloude` | `dev` |
| MCP-сервер (инструменты, API) | `~/MCP` | `main` |

**Алгоритм старта:**
1. Понять о чём задача — сайт или MCP?
2. Перейти в нужную папку
3. Проверить `git branch` — убедиться что на правильной ветке
4. Если не так — переключиться до начала работы
5. **Всегда делать `git fetch origin && git pull --rebase origin dev`** перед началом работы

**Если не ясно** — спросить: "это задача по сайту или по MCP-серверу?"

---

## Факты vs гипотезы vs «не найдено» (жёсткое правило)

Работаем с деньгами и рекламными алгоритмами → **нельзя додумывать**.

1. **Факт** — только то, что подтверждено:
   - Официальной документацией (ссылка обязательна)
   - Эмпирической проверкой на наших данных (с показом запроса/результата)

2. **Гипотеза** — явно помечать словом «гипотеза» или 🤔. Без пометки не писать.

3. **API/документационные вопросы** (поля, endpoint'ы, параметры, значения):
   - **Первое действие** — идти в официальную документацию (target.vk.ru, yandex.ru/support, ads.vk.com, и т.д.)
   - Если в доступной документации нет ответа — прямо писать: **«в документации не найдено»**
   - **Не гадать**. Не пробовать 5 вариантов запроса, надеясь угадать.
   - Если WebFetch блокирован / страница JS-рендерит пусто — это тоже «не найдено», пометить отдельно

4. **Ошибки моей интерпретации** (если были):
   - Признавать явно и быстро
   - Фиксировать в протоколе (РАДАР / ВК-2.0 / здесь), чтобы не повторить
   - Пример 17.04: я ошибочно интерпретировал `learning_progress=1.0` как «обучается», на деле = ОБУЧЕНА. Исправлено эмпирически.

5. **Правило «5500₽» (урок 17.04.2026):**
   При CPC ниже обычной нормы в 2-3 раза → алгоритм ушёл в сетевой мусор (Сеть VK / DSP). Проверять атрибуцию клики→визиты в Метрике **до** уверенности, что трафик реальный.

---

## Параллельная разработка (несколько агентов одновременно)

Владелец может запускать несколько агентов параллельно. Чтобы они не перетирали работу друг друга:

### Правила для каждого агента:

1. **Никогда не пушить напрямую в `dev`** — это зона главного агента (Claude). Только в свою ветку
2. **Своя ветка называется `agent/<задача>`**, например:
   - `agent/agebar-redesign`
   - `agent/landing-seo`
   - `agent/shifts-refactor`
3. **Перед стартом** — получить свежий `dev`:
   ```bash
   git fetch origin
   git checkout dev
   git pull --rebase origin dev
   git checkout -b agent/<задача>
   ```
4. **После завершения работы** — сообщить владельцу, НЕ мёрджить самостоятельно в `dev`
5. **Владелец** сам решает когда и что мёрджить в `dev` и деплоить

### Главный агент — Claude (основная сессия с владельцем):

- Работает напрямую на `dev`
- Перед деплоем всегда проверяет нет ли чужих коммитов:
  ```bash
  git fetch origin
  git log origin/dev..dev    # мои коммиты, которые не запушены
  git log dev..origin/dev    # чужие коммиты, которые я не видел
  ```
- Если чужие коммиты есть — сначала `git pull --rebase origin dev`, потом деплой

### Что произошло если коммит появился неожиданно:

```bash
git fetch origin
git log dev..origin/dev --oneline   # показывает новые чужие коммиты
git show <hash>                      # смотришь что там
git pull --rebase origin dev         # принимаешь изменения
```

---

## Git-воркфлоу (ОБЯЗАТЕЛЬНО соблюдать)

### Схема (единственно правильная):

```
Разработка на local dev
        ↓  ./scripts/deploy.sh dev
   dev.aidacamp.ru  ← тестовая зона, показываем владельцу
        ↓  владелец утверждает ✅
   git checkout main && git merge dev
        ↓  ./scripts/deploy.sh prod
   aidacamp.ru  ← КАНОН (прод)
        ↓
   git checkout dev  ← возвращаемся работать
```

### Правила:
1. **Всегда начинай на `dev`** — проверяй `git branch` в начале сессии
2. **Никогда не коммить в `main` напрямую** — только через merge из dev
3. **Никогда не деплоить прод без явного "выкатываем" от владельца**
4. **После выкатки** — `dev` и `main` должны быть равны
5. **Feature-ветки** (`button-system`, `refactor/*` и т.д.) — только если явно просят, потом мёрджить в dev и удалять

### Команды выкатки в прод (полный цикл):
```bash
git checkout main && git merge dev
./scripts/deploy.sh prod
git checkout dev
```

### Текущее состояние:
- `dev` == `main` (синхронизированы, 2026-04-16)
- GitHub `origin/dev` — актуальный бэкап
- GitHub `origin/main` — не используется для деплоя, только rsync

---

## Фоновые агенты (headless) — без MCP

MCP-серверы теряют соединение в длинных сессиях. Для фоновой автоматизации запускай **Claude Code headless**:

```bash
claude -p "задача" \
  --no-session-persistence \
  --no-chrome \
  --tools "Bash,Read,Write,Edit,Glob,Grep" \
  --max-turns 10 \
  --permission-mode bypassPermissions
```

**Обязательные флаги для фона:** `--no-session-persistence` (не засоряет сессии), `--no-chrome` (не открывает браузер), `--max-turns N` (защита от зацикливания).

**НЕ используй `--bare`** — отключает OAuth, агент не авторизуется.

Для браузерных задач: Playwright headless отдельно (`headless=True`), затем Claude анализирует результат.

Полная инструкция: `~/MCP/AGENT_INSTRUCTIONS.md` → раздел 0.

---

## ВАЖНО: Используй только aidacamp-tools MCP

**НЕ используй** Kapture, Desktop Commander, Chrome MCP, Claude in Chrome, удалённый MCP `5967f77d` (yandex-direct-metrica-mcp). Они либо зависают, либо отключены.

**Все инструменты доступны через единый MCP-сервер `aidacamp-tools`.**
Загрузи схемы: `ToolSearch` с запросом `+aidacamp`.

### Полный список инструментов aidacamp-tools (21 шт.)

| Инструмент | Что делает | Пример вызова |
|---|---|---|
| `ssh` | Команды на сервере 159.194.223.55 | `ssh(host: "aidacamp", command: "ls /var/www")` |
| `stats` | Аналитика Директ/Метрика из PostgreSQL | `stats(command: "summary", period: "week")` |
| `photos` | Поиск фото на Яндекс.Диске (9200 фото) | `photos(command: "search", query: "дети код")` |
| `browser_agent` | Headless браузер: скриншоты, скрапинг, Lighthouse | `browser_agent(action: "screenshot", url: "https://aidacamp.ru")` |
| `clarity` | Microsoft Clarity: поведение на сайте | `clarity(report: "summary", period: "week")` |
| `pagespeed` | Google PageSpeed: аудит скорости, SEO, доступности | `pagespeed(url: "https://aidacamp.ru")` |
| `image_edit` | Обработка фото: яркость, контраст, насыщенность, cinematic | `image_edit(input: "photo.avif", cinematic: true)` |
| `read_file` | Чтение локальных файлов | `read_file(path: "/Users/.../file.txt")` |
| `write_file` | Запись в файлы | `write_file(path: "...", content: "...")` |
| `list_directory` | Список файлов в папке | `list_directory(path: "/Users/...")` |
| `create_directory` | Создание папок | `create_directory(path: "/Users/.../new")` |
| `vk_campaigns` | Список кампаний VK Ads | `vk_campaigns(status: "active")` |
| `vk_manage_campaign` | CRUD кампаний VK | `vk_manage_campaign(action: "create", name: "...")` |
| `vk_manage_ad_group` | CRUD групп объявлений VK | `vk_manage_ad_group(action: "list", campaign_id: 123)` |
| `vk_manage_ad` | CRUD объявлений VK | `vk_manage_ad(action: "create", ad_group_id: 456, ...)` |
| `vk_ads_stats` | Статистика VK Ads | `vk_ads_stats(period: "week", level: "campaign")` |
| `direct_campaigns` | Список кампаний Яндекс Директ | `direct_campaigns(status: "active")` |
| `direct_manage_campaign` | CRUD кампаний Директ | `direct_manage_campaign(action: "create", name: "...")` |
| `direct_manage_adgroup` | CRUD групп Директ | `direct_manage_adgroup(action: "list", campaign_id: 708664426)` |
| `direct_manage_ad` | CRUD объявлений Директ | `direct_manage_ad(action: "create", ad_group_id: ..., title: "...")` |
| `direct_manage_keywords` | CRUD ключевых слов Директ | `direct_manage_keywords(action: "add", ad_group_id: ..., keyword: "...")` |

### Известные кампании
- **Яндекс Директ:** 708664426 (Поиск), 708698819 (РСЯ)

## Фотоархив AidaCamp

Проиндексированный каталог ~9200 фотографий с AI-описаниями (Gemini Vision). Подробная документация: **[PHOTOS.md](PHOTOS.md)**

Быстрый доступ через скрипт или MCP:

```bash
# Поиск по описанию/тегам
./scripts/yadisk.sh search "дети программирование"

# Лучшие фото по сцене (сортировка: сайт → соцсети → архив)
./scripts/yadisk.sh best занятие 5

# Список сцен с количеством
./scripts/yadisk.sh scenes
```

MCP-инструмент `photos`: `photos(command: "search", query: "...")`, `photos(command: "best", query: "занятие", count: 5)`

### Скачивание фото без токена — `/api/photo`

Агентам **не нужен YADISK_TOKEN**. Токен хранится на сервере, фото отдаются через прокси:

```bash
# Одно фото — редирект на временную ссылку Яндекс.Диска
curl -L "https://dev.aidacamp.ru/api/photo?path=disk:/Медиа/2024/Фото/Прочее/IMG_1234.jpg"

# Превью (уменьшенное)
curl -L "https://dev.aidacamp.ru/api/photo?path=disk:/...&preview=1"

# Проксирование через сервер (без редиректа)
curl "https://dev.aidacamp.ru/api/photo?path=disk:/...&mode=proxy"

# Пакетно (до 20 фото) — POST, возвращает JSON с URL
curl -X POST https://dev.aidacamp.ru/api/photo \
  -H "Content-Type: application/json" \
  -d '{"paths": ["disk:/Медиа/2024/Фото/...", "disk:/Медиа/2023/Фото/..."]}'
```

Данные: `scripts/photo_catalog.json`, `scripts/photo_catalog_summary.json`, `scripts/disk_index.json`

## Полная инструкция для агентов по всем каналам аналитики

Подробное описание ВСЕХ таблиц, полей, SQL-запросов и MCP-инструментов для работы с данными Яндекс.Директ, Яндекс.Метрика, VK Реклама, Microsoft Clarity и A/B-тестов: **[AGENT_INSTRUCTIONS.md](/Users/vladimirafanasev/MCP/AGENT_INSTRUCTIONS.md)**

## Stack
- Astro 6.x + Tailwind CSS v4 (utility classes only, no custom CSS)
- @astrojs/node adapter (SSR for /api/ routes, static for pages)
- Communication language: Russian

## Deploy
See memory for full deploy commands. Short version:
- **Always deploy to dev first** (`dev.aidacamp.ru`), never overwrite prod without explicit confirmation
- Build: `npm run build`
- Deploy static: `dist/client/` (NOT `dist/`!)

## Browser Agent (remote headless Chromium)

Headless Chromium + Playwright установлен на сервере 159.194.223.55 в `/opt/browser-agent/`.
Используй для скриншотов, скрапинга, краулинга сайтов **вместо локального браузера**.

### Быстрый вызов через SSH

```bash
# Скриншот (desktop)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node screenshot.js 'https://URL' '/opt/browser-agent/output/NAME.png' --full"

# Скриншот (mobile)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node screenshot.js 'https://URL' '/opt/browser-agent/output/NAME.png' --mobile --full"

# Скрапинг текста / мета / ссылок
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node scrape.js 'https://URL' meta"

# Краулинг сайта (до N страниц)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node crawl.js 'https://URL' 20 json"

# Извлечение читабельного текста статьи
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node readpage.js 'https://URL' readable"

# Многошаговая автоматизация (загрузить JSON-скрипт и выполнить)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node interact.js /tmp/script.json"
```

### Обёртка (wrapper)
```bash
./scripts/browser-agent.sh screenshot <url> [filename] [--full] [--mobile]
./scripts/browser-agent.sh scrape <url> [text|html|links|meta]
./scripts/browser-agent.sh crawl <url> [max_pages] [json|urls]
./scripts/browser-agent.sh readpage <url> [readable|save]
./scripts/browser-agent.sh interact <script.json>
./scripts/browser-agent.sh pdf <url> [filename] [--landscape]
./scripts/browser-agent.sh har <url> [filename] [--summary]
./scripts/browser-agent.sh lighthouse <url> [--mobile] [--html --output file]
./scripts/browser-agent.sh diff <img1> <img2> [output]
./scripts/browser-agent.sh list
./scripts/browser-agent.sh fetch <filename>
```

### Скриншоты доступны по URL
`https://dev.aidacamp.ru/screenshots/<filename>.png`

### Доступные скрипты на сервере

| Скрипт | Назначение |
|---|---|
| `screenshot.js` | Скриншот URL (desktop/mobile, full page) |
| `scrape.js` | Извлечение текста, HTML, ссылок, мета-тегов |
| `crawl.js` | Краулинг сайта — обход всех внутренних ссылок |
| `readpage.js` | Извлечение читабельного текста статьи (Mozilla Readability) |
| `interact.js` | Многошаговая автоматизация: goto → click → fill → screenshot |
| `pdf.js` | Сохранение страницы в PDF (A4/landscape) |
| `har.js` | Запись HAR-трейса сетевых запросов с анализом |
| `lighthouse.js` | Аудит Lighthouse (Performance, SEO, Accessibility, Best Practices) |
| `diff.js` | Попиксельное сравнение двух скриншотов |

### interact.js — формат скрипта
```json
[
  { "action": "goto", "url": "https://example.com" },
  { "action": "wait", "ms": 2000 },
  { "action": "click", "selector": "#login-btn" },
  { "action": "fill", "selector": "input[name=email]", "value": "test@test.com" },
  { "action": "screenshot", "path": "/opt/browser-agent/output/result.png" },
  { "action": "text", "selector": ".result" },
  { "action": "evaluate", "code": "document.title" }
]
```

### Когда использовать
- **Скриншоты сайтов** — screenshot.js (вместо локального Chrome)
- **SEO-аудит** — scrape.js meta + crawl.js
- **Анализ конкурентов** — readpage.js + scrape.js
- **Проверка деплоя** — screenshot.js до/после + diff.js для сравнения
- **Автоматизация веб-форм** — interact.js
- **PageSpeed аудит** — lighthouse.js (без сторонних сервисов)
- **Анализ загрузки** — har.js --summary (медленные запросы, размеры по типам)
- **Сохранение страниц** — pdf.js для PDF, readpage.js save для HTML

## Дополнительные браузерные агенты на сервере

Помимо /opt/browser-agent/ (наш Playwright), на сервере установлены ещё 3 браузерных инструмента. Агент может использовать их через SSH — экран и GUI не нужны, всё работает headless.

### agent-browser (Vercel Labs) — быстрый Rust CLI
```bash
# Accessibility tree (оптимально для AI-анализа страницы)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser snapshot 'https://URL'"

# Скриншот
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser screenshot 'https://URL' '/tmp/shot.png'"

# Клик, заполнение форм
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser open 'https://URL'"
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser click '#submit-btn'"
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "agent-browser fill 'input[name=email]' 'test@test.com'"
```

### dev-browser (SawyerHood) — Playwright API в sandbox
```bash
# Полный Playwright API в изолированном QuickJS
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "dev-browser --headless <<'EOF'
const page = await browser.newPage();
await page.goto('https://URL');
console.log(await page.title());
const buf = await page.screenshot();
await saveScreenshot(buf, 'result.png');
EOF"

# AI-снимок страницы (структура DOM для анализа)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "dev-browser --headless <<'EOF'
const page = await browser.newPage();
await page.goto('https://URL');
const snap = await page.snapshotForAI();
console.log(snap.full);
EOF"
```

### browser-use (Python AI-агент)
```bash
# AI-агент, который сам решает что кликать/вводить
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "/opt/browser-use-env/bin/python3 -c \"
from browser_use import Agent
# Требует API-ключ LLM (ANTHROPIC_API_KEY или OPENAI_API_KEY)
\""
```

### Когда что использовать
- **Простые задачи** (скриншот, скрапинг, lighthouse) → `/opt/browser-agent/` (наш Playwright)
- **Accessibility tree для AI** → `agent-browser snapshot`
- **Сложная автоматизация с Playwright API** → `dev-browser --headless`
- **AI-управляемая навигация** → `browser-use` (Python, нужен API-ключ)

## Аналитика: stats.sh (основной способ)

Статистика по рекламе и трафику хранится в PostgreSQL на сервере. Данные обновляются ежедневно cron-скриптом в 6:15.
**Используй `./scripts/stats.sh` как основной способ получения статистики.** Не нужен MCP, не нужны API-токены — просто bash.

### Команды stats.sh

```bash
./scripts/stats.sh summary [period]         # Сводка: Direct + Metrika + Goals
./scripts/stats.sh direct [period]          # Статистика кампаний Директа
./scripts/stats.sh direct-daily [period]    # Директ по дням
./scripts/stats.sh metrika [period]         # Трафик Метрики по источникам
./scripts/stats.sh metrika-daily [period]   # Метрика по дням
./scripts/stats.sh goals [period]           # Конверсии по целям
./scripts/stats.sh utm [period]             # UTM-разметка
./scripts/stats.sh placements [period] [N]  # Топ площадок по расходу
./scripts/stats.sh query "SELECT ..."       # Произвольный SQL
./scripts/stats.sh tables                   # Список таблиц и кол-во строк
./scripts/stats.sh etl [date] [date_to]     # Ручной запуск ETL
```

### Периоды

`today`, `yesterday`, `week`, `month`, `quarter`, `year`, `YYYY-MM-DD`, `YYYY-MM-DD:YYYY-MM-DD`

### Таблицы в БД (aidacamp)

| Таблица | Что хранит |
|---|---|
| `direct_campaign_stats` | Клики, показы, CTR, расход, конверсии по кампаниям/дням |
| `direct_placements` | Площадки показа (РСЯ) по кампаниям/дням |
| `metrika_traffic` | Визиты, пользователи, отказы по источникам/дням |
| `metrika_goals` | Конверсии по целям и источникам |
| `metrika_utm` | Статистика по UTM-меткам |
| `vk_ads_stats` | Статистика VK рекламы |
| `clarity_daily` | Данные Microsoft Clarity (агрегат за день) |
| `clarity_pages` | Clarity: метрики по URL (сессии, scroll depth, dead/rage clicks) |

### Когда использовать stats.sh vs MCP

- **stats.sh** — для любых отчётов, сводок, анализа. Работает всегда, быстро, не зависает.
- **MCP** — только если нужно что-то, чего нет в БД (управление кампаниями, создание объявлений).

## ЗАПРЕЩЕНО: удалённый MCP yandex-direct-metrica-mcp (5967f77d)

**НЕ используй** инструменты с префиксом `mcp__5967f77d`. Этот удалённый MCP-сервер отключён.
Все его функции перенесены в локальный `aidacamp-tools` (см. таблицу выше).

Токены API хранятся в `~/.codex/mcp-state/yandex-direct-metrica-mcp/.env`.
