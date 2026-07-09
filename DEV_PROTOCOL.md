# АйДаКемп — Протокол разработки и тестирования

**Аудитория:** агенты (Claude / другие AI), которые правят сайт.
**Назначение:** одна страница правил «как делать всё, даже маленькую правку».
**Источники истины:**
- Дизайн → [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) (28 секций, 22 правила)
- Бренд / тон → [`CLAUDE.md`](CLAUDE.md) разделы «Позиционирование» и «Брендовые правила»
- Факты сайта → **prod aidacamp.ru** (НЕ из памяти, НЕ выдумывать)

---

## ⚡ Правило №1 — ВСЯ разработка в изолированном контейнере

**Любая задача по сайту запускается агентом в одноразовом Docker-контейнере — не локально и не под root на проде:**

```bash
./scripts/agent-docker.sh "<задача>" "<детальный бриф>"
```

Контейнер: non-root (юзер `node`), клонирует репо из GitHub внутрь → ветка от `dev` → claude → commit → push → **PR в dev** → самоудаляется (`--rm`). Прод, секреты и соседние проекты агенту **недоступны**. Радиус поражения = только этот репозиторий (по правам fine-grained PAT). Подробности и модель безопасности — [`docker/agent/README.md`](docker/agent/README.md).

**Установка (один раз):**
```bash
docker build -t aidacamp-agent:latest docker/agent
cp docker/agent/agent-secrets.env.example ~/.agent-secrets.env && chmod 600 ~/.agent-secrets.env
#   → вписать GitHub fine-grained PAT (только этот репо: Contents+PR) и ANTHROPIC_API_KEY
```

- **Локально — только хотфиксы владельца** (`MASTER_AGENT=1`).
- **Прод выкатывается автоматически** после мержа в `dev` (см. §6.1). Вручную прод не катят.

**Что агенту можно по деплою** (`.claude/settings.json` → `permissions`):

| Можно | Нельзя |
|---|---|
| `gh pr merge` — мерж PR в `dev` | `./scripts/deploy.sh prod` — прямой прод-деплой (в `deny`) |
| `gh workflow run` / `enable` — запуск выката | обход `MASTER_AGENT` и `pre-merge` хука |
| `gh run watch` / `view` — наблюдение за раном | ввод секретов и токенов в любые поля |
| `./scripts/rollback.sh prod` — откат прода | `git push --force` (в `deny`) |

Логика: **весь выкат идёт через CI**, где есть `quality-gate` → smoke на dev → авто-откат прода.
Локальный прод-деплой этих гарантий не даёт (можно укатить грязное рабочее дерево),
поэтому он остаётся за владельцем. Откат разрешён без ограничений — он чинит, а не ломает.

> **🚫 DEPRECATED (выведено из эксплуатации 2026-06-06):** `vps-start-agent.sh`, `agent-start.sh`, `worker.sh`, `vps-watchdog.sh`, `vps-agent-run.sh`, `vps-status.sh` — старый стек «агент под root в `~/Aidacamp` + tmux + pm2-watchdog». Небезопасен (root на проде = радиус поражения весь сервер; claude блокирует bypass под root). Заменён контейнерами выше. Не использовать.

---

## 1. Стек — обязательно

| Слой | Технология | Версия | Замечание |
|---|---|---|---|
| Framework | **Astro** | 6.x | SSR через `@astrojs/node` для `/api/*`, остальное — статика |
| Стили | **Tailwind CSS v4** | — | utility-first, токены в `@theme {}` блоке `src/styles/global.css` |
| Иконки | Bootstrap Icons | 1.13+ | через `<i class="bi bi-*">` + `src/data/icons-manifest.json` |
| Поиск | Pagefind | 1.5+ | статический индекс, билдится после `astro build` |
| Поиск (БД) | PostgreSQL | — | только аналитика, не контент |
| Адаптер | `@astrojs/node` | 10.x | mode=server, output=static для большинства страниц |

**Запрещённые зависимости:**
- ❌ `@astrojs/partytown` — ломает Метрика-цели (см. CLAUDE.md инцидент 16-18.04.2026)
- ❌ Любые UI-библиотеки кроме Bootstrap Icons (не shadcn, не daisyUI, не chakra и т.п.)
- ❌ jQuery, lodash — не нужны
- ❌ CSS-in-JS (styled-components, emotion) — только Tailwind

**Файловая структура:**
```
src/
├── components/      # переиспользуемые компоненты (.astro)
├── pages/           # роуты (file-based routing)
├── layouts/         # Base.astro + LandingLayout.astro
├── styles/          # global.css (@theme), mobile-ux-p0.css, print.css, icons.css (auto-gen)
├── data/            # contacts.ts, team.ts, reviews.ts, icons-manifest.json
├── lib/             # утилиты
└── scripts/         # build-time скрипты (не runtime!)
public/              # статика — favicon, images/, assets/
scripts/             # node-скрипты (deploy.sh, build-icons-css.mjs, stats.sh)
```

---

## 2. Дизайн-правила — БЕЗ исключений

**Перед любой правкой UI открой [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).** Краткий чек:

1. **Цвета** — только из `@theme` (`bg-primary`, `text-primary-700`, `bg-dark-navy`). Не хардкодить `#ec9b44`, `#0d1a2b` и т.п.
2. **Шрифты** — Mobile-first шкала. Body **минимум 16px** на мобилке (Safari auto-zoom).
3. **Кнопки** — fill ТОЛЬКО для primary CTA. Остальное — outline / ghost. `min-h-[44px]`.
4. **Иконки** — только Bootstrap Icons из `src/data/icons-manifest.json`. Никаких эмодзи. Новая иконка → JSON-манифест → `npm run icons`.
5. **Контраст** — ≥ 4.5:1 для body. На тёмном фоне `text-white/60` минимум (НЕ `/35`, `/40`, `/45`).
6. **Touch target** — 44×44 минимум на мобилке.
7. **Иерархия** — H1 → H2 → H3 без перескоков. 1 H1 на страницу.
8. **CLS** — все `<img>` с `width`/`height` атрибутами.
9. **Эталоны** — `src/components/Shifts.astro`, `src/components/FAQ.astro`. Копируй паттерны.
10. **Бренд тон** — Пивоваров: «Решение остаётся за вами». Без «Перезвоним за 10 минут», «Лучшее предложение», «Звоните!». Без слова «бот».

---

## 3. Контент — ТОЛЬКО факты

**Источник истины фактов = aidacamp.ru (production).** НЕ выдумывать.

**Правило 5 вопросов перед любым текстом:**
1. Этот факт реально есть на aidacamp.ru?
2. Если число — откуда взято? (CAMP_PRICE_FROM, STAT_YEARS, STAT_KIDS, STAT_DISTANCE — из `src/data/contacts.ts`)
3. Если не уверен — пометь TODO и спроси владельца. НЕ ставь правдоподобную выдумку.
4. Дарья (мама-подросток-дочери): её формулировки — «у дочери», не «у сына».
5. Налоговый вычет — НЕ ставь одну сумму для всех смен. См. [`_notes/Библиотека знаний/Налоговый вычет — правила и данные.md`](_notes/Библиотека%20знаний/Налоговый%20вычет%20—%20правила%20и%20данные.md).

**Что часто выдумывают (запрещено):**
- ❌ «настольный теннис» — на проде нет
- ❌ «3D» — на проде нет (есть Python, AI, Minecraft, Scratch)
- ❌ «Хакатон с 6 ролями + 2 раундами инвестиций» — деталей нет на проде
- ❌ «Дискотеки» — нет на проде
- ❌ «мастер-классы» — их НЕТ (подтверждено владельцем 09.07.2026); слово встречается на старых страницах — это тоже ошибка
- ❌ «шведский стол» — его НЕТ (подтверждено владельцем 09.07.2026); питание 5-разовое по СанПиН
- ❌ «Чемпионат лагеря 12:00» — нет на проде
- ❌ Конкретные имена авторов учебников / книг — без подтверждения

---

## 4. Workflow — даже для маленькой правки

### 4.1. Перед стартом
```bash
# Понять о какой задаче речь — сайт или MCP-сервер
git branch --show-current   # должна быть agent/<задача>, не dev/main

# Свежий dev
git fetch origin
git pull --rebase origin dev   # только если рабочая ветка — agent/*

# Если правки UI — открыть DESIGN_SYSTEM.md
# Если контент — открыть позиционирование + проверить факты на aidacamp.ru
```

### 4.2. Размер правки
| Размер | Действие |
|---|---|
| **Тривиально** (1-3 строки, опечатка) | Edit → build → push в ветку → PR в dev |
| **Маленькая** (1 файл, до 50 строк) | + проверить визуально на dev.aidacamp.ru |
| **Средняя** (несколько файлов, новый компонент) | + ручной чек на mobile (390px) И desktop (1440px) |
| **Большая** (новая секция, рефакторинг) | + чеклист DESIGN_SYSTEM.md → планирование → PR с описанием |

### 4.3. Branch hygiene
- Работаем ТОЛЬКО в ветке `agent/<задача>` (или ветке владельца, если он сам пишет)
- Pre-commit/pre-merge hooks блокируют коммит в `dev`/`main` без `MASTER_AGENT=1`
- Финальный шаг — `gh pr create --base dev`. Мержить PR может агент (`gh pr merge`) — при зелёном `quality-gate`

> ⚠️ Мерж в `dev` = **выкат в прод**. Убедись, что PR действительно готов: `gh pr checks <N>` зелёный,
> ветка не `BEHIND`. Прод подстрахован smoke + авто-откатом, но лучше не проверять их лишний раз.

### 4.4. Commit message
Семантический формат (пре-коммит хук блокирует не-семантические):
```
<type>(<scope>): <subject>

<body>
```
Типы: `feat | fix | docs | style | refactor | test | perf | build | ci | chore | revert`

Примеры:
- `feat(hero): mobile compact subtitle, ratings centered`
- `fix(modal): remove duplicate ShiftModal mount`
- `chore(deps): bump pagefind to 1.5.2`

---

## 5. Тестирование — обязательные шаги

### 5.1. Билд (всегда перед коммитом)
```bash
npm run build   # включает: guard-no-partytown + icons + astro build + sitemap + pagefind
```
Билд должен пройти зелёным. Если падает — фиксить ДО коммита, не коммитить «починю потом».

### 5.2. Визуальная проверка
| Уровень | Что |
|---|---|
| **Минимум** | dev.aidacamp.ru на iPhone-размере (390px) и desktop (1440px) — глазами |
| **Средний** | + browser_agent screenshot до/после + diff (см. CLAUDE.md секция Browser Agent) |
| **Полный** | + lighthouse mobile (LCP < 2.0s, INP < 150ms, CLS < 0.05) |

### 5.3. Функциональные проверки (для CTA / интерактива)
- [ ] Все `<a href="...">` ведут куда нужно (не `#` пустой, не битый якорь)
- [ ] Все `<button>` имеют обработчик (data-* атрибут + соответствующий script)
- [ ] Якоря `href="#xxx"` — существует ли `id="xxx"` на странице?
- [ ] Модальные окна не дублируются (один mount на страницу)
- [ ] Tab-навигация работает (focus-visible видно)
- [ ] Метрика-цели срабатывают (`data-analytics-goal`)

### 5.4. Аналитика (для нового CTA)
- [ ] `data-analytics-goal="goal_name"` навешен
- [ ] Цель создана в Метрике → Настройки → Цели
- [ ] Если conversion — добавлена в Директ как цель оптимизации
- [ ] Naming convention: `{Действие}-{Контекст}-{Версия}` (см. DESIGN_SYSTEM.md §14)

### 5.5. SEO/GEO/AEO (для нового блока/страницы)
Чек-лист в DESIGN_SYSTEM.md секция 13:
- [ ] H1 один, главное ключевое слово
- [ ] Meta title 50-65, description 140-160
- [ ] Schema.org разметка (Course / FAQPage / Person — см. таблицу)
- [ ] Все img с alt + width + height
- [ ] ≥ 3 внутренних ссылок на родственные страницы
- [ ] LCP < 2.0s

---

## 6. Деплой

### 6.1. Сначала dev, потом prod

> **⚡ Правило (с 11.06.2026): билд — НА СЕРВЕРЕ.** Билд запускается через SSH напрямую на сервере в `/opt/aidacamp-site`. Мак/агент только пушит коммит и запускает команду.

#### Быстрый деплой на dev (основной путь)

```bash
# 1. Запустить билд в фоне (nohup — чтобы не убился по таймауту SSH/MCP)
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "nohup bash /opt/aidacamp-site/scripts/server-deploy.sh dev > /tmp/deploy-dev.log 2>&1 &"

# 2. Следить за прогрессом
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "tail -f /tmp/deploy-dev.log"

# 3. Или проверить итог
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "tail -10 /tmp/deploy-dev.log"
```

Через MCP `aidacamp-tools` (ssh):
```
run(service="ssh", action="run", params={host:"aidacamp",
  command:"nohup bash /opt/aidacamp-site/scripts/server-deploy.sh dev > /tmp/deploy-dev.log 2>&1 & echo PID=$!"})
# затем проверять:
run(service="ssh", action="run", params={host:"aidacamp",
  command:"ps -p <PID> > /dev/null && echo 'идёт' || tail -8 /tmp/deploy-dev.log"})
```

> **⚠️ Важно:** `server-deploy.sh` синхронизирует и `current/` и плоский корень `/var/www/aidacamp-dev/` (nginx отдаёт оттуда). Если деплой прошёл, но страница 404 — проверь плоский корень вручную:
> ```bash
> rsync -a /opt/aidacamp-site/dist/client/stati/СТРАНИЦА/ /var/www/aidacamp-dev/stati/СТРАНИЦА/
> ```

#### Прод — автоматически, руками не катят

Мерж PR в `dev` запускает [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

```
push в dev → деплой dev → smoke dev → merge dev→main → деплой prod → smoke prod
                              ↓ красный                                  ↓ красный
                          поезд встал                              авто-откат прода
```

Три рубежа защиты:
1. `quality-gate.yml` — `check:banned`, `check:prices`, `build`;
2. **smoke на dev** — прод не поедет, пока dev красный;
3. **авто-откат** на последний `backup-*`, если верификация или smoke прода провалились.

`main` **мержится**, а не ресетится: прежний `reset --hard`-промоут разъезжал истории
и терял правки (инцидент 2026-07-07), из-за чего один хотфикс пришлось делать дважды.

**Как остановить выкат:** выключить workflow `Deploy` в GitHub Actions,
либо запустить его вручную (`workflow_dispatch`) с галкой `skip_prod`.

**Откат вручную** (если авто-откат не справился):
```bash
./scripts/rollback.sh prod                    # на последний бэкап
./scripts/rollback.sh prod backup-20260708-1200   # на конкретный
```

#### Запасной путь (если Actions недоступны)
```bash
MASTER_AGENT=1 ./scripts/deploy.sh prod       # локальный билд, интерактивное подтверждение
```

#### Статьи — только в `/stati/`, не в `/blog/`
`src/pages/blog/` **исключён из sitemap** и не индексируется. Все SEO-статьи — в `src/pages/stati/`.

### 6.2. После деплоя
- Проверить что HTTP 200 на главной (deploy.sh автоматически)
- В первые 5 минут — открыть aidacamp.ru на мобиле, проверить главную и CTA
- Если что-то сломалось — сразу `./scripts/deploy.sh prod` с ОТКАТОМ предыдущей версии (бэкапы в `/var/www/aidacamp/backup-*`)

---

## 7. Представление результата владельцу

### 7.1. Для маленькой правки (1 коммит)
Кратко в чате:
- Что сделано (1-2 строки)
- Где проверить (URL + якорь)
- ✅ build green
- Запушено в `agent/<branch>` / PR #XXX

### 7.2. Для средней правки (несколько коммитов)
- Список изменений (bullet points)
- Скриншоты до/после если визуальное (через browser_agent)
- Build status
- PR ссылка
- Что осталось / нужны ли ответы владельца

### 7.3. Для большой партии (фаза)
Markdown-таблица с фазами (как в hero-declutter):

| Фаза | Что | Статус |
|---|---|---|
| O. Sync DESIGN_SYSTEM | ... | ✅ |
| S. Codemod токенов | ... | ✅ |

+ скриншоты + ссылка на PR + список вопросов.

### 7.4. Если нужны ответы владельца
- Чёткий список вопросов с вариантами ответа
- Не спрашивать «как лучше?» — предложить 2-3 варианта с плюсами/минусами и **рекомендацию**
- Не делать «правдоподобную выдумку» вместо вопроса

---

## 8. Когда ОСТАНОВИТЬСЯ и спросить

Останавливайся и спрашивай владельца если:
- Не нашёл факт на aidacamp.ru, а нужно его утверждать в тексте
- Меняешь сумму денег / возраст / даты смены / адрес
- Удаляешь / переименовываешь существующую страницу (SEO-риск)
- Меняешь логотип / favicon / основные цвета палитры
- Добавляешь новую зависимость в `package.json`
- Сомневаешься в брендовом тоне (особенно для текстов автора Дарьи)

---

## 9. Что хранится где (быстрая шпаргалка)

| Что | Где |
|---|---|
| Цвета, типографика, отступы | `src/styles/global.css` (@theme) |
| Mobile-only override | `src/styles/mobile-ux-p0.css` |
| Print | `src/styles/print.css` |
| Иконки манифест | `src/data/icons-manifest.json` |
| Контакты, цены, статы | `src/data/contacts.ts` |
| Команда | `src/data/team.ts` |
| Шаблоны компонентов | `src/components/` |
| Эталон карточек | `src/components/Shifts.astro` |
| Эталон FAQ/аккордеонов | `src/components/FAQ.astro` |
| Базовый layout | `src/layouts/Base.astro` |
| Деплой-скрипт | `scripts/deploy.sh` |
| Stat / аналитика | `scripts/stats.sh` |
| Аналитика БД | PostgreSQL `aidacamp` (см. AGENT_INSTRUCTIONS.md) |

---

## 10. Антипаттерны — НЕ делать

- ❌ `style="color: #ec9b44"` → используй `text-primary` или `var(--color-primary)`
- ❌ `<details>/<summary>` для аккордеонов — ломается в Mail.ru/VK in-app
- ❌ Несколько monтажей одного компонента (например `<ShiftModal />` в layout И в page → 2 модала)
- ❌ Абсолютные пути из `node_modules` в импортах
- ❌ Inline `<script>` без `is:inline` или внутри Astro-компонента без понимания scope
- ❌ Прямой `git push origin dev` или `main` (хуки заблокируют)
- ❌ Build с warning'ами «не страшно» — лечить ВСЕ предупреждения
- ❌ Деплой прода без dev-проверки

---

## 11. Минимальный чек-лист «готово к merge»

```
- [ ] npm run build → зелёный
- [ ] Визуально проверено на mobile (390px) И desktop (1440px)
- [ ] Все CTA ведут куда надо (нет битых href / якорей)
- [ ] Контраст и шрифты соответствуют DESIGN_SYSTEM.md
- [ ] Факты проверены против aidacamp.ru (если меняли контент)
- [ ] Commit семантический (feat/fix/chore...)
- [ ] PR создан с base=dev (не main)
- [ ] В описании PR — что/зачем + ссылка на превью dev.aidacamp.ru
```

---

*v1 · 2026-05-01 · АйДаКемп · Astro 6 + Tailwind v4*
