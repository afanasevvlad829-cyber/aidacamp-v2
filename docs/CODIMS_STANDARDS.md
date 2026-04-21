# CODIMS_STANDARDS.md

Стандарты проекта aidacamp-v2 для разработки сайта **Codims** (школа программирования для детей, круглогодичный продукт). Документ создан аудитором 2026-04-21 на основе чтения исходников и заметок АйДаКемп.

---

## 1. СТЕК И ИНФРАСТРУКТУРА

**Astro 6.1.4** + **Tailwind CSS 4.2.2** + **Node 22** (через NVM)

```bash
# Активация Node 22
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22
```

**Tailwind v4** — нет отдельного `tailwind.config.mjs`. Конфиг через `@tailwindcss/vite` плагин в `astro.config.mjs`. CSS-переменные определяются в `src/styles/global.css` через `@theme`.

### Структура `src/`

```
src/
  components/    — UI-компоненты (.astro)
  layouts/       — Base.astro (общий лейаут)
  pages/         — страницы + /api/ роуты
  scripts/       — TypeScript: form-submit.ts, tracking
  styles/        — global.css, tokens.css, mobile-ux-p0.css, icons.css
  data/          — contacts.ts, shifts.ts, landing-pages.ts, icons-manifest.json
  lib/           — вспомогательные утилиты (уточнить структуру)
```

### Окружения

| Окружение | URL | Путь на сервере |
|---|---|---|
| Dev | dev.aidacamp.ru | /var/www/aidacamp-dev/current/ |
| Prod | aidacamp.ru | /var/www/aidacamp/current/ |

### Деплой

```bash
npm run build  # guard → icons → astro build → sitemap → critical CSS → modulepreload
# Деплоить ТОЛЬКО dist/client/ — не dist/!
rsync -avz --delete -e 'ssh -i ~/.ssh/aidacamp_prod' \
  dist/client/ root@159.194.223.55:/var/www/aidacamp/current/
# SSR-сервер (API роуты):
rsync ... dist/server/ root@159.194.223.55:/var/www/aidacamp/current/server/
```

### Ветки

```
main (прод) ← только merge из dev с явного разрешения владельца
  ↑
dev (стейджинг) ← оркестратор пишет сюда напрямую
  ↑
agent/* ← рабочие ветки агентов → PR → dev

tooling (orphan) — скрипты CI, не мержится в dev/main
```

### Запрещённые зависимости

- **`@astrojs/partytown`** — никогда. Ломает Яндекс.Метрика → 0 конверсий → Direct встаёт (инцидент апрель 2026, −60К₽)

---

## 2. ДИЗАЙН-СИСТЕМА

### Цветовая палитра

| Роль | Hex | Применение |
|---|---|---|
| Primary (оранжевый) | `#ec7c00` | CTA уровень 1, акценты, focus ring, ссылки |
| Primary light | `#f59332` | Градиенты, hover-вариант |
| Primary soft | `#fff1df` / `#fff0e0` | Фон CTA уровня 2, chip-hover |
| Primary dark (текст) | `#b84800` | Текст на светлом фоне уровня 2 |
| Dark navy | `#0f172a` / `#0f1c2e` | Hero фон, тёмные блоки, H1-H3 |
| Dark navy alt | `#0d1a2b` | Overlay на Hero |
| Dark overlay | `rgba(2, 6, 23, 0.85)` | Оверлей поверх фото |
| Text primary | `#111827` / `#1e2430` | Основной текст |
| Text muted | `#6b7280` / `#6d7586` | Вторичный текст, chip-text |
| Text sub | `#374151` | Подзаголовки |
| Surface | `#f7f8fb` / `#f7f5f2` | Альт-фон секций |
| Background | `#f0f0f5` / `#eef1f6` | Общий фон страниц |
| Panel | `#f6f7fc` | Фон карточек-панелей |
| Card | `#ffffff` | Фон карточек |
| Border | `rgba(17, 24, 39, 0.14)` | Рамки карточек |
| Border soft | `#e5e8f0` | Мягкие разделители |
| Accent green | `#2fa768` | Успех, статус «готово» |
| Accent green light | `#45c97f` | Hover для зелёного |
| Accent green soft | `#e9f8ef` | Фон зелёного badge |

### Система кнопок — 4 уровня

| Уровень | Визуал | Когда | Пример |
|---|---|---|---|
| 1 — Кричит | Залитый `#ec7c00`, белый текст | Бронь, заявка, оплата | «Записаться» |
| 2 — Говорит | Контурный оранжевый, фон `#fff0e0`, текст `#b84800` | Вторичное конверсионное | «Узнать цену» |
| 3 — Шепчет | Серый, border `#e2e8f0` | Навигация, табы, фильтры | «Программа» |
| 4 — Молчит | Badge/chip, без hover | Только статус | «Python» |

**Правила:**
- Максимум 2 залитых оранжевых (уровень 1) одновременно на экране
- Disabled: всегда `bg-slate-200 text-slate-400 cursor-not-allowed`
- Мобилка: `min-height: 48px; width: 100%` — критично, без этого bounce +81%
- Focus: `box-shadow: 0 0 0 3px rgba(255,119,0,0.42)` (WCAG AA)

**Доступность:**
- CTA оранжевый `#ec7c00` не проходит WCAG AA на белом → затемнять до `#c45f00` для текста

### Типографика

> Источник правды: `/Users/vladimirafanasev/Aidacamp-cloude/Дизайн-архитектура.md`

| Элемент | Десктоп | Мобилка | Вес | Цвет |
|---|---|---|---|---|
| H1 | 44px | 36px | 700 | `#0f172a` |
| H2 | 30px | 30px | 700 | `#0f172a` + оранжевая полоса слева |
| H3 | 22px | 22px | 700 | `#0f172a` |
| Лид | 16px | 16px | 400 | `#475569` |
| Body | 15px | 15px | 400 | `#1e293b` |
| Small | 13px | 13px | 400 | `#64748b` |
| Caption | 11px | 11px | 600 caps | `#94a3b8` |
| Ссылки | — | — | 500 | `#ec7c00` |

**Правило `mobile-ux-p0.css`:** body минимум `font-size: 16px` (не 14px), `line-height: 1.65`


### Брейкпоинты (Tailwind defaults, Tailwind v4)

| Prefix | Min-width |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

**Мобилка-первично:** большинство компонентов идут mobile-first, `lg:` — основной переключатель на десктоп.

### Токены (CSS-переменные из `tokens.css`)

```css
/* Отступы */
--space-sm: 8px    --space-md: 12px   --space-lg: 16px
--space-xl: 20px   --space-xxl: 24px  --space-3xl: 32px
--space-4xl: 40px

/* Border-radius */
--radius-sm: 12px  --radius-md: 16px  --radius-lg: 24px  --radius-pill: 999px

/* Размеры */
--header-height: 76px           --topnav-height: 58px
--container-max: 1202px         --section-container-max: 1140px
--container-padding-desktop: 40px   --container-padding-mobile: 16px
--hero-min-height: 620px        --hero-min-height-mobile: 460px
--chip-height: 30px

/* Тени */
--ac-shadow-card: 0 16px 40px rgba(15, 23, 42, 0.08)
--ac-shadow-hero: 0 16px 40px rgba(15, 23, 42, 0.10)
--ac-shadow-hover-soft: 0 12px 24px rgba(15, 23, 42, 0.16)
--ac-shadow-overlay: 0 18px 44px rgba(22, 29, 43, 0.24)

/* Motion */
--motion-duration-fast: 160ms   --motion-ease: ease-out
```

### Иконки — только Bootstrap Icons

`<i class="bi bi-*" aria-hidden="true">` — только иконки из `src/data/icons-manifest.json` (80 штук на 2026-04-21). Эмодзи в UI — запрещены.

Добавить иконку: добавить имя в `icons-manifest.json` → `npm run icons` (не редактировать `icons.css` вручную).

---

## 2b. ОТКРЫТЫЕ ЗАДАЧИ AIDACAMP (из Дизайн-архитектуры)

Зафиксированы в `/Users/vladimirafanasev/Aidacamp-cloude/Дизайн-архитектура.md`, актуальны на 2026-04-21:

| Приоритет | Задача |
|---|---|
| 🔴 КРИТ | CSS-переменные: смешаны хардкод-hex и `var()` — привести к единой схеме |
| 🔴 КРИТ | `Base.astro` fix — восстановить age-selection modal (сломана воронка VK) |
| 🟡 | Кнопки уровень 2 → единый контурный оранжевый (сейчас не единообразно) |
| 🟡 | Team PNG → avif (400–520KB каждая) |
| 🟡 | Gallery JPGs → avif |
| 🟢 | `VideoFacade.astro` — ленивая загрузка для 5 Kinescope видео |


## 3. КОМПОНЕНТЫ

| Компонент | Назначение | Ключевые пропсы | В Codims |
|---|---|---|---|
| `LeadForm.astro` | Форма заявки (возраст + телефон) | `variant: 'desktop'|'mobile'` | ✅ да 1:1 |
| `FAQ.astro` | Аккордеон вопросов с фильтрами | — | ✅ да 1:1 |
| `Footer.astro` | Подвал (документы, разделы, соцсети) | — | ✅ адаптировать (ссылки, юрлицо) |
| `Header.astro` | Шапка с навигацией | — | ✅ адаптировать (меню) |
| `PhoneDropdown.astro` | Дропдаун телефонов/мессенджеров | `variant: 'desktop'|'mobile'` | ✅ адаптировать (номера) |
| `SchemaOrg.astro` | JSON-LD схемы (Organization, FAQPage…) | — | ✅ адаптировать (тип: School) |
| `Hero.astro` | Главный экран с формой | — | ✅ адаптировать |
| `About.astro` | Блок «О компании» | — | ✅ адаптировать |
| `Reviews.astro` | Карусель отзывов | — | ✅ адаптировать |
| `Gallery.astro` | Фото с фильтрами | — | ✅ адаптировать |
| `Team.astro` | Карточки команды | — | ✅ адаптировать |
| `Contacts.astro` | Карта + контакты | — | ✅ адаптировать (адрес) |
| `Journey.astro` | Программа/расписание дня | — | ✅ адаптировать (смена→урок) |
| `RelatedPages.astro` | SEO-перелинковка | `icon`, `href`, `title` | ✅ адаптировать |
| `BookingBar.astro` | Форма бронирования (inline) | `headline`, `id` | ❌ нет (смены не нужны) |
| `Shifts.astro` | Карточки смен с прогрессом | — | ❌ нет → CourseCard |
| `ShiftModal.astro` | Модалка подробностей смены | — | ❌ нет → CourseModal |
| `AgeBar.astro` | Верхняя полоска выбора возраста | — | ❌ нет (другая UX) |
| `Economy.astro` | Блок «Телефон в лагере» | — | ❌ нет (специфика лагеря) |

**Что адаптировать в Hero:** смена→курс, лагерь→школа, «7 дней» → длительность курса, ценовое — другой чек.

---

## 4. SEO-ПАТТЕРНЫ

### Структура URL

```
Главная:         /
Лендинги:        /[тематика]-[тип]           пример: /lager-programmirovaniya
Хаб-страницы:    /[тема]/                    пример: /kompyuternyy-lager/
Статьи:          /stati/[тема]
B2B:             /dlya-kompaniy
Лендинги гео:    /[продукт]-[гео]            пример: /it-lager-podmoskove
```

**Slug-правила:** только латиница, дефисы, всегда lowercase, без trailing slash кроме хабов.

### Формула title / description

```
title: "[Продукт] [гео/сезон] [год] — [специализация] | [Бренд]"
Пример: "IT-лагерь в Подмосковье 2026 — Python для детей | АйДаКемп"

description: "[Продукт] [гео], [расстояние]. Детям [возраст]: [ключевые направления] — [результат]. [Сроки/формат], от [цена]."
```

### Schema.org (из `SchemaOrg.astro`)

| Тип | Где | Ключевые поля |
|---|---|---|
| `Organization` | Все страницы | name, url, logo, telephone, address, sameAs (VK, TG, YouTube) |
| `EducationalOrganization` / `SummerCamp` | Главная | name, description, offers, location |
| `FAQPage` | Страницы с FAQ | mainEntity → Question/Answer |
| `BreadcrumbList` | Лендинги | OrderedList → страница |
| `Person` (E-E-A-T) | Главная | Команда: name, jobTitle, sameAs |

**Для Codims:** тип схемы `EducationalOrganization` + `Course` вместо `SummerCamp`.

### Внутренняя перелинковка

- `RelatedPages.astro` — 16 SEO-карточек (4×4) в подвале каждого лендинга
- `RelatedArticles.astro` — блок статей в конце страниц
- Принцип: каждый лендинг ссылается на 3-5 смежных лендинга по теме

### Индексирование

- **Яндекс Вебмастер:** ручная отправка URL, 17 URL отправлено апрель 2026
- **Google Search Console:** ручная отправка, лимит ~10 URL/день
- **IndexNow** — подключён для автоматического уведомления поисковиков

---

## 5. ПРОИЗВОДИТЕЛЬНОСТЬ

### Изображения

| Правило | Значение |
|---|---|
| Формат Hero | `.avif` (конвертировать из PNG/JPG до деплоя) |
| Формат прочих | `.avif` (фоллбэк `.jpg`) |
| Hero `loading` | `eager` + `fetchpriority="high"` |
| Остальные | `loading="lazy"` |
| Hero `srcset` | 3 размера: 480w, 800w, 1200w |
| Пример экономии | merch-hoodie.png 2.4MB → avif 48KB (−98%) |

### Шрифты

```html
<!-- Preload в <head> (из Base.astro) -->
<link rel="preload" as="font" href="/fonts/inter-cyrillic.woff2"
      type="font/woff2" crossorigin />
<link rel="preload" as="font" href="/fonts/inter-latin.woff2"
      type="font/woff2" crossorigin />
```

`font-display: swap` — обязательно. Шрифты хранятся локально в `/public/fonts/`.

### JS стратегия

- Форма и базовая логика — inline `<script>` в компоненте
- Аналитика (Метрика, Mail.ru, Clarity) — стандартный async тег, без Partytown
- Тяжёлые компоненты — `client:visible` (карусели, видео)
- Модальные окна — `client:idle`

### Видео (Kinescope)

```html
<!-- Паттерн lazy-load через Intersection Observer -->
<div class="video-facade" data-video-id="KINESCOPE_ID">
  <img src="/images/video-poster.avif" loading="lazy" alt="..." />
  <!-- iframe подставляется JS при клике -->
</div>

<!-- IDs видеороликов АйДаКемп: -->
<!-- video-01: qmLxu2S7uaS44CKkhoV1Jj -->
<!-- video-02: tJAaAnvCYYJ5vRz7uyUepj -->
<!-- video-03: naDfzrei9duApz3AnaencH -->
<!-- video-04: eTmCgZHcwhcWQQs3HLCz1S -->
<!-- video-05: s1SCYKqLx6C94fMRumitHF -->
```

### Текущие метрики PageSpeed (апрель 2026, aidacamp.ru)

| Метрика | До оптимизации | После |
|---|---|---|
| PageSpeed Mobile | 69 | 82 |
| PageSpeed Desktop | ~76 | 96 |
| LCP Mobile | 4.5s | ~3s (цель <2.5s) |

**Что сделано:** AVIF-конвертация, preload hero-img, cache-control, critical CSS inline, modulepreload.

**Что осталось:** VideoFacade (Kinescope ленивая загрузка), cookie banner ниже fold.

---

## 6. UX И КОНВЕРСИЯ

### Форма заявки (`LeadForm.astro`)

**Поля:**
1. Возраст ребёнка — 3 радио-кнопки: `7–9 лет`, `10–12 лет`, `13–15 лет` (уровень 1, оранжевые)
2. Телефон — `type="tel"`, `+7` формат, autocomplete
3. Чекбокс согласия — ссылка на политику конфиденциальности
4. Submit кнопка — disabled пока форма не валидна

**Логика:** `src/scripts/form-submit.ts` → POST `/api/lead` → AlfaCRM + Telegram

### Контекст формы (UTM и поведение)

```typescript
// Собирается автоматически при отправке:
utm_source, utm_medium, utm_campaign, utm_content, utm_term
yclid, gclid
ym_client_id        // из Метрика getClientID() или _ym_uid cookie
landing_url, page_title, referrer
screen, viewport, language, tz
session_ms          // время на сайте (sessionStorage: ac_session_start)
```

### Цели Метрики (ID 96499295)

| Имя | GoalID | Ценность | Где навешана |
|---|---|---|---|
| `form_submit` | 541048197 | 6750₽ | LeadForm → /api/lead |
| `age_select` | 541048270 | авто (стратегии Директ) | LeadForm, 175/нед ✅ |
| `phone_click` | 545216440 | 3375₽ | PhoneDropdown |
| `telegram_click` | — | 3375₽ | PhoneDropdown, Contacts |
| `whatsapp_click` | — | TODO: уточнить | PhoneDropdown, Contacts |
| `shift_book_click` | — | 500₽ | Shifts |
| `scroll_25/50/75/90` | — | — | Base.astro глобально |

**window.trackGoal(id, params)** — глобальная функция в Base.astro.

### CTA-паттерн

- Мобилка: `width: 100%; min-height: 48px` — обязательно (без этого 81% drop-off на мобилке)
- Цвет фона: `#ec7c00` (hover: `#d46e00`)
- Позиции: Hero (первый экран) + BookingBar ×2 (середина и конец)

### Модальные окна

- Триггер — атрибут `data-modal-trigger="id"`
- Анимация — CSS transition opacity + transform, `duration-200`
- Закрытие — клик по overlay, кнопка «×», клавиша Escape
- Base.astro монтирует глобальный обработчик

### Мобильные правила (`mobile-ux-p0.css` — критично)

```css
body { font-size: 16px; line-height: 1.65; }          /* не 14px! */
.secondary-text { color: #555; }                       /* не #767676 — не проходит WCAG */
section { padding: 16px; }                             /* не 8px */
.touch-target { min-height: 44px; min-width: 44px; }  /* iOS HIG */
```

### Проблемы конверсии (апрель 2026, для Codims — учесть сразу)

| Проблема | Данные | Решение |
|---|---|---|
| Smartphones bounce 55% vs PC 21% | Clarity | Улучшить mobile hero |
| «Выбрать смену» → «Заявка»: 81% drop-off | Clarity воронка | Короче путь до формы |
| Dead clicks 22% (норма <5%) | Clarity | Убрать декоративные кликабельные элементы |

---

## 7. КОНТЕНТ-ПАТТЕРНЫ

### Структура главной страницы (порядок секций)

1. Header
2. Hero (LeadForm встроен)
3. Trust-bar / ShiftOccupancy + MomStory
4. About
5. Journey (программа / день)
6. Economy (спецсекция лагеря — **не переносить в Codims**)
7. BookingBar #1 (**не переносить**)
8. Shifts / Courses (**адаптировать**)
9. BookingBar #2 (**не переносить**)
10. Hackathon / SummerCta
11. Gallery
12. Videos
13. Reviews
14. FAQ
15. Team
16. Stay / О школе (**адаптировать**)
17. Contacts
18. RelatedPages (SEO-сетка)
19. Footer

**AIDA-логика:** Attention (Hero) → Interest (About+Program) → Desire (Gallery+Reviews) → Action (BookingBar×2+StickyCta)

### Структура лендинга (отличие от главной)

- Тот же Header/Footer
- Hero с той же LeadForm (variant="desktop"|"mobile")
- 5-7 секций вместо 20+
- Фокус на одном ключевом запросе
- RelatedPages в конце (SEO-перелинковка)
- Упрощённый FAQ (3-5 вопросов)

### Формулы H1

```
Гео-лендинг:  "[Продукт] [гео] [год]"
              → "IT-школа в Москве 2026"
Тематический: "[Направление] для детей [возраст]"
              → "Python для детей 10-14 лет"
Проблемный:   "[Проблема решаемая продуктом]"
              → "Ребёнок проводит всё время в играх?"
```

### Подмены H1 по UTM (из `_notes/Сайт/Подмены H1.md`)

Динамическая замена H1/subtitle в зависимости от `utm_content`:

```javascript
// Логика в Hero.astro
const prefixMap = {
  'problem_photo/telefon': 'Перестаёт сидеть в телефоне? IT-лагерь это исправит',
  'problem_photo/nichego': 'Ничего не хочет? В лагере это исчезает на 3-й день',
  'intent_kw/lager':       'Летний лагерь под Москвой',
  'intent_kw/it_lager':    'IT-лагерь для детей',
  'crm_school/next_step':  'Этим летом — не просто отдых',
  // + ещё 45+ вариантов...
}
```

**Для Codims:** адаптировать под школьные UTM (направление, возраст, цель).

### Тон и голос

**Обращение:** «вы», тёплый, не экспертный.

✅ Работает:
- Социальное подтверждение: «60% детей возвращаются»
- Лёгкий тон подруги: «звоните в любое время»
- Конкретные цифры: «за 7 дней — свой проект»
- Налоговый вычет 13% — рациональный якорь

❌ Запрещено:
- Нотации: «ваш ребёнок проводит слишком много времени...»
- Педагогические термины: «soft-skills», «формирование фундамента»
- Сравнение с конкурентами в лоб

---

## 8. МАРКЕТИНГ И АУДИТОРИЯ

### Два продукта, одна аудитория

| | АйДаКемп (лагерь) | Codims (школа) |
|---|---|---|
| Сезон | Июнь — Август | Сентябрь — Май |
| Чек | 56–95к₽ за смену | 2.5–5к₽/мес |
| Цикл сделки | 3–14 дней | 1–3 дня |
| Канал продаж | Звонки (90%) | Заявки + чат-бот |
| Повторка | Следующий сезон | Ежемесячно |
| LTV | ~100к₽ | ~36к₽ (долгий хвост) |
| Email | hello@codims.ru | hello@codims.ru |
| Метрика | 96499295 | 51406414 |

Аудитория **частично пересекается** — одни и те же мамы. Кросс-движения:
- **Школа → Лагерь** (апсейл летом): ~150 чел/год потенциально
- **Лагерь → Школа** (возврат к сентябрю): ~150–200 чел/год
- **Лиды школы → Лагерь**: ~100 чел/год

> **Ключевой факт (апрель 2026):** трафик с сайта Codims даёт **лучшее качество аудитории** на лагерь из всех каналов. Это тёплые родители — уже знакомы с брендом, уже доверяют. Перелинковка Codims → АйДаКемп (лето) — приоритетный канал кросс-продаж.

### Портрет клиента

| Параметр | Значение |
|---|---|
| Пол/возраст | Женщина 34-45 лет |
| Гео | Москва и МО до 100 км, Дубай (эмигранты) |
| Доход | Средний+ (~75 000₽/мес) |
| Устройство | Мобильный (60%+ трафика, конверсия лучше на PC) |
| Ребёнок | 7-14 лет (1-2 ребёнка) |

**Глубинная мотивация:** покупает self-image «я хорошая мама», не образование. «Мой сын в IT-школе» = современная, заботливая мама.

**Страхи (для школы):**
- «А вдруг ему не понравится / будет скучно?»
- Эффективность: «он реально научится или просто играет?»
- Навязчивые звонки/спам после заявки
- (Безопасность — меньше страх, чем в лагере)

**Каналы после заявки:**
- 65% пишут «Здравствуйте» и ЖДУТ ответа
- WA приоритетнее TG для операционки и апсейла
- Скорость ответа <2 минут → конверсия ×2

### UTM-структура

```
utm_source:   yandex / vk / refer
utm_medium:   cpc / cpm / friend
utm_campaign: problem_photo / intent_kw / crm_school / broad / merch / rsy
utm_content:  [подтип кампании/аудитории]
utm_term:     [ключевое слово для поиска]
```

### Что подтверждено данными

| Факт | Источник |
|---|---|
| РСЯ до 11:00 МСК = bounce 100% → отключена | Метрика апрель 2026 |
| Четверг — лучший день; воскресенье — худший | Директ статистика |
| Автотаргетинг съедает 90% бюджета в мусор | Апрель 2026, расход без конверсий |
| Регионы кроме [1, 213] — плохое качество | Аналитика гео |
| Женщины 45-54 — лучшая конверсия (время 195c, отказы 42%) | Метрика |
| VK CTR 2.3% после добавления Одноклассники + 35-54 | VK статистика |
| CPA rsya/competitors: 142₽ (лучшая группа) vs rsya/books 100% отказов | Апрель 2026 |

### Что НЕ работает

| Что | Почему |
|---|---|
| PAY_FOR_CONVERSION при <10 конв/нед | Кампании «замерзают», 0 показов |
| Автотаргетинг без ограничений | Сливает в нерелевантные запросы |
| Partytown для аналитики | Ломает Метрика-цели через proxy-TypeError |
| micro_age_select как priced_goal в VK | Неправильная атрибуция, кампании не обучаются |
| Площадки РСЯ без автобана | CPA взлетает, нужен autoban >80₽ >3 кликов |

---

## 9. CODIMS — ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА

> Codims — **отдельный готовый Astro-проект** на `/Users/vladimirafanasev/codims/`. Актуально на 2026-04-21.

### Репозиторий и деплой

| Параметр | Значение |
|---|---|
| Путь локально | `/Users/vladimirafanasev/codims/` |
| GitHub | отдельный репо `codims-v2` |
| Dev-стенд | dev.codims.ru |
| Prod | codims.ru (сейчас Tilda, переезд планируется) |
| Сервер dev | 159.194.223.55, порт 4182, `/var/www/codims-dev/` |
| Деплой | push в `main` → **GitHub Actions** → сервер (автоматически) |
| Сервис | `systemctl status codims-dev` |
| ⚠️ | `site` в astro.config.mjs = `dev.codims.ru` — поменять на `codims.ru` перед prod |

### Стек

Идентичен AidaCamp: **Astro 6 + Tailwind 4 + Node 22**, `@astrojs/node` SSR.
Дизайн-система **полностью идентична** — те же CSS-переменные, шрифты, цвета.

### Продукт

| Параметр | Значение |
|---|---|
| Возраст | 6–17 лет |
| Форматы | офлайн (основной) + онлайн |
| Длительность урока | 90 минут |
| Расписание | согласовывается индивидуально; офлайн — преимущественно выходные |
| Форматы обучения | группа (до 6 чел.) или индивидуально |
| Пробный урок | 500₽ (возвращаем за отзыв на Яндексе) — 50 минут, 5 шагов |
| Гарантия | деньги назад если не понравится |
| Основание | 2018 год |

### 21 курс (`src/data/courses.ts`)

**Ценовые группы:**
- Младшие (6–10 лет): **5 400 ₽/мес** группа | **2 000 ₽/зан.** индивидуально
- Средние/старшие (10–17 лет): **9 790 ₽/мес** группа | **3 100 ₽/зан.** индивидуально
- Индивидуально онлайн: **9 350 ₽/мес** (4 занятия)

| ID | Название | Возраст | Группа/мес | Инд/зан | Популярный |
|---|---|---|---|---|---|
| `scratch` | Scratch | 6–10 | 5 400₽ | 2 000₽ | ⭐ |
| `minecraft` | Minecraft | 8–11 | 5 400₽ | 2 000₽ | ⭐ |
| `roblox` | Roblox Studio | 8–12 | 5 400₽ | 2 000₽ | ⭐ |
| `logic-math` | Логика и математика | 6–9 | 5 400₽ | 2 000₽ | — |
| `python` | Python | 10–15 | 9 790₽ | 3 100₽ | ⭐ |
| `olympiad-python` | Олимпиадное программирование | 10–17 | 9 790₽ | 3 100₽ | — |
| `unity` | Unity | 10–17 | — | 3 100₽ | — |
| `design` | Графический дизайн | 10–15 | 9 790₽ | 3 100₽ | — |
| `web` | Веб-дизайн и сайты | 10–17 | 9 790₽ | 3 100₽ | — |
| `blender` | 3D-моделирование | 10–17 | 9 790₽ | 3 100₽ | — |
| `animation` | Компьютерная анимация | 10–15 | 9 790₽ | 3 100₽ | — |
| `javascript` | JavaScript | 13–17 | 9 790₽ | 3 100₽ | — |
| `cpp` | C++ | 14–17 | 9 790₽ | 3 100₽ | — |
| `drone` | Программирование дронов | 10–14 | 9 790₽ | 3 100₽ | — |
| `mobile` | Мобильные приложения | 12–17 | — | 3 100₽ | — |
| `flask-fastapi` | Flask и FastAPI | 12–17 | 3 100₽ | — | — |
| `cybersecurity` | Кибербезопасность | 15–17 | — | 3 100₽ | — |
| `ml-data` | Анализ данных и ML | 15–17 | — | 3 100₽ | — |
| `ege` | ЕГЭ по информатике | 15–17 | 9 790₽ | 3 100₽ | highlighted |
| `ege-math` | ЕГЭ по математике | 15–17 | — | 3 100₽ | — |
| `design-portfolio` | Дизайн-портфолио | 15–17 | 9 790₽ | 3 100₽ | — |

**Быстрый доступ:** `popularCourses` (4 шт), `highlightedCourses` (3: scratch, python, ege), `coursesByAge` (4 группы).

### 6 офлайн-филиалов (`src/data/locations.ts`)

| ID | Название | Адрес | Метро |
|---|---|---|---|
| `peredelkino` | Переделкино Ближнее | ул. Самуила Маршака, 22 | Рассказовка |
| `novo-peredelkino` | Ново-Переделкино | ул. Лукинская, 8 | Рассказовка |
| `odintsovo` | Одинцово | ул. Чистяковой, 58 | — |
| `moskovskiy` | Московский | ул. Радужная, 8 | Филатов Луг |
| `solntsevo` | Солнцево — ЖК Лучи | Производственная ул., 12, корп. 2 | Солнцево |
| `kuntsevo` | Кунцево | Рублёвское шоссе, 20к3 | Кунцевская |

+ **50+ гео-страниц** `/locations/[slug]` — SEO-посадочные по районам Москвы и МО, предлагают онлайн.

### Возрастные страницы (11 шт, `/ages/[slug]`)

6-let, 7-let, 8-let, 9-let, 10-let, 11-let, 12-let, 13-let, 14-let, 15-let, 16-let.
Каждая показывает подходящие курсы из `courses.ts`.

### Структура главной (`src/pages/index.astro`)

1. Header
2. Hero (FAQ-карточки встроены)
3. Courses (21 курс)
4. WhyUs
5. TrialLesson (5 шагов)
6. Guarantees
7. Pricing (4 ценовые группы)
8. FounderMessage
9. ParentFAQ
10. StudyFormats
11. Team
12. Gallery
13. Reviews (16 отзывов, 5.0★)
14. FAQ
15. Contacts
16. Footer
17. StickyCta

### Страница курса (`/courses/[slug]`)

1. Hero (иконка, тег, название, tagline)
2. Статс-блок: возраст, цена, размер группы, расписание, длительность
3. **Camp banner** — оранжевый баннер «Летний IT-лагерь 2026» → aidacamp.ru (кросс-продажа на каждой странице курса)
4. Контент (описание, навыки, outcomes, инструменты)
5. Программа (curriculum, если есть)
6. FAQ курса
7. Филиалы где доступен курс
8. Связанные курсы (nextCourses)
9. LeadForm

Schema.org: `Course` + `EducationalOrganization` + `Offer`.

### Уникальные компоненты (которых нет в aidacamp-v2)

| Компонент | Назначение |
|---|---|
| `Courses.astro` | Каталог 21 курса с фильтрами по возрасту |
| `TrialLesson.astro` | 5 шагов пробного урока (50 мин), механика 500₽ за отзыв |
| `Pricing.astro` | 4 ценовые группы, принимает `courseId?` для фильтра |
| `StudyFormats.astro` | Онлайн vs офлайн |
| `Guarantees.astro` | Гарантии возврата |
| `LandingHero.astro` | Hero для SEO-лендингов |
| `LandingContent.astro` | Контент SEO-лендинга |

### API (`src/pages/api/`)

**⚠️ Важное отличие от AidaCamp:** Codims `/api/lead` отправляет только в **Telegram** — без AlfaCRM.

```typescript
// POST /api/lead
{ phone, age, course, name, source }
→ Telegram: "🎯 Новая заявка Codims
👤 Имя: ...
📞 Телефон: ..."
```

Редиректы со старых URL Tilda → новые Astro-URL настроены в nginx (`/etc/nginx/snippets/codims-redirects.conf`).

### Кросс-связь с лагерем

- В `contacts.ts`: `CAMP_URL = 'https://aidacamp.ru/?utm_source=codims&utm_medium=website'`
- Camp banner на **каждой странице курса** — встроенная кросс-продажа
- Трафик с Codims → лагерь = **лучшее качество аудитории** из всех каналов

### Реквизиты

```
ИП Афанасьева Дарья Викторовна
ИНН: 693203571312  |  ОГРН: 323774600673702
Тинькофф Банк, БИК 044525974
р/с 40802810500005309704  |  к/с 30101810145250000974
```

---

*Документ актуален на 2026-04-21. Обновлять при изменении стека, дизайн-системы или ключевых маркетинговых выводов.*
