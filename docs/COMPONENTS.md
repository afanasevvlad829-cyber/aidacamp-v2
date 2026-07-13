# Карта компонентов и рекомендации по рефакторингу — АйДаКемп

> Сгенерировано 2026-06-26. Источник — прямой обход `src/components/`, `src/layouts/`, `src/partials/`, `src/scripts/`, `src/utils/`.
> Документ состоит из двух частей: **(A) каталог Astro-блоков** и **(B) рекомендации** (переиспользование, упрощение, найденные баги).
> Эталонные компоненты (по CLAUDE.md): `Shifts.astro`, `FAQ.astro`. Единый источник правды по UI — `DESIGN_SYSTEM.md`.

---

## 0. Сводка

- **~146 компонентов** всего (top-level `src/components/*.astro` — 74, остальное — подпапки `hero/`, `shifts/`, `timeline/`, `gallery/`, `corp/` и портал `smena/`).
- **Готовые утилиты уже есть, но игнорируются:** `src/scripts/scrollLock.ts`, `src/utils/phoneMask.ts` переписаны инлайн в 4–6 местах.
- **Самые тяжёлые дубли:** видео-кластер (karaoke + карусель), модалки (паттерн close ×22), калькуляторы вычета (формула ×3).
- **Найдено 3 дефекта корректности** (не косметика): `ReferenceError` в `HeroModals.astro`, мёртвая строка в `MomStory.astro`, запрещённая цифра вычета «5 434 ₽» в `HeroFeatures.astro`.
- **~200 строк чистого мёртвого кода** удаляются с риском ≈0.

---

# Часть A. Каталог компонентов

## 1. Герой / Лендинг (7)
| Компонент | Назначение | Ключевые props | Где используется |
|---|---|---|---|
| `hero/Hero.astro` | Hero главной + модалки | `imageSrc?`, `hasVariants?` | index, mincifry-v2, blocks, nexfield |
| `hero/Desktop.astro` | Desktop-версия hero | `imageSrc?`, `hasVariants?` | Hero, blocks |
| `hero/Mobile.astro` | Mobile-версия hero | `imageSrc?`, `hasVariants?` | Hero, Header |
| `hero/DesktopTrust.astro` | Hero с рейтингами (desktop) | `imageSrc?`, `hasVariants?` | hero-trust |
| `LandingHero.astro` | Hero лендингов с крошками + SEO | `h1`, `subtitle`, `breadcrumb`, `keywords[]`, `image?` | 50+ лендингов |
| `LandingTwoCol.astro` | Двухколоночная секция лендинга | `sections[]`, `priceFrom?`, `highlights?` | lager-7-let, scratch-lager |
| `lanit/TerminalCard.astro` | Card с терминал-эффектом | — | lanit/Hero |

## 2. Видео (5)
| Компонент | Назначение | Ключевые props | Где используется |
|---|---|---|---|
| `VideoPlayer.astro` | Плеер с превью, субтитрами, аналитикой | `src`, `caption?`, `cues?`, `goalName?`, `uid?` | MomStory, TimelinePost, демо |
| `Videos.astro` | Галерея видео | — | blocks, nexfield |
| `VideoGallery.astro` | Галерея для сложных лейаутов | `videos[]`, `baseUrl?` | tv |
| `VideoModal.astro` | Модалка просмотра видео | — | Videos |
| `DaryaVideoCarousel.astro` | Карусель видео Дарьи | `baseUrl?`, `heading?` | darya-videos |

## 3. Графики и статистика (4)
| Компонент | Назначение | Ключевые props | Где используется |
|---|---|---|---|
| `AnimatedStat.astro` | Большая цифра с анимацией 0→N | `value`, `unit?`, `label`, `tone?`, `size?` | stati/ (5+) |
| `AnimatedBarChart.astro` | Горизонтальные полосы с fill-анимацией | `items[]`, `title?`, `maxValue?` | stati/ (5+) |
| `DonutChart.astro` | Кольцевая диаграмма с % в центре | `percentage`, `label`, `color?`, `size?` | stati/ (5+) |
| `StatCallout.astro` | Статистика как callout-уведомление | `value`, `label`, `source`, `tone?` | stati/ (2+) |

## 4. Отзывы и доверие (4)
| Компонент | Назначение | Ключевые props | Где используется |
|---|---|---|---|
| `Reviews.astro` | Секция отзывов (рейтинг 5.0, Я.Карты, Incamp) | — | index, mincifry-v2, blocks |
| `DualRatingPill.astro` | Два рейтинга (Яндекс + Incamp) | `yandexRating?`, `incampRating?`, `variant?`, `size?` | DesktopTrust, blocks |
| `IncampBadge.astro` | Бейдж рейтинга incamp.ru | `rating?`, `reviews?`, `variant?`, `size?` | blocks |
| `TrustBlock.astro` | Блок доверия с логотипами | — | r, zapisatsya, index |

## 5. Калькуляторы и вычет (3)
| Компонент | Назначение | Ключевые props | Где используется |
|---|---|---|---|
| `TaxCalculator.astro` | Интерактивный калькулятор вычета 13% | `variant?`, `title?` | TaxWidget, LandingLayout, лендинги |
| `TaxWidget.astro` | Выезжающий виджет с калькулятором | `variant?` | SoftStart, LandingLayout |
| `BenefitCalculator.astro` | Калькулятор выгод (+ групповые скидки) | — | ceny |

## 6. Смены и бронирование (10)
| Компонент | Назначение | Ключевые props | Где используется |
|---|---|---|---|
| `Shifts.astro` | Главная секция со списком смен (эталон) | — | Hero |
| `shifts/ShiftCard.astro` | Карточка смены | `shift`, `variant` | Shifts, shift-cards-ab |
| `shifts/ShiftCardCombined.astro` | Карточка нескольких смен | `shifts[]`, `combinedDates`, `combinedDuration` | Shifts ⚠️ (импорт мёртв, см. B-9) |
| `shifts/ShiftRetroCard.astro` | Карточка архивной смены | `shift` | Shifts |
| `shifts/FortuneShiftCard.astro` | Карточка со спец-эффектом | `shiftId?` | Shifts |
| `shifts/ShiftBookModal.astro` | Модалка формы брони | — | Shifts, lager-7-let |
| `shifts/ShiftCalendarModal.astro` | Модалка-календарь смен | — | Shifts |
| `shifts/ShiftInfoModal.astro` | Модалка деталей смены | — | Shifts |
| `shifts/ShiftTimeline.astro` | Таймлайн дней смены | `durationDays?` | r, [id] |
| `shifts/ShortShiftsBlock.astro` | Блок коротких смен | `shifts[]` | Shifts ⚠️ (импорт мёртв, см. B-9) |

## 7. CTA и попапы (8)
| Компонент | Назначение | Ключевые props | Где используется |
|---|---|---|---|
| `AskCta.astro` | CTA «Задайте вопрос» | — | 20+ страниц |
| `BlogCTA.astro` | CTA для статей | `variant?` (default/addiction/summer/detox) | stati/ |
| `StickyCta.astro` | Фиксированный CTA при скролле | — | LandingLayout, index |
| `SummerCta.astro` | CTA для летних лагерей | — | blocks, nexfield |
| `HeroModals.astro` | Контейнер модалок hero | — | Hero, hero-bot |
| `FeatureModal.astro` | Модалка описания фичи (параметризуемая — образец) | `id`, `icon`, `title`, `whatIs`, `whyMatters` | HeroModals |
| `BookingInfoModal.astro` | Модалка инфо о брони | — | HeroModals |
| `ShiftModal.astro` | Модалка смены на лендинге | — | LandingHero, LandingLayout |

## 8. Навигация и служебное (7)
| Компонент | Назначение | Props | Где используется |
|---|---|---|---|
| `Header.astro` | Шапка | — | каждая страница |
| `Footer.astro` | Подвал | — | каждая страница |
| `MobileMenu.astro` | Бургер-меню | `items[]` | Header |
| `PhoneDropdown.astro` | Дропдаун телефонов | `variant` | Header |
| `BrandName.astro` | Логотип-брендинг | `variant?` | Header, Footer |
| `SiteSearch.astro` | Поиск по сайту | — | Base |
| `BackToTop.astro` | Кнопка «наверх» | — | Base |

## 9. SEO и schema (4)
| Компонент | Назначение | Ключевые props | Где используется |
|---|---|---|---|
| `CourseSchema.astro` | JSON-LD Course | `name`, `description`, `url`, `ageMin?`, `ageMax?` | 20+ лендингов |
| `FAQSchema.astro` | JSON-LD FAQPage | `items?[]` | LandingLayout, 15+ лендингов |
| `SchemaOrg.astro` | Organization/BreadcrumbList | — | nexfield, liquid |
| `SeoTextBlock.astro` | SEO-текстовый блок | — | blocks, nexfield |

## 10. Статьи и блог (4)
| Компонент | Назначение | Ключевые props | Где используется |
|---|---|---|---|
| `ArticleHero.astro` | Hero статьи (заголовок, дата, время чтения) | `title`, `date?`, `readTime?`, `daryaQuote?` | stati/ (20+) |
| `ArticleBottomCta.astro` | CTA в конце статьи (переиспользует `AskCta` — образец композиции) | `reviewQuotes?`, `bookingTitle?` | stati/ (10+) |
| `RelatedArticles.astro` | «Читать по теме» | `articles[]` | lager-7-let и др. |
| `RelatedPages.astro` | «Подберите лагерь по интересам» | `pages[]` | lager-7-let и др. |

## 11. Timeline / блог о смене (4)
`timeline/TimelineHero.astro` (`timeline`), `timeline/TimelineDay.astro` (`day`), `timeline/TimelineDayNav.astro` (`days[]`), `timeline/TimelinePost.astro` (`post`) — страницы смен `[slug].astro`.

## 12. Галерея (1)
`gallery/Lightbox.astro` — лайтбокс фото, `PortalLayout`.

## 13. Общий контент (19)
`About`, `Contacts`, `Economy`, `Gallery`, `GalleryPreview`, `Guarantees`, `Hackathon`, `HeroFeatures`, `Journey`, `Mentors`, `MomStory`, `NewsJazz`, `Philosophy`, `Slideshow`, `SoftStart`, `Stay`, `Team`, `TrevoznyjRoditel`, `ShiftOccupancy`. Преимущественно секции главной/демо-страниц (`blocks.astro`, `nexfield.astro`), props в основном отсутствуют.

## 14. Вспомогательное (9)
`AgeBar`, `CallTimeSelector` (`dark?`), `DotPatternBackground`, `DynamicPrices`, `ShiftLink` (`shiftId`, `title?`), `ReturnBanner`, `UploadQueueIndicator`, `FAQ` (эталон), `LastMinuteWidget`.

## 15. Корпоративные `corp/` (20, B2B → `mincifry-v2.astro`)
`CorpHero`, `CorpNav`, `CorpFooter`, `CorpVideo`, `CorpGallery`, `CorpWhy`, `CorpShifts`, `CorpHackathon`, `CorpTeam`, `CorpReviews`, `CorpFAQ`, `CorpPool`, `CorpContacts`, `CorpBot`, `CorpMap`, `CorpPricing`, `CorpTax`, `CorpTracks`, `CorpRefund`. Многие принимают `client` для персонализации.

## 16. Портал управления сменой `smena/` (40+)
- **Ядро:** `ToastInit`, `VoiceInput`, `MediaManager`, `MediaLightbox`, `UppyUploader`.
- **DEN (дневник):** `DenCard`, `DaySummary`, `ChecklistModal`.
- **ECONOMY:** `ActivitiesTable`, `PrizesTable`, `GivePrizeDialog`, `CustomPrizeDialog`, `ActivityDialog`, `EconomySettings`, `SummaryTab`.
- **ROOMS (расселение):** `RoomsTabs`, `InventoryStats`, `InventoryFloorPlan`, `InventoryModal`, `RasseleniePlan`, `RasselenieList`, `RasseleniKidPool`, `KidCardBody`, `AddKidModal`.

## 17. Под вопросом — неиспользуемые / в разработке (8)
`ExitIntentPopup` (закомментирован в Base), `ValidationModal`, `PortalUploader` (legacy → UppyUploader), `LeadForm` (только в демо/доке), а также SMENA-views в разработке: `ActivityView`, `DayView`, `MatrixView`, `NoShift`, `ShiftHeader`, `DupEventDialog`.

> ⚠️ Статус «не используется» требует подтверждения перед удалением — часть может подключаться динамически или через layout.

---

# Часть B. Рекомендации

Приоритет: сначала «бесплатные победы» и баги, затем дедупликация по убыванию импакта.

## 🟢 B-0. Бесплатные победы — утилиты уже существуют (S, риск L)
- **scroll-lock:** `src/scripts/scrollLock.ts` (`lockScroll`/`unlockScroll`) переписан инлайн в `TaxWidget.astro:123-131`, `HeroFeatures.astro:195-203`, `NewsJazz`, `SiteSearch`. В `Reviews.astro:173-174` — упрощённая копия без iOS-фикса (потенциальный баг скролла на iPhone). → заменить на импорт.
- **phoneMask:** `src/utils/phoneMask.ts` (`formatPhone`/`isPhoneValid`) корректно импортирован в `LastMinuteWidget.astro:146`, но переписан инлайн в `ExitIntentPopup.astro:110-122` (и в LeadForm/ShiftBookModal по grep). → заменить на импорт.

## 🔴 B-1. Дефекты корректности — исправлять отдельными задачами
1. **`HeroModals.astro:128` — `ReferenceError`.** `equipmentModal` используется в `if (equipCloseBtn && equipmentModal)`, но переменная не объявлена в скрипте → обработчики close для equipment/booking-reminder, вероятно, не навешиваются. Проверить и объявить переменную.
2. **`HeroFeatures.astro:168` — запрещённая цифра.** Захардкожено «от 2 800 до 5 434 ₽». `5 434 ₽` — прямо в банлисте CLAUDE.md. Должно браться из `getTaxDeduction()` / данных, не литералом.
3. **`MomStory.astro:386` — мёртвая строка.** Оборванное `modal?.querySelector(...)` без присваивания и `;` (остаток рефакторинга). Success-state показывается хрупким `querySelectorAll('p, input, label, button...')` + `forEach(hidden)` — обернуть форму в один контейнер и тоглить его.

## 🔴 B-2. Видео-кластер — самое тяжёлое дублирование (M–L, риск M)
- **Karaoke-субтитры** (VTT-парсер + RAF + пословная подсветка) написаны почти байт-в-байт: `VideoGallery.astro:279-340`, `VideoPlayer.astro:119-176`, частично `MomStory.astro`. → вынести `src/scripts/karaoke.ts` (`parseVTT(text)`, `createKaraokeRenderer(video, cuesEl, cues)`).
- **Dots-карусель** (IntersectionObserver + scrollTo-центрирование, пороги `[0.4,0.6,0.8]`): `VideoGallery.astro:388-423`, `DaryaVideoCarousel.astro:284-350`, частично `Shifts.astro:538-565` и `Reviews.astro:151-171`. → вынести `src/scripts/dotCarousel.ts` (`initDotCarousel(track, dots, opts)`). В репо уже лежит неиспользуемый `scripts/carousel-dots.ts`, который это и должен был решать.
- **Данные** `DaryaVideoCarousel.astro:17-53` — массив видео захардкожен инлайн, место — `src/data/videos.ts`.
- Делать поэтапно, начиная с karaoke; проверять iOS Safari.

## 🔴 B-3. Модалки — паттерн close скопирован в ~22 файла (M, риск L–M)
`modal.close()` + `if (e.target === modal) close()` + Escape повторён в VideoModal, FeatureModal, BookingInfoModal, ExitIntentPopup, HeroModals, LandingHero, TaxWidget, Reviews, Stay, Mentors, Team, About, Shifts, Gallery, NewsJazz, SiteSearch, corp/*, shifts/*…
- → `src/scripts/dialogModal.ts` → `bindDialog(modal, {onClose?})`. Образец параметризации уже есть — `FeatureModal.astro`.
- **Equipment-модалка задвоена целиком:** `HeroModals.astro:45-107` и `LandingHero.astro:138-189` — контент слово-в-слово, разнятся только `id`. → один `<EquipmentModal id=.../>`.

## 🔴 B-4. Калькуляторы вычета — формула продублирована ×3, затрагивает деньги (S–M, риск M)
Формула `13% × (price − 3800×days)`, лимит 110 000 ₽, `roundTo100` реализована независимо в `TaxCalculator.astro:203-252` и `BenefitCalculator.astro:184-236`, при том что в `dynamicPrices.ts:204` уже есть канонический `getTaxDeduction()`.
- **Нарушение single-source:** `RESIDENTIAL_PER_DAY = 3800` захардкожен в обоих скриптах вместо `EDU_RESID_PER_DAY` из `shifts.ts`. Изменят ставку в `shifts.ts` — калькуляторы молча останутся со старой.
- Также продублированы `parsePrice`/`parseDays` и маппинг `mainShifts → {id,label,price,days}`.
- → экспортировать константы вычета из `dynamicPrices.ts`, пробрасывать через `define:vars`; вынести `src/utils/shiftSelectOptions.ts`; рассмотреть общий `<ShiftSelect/>`.
- ⚠️ Любая правка денежной математики → прогнать `src/data/dynamicPrices.test.ts` и сверить суммы вычета из CLAUDE.md.

## 🟠 B-5. Анимация «считать при появлении» — один IO-скелет ×16 (M, риск L)
Идентичный каркас `IntersectionObserver → isIntersecting → анимация → unobserve` + `prefers-reduced-motion` в `DonutChart:103-117`, `AnimatedBarChart:97-112`, `AnimatedStat:101-116` (и ещё в Stay, About, Team, Mentors, Shifts, ShiftOccupancy). → `src/scripts/onInView.ts` → `onInView(selector, cb, {threshold})`; компоненты оставляют себе только tween-функцию.
> `DualRatingPill` и `ShiftOccupancy` — **НЕ дубли** (статичный pill и stateful-виджет), не трогать.

## 🟠 B-6. Toast со статистикой — почти идентичен (M, риск M)
`Shifts.astro:303-332` (`showShiftToast`) и `AgeBar.astro:214-241` (`showAgeToast`) — тот же скелет (reset баров → slide-in → double-rAF анимация высот → auto-dismiss), различия только в данных. → общий `showStatToast(el, {pct, bars, heights, accentIdx, dismissMs})`.

## 🟡 B-7. Сетка иконочных бейджей — лёгкий дубль (S, риск L, опционально)
`TrustBlock.astro` и `Guarantees.astro` — почти одинаковый паттерн `{icon,color,title,text}[] → grid → карточка с круглым бейджем`. → опциональный `<IconBadgeGrid items columns as>`. Низкий приоритет.

---

# Часть C. Мёртвый код и упрощение крупных компонентов

## 🔴 C-1. Мёртвый код — удалять безопасно (~200 строк, риск ≈0)
| # | Файл / строки | Что | Действие |
|---|---|---|---|
| 1 | `Shifts.astro:350-398` | блок «MOBILE CAROUSEL TABS» — разметки `[data-shifts-carousel]` нет нигде (переехало на marquee) | удалить |
| 2 | `Shifts.astro:118-121, 690-706` | стаб `closed-shift-panel` + no-op `initClosedShift` | удалить |
| 3 | `Shifts.astro:6-7` | мёртвые импорты `ShiftCardCombined`, `ShortShiftsBlock` (нигде не рендерятся) | убрать импорты, рассмотреть удаление файлов |
| 4 | `StickyCta.astro:59-108, 181` | legacy-бар `#sticky-bar-legacy` + `#sticky-bubble` (DISABLED) + мёртвая `bubble` | удалить |
| 5 | `src/scripts/` | `nudge.ts`, `dead-clicks.ts`, `age-adapt.ts`, `carousel.ts`, `carousel-dots.ts`, `animateOnScroll.ts`, `tabs.ts` — 0 импортёров | проверить и удалить 7 файлов |

## 🟡 C-2. Слишком крупные / смешанные (вынос логики из инлайн-скриптов)
- **`Shifts.astro` (706 строк, эталонный по CLAUDE.md)** — 6 независимых `<script>` в одном файле (fortune-wheel, shift-toast+modals, marquee+drag+dots, viewed-scroll, returning-spots, closed-shift). → вынести в `src/scripts/shifts/*.ts` (папка частично есть). После C-1 файл и так худеет ~120 строк. **Эффект L, выгода H.**
- **`AgeBar.astro` (447)** — `_initAgeBar` ~230 строк в одном IIFE (toast, TTL, триггеры, MutationObserver-синк с ShiftModal). → `src/scripts/age-bar.ts`, тонкий инициализатор. Заметка: `awakenTimer = null` без типа.
- **`BenefitCalculator`/`TaxCalculator`** — см. B-4 (общий `taxMath`).

## ℹ️ Чисто (проверено)
- `console.log` в компонентах — не найдено.
- `src/_archive/` — только `demo/`, нигде не импортируется.
- `@deprecated`-поля в `RelatedPages.astro:19` и `lib/portalShift.ts:28` оставлены осознанно — не трогать без проверки вызовов.

---

# Дорожная карта (предлагаемый порядок)

| Этап | Задачи | Эффект | Риск |
|---|---|---|---|
| **1. Чистка** | C-1 (мёртвый код, ~200 строк) | H | ≈0 |
| **2. Баги** | B-1 (HeroModals ReferenceError, «5 434 ₽», MomStory) | H | L |
| **3. Бесплатные победы** | B-0 (scrollLock/phoneMask импорты) | M | L |
| **4. Деньги** | B-4 (константы вычета из единого источника) | H | M (тесты!) |
| **5. Дедуп** | B-3 (модалки) → B-2 (видео) → B-5 (IO-анимации) → B-6 (toast) | M–L | L–M |
| **6. Опционально** | B-7, C-2 (вынос скриптов Shifts/AgeBar) | M | L |

> Каждый этап — отдельная ветка/PR. Работа по сайту — в изолированном Docker-контейнере (`./scripts/agent-docker.sh`), не локально (CLAUDE.md, Правило №1).
