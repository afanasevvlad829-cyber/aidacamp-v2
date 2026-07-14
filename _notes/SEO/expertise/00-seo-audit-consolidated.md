# Консолидированный SEO-аудит — 2026-06-04

> Единый структурированный свод всей SEO-информации по проектам **aidacamp.ru** (детский IT-лагерь) и **codims.ru** (Школа #АйДаКодить).
> Источники: git-история репо `~/Aidacamp-cloude`, заметки `_notes/SEO/`, `_notes/SEO-проекты/`, `_notes/Библиотека знаний/SEO*`, HTML-отчёты (`_notes/SEO/reports/` + сервер `/opt/reports-hub/files/`), session-инсайты `_notes/SEO/expertise/07-session-insights-2026-06-03.md`.
> Метод: только факты из файлов/git/отчётов. Гипотезы и непроверенное помечены «гипотеза» / 🤔.

---

## 1. aidacamp.ru

### 1.1 Git-история SEO-работ (ветки, PR, что сделано)

В репо **~120+ SEO-веток** (`agent/seo-*`, `worktree-seo-*`, `serp-monitoring`). Подавляющее большинство замержено в `dev`/`main` через PR. Сгруппировано по направлениям:

**Технический SEO (замержено):**
- `agent/seo-block1-technical` (PR #232, #234, #248) — массовая правка title-тегов: 37 страниц укорочены до ≤58 симв., устранены обрезанные description, исправлены 4xx, schema-completeness (Article+FAQ+dateModified, author sameAs).
- `agent/seo-tech-fixes` (PR, `51b9254c`) — tech SEO: title/meta/4xx/schema.
- `agent/seo-article-schema` / `agent/review-schema` / `agent/seo-video-schema` — JSON-LD: BreadcrumbList в 79 статьях `/stati/` (`9eb1b7be`), Event schema для 6 смен на `/ceny` (`24228859`), FAQ schema по кластерам.
- `agent/indexnow`, `agent/seo-sitemap-ctr-monitoring`, `serp-monitoring` — sitemap/CTR/indexnow инфраструктура.
- `remove-partytown-metrika-fix` / `hotfix/partytown-regression` — устранение Partytown (ломал Метрика-цели, инцидент 16–18 апр).

**CTR / сниппеты (замержено):**
- `agent/seo-ctr-snippets`, `seo-ctr-snippets2`, `seo-ctr-titles`, `seo-quick-wins-titles`, `seo-title-desc-fixes`, `blog-meta-ctr`. Главная: `c39168b2` (title+description для CTR), `4762eb0b` (рейтинг 5.0 + «на лето 2026» в description).
- `worktree-seo-ctr-optimization` (PR #209, commit `9a52afcc`) — оптимизация сниппетов 5 ВЧ-ключей (поз. 4–6 → цель 1–3). См. `_notes/SEO-проекты/`.

**Контент / лендинги (замержено):**
- Сезонные 2026-апдейты по кластерам: `seo-grinder-*` (malchiki, moskva, iyun, iyul, kanikuly, programmirovanie, ai, shkolniki, ozdorov, ceny, putevki) — H1/title 2026, новые секции, FAQ schema.
- Гео-страницы: `seo-geo-batch3/4`, `geo-pages-batch3`, `seo-podmoskove-2026`, `seo-naro-luchshie-vychet`, `seo-avgust-devochek`. Города МО + маршруты + раздел «вожатые».
- Новые лендинги: `/pionerskiy-lager` (20K vol, `613ac8b8`), `/lager-letom` (`f19a31e4`), `/moskovskie-letnie-lagerya` (`f67d8a98`), `/founders` (E-E-A-T, `5885aebb`), `/lager-dlya-podrostkov` (усиление против каннибализации, `1c1391a0`).
- Статьи: десятки в `/stati/` (`seo-articles*`, `seo-blog-batch1..5`, `practical-parent-guide-articles`, `screen-time-articles-improve`, `seo-addiction-articles`, `seo-zavisimost-series`).
- `agent/seo-cannibalization-it` — устранение каннибализации IT-страниц. `82fa1991` — удалён дубль H1 (Mobile eyebrow p→h1).

**Внутренняя перелинковка (замержено):**
- `seo-interlinking`, `seo-main-links`, `seo-batch3-links`, `seo-block2-internal-links`, `seo-textblock-links`, `zavisimost-hub-link`. Хаб `zavisimost-ot-gadzetov` + обратные ссылки из 8 статей (`66eeb4ae`), ссылки на нал.вычет в блоке Shifts (`d6819741`), ссылки на `kak-dobratsya-do-lagera` с 32 городских лендингов (`7264463b`).

**SEO-фабрика — автопилот (самое свежее, 2026-06-04, замержено):**
- `agent/seo-factory-v1` (PR #528, `3c5f4161`) — `scripts/seo-factory/seo-factory.js`: кластеризация `seo_keywords` → генерация Astro → PR в dev. Шаблоны `nch-landing.astro.tpl` (НЧ 300 слов + FAQPage), `geo-landing.astro.tpl` (маршрут + CourseSchema). Крон 07:00 после ETL (06:15), лог в `seo_factory_log`.
- `agent/seo-factory-2026-06-04` (PR #532, `642fe7e5`+`4a6e6cb1`) — **49 новых страниц** за один день (15 + 34).

**Документация (замержено):**
- `agent/seo-notes-expertise` (PR #531, `519c9ff8`) — база экспертизы + 10 инсайтов сессии 2026-06-03.
- `agent/seo-notes-incident` (PR #522, `1127d545`) — грабля: нулевые клики при позиции 6–8.
- `c7e0b987` / `09b8a5f7` — SEO commercial audit design spec 2026-05-14 + фаза каннибализации.

**Ветки потенциально НЕ замержены** (есть локально, без merge-коммита/без origin):
`agent/seo-age-geo-expand`, `seo-age-lps`/`seo-age-lps-2`, `seo-batch4-schema`/`5-geo`/`6-content`/`7-new-pages`/`8-google`, `seo-cluster-booking-schema`, `seo-content-tier2/3/4-lp`, `seo-content-top5-lp`, `seo-content-narrow-it-lp`, `seo-dlya-kompaniy`, `seo-expand-*` (programmirovanie/roblox-3d/telefon-lager/vybrat-pervyj/zavisimost), `seo-f-lps-final`, `seo-new-lps-uncovered`, `seo-partial-clusters`, `seo-price-block`, `seo-quick-wins-batch2`, `seo-schema-landings`, `seo-semantic-gap-it`, `seo-tilda-migration-articles`, `it-camp-hub-lps`, `p22-*`. Статус каждой требует индивидуальной проверки `git branch --merged` (гипотеза: часть уже влита через сквош/др. ветку).

### 1.2 Текущие стратегии и цели

**Карта страница ↔ ключ** (`seo-strategy-may2026.md`):
- Главная `/` — хаб: «детский лагерь» (1-я цель), «летний лагерь», «лагерь в подмосковье», «лагерь для детей/подростков», IT-ниша.
- `/detskiy-lager-podmoskove/` — «детский лагерь в подмосковье».
- `/kupit-putevku-v-lager/` — транзакционные «купить путёвку».
- `/stati/*` — информационные (без гаджетов, IT-школа, зависимость).
- **Принцип: 1 кластер = 1 страница.** Не плодить дубли под ключи, которые и так конвертят с главной (CTR 30–57%).

**Главная цель / KPI:** Метрика Goal `541048270` (отправка формы age_select) — критичная конверсия, мониторится во всех SERP-экспериментах.

**Действующая стратегия после сессии 2026-06-03 (инсайты, актуальнее майской):**
- Инвестировать **только** в IT-нишу (поз. 1.1–1.5, CTR 74–96%) и запросы «2026»+гео (CTR 37–70%).
- Широкие транзакционные («детский лагерь», «летние лагеря») — **не трогать**: агрегаторы непробиваемы, карточный виджет отбирает клики (~0% CTR при поз. 7–12).
- Главный сигнал успеха = **клики** (`seo_queries.clicks`), не позиции трекера.
- «2026»+гео в title/H1 всех коммерческих страниц (устойчивы к алгоритм-апдейтам, обновлять ежегодно).

**SERP-CTR проект 2026-05** (`_notes/SEO-проекты/`): оптимизация сниппетов 5 ключей, автомониторинг (3 крон-скрипта: daily 09:07, weekly пн 10:13, positions вт–чт 08:15). Откат через `git revert 9a52afcc`.

### 1.3 Известные проблемы и грабли

| Проблема | Суть | Статус |
|---|---|---|
| **Нулевые клики при поз. 6–8** | 27 000+ показов/мес, ~0 кликов. Причина: юр.адрес офиса = адрес codims.ru → Яндекс классифицирует как онлайн-сервис, показывает в виджете Карт. Решение — отдельный физадрес лагеря (Наро-Фоминский р-н). **До решения не тратить время на LocalBusiness/Яндекс.Бизнес.** | 🔴 Открыта |
| **Каннибализация Tilda-блога** | `/tpost/...` 301→`/detskiy-lager-podmoskove/`, но Яндекс держит старый URL в индексе, делит вес. | Частично (есть редирект) |
| **Трекер позиций врёт** | Топвизор/Arsenkin = одна точка (Москва+смартфон). В конце мая показал «катастрофу» (поз. 16→28), реальный трафик и конверсии держались. | Принято как данность |
| **Алгоритм-апдейт 31.05.2026** | Одновременное падение 65+ широких запросов. Не техническая проблема (коммитов в SEO в этот период нет). Устояли «2026»+гео и гиперлокальные. | Внешний фактор |
| **Волатильность ±10 поз/неделю** | Норма для ниши в сезон. Не паниковать. | Норма |
| **Partytown ломал Метрика-цели** | Инцидент 16–18 апр, ~60К₽ потерь. `@astrojs/partytown` навсегда забанен (`scripts/guard-no-partytown.sh`). | Закрыта |
| **RSY-группа `books`** | 695 визитов, scroll 5–6%, bounce ~85% → портит поведенческие. | В работе |
| **143 запроса ведут только на `/`** | Главная не может ранжироваться по 143 разным запросам → нужны отдельные страницы (драйвер SEO-фабрики). | В работе (factory) |

### 1.4 Ключевые метрики

**Топ-ключи по трафику (Вебмастер, апр–май 2026, `seo-strategy-may2026.md`):**

| Ключ | Ср. позиция | Показы | Клики | CTR |
|---|---|---|---|---|
| детский лагерь | 10.6 | 2 929 | 285 | 9.7% |
| летний лагерь | 6.4 | 1 325 | 206 | 15.5% |
| лагерь для подростков | 3.8 | 1 075 | 319 | 29.7% |
| детский лагерь в подмосковье | 5.5 | 909 | 293 | 32.2% |
| летний лагерь в подмосковье | 2.6 | 584 | 348 | 59.6% |
| летний лагерь для подростков | 2.2 | 578 | 330 | 57.1% |

**Драйверы CTR (seo_queries, май 2026, инсайты):** IT-ниша поз.1.1–1.5 → CTR 74–96%, 2000+ кликов/мес. «2026»+гео поз.3–6 → 37–70%. Бренд → 35–40%, 800+ кликов.

**Структура органики (Метрика 25.05–03.06):** ссылочный трафик агрегаторов **1633** визита > поиск **849** > реклама **497**. Органика = длинный хвост + бренд.

**Семантическая карта (seo_keywords, freq≥10, без позиции):** 506 запросов вне ТОП-100 (440 НЧ / 63 СЧ / 3 ВЧ); 348 запросов без страницы вообще.

**Лучшие страницы по кликам:** `kompyuternyy-lager.astro` (поз.1.9, CTR 72%, 1672 кл/мес); статья `ekrannoe-vremya-detej-norma` (1006 кл, инфо); конверсионная `kuda-otdat-rebenka-na-leto` (343 кл, коммерч.).

---

## 2. codims.ru

> Школа #АйДаКодить. Отдельный сайт, тот же стек (Astro 6 + Tailwind v4), тот же сервер. SEO-методология идентична aidacamp (skill `seo-keyword-grinder-codims`).

### 2.1 Git-история SEO-работ
В основном репо `~/Aidacamp-cloude` codims-специфичных SEO-веток **нет** (есть только `agent/codims-standards`). Сайт codims.ru живёт в отдельных репо на сервере: `/var/www/codims-prod/repo/`, `/var/www/codims-dev/repo/`. SEO-работа по codims ведётся через skill и отчёты, не через коммиты в этот репо. БД SEO для codims на момент создания skill ещё не существовала (DSN-заготовка `postgresql://...:5432/codims`).

### 2.2 Текущие стратегии и цели
**Запуск нового направления — ЕГЭ/ОГЭ** (`_notes/SEO/reports/ege-keywords-codims.html`, 04.05.2026): 26 ключей, сум. W=12 648, 4 кластера. Быстрые победы:
- 🔴 Создать `/ege-informatika` (W~1 200, нет конкурирующей страницы).
- 🟠 Создать `/ege-matematika` (W=9 502, профильная математика+ЕГЭ).
- 🟢 `/olimpiady` (W~420, амбициозные школьники).
- 🟢 FAQ-блок «Готовим к ЕГЭ по информатике» на `/courses`.

**Методология (skill):** аудит кластеров → on-page (title ≤60, desc ≤140, H1+год, FAQ ≥4) → создание страниц по шаблону LandingLayout → деплой → дашборд. action_type по позиции: optimize 6–20, expand_content 21–50, create_page если страницы нет.

### 2.3 Известные проблемы и грабли
- **Общий физадрес с aidacamp** — корень проблемы нулевых кликов aidacamp (см. 1.3). Для codims это «родной» адрес, для лагеря — конфликт классификации.
- Scratch-статья `/stati/kak-sozdat-igru-v-scratch/` ранжируется по нескольким «скретч игра/игры» запросам на поз.20–24 — кандидат на оптимизацию (quick win).

### 2.4 Ключевые метрики
**Полный SEO-отчёт codims** (`_notes/SEO/reports/codims-full-seo.html`, 04.05.2026, Москва-213):
- **1322** ключа · **226** кластеров.
- TOP-3: **334** · TOP-10: **450** · TOP-30: **556** · не в TOP: **766**.

**Быстрые победы (поз. 11–30 → ТОП-10):**

| Ключ | W | Позиция | URL |
|---|---|---|---|
| школа информатики | 3 728 | #11 | codims.ru/ |
| детские курсы | 1 905 | #15 | codims.ru/ |
| школа программистов | 1 181 | #13 | codims.ru/ |
| скретч игра / игры скретч | 1 797 | #20–24 | /stati/kak-sozdat-igru-v-scratch/ |

**Серверные отчёты по codims** (`/opt/reports-hub/files/`): `2026-05-07-audit-codims-final.html`, серия `seo-autopilot-codims-ru-*` (E-E-A-T 93/100, score 99.7, pagespeed, GSC), `seo-geo-aeo-*-codims-ru-*`, `2026-05-05-codims-xxxx-python.html`.

---

## 3. Общие SEO-правила и методология

Источник: `_notes/Библиотека знаний/SEO — основные правила.md` (живой документ, 348 строк).

### 3.1 Технические правила
- **Два поисковика параллельно:** Google ~40% (технические сигналы, CWV, E-E-A-T, ссылки) + Яндекс ~60% (поведенческие, локальная выдача, ИКС). Настройки шлём в оба вебмастера.
- **robots.txt:** обязательна `Clean-param` для Яндекса (склейка UTM/yclid/gclid). Решило 11 дублей `/it-camp` (15.04.2026). Полный список параметров — в файле.
- **sitemap.xml:** лимит 50 000 URL / 50 МБ; иначе sitemap-index. Грабля: `@astrojs/sitemap` генерит `sitemap-index.xml` (404 после post-processor) — в robots оставлять реально существующий `sitemap.xml`. Sitemap с source=ROBOTS_TXT в Вебмастере **нельзя удалить** ни API, ни UI — только ждать переобхода.
- **canonical** на UTM-дубли; **301** (не 302) для переездов; без цепочек редиректов. Якорь-редирект: `return 301 /path#anchor` через `location =` (не `rewrite`).
- **Core Web Vitals:** LCP <2.5с, INP <200мс (заменил FID с 03.2024), CLS <0.1. Mobile-First Indexing (Google индексирует мобильную версию как основную).
- **HTTPS** обязателен. Картинки — alt + WebP/AVIF.
- Грабля: 404 в Вебмастере на 301-редиректах = норма (исторические состояния), проверять `curl -I`.

### 3.2 LSI-методология
Пример: `_notes/SEO/lsi-podmoskove.md` (Arsenkin API: check-top/sp/copyrighters, регион 213, глубина 20).
1. Снять ТОП-20 Яндекса по целевому запросу, классифицировать домены (агрегатор/гос/лагерь/статья).
2. Из `sp` (подсветки топ-50) собрать LSI-слова с частотой встречаемости; разбить на тиры (критичные ≥15, важные 8–14, добавить 5–9).
3. От copyrighters — медиана объёма текста (415 слов, диапазон 210–610) и эталонная структура заголовков (H1→год+USP, H2 обзор/рейтинг/недорогие/цены/программы/отзывы/акции/FAQ).
4. Обязательные точные вхождения с заданной частотой (ключ 1×, «лагерь» 3×, «подмосковье» 2×, «детский» 2×).
5. Найти отсутствующие критичные слова (в кейсе: «путёвка» freq=29 полностью отсутствовала) → ТЗ копирайтеру по тирам HIGH/MEDIUM/LOW.
**Стратегический вывод LSI:** против агрегаторов (поз.1–5) ссылками не пробиться → заходить через менее конкурентные ниши (IT-лагерь, +программирование, +возраст, гиперлокаль типа «Наро-Фоминск»).

### 3.3 Яндекс-алгоритмы и поведенческие факторы (SXO)
- **ИКС** — публичный аналог PageRank (формула закрыта 🤔).
- **Поведенческие через Метрику** влияют на ранжирование: CTR в выдаче, dwell time, pogo-sticking, bounce. UX/скорость/соответствие интенту = часть SEO.
- **Регион сайта** в Вебмастере обязателен (Москва/МО) — иначе локальные запросы не ранжируются.
- **Clarity как SXO-инструмент:** rage clicks / dead clicks / scroll depth = прямые сигналы. ETL в PostgreSQL, `./scripts/stats.sh` или MCP `clarity`.
- Высокий объём + низкая глубина РСЯ-трафика → риск для поведенческих, не «дешёвые лиды».
- **E-E-A-T (YMYL — дети):** фото педагогов с именами/опытом, лицензия Минобра, отзывы со ссылкой на Яндекс.Карты = проверяемые факты.

### 3.4 Структура сниппетов / title
- **Title** ≤60 симв (правка довела до ≤58), уникальный, главный ключ **в начале** (вес!), «2026» обязательно для коммерческих.
- **Description** ≤160 симв Google / ~250 Яндекс; не дублировать; CTR-ориентированный (цифры, рейтинг 5.0, цена, CTA).
- **H1** ≠ Title: Title — SEO-формула с брендом, H1 — человеческий заголовок; один H1 на страницу.
- Формула сниппета (SERP-CTR проект): `Title = [ключ] + [дата] + [3 выгоды] + [длительность]`; `Desc = [ценность] + [экспертность] + [результат+CTA]`. Убрали из сниппетов цены/бренд/скучные детали, добавили эмоц.выгоды, дифференциаторы (мини-группы до 8), соц.доказательство (вычет 13%).
- **GEO/AEO** (Нейро/AI Overview/ChatGPT): короткие абзацы, FAQ-блоки, чёткие определения в начале раздела, Schema.org, «одна мысль = один абзац».
- **Schema для лагеря:** LocalBusiness + Event (каждая смена) + Review/AggregateRating + FAQPage + BreadcrumbList.

---

## 4. Карта SEO-активов (где что лежит)

**Заметки (`_notes/`):**
- `SEO/seo-strategy-may2026.md` — стратегия май, карта страниц↔ключей, KPI.
- `SEO/lsi-podmoskove.md` — эталон LSI-методологии + ТЗ копирайтеру.
- `SEO/seo-quick-wins-journal.md` — дневник быстрых правок (batch 2, 37 правок).
- `SEO/expertise/00-seo-audit-consolidated.md` — **этот документ**.
- `SEO/expertise/07-session-insights-2026-06-03.md` — 10 инсайтов (актуальнейшая стратегия).
- `SEO/seo-hierarchy.html` — иерархия.
- `SEO/reports/codims-full-seo.html`, `ege-keywords-codims.html` — отчёты codims.
- `SEO/wordkeeper-full-may2026.csv`, `wordkeeper-keywords-19apr2026.csv`, `yandex-keywords-april-2026.csv` — дампы семантики.
- `SEO/logs/cron.log` — логи мониторинга.
- `SEO-проекты/SERP-CTR-optimization-2026-05.md` + `SERP-CTR-monitoring-setup-checklist.md` — проект CTR + автомониторинг.
- `Библиотека знаний/SEO — основные правила.md` — фундамент + best practices/инциденты.

**Скрипты:**
- `scripts/seo-factory/seo-factory.js` + `templates/{nch,geo}-landing.astro.tpl` — автопилот генерации страниц (крон 07:00).
- `scripts/serp-ctr-monitor-{daily,weekly,positions}.sh` + `SERP-MONITOR-README.md` — мониторинг CTR/позиций.
- `scripts/guard-no-partytown.sh`, `npm run check:banned` — guard-проверки в билде.

**База данных (PostgreSQL `aidacamp` на сервере):**
- `seo_keywords`, `seo_positions`, `seo_queries` (clicks — главный сигнал), `seo_cluster_progress`, `seo_pages`, `seo_factory_log`, `seo_etl_log` (крон-ETL декоммишен 14.07.2026, не восстанавливать), `knowledge_chunks`.
- codims Б/Д (`...:5432/codims`) — заготовка в skill.

**Сервер (`/opt/reports-hub/files/`, ~420 файлов, дашборд https://dev.aidacamp.ru/reports-hub/):**
- aidacamp ежедневные `YYYY-MM-DD-seo-*.html` (до 2026-06-04), `seo-geo-aeo-full-audit-aidacamp-ru.html`, `seo-architecture*.html`, `seo-positions-latest.html`, `serp-ctr-*.html`.
- codims: `audit-codims-final.html`, `seo-autopilot-codims-ru-*` (E-E-A-T/score/pagespeed/GSC), `seo-geo-aeo-*-codims-ru-*`.

**Skills:** `seo-keyword-grinder` (aidacamp), `seo-keyword-grinder-codims`, `seo-full-cycle`, `seo-full-audit`.

**Внешние инструменты/доступы:**
- Topvisor (User-Id 126727) — позиции/история.
- Arsenkin — wordstat/кластеры/LSI/топ-export.
- Яндекс.Вебмастер + GSC + Метрика (Goal 541048270) + Clarity.
- DataForSEO: Google SERP работает, Яндекс SERP — нет (40402); для Яндекса — xmlstock.com.

**Ссылочное (каталоги, 23.04.2026):** incamp.ru ✅ (главный, самая ценная ссылка). vlagere.ru/gemrussia/kidsincamp — платные, пропустить. Бесплатно: Яндекс.Карты/2GIS/Maps (отзывы), Дзен, vc.ru/rb.ru, 7ya.ru (рейтинг), kidsreview.ru, babyblog/u-mama, camp.mosreg.ru (реестр МО).

---

*Составлено 2026-06-04. Только чтение источников — код/прод/git не изменялись (создан только этот файл).*
