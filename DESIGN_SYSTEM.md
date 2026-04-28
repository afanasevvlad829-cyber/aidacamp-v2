# АйДаКемп — Дизайн-система

**Цель:** единые правила, чтобы каждый компонент на каждой странице выглядел консистентно. При добавлении новых блоков просто следуй этим правилам — и они впишутся в общую стилистику.

**Источник истины токенов:** `src/styles/global.css` блок `@theme {}` (строки 22–43).
**Доступные иконки:** `src/data/icons-manifest.json` → запусти `npm run icons` после правки.

---

## 1. Цвета — палитра

| Назначение | Токен / Tailwind | HEX | Когда использовать |
|---|---|---|---|
| **Бренд (CTA)** | `bg-primary` `text-primary` | `#ec7c00` | главные кнопки, акценты, активные состояния |
| Бренд (свет) | `bg-primary-light` | `#f59332` | hover state |
| Бренд (фон-чип) | `bg-primary-soft` `bg-orange-50` | `#fff1df` | подложка для оранжевых блоков |
| **Текст основной** | `text-slate-900` | `#0f172a` | заголовки h1–h3 |
| Текст body | `text-slate-700` | `#334155` | абзацы |
| Текст muted | `text-slate-600` | `#475569` | подписи, мета |
| Текст disabled / hint | `text-slate-500` | `#64748b` | placeholder, hint (только на белом!) |
| **Тёмный фон hero** | `bg-[#0d1a2b]` или `bg-dark-navy` | `#0d1a2b` | hero-блоки, тёмные секции |
| Текст на тёмном | `text-white` | `#ffffff` | заголовок на тёмном |
| Текст на тёмном (body) | `text-white/80` | rgba(255,255,255,0.8) | абзацы на тёмном |
| Текст на тёмном (muted) | `text-white/60` | rgba(255,255,255,0.6) | минимум для AA контраста |
| **Граница / разделитель** | `border-slate-200` `border-slate-100` | | контейнеры, карточки |
| Поверхность фон | `bg-slate-50` `bg-surface` | `#f7f8fb` | вторичные блоки |
| Успех | `text-green-600` `bg-green-50` | | подтверждения, "✓" |
| Ошибка | `text-red-600` `bg-red-50` | | валидация |

### ❌ Запрещено

- `text-white/35`, `text-white/40`, `text-white/45` — **FAIL WCAG AA** (контраст < 4.5:1).
- `text-slate-400`, `text-slate-300` на белом фоне — слишком слабо.
- Текст на градиенте без overlay — нечитаемо.

### Контраст: WCAG 2.1 AA (минимум для прода)

- **Обычный текст: ≥ 4.5:1**
- **Крупный (18px+ или 14px+ bold): ≥ 3:1**
- Декоративные элементы (разделители `·`, иконки, рамки): не считаются.

Проверка: https://webaim.org/resources/contrastchecker/ или DevTools → Color picker.

---

## 2. Типографика — шкала

| Уровень | Mobile | Desktop | Класс | Применение |
|---|---|---|---|---|
| **H1** | `34px` | `54px` | `text-[34px] md:text-[54px] font-bold leading-[1.05] tracking-[-0.03em]` | Hero главная |
| H1 LP | `28px` | `42px` | `text-[28px] md:text-[42px] font-bold leading-[1.1] tracking-[-0.02em]` | LandingHero |
| **H2** | `22px` | `28px` | `text-[22px] md:text-[28px] font-bold leading-[1.15] tracking-[-0.02em]` | секции |
| H3 | `18px` | `22px` | `text-[18px] md:text-[22px] font-semibold leading-[1.2]` | подсекции, карточки |
| **Body** | `16px` | `16px` | `text-[16px] leading-[1.65]` | основной текст |
| Body large | `17px` | `18px` | `text-[17px] md:text-[18px] leading-[1.65]` | hero-сабтайтлы |
| Caption | `14px` | `14px` | `text-[14px] leading-[1.5]` | мета, подписи |
| Label | `13px` | `13px` | `text-[13px] font-semibold uppercase tracking-[0.06em]` | метки, заголовки чипов |
| Micro | `12px` | `12px` | `text-[12px] leading-[1.4]` | копирайт, дисклеймеры (только!) |

### ⛔ Минимальный шрифт

- **Body на мобилке: 16px минимум** (иначе Safari делает auto-zoom на input).
- **Меньше 14px только для:** copyright, легальный мелкий текст, badges.
- **`text-xs` (12px) запрещено в body** — только в мелких элементах.

### Жирность

- 400 (regular) — body
- 500 (medium) — кнопки, ссылки внутри текста
- 600 (semibold) — H3, метки, акценты
- 700 (bold) — H1, H2

---

## 3. Spacing (отступы)

Базовая единица — **4px**. Tailwind: `gap-1` = 4px, `gap-2` = 8px, `gap-3` = 12px, `gap-4` = 16px и т.д.

| Контекст | Mobile | Desktop |
|---|---|---|
| Секция (паддинг сверху-снизу) | `py-10` (40px) | `py-16` md (64px) |
| Между секциями | `mt-12` (48px) | `mt-20` (80px) |
| Внутри карточки | `p-4` (16px) | `p-6` (24px) |
| Между карточками | `gap-3` (12px) | `gap-4` (16px) |
| Между параграфами | `mt-3` (12px) | `mt-4` (16px) |
| Container max-width | `max-w-[1312px] px-4` | то же |
| Текстовый блок max-width | `max-w-[720px]` | (для читаемости — 60–80 символов в строке) |

---

## 4. Радиусы (border-radius)

| Размер | Класс | Применение |
|---|---|---|
| Small | `rounded-[8px]` | бейджи, маленькие чипы |
| Medium | `rounded-[12px]` | мелкие кнопки, инпуты |
| **Default** | `rounded-[14px]` | карточки, FAQ-айтемы, обычные кнопки |
| Large | `rounded-[20px]` | большие карточки, модалы |
| XL | `rounded-[24px]` | hero-блоки, главные секции |
| Full | `rounded-full` | бейджи возраста, pill-кнопки, аватары |

---

## 5. Тени (shadows)

| Класс | Применение |
|---|---|
| `shadow-[0_2px_8px_rgba(15,23,42,0.04)]` | мягкая, hover на ссылках |
| `shadow-[0_4px_16px_rgba(15,23,42,0.06)]` | карточки в спокойном состоянии |
| `shadow-[0_8px_24px_rgba(15,23,42,0.08)]` | приподнятые карточки, модалы |
| `shadow-[0_4px_16px_rgba(249,115,22,0.35)]` | hover на оранжевой кнопке |

**Правило:** не использовать `shadow-md`, `shadow-lg` Tailwind по умолчанию — они слишком серые. Только перечисленные.

---

## 6. Кнопки (стандартизованные)

### Primary CTA
```html
<button class="rounded-[14px] bg-primary text-[#1e2430] px-6 py-3.5 text-[15px] font-semibold transition-all duration-200 hover:shadow-[0_4px_16px_rgba(249,115,22,0.35)] hover:-translate-y-[1px] active:translate-y-0">
  Записаться
</button>
```

### Secondary
```html
<button class="rounded-[14px] border border-slate-200 bg-white text-slate-700 px-6 py-3 text-[14px] font-medium hover:border-orange-400 hover:text-orange-600 transition-colors">
  Подробнее
</button>
```

### Tertiary (link-style)
```html
<a class="text-orange-600 underline underline-offset-2 hover:text-orange-700">Ссылка</a>
```

### Размеры
- **Mobile primary** (CTA в hero): `py-3.5 text-[15px]` минимум
- **Touch target**: `min-h-[44px]` (`@media (pointer: coarse)` уже навешивает в global.css)
- **Никогда** не делать кнопку меньше 44×44px — WCAG 2.5.5.

---

## 7. Карточки

### Стандарт (белая на сером фоне)
```html
<div class="rounded-[14px] border border-slate-100 bg-white p-4 md:p-6">
  <h3 class="text-[18px] font-semibold text-slate-900">Заголовок</h3>
  <p class="mt-2 text-[16px] leading-[1.65] text-slate-600">Описание...</p>
</div>
```

### На тёмном фоне (hero, dark sections)
```html
<div class="rounded-[14px] bg-white/8 border border-white/10 p-4 backdrop-blur">
  <h3 class="text-[18px] font-semibold text-white">Заголовок</h3>
  <p class="mt-2 text-[16px] leading-[1.65] text-white/80">Описание...</p>
</div>
```

---

## 8. Иконки

- **Только Bootstrap Icons** через `<i class="bi bi-*">`. Никаких эмодзи.
- Размер: `text-[14px]` для inline, `text-[20px]–[24px]` для card heroes.
- Цвет: `text-orange-500` для акцента, `text-slate-400`–`text-slate-500` для нейтральных.
- Иконки в манифесте: `src/data/icons-manifest.json` → `npm run icons` если добавляешь новую.

---

## 9. Ссылки в тексте (FAQ, статьи)

Внутри prose-блоков:
```html
<a class="text-orange-600 underline underline-offset-2 hover:text-orange-700">Текст</a>
```

Или на родительский контейнер:
```html
<div class="[&_a]:text-orange-600 [&_a]:underline [&_a:hover]:text-orange-700">
  ...
</div>
```

### Контактные ссылки — обязательно правильные href

| Тип | href |
|---|---|
| Телефон | `href="tel:+74951284429"` или `tel:+79688086455` |
| Email | `href="mailto:hello@codims.ru"` |
| WhatsApp | `href="https://wa.me/79688086455" target="_blank" rel="noopener"` |
| Telegram | `href="https://t.me/Progaschool" target="_blank" rel="noopener"` |

Используй константы из `src/data/contacts.ts`: `PHONE_MAIN_HREF`, `EMAIL_HREF`, `WHATSAPP_URL`, `TELEGRAM_URL`.

---

## 10. Анимации

- Длительность: `duration-200` (быстрые), `duration-300` (плавные).
- Easing: `ease-out` для входа, `ease-in-out` для toggle.
- Hover-подъём: `hover:-translate-y-[1px]` (только для кнопок и кликабельных карточек).
- Никаких `animate-bounce`, `animate-pulse` без причины — отвлекает.

---

## 11. Hero-блоки (анимированные эффекты)

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
| `glass-orbs` | информационные страницы (legal, privacy, политика возврата) |
| `fireflies` | питание, тёплые блоки |
| `cosmic` | отзывы |
| `star-genesis` | лето 2026 |

Конфиг: `src/components/LandingHero.astro` → `_HERO_BG_BY_SLUG`.
Реализация эффектов: `src/styles/global.css` блок `[data-hero-bg="..."]` с `@media (max-width: 768px)` fallback.

---

## 12. Чек-лист перед добавлением нового компонента

- [ ] Использую токены из `@theme`, не хардкодю цвета (например, `var(--color-primary)`).
- [ ] Все интерактивные элементы — минимум 44×44px на мобилке (`min-h-[44px]`).
- [ ] Body-текст ≥ 16px на мобилке. Меньше — только для caption/badge/disclaimer.
- [ ] Контраст ≥ 4.5:1 для обычного текста (проверить webaim).
- [ ] Кнопки с `hover:` и `active:` состояниями.
- [ ] Иконки только Bootstrap Icons, в манифесте.
- [ ] Ссылки на контакты — правильный `href` (`tel:`, `mailto:`, `wa.me`, `t.me`).
- [ ] Заголовки — иерархия H1 → H2 → H3 (не скакать через уровень).
- [ ] Mobile-first: сначала пишу мобильные классы, потом `md:`.
- [ ] Если фон тёмный — текст `text-white/60` минимум.
- [ ] Если есть фото в качестве hero/bg — добавить gradient-overlay или dim, чтобы текст читался.

---

## 13. Запрещено категорически

- ❌ Эмодзи в UI (только в текстах статей при цитировании).
- ❌ `text-white/35` и ниже (FAIL AA).
- ❌ `text-xs` (12px) для body-текста.
- ❌ Inline-стили `style="color: ..."` — только классы Tailwind.
- ❌ Кастомный CSS без причины — добавлять в `src/styles/global.css` только если нет аналога в Tailwind.
- ❌ Picture без `width`/`height` атрибутов (вызывает CLS).
- ❌ `<details>/<summary>` для аккордеонов — ломается в WebView (Mail.ru, VK in-app). Используй `button[data-faq-toggle]` + JS.

---

## 14. Где брать готовые паттерны

- **Hero для лендинга:** `src/components/LandingHero.astro` → `<LandingHero h1=".." subtitle=".." breadcrumb=".." keywords={[...]} />`
- **Двухколоночный блок:** `src/components/LandingTwoCol.astro` → `<LandingTwoCol sections={sections} />`
- **FAQ:** `src/components/FAQ.astro` (10 категорий, JSON-LD автоматически)
- **Карточки смен:** `src/components/Shifts.astro`
- **CTA-бар:** `src/components/BookingBar.astro`

---

**Если сомневаешься — открой `src/components/Shifts.astro` или `src/components/FAQ.astro` и копируй паттерн. Они эталонны.**
