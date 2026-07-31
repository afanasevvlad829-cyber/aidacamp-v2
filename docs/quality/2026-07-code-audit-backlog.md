# Бэклог по итогам аудита кодовых баз (2026-07-15)

Сводный бэклог по 4 сайтам (aidacamp, codims, icepartners, vlad-a). Аудит выполнен read-only
7 агентами по ТЗ [`docs/specs/2026-07-15-tz-astro-code-audit.md`](../specs/2026-07-15-tz-astro-code-audit.md).
Полные отчёты по блокам — в scratchpad сессии (01–07), ключевые находки перенесены сюда.

**Приоритеты:** P0 — риск прода/безопасность сейчас; P1 — быстрая победа или существенный
риск; P2 — рефакторинг/техдолг; P3 — косметика. Effort: S ≤ полдня, M ≤ 2 дня, L — крупнее.

⚠️ Перед удалением/слиянием страниц на **codims** — сверять позиции в Топвизоре (после SEO-волн
с редиректами). На **aidacamp** — 182 SEO-лендинга не сливать (намеренная политика, раздел 3 ТЗ).

---

## P0 — немедленно

| ID | Сайт | Находка | Файлы | Рекомендация | Eff |
|---|---|---|---|---|---|
| P0-1 | aidacamp | **Неаутентифицированный RCE + произвольный DELETE.** Публичный POST строит `psql -c "…'${keyword}'…"` и запускает через `execSync`; экранируется только `'`, символ `"` выходит из shell-кавычек → выполнение команд ОС на проде. Сценарий: `POST /api/seo-delete {"keyword":"\"; touch /tmp/pwned; \""}` | `src/pages/api/seo-delete.ts:10-14` | Закрыть под portal-admin auth + параметризованный `pg`-клиент (`query('DELETE … WHERE keyword=$1',[keyword])`), убрать shell | S |
| P0-2 | aidacamp | **Критический путь заявки без таймаута.** `/api/lead` → AlfaCRM auth+create+Telegram делает `fetch` без `AbortSignal.timeout`; зависший AlfaCRM = зависшее оформление заявки, воркер занят | `src/pages/api/lead.ts:254,299,368`, `src/lib/alfaCrm.ts:18,39,65,91` | Обёртка `fetchWithTimeout` (5–10 с) в `src/lib/`, начать с lead-пути | S |
| P0-3 | icepartners | **Root-SSH из веб-процесса.** Рендер PDF ходит `ssh root@159.194.223.55` ключом `aidacamp_prod` из интернет-обращённого Node → при компрометации радиус поражения = весь сервер (все 3 сайта) | `server/quote/render-pdf.mjs:13-14,43-55` | Локальный рендер (уже поддержан в коде) либо непривил. юзер + forced-command | M |

> P0-2/P0-3 формально на границе P0/P1 (не мгновенная эксплуатация, но высокий потенциальный
> ущерб). P0-1 — однозначный: работает на живом сайте без всякой аутентификации.

## P1 — быстрые победы и существенные риски

### Безопасность и доступ
| ID | Сайт | Находка | Файлы | Рекомендация |
|---|---|---|---|---|
| P1-1 | aidacamp | Неаутент. GET/POST плана смены (расселение/роли — данные детей/персонала; POST затирает файл) | `src/pages/api/shift-plan.ts:24,34` | Под `/api/portal/*` или проверка `locals.portalRole` |
| P1-2 | aidacamp | Нет rate-limit на `/api/lead`, `/api/contact-send` (лимитер только на `/api/ask`) | `src/middleware.ts:137` | Распространить IP-лимитер на lead/contact |
| P1-3 | aidacamp | `PORTAL_SESSION_SECRET` с fallback `''` → подделка сессий если env пуст (гипотеза) | `src/middleware.ts:63` | Fail-closed при пустом секрете |
| P1-4 | icepartners | Утечка чужих КП из публичной `/quotes/`: имя PDF = `Math.random` 4 цифры (~9000/день, перебираемо), внутри PII+цены лида | `server/quote/handler.mjs:27,90-99` | `crypto.randomBytes` в имени или отдача по подписанной ссылке + `autoindex off`/noindex |
| P1-5 | icepartners | Обход rate-limit подделкой `X-Forwarded-For[0]` → флуд менеджеру + расход платного Anthropic | `server/quote/handler.mjs:51`, `lead-handler.mjs:44` | `trust proxy` / `X-Real-IP` |
| P1-6 | codims | Telegram-токен бота закоммичен (HEAD + история) | `.claude/skills/seo-keyword-grinder-codims.md:22` | Ротировать у BotFather, убрать в env |
| P1-7 | vlad-a | Платёжный (Tinkoff) и contact API не аудированы | `/opt/vlad-a/payment-api/server.js`, `/opt/vlad-a/contact-api/server.js` | Отдельный security-проход (auth, валидация, ключи) |

### Аналитика и конверсии
| ID | Сайт | Находка | Файлы | Рекомендация |
|---|---|---|---|---|
| P1-8 | aidacamp | Цели Метрики шлются на счётчики `88121468`/`98895405`, которые нигде не инициализируются (init только у `96499295`) → потеря конверсий, включая `form_submit` | `SeasonPreRegister.astro:231`, `LastMinuteWidget.astro:183,264`, `404.astro:24`, `Base.astro:150` | Свести к одному счётчику или инициализировать нужные; проверить в интерфейсе Метрики |

### Производительность и билд
| ID | Сайт | Находка | Файлы | Рекомендация |
|---|---|---|---|---|
| P1-9 | aidacamp | 95% инлайн-JS в dist — дубли: общие скрипты лейаута инлайнятся в каждую из ~326 страниц (7,3 МБ, ~22 КБ/страницу, некэшируемо) | `Base.astro`, `Header.astro`, скрипты аналитики/цен | Объединить стабильные общие скрипты в внешний модуль `src/scripts/` (>4 КБ → файл). **Обязательно проверить цели Метрики после — тень Partytown** |
| P1-10 | aidacamp | FAQ-аккордеон скопирован в 70 страниц (уже 64 варианта, расходятся), эталон в `FAQ.astro:134` | `stati/*`, лендинги; `src/components/FAQ.astro:134` | Вынести в `src/scripts/faq-accordion.ts`, подключать `<script src>` |
| P1-11 | aidacamp | Общий CSS 240 КБ эмитится дважды (`global.*.css` ≡ `dynamicPrices.*.css`, md5 совпадает) → двойная загрузка статика→SSR, расщеплённый кэш | импорт CSS через `src/data/dynamicPrices.ts` (гипотеза) | Убрать CSS-импорт из ts-модуля, чтобы Vite дедуплицировал |
| P1-12 | aidacamp | `@playform/compress` — 70% времени билда (~75 с), зря жмёт статические `metodichki/` (23 МБ), `demo/` каждый билд | `astro.config.mjs` | Исключить `metodichki/`,`demo/`,`docs/` из compress; HTML-проход оставить |
| P1-13 | aidacamp | 4–6 API-endpoint'ов создают свой `new Pool` в обход `lib/db.ts` (fortune/spin,init — без лимитов) → риск исчерпания PG-коннектов | `fortune/{spin,init}.ts`, `track.ts`, `article-views.ts` | Перевести на `getPool()` из `src/lib/db.ts`; добавить `statement_timeout` |
| P1-14 | aidacamp | `prototype/news-jazz` — noindex, но в sitemap и не закрыт в robots (смешанный сигнал Яндексу) | `prototype/news-jazz.astro:11`, `astro.config.mjs`, `public/robots.txt` | Добавить `/prototype/` в sitemap-filter и robots Disallow, либо удалить |
| P1-15 | codims | `redirects.conf` в репо мёртв (на проде работает astro.config); 27 конфликтующих целей, одна страница отдаёт 404 живьём | `redirects.conf`, `astro.config.mjs:22-150` | Переименовать в `docs/redirects-archive.conf`; починить 404-редирект. ⚠️ Топвизор |
| P1-16 | vlad-a | Серверное рабочее дерево — единственный актуальный источник: +10 коммитов и 66 незакоммиченных файлов относительно GitHub; CI делает `git pull` → конфликт/откат прода | `/opt/vlad-a/app` | Закоммитить+запушить; проверить `deploy.yml`; наладить бэкап |

### Контент/оффер
| ID | Сайт | Находка | Файлы | Рекомендация |
|---|---|---|---|---|
| P1-17 | codims | Противоречие оффера: «первый урок 500 ₽» (43+) vs «бесплатно» (37), бывает на одной странице; CLAUDE.md требует «всегда бесплатно» | `kursy-dizayna-dlya-podrostkov.astro:29,140`, `BookingForm.astro:51` | Решение владельца → константа `TRIAL_LESSON` в `src/data/` → замена |
| P1-18 | aidacamp | Налоговый вычет литералом + запрещённая формулировка «до 5 200 ₽» в боте | `ask.ts:515,897`, `campData.ts:113` | Считать через `getTaxDeduction()`, убрать литералы |

## P2 — техдолг и рефакторинг

| ID | Сайт | Находка | Файлы | Рекомендация |
|---|---|---|---|---|
| P2-1 | aidacamp | **Мёртвый код ~32,5К строк (~20% базы):** прото-рантайм `src/scripts/{main.js,core,data,features}` + весь `src/partials/` + `workers/ab-analytics/` (~15,6К, 0 ссылок); 18 неиспользуемых компонентов (~2,6К); `demo/` (27 стр., 3,1 МБ dist) | см. отчёт 02, раздел 4.3 | Удалить каталоги (после контрольного билда), обновить `docs/COMPONENTS.md`. `demo/` вынести из pages |
| P2-2 | aidacamp | 6 из 72 endpoint'ов без вызывающих (~460 строк) | отчёт 02 §4.3.5 | Сверить с логами nginx 30 дней → удалить |
| P2-3 | aidacamp | ~50 скриптов `scripts/` без упоминаний + 20 старых SQL-миграций | отчёт 02 §4.3.7 | Сверить с cron/systemd на проде → в `scripts/_archive/` |
| P2-4 | aidacamp | AlfaCRM-клиент (37 строк) скопирован между 2 endpoint'ами, внутри хардкод `/opt/alfacrm-exporter/.env` | `portal/alfacrm-groups.ts:9-45` ≡ `shift-roster.ts:15-51` | Вынести в `src/lib/alfacrm.ts`; путь в env |
| P2-5 | aidacamp | Ручной JSON-LD в 131 странице `stati/` при живых `ArticleSchema`/`FAQSchema` | `stati/*` | Новые — через компоненты; старые переводить при касании |
| P2-6 | aidacamp | 134 сырых `new Response(JSON.stringify)` при живом `portalResponse.ts`; 14 локальных `json()`; zod-валидации входа нет ни на одном из 72 endpoint'ов | `src/pages/api/*` | Постепенно на `apiOk/apiBad`; zod-схемы для публичных POST |
| P2-7 | aidacamp | `mammoth` + `playwright` (тянет браузеры) в prod-dependencies, нужны только офлайн-скриптам | `package.json` | В devDependencies |
| P2-8 | aidacamp | Dev-пути/домены зашиты в прод-эндпоинты | `api/tts.ts:6,8`, `api/lead.ts:20`, `api/fortune/init.ts:43` | Вынести в env (`LEADS_DIR`,`SITE_URL`,`TTS_CACHE_*`) |
| P2-9 | aidacamp | Слепая зона стража цен: «голая» цена в schema.org (устареет в rich-сниппетах) | `CourseSchema.astro:75` (`price:'74900'`) | `getCurrentPrice('shift-4')`; расширить страж на числа без ₽ и на `src/data/` |
| P2-10 | aidacamp | Нет `astro check`/`tsc` в пайплайне; `/api/lead` и бот не покрыты тестами | `package.json` | Добавить `astro check` в guard/CI; vitest на lead+campData |
| P2-11 | aidacamp↔codims | 12 статей с одинаковым slug на обоих сайтах (гипотеза каннибализации; размеры разные) | `stati/scratch-dlya-detej.astro` и др. | Выборочная сверка 3–4 пар текстов (SEO-задача) |
| P2-12 | codims | 16 мёртвых компонентов (~1,7К строк, клон aidacamp) + 14,5 МБ чужих JSON/скриптов aidacamp в `scripts/` + мусорный роут `/api/redirects` | `src/components/*`, `scripts/{photo_catalog,disk_index}.json` | Удалить одним PR (живут в ~/MCP и на сервере) |
| P2-13 | codims | Цены курсов литералами мимo `courses.ts` (26 стр. с «5 400») | `online.astro:23`, `legal.astro:172` | Импорт `priceHuman` из `courses.ts` |
| P2-14 | codims | `/api/lead` без rate-limit, слабая валидация, HTML-инъекция в TG, `String(e)` клиенту | `api/lead.ts:10-25`, `leadTelegram.ts:57-66` | `limit_req` nginx; allowlist; escape; generic-ошибка |
| P2-15 | icepartners | Реквизиты компании дублируются (`render-html.mjs` зеркалит `site.ts`, реальный рассинхрон телефона/адреса); прототип `v2/` едет в прод-dist; мёртвый код (`QuoteModal.tsx`, `mail.mjs`); Multer без fileFilter | `server/quote/render-html.mjs:14-21`, `src/pages/v2/*` | Общий JSON реквизитов; решить судьбу v2; удалить мёртвое; whitelist типов файлов |
| P2-16 | icepartners | Metrika ID `6726376` захардкожен в 20 местах (расходится с DECISIONS #11) | 20 файлов | Единый источник |
| P2-17 | vlad-a | Файлы прототипа design-canvas в публичном вебруте (индексируются); тяжёлые картинки (ironman.jpg 3,4 МБ); React-бандл 135 КБ; TTFB статики ~1,5 с | `vlad-a-prod/*.jsx`, `_astro/client.*.js`, nginx | Убрать прототип из вебрута; сжать картинки в webp; проверить кэш nginx; ревизия hydration |
| P2-18 | vlad-a | Карта проектов в CLAUDE.md неверна («нет локального репо») — исходники есть в `/opt/vlad-a/app` | `~/.claude/CLAUDE.md` | Обновить запись |

## P3 — косметика

| ID | Сайт | Находка | Рекомендация |
|---|---|---|---|
| P3-1 | aidacamp | ID счётчика Метрики и реальный телефон зашиты в 27+/35 мест | Единый источник в `src/data/` |
| P3-2 | aidacamp | Слепая зона стража дат: `src/data/*.json` не сканируется | Добавить `src/data` в обход |
| P3-3 | aidacamp | `portal/den`≡`portal/smena` фронтматтер; `portal/all`≈`index` карточки; 4 компонента >500 строк | Выносить при следующем касании |
| P3-4 | aidacamp | `/shifts/` отдаёт 403; `inject-modulepreload` покрывает только главную | 301 на `/#shifts`; обобщить preload на лендинги |
| P3-5 | codims | sitemap `lastmod=today` всем; страницы-сироты в sitemap; 88 файлов-сирот в public (5,8 МБ); незакоммиченная ветка | lastmod из git mtime; `sitemap({filter})`; сверка nginx; закоммитить |
| P3-6 | icepartners | Телефон/почта литералами; `LeadForm` на `client:load` вместо idle; CRLF в Subject; IP уходит в `ipwho.is` | Из `site.ts`; `client:idle`; strip `\r\n`; серверное geo |
| P3-7 | vlad-a | Дубли-артефакты (`robots 2.txt`); три копии дистрибутива на сервере | Удалить дубликаты; убрать мёртвые копии |

---

## Что признано «чисто» (не находки)

- **aidacamp:** SQL в `/api/lead` параметризован; загрузка файлов (`@uppy`) вся под auth-гейтом;
  `photo.ts` с allowlist; секретов в `PUBLIC_*`/клиентском бандле нет; циклов в `.ts` нет (madge);
  hydration-директив **0** (коррекция ТЗ — «10» были поля `client:` в Corp-интерфейсах);
  клиентские тяжёлые библиотеки (uppy/plyr/photoswipe) грузятся только на портале, не на публичных
  страницах; TTFB прода ~0,3 с; билд зелёный, стражи проходят.
- **icepartners:** секреты только из ENV, `.env` не в git; nodemailer не open-relay; multer держит
  файл в памяти (на URL не попадает); CSP/security-заголовки выставлены; jscpd 0.39–2.69%.
- **codims:** инлайн-скрипты без дублей (лучше aidacamp); клиентский бандл 188 КБ; TTFB 0,36–0,66 с.
- **Межсайтовое дублирование кода** практически отсутствует — общий пакет не окупится (форки
  `dialog.ts`/`phone.ts` осознанные).

## Коррекции к ТЗ (по факту аудита)

1. vlad-a **имеет** исходники и git (`/opt/vlad-a/app` + GitHub) — премиса «нельзя пересобрать»
   снята; реальный риск — рассинхрон с GitHub (P1-16).
2. aidacamp: hydration-директив **0**, а не 10 — блок «лишняя hydration» пустой.
3. Процессный инцидент: в основном репо отсутствовал `node_modules` (worktree-ловушка) —
   локальные билды ложно «зеленели» за 5 с; восстановлено `npm ci`. Стоит добавить preflight-проверку
   `node_modules/.bin/astro` в guard.
