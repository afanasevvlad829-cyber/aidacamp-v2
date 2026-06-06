# АйДаКемп — Дизайн-система v3

**Источник истины токенов:** `src/styles/global.css` блок `@theme {}`.
**Доступные иконки:** `src/data/icons-manifest.json` → `npm run icons` после правки.
**Визуальная демо-страница:** `/demo/design-system` (полная с примерами).
**Эталонные компоненты:** `src/components/Shifts.astro`, `src/components/FAQ.astro`.

> **Целевая аудитория:** Дарья 35–45 лет, мама подростка, на мобиле. Дизайн = инструмент конверсии, не эстетики.

---

## 1. Философия

| # | Принцип | Суть |
|---|---|---|
| 1 | **Photo emotion > graphic effects** | Фото улыбающегося ребёнка работает в 10× сильнее gradient orbs |
| 2 | **Soft orange** (`#ec9b44`, как голова робота) | Hard orange = «реклама», soft = «премиум» |
| 3 | **Avoid aggressive fills** | Где можно — outline вместо fill |
| 4 | **Один accent per screen** | На каждом экране — 1 точка внимания |
| 5 | **Info vs Conversion blocks** | Info = navy + white (без orange). Conv = soft orange accent |
| 6 | **Конверсия = звонок** | Phone в header — главный CTA, всегда виден |
| 7 | **Mobile-first** | Сначала 390px, потом upscale до 1280px+ |

---

## 2. Палитра

### Primary — soft orange (бренд)

| Step | HEX | Применение |
|---|---|---|
| 50 | `#fdf6ec` | подложка soft |
| 100 | `#faead0` | подложка карточек |
| 200 | `#f5d4a4` | borders soft |
| 300 | `#f0bb78` | hover state на soft |
| 400 | `#eba955` | secondary accent |
| **500** | **`#ec9b44`** | **бренд, primary CTA** |
| 600 | `#d68830` | hover на primary |
| 700 | `#b66d10` | active, text-on-light |
| 800 | `#8c540c` | text emphasis |
| 900 | `#603b08` | dark text |
| 950 | `#321e04` | darkest |

### Navy — фон тёмных секций

| Step | HEX | Применение |
|---|---|---|
| 50 | `#f3f6fb` | secondary surface |
| 500 | `#3b76c3` | accent navy |
| 700 | `#285085` | navy text |
| 900 | `#152a46` | hero подложка вторая |
| **950** | **`#0d1a2b`** | **hero bg, тёмные секции** |

### Neutrals + success

| Назначение | HEX | Класс |
|---|---|---|
| White | `#ffffff` | `bg-white` |
| Surface | `#f8f9fb` | `bg-surface` / `bg-slate-50` |
| Border | `#e5e7eb` | `border-slate-200` |
| Text muted | `#6b7280` | `text-slate-500` |
| Text body | `#1e2430` / `#334155` | `text-slate-700` |
| Text strong | `#0d1a2b` / `#0f172a` | `text-slate-900` |
| Success | `#2fa768` | `text-green-600` / `bg-green-50` |
| Stars only | `#ffd86b` | только для ★ rating |
| Error | `#c4515c` / `#dc2626` | `text-red-600` |

### Контраст: WCAG 2.1 AA

- **Обычный текст: ≥ 4.5:1**
- **Крупный (18px+ или 14px+ bold): ≥ 3:1**
- На тёмном фоне минимум `text-white/60` (FAIL: `/35`, `/40`, `/45`)
- Декоративные элементы (`·`, иконки, рамки) не считаются

Проверка: https://webaim.org/resources/contrastchecker/

### Hard vs Soft Orange

| ❌ Hard `#ec7c00` | ✅ Soft `#ec9b44` |
|---|---|
| «Реклама», агрессивно, крикливо | «Премиум», как у Apple/Stripe |
| **НЕ использовать в новых компонентах** | Используй везде |

---

## 3. Типографика

Mobile-first шкала. Минимум на мобилке: **16px для body** (иначе Safari auto-zoom).

| Уровень | Mobile | Desktop | Класс | Применение |
|---|---|---|---|---|
| **Hero H1** | 38px | 56px | `text-[38px] md:text-[56px] font-extrabold leading-[1.05] tracking-[-0.03em]` | Hero главная |
| H1 LP | 28px | 42px | `text-[28px] md:text-[42px] font-bold leading-[1.1] tracking-[-0.02em]` | LandingHero |
| **Section H2** | 26px | 36px | `text-[26px] md:text-[36px] font-bold leading-[1.15] tracking-[-0.02em]` | секции |
| Card H3 | 18px | 22px | `text-[18px] md:text-[22px] font-bold leading-[1.2]` | карточки |
| **Body** | 16px | 16px | `text-[16px] leading-[1.65]` | основной текст |
| Body large | 18px | 18px | `text-[18px] leading-[1.5]` | hero-сабтайтлы |
| Caption | 14px | 14px | `text-[14px] leading-[1.5]` | мета, подписи |
| Label UC | 12px | 12px | `text-[12px] font-semibold uppercase tracking-[0.06em]` | метки чипов |
| Micro | 12px | 12px | `text-[12px] leading-[1.4]` | копирайт, дисклеймеры |

### Жирность
- 400 regular — body
- 500 medium — кнопки, ссылки внутри текста
- 600 semibold — H3, метки, акценты
- 700 bold — H1, H2
- 800 extrabold — Hero H1

### ⛔ Запрещено
- `text-xs` (12px) для body
- Меньше 14px только в caption / badge / disclaimer

---

## 4. Spacing

База — **4px**. Tailwind: `gap-1`=4, `gap-2`=8, `gap-3`=12, `gap-4`=16…

| Контекст | Mobile | Desktop |
|---|---|---|
| Секция (py) | `py-10` (40px) | `py-16` (64px) |
| Между секциями | `mt-12` (48px) | `mt-20` (80px) |
| Внутри карточки | `p-4` (16px) | `p-6` (24px) |
| Между карточками | `gap-3` (12px) | `gap-4` (16px) |
| Container | `max-w-[1312px] px-4` | то же |
| Текстовый блок | `max-w-[720px]` | 60–80 chars/line |

---

## 5. Радиусы

| Размер | Класс | Применение |
|---|---|---|
| Small | `rounded-[8px]` | бейджи, чипы |
| Medium | `rounded-[12px]` | мелкие кнопки, инпуты |
| **Default** | `rounded-[14px]` | карточки, FAQ-айтемы, кнопки |
| Large | `rounded-[20px]` | большие карточки, модалы |
| XL | `rounded-[24px]` | hero-блоки |
| Full | `rounded-full` | бейджи, pill, аватары |

---

## 6. Тени

| Класс | Применение |
|---|---|
| `shadow-[0_2px_8px_rgba(15,23,42,0.04)]` | мягкая, hover на ссылках |
| `shadow-[0_4px_16px_rgba(15,23,42,0.06)]` | карточки спокойные |
| `shadow-[0_8px_24px_rgba(15,23,42,0.08)]` | приподнятые, модалы |
| `shadow-[0_4px_16px_rgba(236,155,68,0.35)]` | hover на оранжевой кнопке |

**Запрещено:** `shadow-md`, `shadow-lg` дефолтные Tailwind (слишком серые).

### Канонический класс `.card-shadow`

Для карточек используется единый утилитарный класс **`.card-shadow`** (определён в `global.css`) — это канонический бокс-шэдоу карточек (≈ `0 4px 16px rgba(15,23,42,.06)`). Используется в 90+ местах портала. Новые карточки оформляй им, а не повторяй inline `shadow-[...]`.

```html
<div class="card-shadow rounded-[14px] border border-slate-100 bg-white p-4 md:p-6">…</div>
```

Портальный аналог в `portal.css`: токен `--p-shadow` и класс `.portal-card`.

---

## 7. Кнопки

**Правило: fill ТОЛЬКО для primary CTA. Остальное — outline/ghost.**

### Primary (1 на экран)
```html
<button class="rounded-[14px] bg-primary text-[#1e2430] px-6 py-3.5 text-[15px] font-semibold transition-all duration-200 hover:bg-primary-light hover:shadow-[0_4px_16px_rgba(236,155,68,0.35)] hover:-translate-y-[1px] active:translate-y-0 min-h-[44px]">
  Выбрать смену
</button>
```

### Secondary (outline)
```html
<button class="rounded-[14px] border-[1.5px] border-primary bg-white text-slate-900 px-6 py-3 text-[14px] font-medium hover:bg-primary/10 transition-colors min-h-[44px]">
  Узнать больше
</button>
```

### Ghost (link-style)
```html
<a class="text-primary underline underline-offset-2 hover:text-primary-700">Скачать программу</a>
```

### Phone (всегда наверху)
```html
<a href="tel:+74951284429" class="inline-flex items-center gap-1.5 text-primary font-bold text-[16px]">
  <i class="bi bi-telephone-fill"></i> +7 (495) 128-44-29
</a>
```
Не fill. Просто текст с иконкой. **Главный путь = звонок.**

### Размеры — touch target
- Mobile primary: `py-3.5 text-[15px]` минимум
- **min-h-[44px]** — WCAG 2.5.5
- Никогда меньше 44×44px

---

## 8. Карточки

### На светлом
```html
<div class="rounded-[14px] border border-slate-100 bg-white p-4 md:p-6 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
  <h3 class="text-[18px] font-bold text-slate-900">Заголовок</h3>
  <p class="mt-2 text-[16px] leading-[1.65] text-slate-700">Описание...</p>
</div>
```

### На тёмном (hero)
```html
<div class="rounded-[14px] bg-white/8 border border-white/10 p-4 backdrop-blur">
  <h3 class="text-[18px] font-bold text-white">Заголовок</h3>
  <p class="mt-2 text-[16px] leading-[1.65] text-white/80">Описание...</p>
</div>
```

---

## 9. Иконки

- **Только Bootstrap Icons** через `<i class="bi bi-*" aria-hidden="true">`. Никаких эмодзи в UI.
- Размер: `text-[14px]` inline, `text-[20px]–[24px]` для card heroes.
- Цвет: `text-primary` для акцента, `text-slate-400`–`text-slate-500` нейтрально.
- Любая новая иконка → `src/data/icons-manifest.json` → `npm run icons`.
- **НИКОГДА не редактируй `src/styles/icons.css` вручную** (auto-generated).

Полная карта замены эмодзи → bi-* в `CLAUDE.md`.

---

## 10. Ссылки и контакты

В prose:
```html
<a class="text-primary underline underline-offset-2 hover:text-primary-700">Текст</a>
```

### Контакты — порядок ВЕЗДЕ одинаковый
1. **Phone** — главный канал (`tel:+74951284429`)
2. **Telegram** — наш основной мессенджер (`https://t.me/Progaschool`)
3. **WhatsApp** — для тех кто не Telegram (`https://wa.me/79688086455`)
4. **Email** — для документов (`mailto:hello@codims.ru`)

**НЕ менять порядок!** Telegram всегда перед WhatsApp.

Используй константы из `src/data/contacts.ts`: `PHONE_MAIN_HREF`, `EMAIL_HREF`, `WHATSAPP_URL`, `TELEGRAM_URL`.

---

## 11. Блоки сайта — Info vs Conversion

Каждый блок имеет тип. **Info** = navy/white без orange. **Conv** = soft orange accent.

### INFORMATIONAL (закрывают страхи, дают доверие)
| Блок | Точка внимания |
|---|---|
| Hero фото | Лицо ребёнка |
| Stats (7 лет / 1200 / ★5.0) | Цифры |
| About | Иконки + 3 факта |
| Reviews | Лица + рейтинг |
| Mentors / Team | Лица педагогов |
| Stay (размещение) | Фото комнат |
| Trust (Лицензия / Медсестра / Страховка) | Иконки документов |
| FAQ | Q&A |

### CONVERSION (вызывают действие)
| Блок | Точка внимания |
|---|---|
| Phone в Header | Phone link |
| Age picker | 4 кнопки возраста (главная цель Метрики) |
| Hero CTA | Soft orange button |
| Anon Q&A CTA | Cycling word + 🛡 icon (БЕЗ слова «бот») |
| Shifts | Цена + «Выбрать» |
| Booking (внутри карточки смены) | Phone + Submit |

### Точки внимания на блок (правило 1 точки)

| Блок | Главная точка | НЕ должно конкурировать |
|---|---|---|
| Hero | Лицо + Phone в header | Никаких других orange акцентов |
| Age picker | 4 кнопки возраста | Никаких баннеров рядом |
| Shifts | Цена + «Выбрать» | Не выделять рейтинг ярко |
| Reviews | ★ rating + лица | Не делать orange CTA «Все отзывы» |
| About | 3 факта | Никаких CTA |
| FAQ | Список вопросов | Никаких иллюстраций |
| Footer | Контакты | Не дублировать CTA |

---

## 12. Mobile vs Desktop

Mobile-first: проектируем 390px, затем upscale до 1280px+.

| Параметр | Mobile (≤768px) | Desktop (≥1024px) |
|---|---|---|
| Hero H1 | 38px / 800 / -0.03em | 56px / 800 / -0.04em |
| Section H2 | 26px | 36px |
| Body | 16px (мин) | 16px |
| Section padding | 40px (`py-10`) | 64px (`py-16`) |
| Container | full width | 1280px |
| Cards | 1 col stacked | 2-3 col grid |
| Header CTA | Phone icon + burger | Phone full + nav + CTA |
| Hero photo | Full bleed bg, soft mask | Right column 50%, left text |
| Touch target | 44×44 min | 32×32 ok (mouse) |

---

## 13. SEO / GEO / AEO

### Schema.org разметка по блокам

| Блок | Schema type | Ключевые поля |
|---|---|---|
| Header / Footer | `Organization` + `LocalBusiness` | name, url, logo, telephone, address, sameAs, aggregateRating |
| Hero | `WebPage` + `BreadcrumbList` | name, description, primaryImageOfPage |
| Shifts | `Course` + `Offer` | provider, offers (price, priceCurrency, availability, validFrom/Through) |
| Reviews | `Review` + `AggregateRating` | author, reviewBody, reviewRating — минимум 5 для rich snippet |
| FAQ | `FAQPage` | mainEntity[] с Question/Answer |
| Mentors / Team | `Person` | name, jobTitle, image, sameAs |
| Articles | `Article` + `Person author` | headline, datePublished, dateModified, author, image |
| Stay | `Place` + `LodgingBusiness` | name, address, geo, amenityFeature |
| Contacts | `ContactPoint` | telephone, email, contactType, areaServed |

### Meta tags — обязательны на каждой странице

| Tag | Правило | Пример |
|---|---|---|
| `title` | 50–65 chars, ключ + бренд | `Летний IT-лагерь в Подмосковье 2026 — АйДаКемп` |
| `description` | 140–160 chars, USP + цена + CTA | `Программирование, AI, бассейн. От 48 000 ₽. Налоговый вычет 13%.` |
| `canonical` | абсолютный URL | `<link rel="canonical" href="https://aidacamp.ru/" />` |
| `og:image` | 1200×630 webp, < 100kB | `/images/og-default.webp` |
| `twitter:card` | `summary_large_image` | — |
| `robots` | `index,follow`. `noindex` для `/demo/`, `/admin/` | — |
| `html lang` | `ru` | `<html lang="ru">` |

### Иерархия H1–H6
- 1 H1 на страницу. H2 — секции (LSI-ключи). H3 — подсекции/карточки.
- Не скакать через уровень.

### Изображения
- AVIF → WebP → JPEG fallback (через `<picture>`)
- Hero LCP: `loading="eager" fetchpriority="high"` + `<link rel="preload">`
- Below-fold: `loading="lazy" decoding="async"`
- Все meaningful images — `alt`. Декоративные — `alt="" aria-hidden="true"`
- Width/height обязательны (CLS prevention)
- Srcset минимум 2 размера (`-600w`, `-900w`)

### Internal linking
Из каждой страницы — минимум 3 ссылки на родственные landing pages (компонент `RelatedPages`).

### Core Web Vitals — наш SLA

| Метрика | Цель Google | Наш SLA |
|---|---|---|
| LCP | < 2.5s | < 2.0s |
| INP | < 200ms | < 150ms |
| CLS | < 0.1 | < 0.05 |
| TTFB | < 0.8s | SSR + brotli |

### GEO (Generative Engine Optimization — для Perplexity / ChatGPT / Gemini)
- **Конкретные цифры:** «От 48 000 ₽», «66 км от МКАД», «1200+ выпускников»
- **Bullet lists и таблицы** — AI любит структурированный контент
- **Author bylines** — `Person author` в Schema + видимый автор
- **dateModified** на статьях
- **External citations:** vc.ru, incamp.ru, Яндекс.Карты
- **Q&A формат** в FAQ
- **One-fact paragraphs** — каждый абзац = 1 факт

### AEO (Answer Engine Optimization — featured snippets)

| Тип | Как попадаем |
|---|---|
| Paragraph | прямой ответ 40–60 слов под H2-вопросом |
| List | нумерованный/маркированный под «Как…» |
| Table | HTML `<table>` для сравнений |
| Video | YouTube embed + `VideoObject` Schema |
| FAQ rich snippet | минимум 4 вопроса с реальными ответами |

### SEO Checklist для нового блока
- [ ] H1 один, главное ключевое слово
- [ ] H2-H3 содержат LSI-ключи
- [ ] Meta title 50-65, description 140-160
- [ ] Schema.org по типу контента
- [ ] Все img: alt + width + height + lazy (кроме hero LCP)
- [ ] ≥ 3 внутренних ссылок
- [ ] Canonical URL без mismatch
- [ ] OG image 1200×630
- [ ] Sitemap включает страницу
- [ ] LCP < 2.0s
- [ ] One factor per paragraph (GEO)
- [ ] FAQ/Q&A где уместно (AEO)

---

## 14. Порядок блоков — на данных Метрики

Воронка за 30 дней: 2827 entered → 692 (24%) выбрали возраст → 6 (0.2%) форма.

### Главные конверсионные цели

| Цель | ID | Reaches |
|---|---|---|
| **Выбор возраста-new** (главная оптимизация Директа) | `541048270` | 692 (24%) |
| Открыл инфо о смене | — | 221 (7%) |
| Посмотреть смены | — | 185 (6%) |
| «Выбрать смену» | — | 115 (4%) |
| Нижняя плашка возраста | — | 76 (3%) |
| Клик телефон (auto+manual) | auto | 48 (1.7%) |

### Принцип «3 волны внимания»

**Wave 1 (Hero + Shifts + Reviews)** — главная задача через emotion + цена + соц. proof.
**Wave 2 (About → Trust → Team → Stay)** — закрываем страхи безопасности и доверия.
**Wave 3 (FAQ → Economy → Booking)** — финальное снятие возражений + рациональный аргумент (вычет 13%).

### Что предлагается удалить / сократить
- **Videos** (0.9% conv) — оптально, либо удалить
- **BookingBar #2** (дубль) — оставить только один
- **Mentors отдельно от Team** — объединить
- **Photo/Video** — на отдельные страницы `/foto/` и `/video/`

### Naming convention для целей
Формат: `{Действие}-{Контекст}-{Версия}`. Пример: `Клик-БотCTA-v3`. Версия меняется при изменении дизайна — старые данные сохраняются.

### Чек-лист для каждого нового CTA
- [ ] `data-analytics-goal="goal_name"`
- [ ] `data-analytics-label="context"`
- [ ] Цель создана в Метрика → Настройки → Цели
- [ ] Если conversion — добавлена в Директ как цель оптимизации

---

## 15. Brand Voice — тон коммуникации

### Тон голоса — характеристики

| Параметр | Уровень | Пояснение |
|---|---|---|
| Формальность | Низкая | На «вы», но как подруга, не как банк |
| Эмоциональность | Средняя | Тёплая забота, без слащавости |
| Юмор | Лёгкий | Уместная ирония, никогда сарказм |
| Экспертность | Скрытая | Не говорим «эксперты», показываем фактами |
| Срочность | Точечная | «Осталось 14 мест», но не «СПЕШИТЕ!!» |
| Назидание | Запрещено | Никогда не учим маму как воспитывать |

### Принцип Пивоварова

> «Решение всегда остаётся за вами. Мы посоветуем, расскажем, поможем — но выбор ваш. Мы вас за это ценим.»

Не давим, не названиваем, не торопим. Уважаем взрослого человека. Факты вместо провокаций любопытства.

### ✅ Работает
- «Пока другие на даче — ваш сделает AI-проект» — лёгкая зависть от подруг
- «Вам — 14 дней для себя» — закрывает вторичную выгоду
- «Анонимно, без регистрации» — снимает страх спама
- «Налоговый вычет 13%» — рациональный аргумент
- «Как у нас в семье» — личная история Дарьи (founder)
- «Решение остаётся за вами» — закрытие любого блока

### ❌ Не работает / запрещено
- **«Перезвоним за 10 минут»** — мусорное обещание, как у всех
- **«Самые выгодные», «лучшие цены», «лидеры рынка»** — клише, не верят
- **«Звоните!», «Пишите!», «Запишитесь!»** — давление, обратный эффект
- **«Бот», «чат-бот», «AI-помощник»** — 42% боятся «опять заберут телефон». Используй «Спросите анонимно»
- **«Ваш ребёнок не получает должного внимания»** — обвинение мамы
- **«Soft skills будущего», «уникальная методика», «инновационный»** — пустые слова
- **«Гарантируем результат»** — невозможно гарантировать
- **«Дети», «ребёнок»** — где можно избегать. Не «ваш ребёнок будет», а «ваш сделает»

### Микрокопирайтинг

| Контекст | Шаблон |
|---|---|
| CTA primary | Глагол + объект — «Выбрать смену», «Узнать цены» |
| CTA secondary | «Узнать больше», «Посмотреть фото» |
| Form labels | Что-нужно-сделать: «Как вас зовут?» вместо «Имя*» |
| Error | «Похоже, телефон не записался — проверим?» вместо «Ошибка: invalid input» |
| Empty | «Тут пока пусто — посмотрите смены лета 2026» |
| Loading | «Считаем места…» вместо «Loading…» |

### Слова-маркеры что нельзя
«безусловно», «качественный», «настоящий», «современный», «инновационный», «гарантия», «эксклюзивный», «уникальный», «лидер», «топовый» — все эти слова сигнализируют о слабом продукте.

---

## 16. Доступность (a11y)

WCAG 2.1 AA — минимум для прода:

| Критерий | Что значит |
|---|---|
| Contrast 4.5:1 | Обычный текст ≥ 4.5:1 с фоном |
| Contrast 3:1 | Большой текст (18px+ или 14px+ bold) ≥ 3:1 |
| Touch targets 44×44 | Кнопки на мобиле минимум 44×44px |
| Alt text | Все meaningful images имеют alt |
| Focus visible | Tab по клавиатуре подсвечивает элемент |
| aria-label | Кнопки только с иконкой имеют aria-label |
| Form labels | Каждый input имеет связанный `<label for>` |
| Heading hierarchy | H1 → H2 → H3 без перескоков |
| Lang attribute | `<html lang="ru">` |
| Reduced motion | Уважать `prefers-reduced-motion` |

**Инструменты:** Chrome DevTools → Lighthouse → Accessibility, [WAVE](https://wave.webaim.org/), [WebAIM Color Contrast](https://webaim.org/resources/contrastchecker/), VoiceOver (Mac) / TalkBack (Android).

---

## 17. Микроанимации

Принцип: анимация работает на UX (даёт feedback, обозначает состояние), а не на «красиво».

### ✅ Можно — функциональные

| Где | Что | Длительность |
|---|---|---|
| Hover на кнопках | `hover:-translate-y-[1px]` + shadow | 200ms ease-out |
| Active на кнопках | `active:translate-y-0` + opacity 0.9 | 100ms |
| FAQ accordion | height 0 → auto + chevron rotate 180° | 250ms ease-in-out |
| Modal появление | opacity 0→1 + scale(0.95→1) + backdrop fade | 200ms |
| Fade-in scroll | IntersectionObserver, opacity 0→1 + translateY 12→0 | 400ms ease-out |
| Cycling text | opacity 0→1 со сменой слова | 200ms, цикл 2.2s |
| Pulse «Запись открыта» | opacity 0.6↔1 + scale(1↔1.3) | 1.5s, ТОЛЬКО 1 элемент |

### ❌ Запрещено
- Авто-карусели быстрее 5 секунд
- Bounce-effect на кнопках
- Mouseover wave/ripple везде (Material overkill)
- Анимация background-image, width, height (НЕ GPU-accelerated)
- Pulse на 5+ элементах
- Loop scroll-triggered animations

### Performance rules
- Animatable: только `transform` (translate/scale/rotate) и `opacity`
- 60 FPS на iPhone SE 1st gen
- 150–300ms для micro, 400–600ms для больших
- `ease-out` для появления, `ease-in-out` для toggle
- `@media (prefers-reduced-motion: reduce)` отключает все анимации

---

## 18. USP — что подсвечиваем

### 1. 📵 Отрыв от телефонов — наша философия
Не «без телефонов» (звучит как наказание), а «другая сторона жизни». Лагерь не для всех — для думающих родителей. К концу смены — 5–10 минут телефона/день, собственный выбор.

### 2. 💸 Налоговый вычет 13%
Рациональный аргумент для папы. Документы для вычета даём автоматически. **Конкретные суммы** (см. CLAUDE.md):
- Смена 2.1 (7 дн., 48 000 ₽) → ~2 800 ₽
- Смены 1/4 (10 дн., 74 900 ₽) → ~4 800 ₽
- Смена 2 (14 дн., 95 000 ₽) → ~5 434 ₽ (максимум)

### 3. 🤖 Реальный AI-проект
Не «информатика», а реальный продукт за 7–14 дней. Игра / бот / сайт — что-то, что можно показать в чате с подругами / на родительском собрании.

### Где подсвечивать

| USP | Где | Как |
|---|---|---|
| Отрыв от телефонов | Hero subtitle, About, отдельный блок Philosophy, FAQ | «Другая сторона», не «без телефонов» |
| Налоговый вычет | Hero (микро), Shifts (под ценой), Economy, FAQ | Конкретные суммы по сменам |
| AI-проект | Hero subtitle, Journey, Hackathon | Реальные проекты прошлых смен с фото/видео |

---

## 19. Customer Journey — «скользкая горка»

Принцип Sugarman: конец каждого блока должен заставлять идти дальше — но БЕЗ провокаций любопытства (Пивоваров tone). Просто называем что дальше.

### Простые навигационные подсказки

| Блок | Заканчивается на | Ведёт к |
|---|---|---|
| Hero | Возраст ребёнка ↓ | Age picker |
| Age picker | Подходящие смены ↓ | Shifts (filtered) |
| Shifts | Как проходит день ↓ | Journey |
| Journey | Хакатон в финале ↓ | Hackathon / About |
| About | Команда и менторы ↓ | Team+Mentors |
| Team+Mentors | Размещение и безопасность ↓ | Stay + Trust |
| Stay+Trust | Отзывы родителей ↓ | Reviews |
| Reviews | Стоимость и налоговый вычет ↓ | Economy |
| Economy | Частые вопросы ↓ | FAQ |
| FAQ | Не нашли — спросите анонимно ↓ | Anon Q&A CTA |

### 3 типа путей клиента

| Путь | Сценарий | Длина |
|---|---|---|
| Быстрый (~24% — главный) | Hero → Age → Shifts → Звонок | 3–4 экрана, 1–2 мин |
| Глубокий (~7%) | Hero → Age → Shifts → Journey → Reviews → FAQ → Звонок | 10–15 мин |
| Параноик (~3%) | Все блоки → FAQ → Анон Q&A → Карты → Звонок | 2–3 сессии |

---

## 20. Меню

### Top (mobile + desktop) — главные конверсионные + философия
**Смены** · **Цены** · **Философия** · **Спросить анонимно** (highlighted)

### More dropdown — вспомогательные
О лагере · Как проходит смена · Команда · Размещение · Отзывы · FAQ · Документы · Фото · Видео · Контакты

### Footer (sitemap)
Все основные + Политика · Пользовательское соглашение

### Search
Иконка лупа в header — поиск по статьям/FAQ/смене (Pagefind, статический).

---

## 21. Отдельные страницы (что выносим с главной)

Чтобы главная грузилась быстрее (LCP < 2s) и была сфокусирована.

| Блок | Куда | Зачем |
|---|---|---|
| Gallery (фото) | `/foto/` | 10–30 фото, много места + load time |
| Videos | `/video/` | YouTube embed = тяжёлый load. Конверсия 0.9% |
| Mentors (детально) | `/komanda/` (внутри Team) | На главной кратко (3–4), полная — внутри |
| Документы / Лицензия | `/stati/dokumenty-licenziya-strahovka/` (есть) | Ссылка из trust-блока + footer |

**Эффект:** главная сократится с ~21 блока до ~12. TTI улучшится в 1.5–2x.

---

## 22. Бронирование — внутри карточек

**Принцип:** не назойливо. Кто хочет — позвонит сам (телефон в header). Кто хочет глубже — Age picker → Shifts → Modal с деталями → «Забронировать» появляется ТУТ, не раньше.

### Новый flow
1. Hero → Age picker (4 кнопки)
2. Shifts (filtered по возрасту)
3. Клик на смену → Modal с деталями
4. Inside Modal: **«Забронировать»** кнопка
5. Booking form: минимум полей. Имя + телефон + email опционально.

### ❌ Что убрали
- BookingBar #1 (после Economy) — удалить
- BookingBar #2 (после Shifts) — удалить
- «Перезвоним за 10 минут» — мусорное обещание

### ✅ Что оставили для звонящих
- Phone link в header (всегда виден)
- Phone в Contacts (один раз внизу)
- Phone в Footer
- Telegram / WhatsApp иконки (Telegram первым) в header

---

## 23. Слово «бот» — никогда

42% россиян не оставляют контакты из страха спама. Слово «бот» = «опять менеджер заберёт телефон».

| ❌ Запрещено | ✅ Нужно |
|---|---|
| «Спросите бота» | «Спросите анонимно» |
| «Чат-бот ответит» | «Получите ответ за минуту» |
| «AI-помощник» | «Узнайте всё про лагерь» |
| «Telegram-бот» | «Через мессенджер» |
| «Напишите боту» | «Спросите про лагерь / еду / стоимость» |

### CTA для anon Q&A
```
СПРОСИТЕ ПРО
[cycling word: лагерь / еду / бассейн / размещение / стоимость / программу / безопасность]
🛡 Анонимно, без регистрации
```

**Cycling words — нейтральные, без провокаций любопытства.** Убрали: «минусы», «косяки», «правду о ценах» — это тон тревоги, не наш.

---

## 24. UX-детали

### Sticky bottom CTA на mobile
Когда юзер проскролил Hero и не выбрал возраст — снизу появляется sticky-bar с **выбором возраста** (главная цель Метрики `541048270`). После выбора возраста меняется на «Выбрать смену».

### Skeleton loading
**Где НЕ нужны:** static контент, Hero (с preload).
**Где нужны:** API-driven блоки (ShiftOccupancy), bot interface при первой загрузке, lightbox.

### Back-to-top button
| Параметр | Значение |
|---|---|
| Когда появляется | После прокрутки > 800px |
| Где | Sticky right-bottom |
| Размер | 44×44px круглая |
| Иконка | `bi-arrow-up` |
| Стиль | Soft white/glass, ненавязчивая |
| Анимация | Fade-in 200ms + smooth scroll |

### 404 — «Возможно вы искали»
1. H1: «Эта страница переехала или удалена»
2. «Возможно вы искали:» 5–7 популярных страниц
3. Поиск по сайту (input)
4. Кнопка «На главную»
5. Phone в header

### Поиск по сайту
Иконка лупа в header (после телефона). Клик → overlay с input. Ищет по статьям `/stati/`, FAQ, названиям смен. **Pagefind** (open-source, статический индекс, без backend).

### Mobile keyboard — viewport jump
Когда mobile-клавиатура поднимается, viewport сжимается → кнопки уезжают / контент перекрывается. Решение:
```css
html { height: 100%; }
body { min-height: 100svh; }
```
Плюс `visualViewport API` для критичных форм (input на focus → скролл к элементу с учётом высоты клавиатуры).

### Mail.ru webview — dead clicks
Mail.ru WebView часто не работает с `<details>/<summary>` (dead clicks). Используй `<button data-faq-toggle>` + JS для accordion'ов.

### Photo Gallery — отдельная страница
| Параметр | Значение |
|---|---|
| URL | `/foto/` |
| Layout | Masonry grid, 2 col mobile / 4 col desktop |
| Lightbox | Swipe + pinch zoom + ESC |
| Lazy | IntersectionObserver |
| Format | AVIF + WebP fallback, 300w/600w/1200w |
| Категории | Tabs: Занятия / Бассейн / Природа / Хакатон / Команда |

### Программа смены — печать в PDF
Папа распечатает программу — должна красиво лечь на A4. `@media print` stylesheet: скрыть nav/footer/CTA, оставить программу с большими полями для заметок.

### Дата формат — ВСЕГДА «30 мая»

| ❌ | ✅ |
|---|---|
| 30.05.2026 | 30 мая 2026 |
| May 30 | 30 мая |
| 30/05 | 30 мая |
| 2026-05-30 | 30 мая 2026 (для людей) |

В коде: `<time datetime="2026-05-30">30 мая 2026</time>` — ISO в атрибуте, человеческий внутри.

---

## 25. Hero-блоки (анимированные эффекты)

| Slug → Эффект | Назначение |
|---|---|
| `quantum` | AI/тех |
| `fiber` | 3D / геометрия |
| `hexagons` | Roblox |
| `interactive-stars` | Minecraft |
| `particle-flow` | Scratch |
| `circuit` | Python |
| `neon-network` | подростки |
| `ascendant` | программирование, IT-школа |
| `glass-orbs` | информационные (legal, privacy) |
| `fireflies` | питание, тёплые блоки |
| `cosmic` | отзывы |
| `star-genesis` | лето 2026 |

Конфиг: `src/components/LandingHero.astro` → `_HERO_BG_BY_SLUG`.
Реализация: `src/styles/global.css` блок `[data-hero-bg="..."]` с `@media (max-width: 768px)` fallback.

---

## 26. Чек-лист для нового компонента

- [ ] Использую токены из `@theme`, не хардкодю цвета (`var(--color-primary)`)
- [ ] Все интерактивные элементы — минимум 44×44px на мобилке
- [ ] Body-текст ≥ 16px на мобилке
- [ ] Контраст ≥ 4.5:1 для обычного текста
- [ ] Кнопки с `hover:` и `active:` состояниями
- [ ] Иконки только Bootstrap Icons, в манифесте
- [ ] Ссылки на контакты — правильный `href` (`tel:`, `mailto:`, `wa.me`, `t.me`)
- [ ] Иерархия H1 → H2 → H3 без перескоков
- [ ] Mobile-first: сначала мобильные классы, потом `md:`
- [ ] На тёмном фоне — `text-white/60` минимум
- [ ] Если фото в hero/bg — gradient-overlay для читаемости
- [ ] Picture с `width`/`height` (CLS prevention)
- [ ] Нет эмодзи в UI (только `bi-*`)
- [ ] data-analytics-goal на каждом CTA
- [ ] Schema.org разметка (если применимо)

---

## 27. Чего категорически НЕ делать

- ❌ Hard orange `#ec7c00` в новых компонентах. Используй soft `#ec9b44`
- ❌ Iridescent / multi-hue gradients (pink, violet, cyan — не наша палитра)
- ❌ Несколько orange CTA на одном экране (только 1 primary, остальное outline/ghost)
- ❌ Эмодзи в UI (только Bootstrap Icons)
- ❌ Жёсткие края фото в hero (soft mask или vignette)
- ❌ Pulse-animation на множестве элементов (только 1, pacing 4-5с)
- ❌ Текст < 16px на mobile body (Safari auto-zoom ломает UX)
- ❌ `text-white/35`, `/40`, `/45` (FAIL WCAG AA)
- ❌ Inline стили `style="color:..."` (только Tailwind tokens)
- ❌ Назидание / экспертный тон (лёгкий тон подруги)
- ❌ «Перезвоним за 10 минут», «Самые выгодные», «Лучшее предложение»
- ❌ Слова «дети», «ребёнок» где можно избегать (заменять на «ваш», «он/она», «подросток»)
- ❌ Слово «бот» в любой форме («Спросите анонимно»)
- ❌ Призывы «Звоните!», «Пишите!», «Запишитесь!» (Пивоваров tone: «Решение остаётся за вами»)
- ❌ BookingBar как отдельный блок (только внутри карточки смены, после возраста)
- ❌ `<details>/<summary>` для аккордеонов (ломается в Mail.ru/VK in-app — используй `button data-faq-toggle`)
- ❌ Picture без `width`/`height` (CLS)
- ❌ Кастомный CSS без причины (только в `global.css` если нет аналога Tailwind)

---

## 28. Где брать готовые паттерны

- **Hero лендинга:** `src/components/LandingHero.astro`
- **Двухколоночный блок:** `src/components/LandingTwoCol.astro`
- **FAQ:** `src/components/FAQ.astro` (10 категорий, JSON-LD автоматически)
- **Карточки смен:** `src/components/Shifts.astro`
- **Booking modal:** `src/components/ShiftModal.astro` (бронирование внутри)
- **Sticky CTA / AgeBar:** компонент с главной целью Метрики 541048270
- **Visual demo:** `/demo/design-system` — все примеры с кодом

---

**Если сомневаешься — открой `src/components/Shifts.astro` или `src/components/FAQ.astro` и копируй паттерн. Они эталонны.**

*v3 · 2026-05-01 · Soft Orange + Attention-driven · АйДаКемп*
