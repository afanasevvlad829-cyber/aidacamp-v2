# Project Map (Canonical)

## Source of truth
- `/index.html`
- `/src/scripts/**`
- `/src/styles/**`
- `/assets/**`
- `/docs/**`

## Runtime entrypoints (dev)
- HTML: `/index.html`
- Styles: `/src/styles/main.css`
- Scripts: `/src/scripts/main.js`

## Runtime scope guard
- В production build подключаются только:
  - `/src/styles/main.css` (и его `@import`)
  - `/src/scripts/main.js`
- Любые другие JS/CSS файлы вне этих entrypoint не считаются runtime, пока не подключены явно в `build.sh`.

## Build entrypoints
- `/build.sh` — единственный build pipeline
- `/deploy.sh` — единственный deploy pipeline

## Build output
- `/dist/index.html` — **canonical release artifact**, do not edit manually
- `/dist/legal.html` — canonical legal artifact (if `src/pages/legal.html` exists)
- `/legal.html`, `/build/legal.html` — generated mirrors, do not edit manually

## Archive / non-runtime
- `/archive/legacy/**` — старые backup/legacy scripts/html/css/js
- `/archive/non-runtime/**` — exports, snapshots, временные артефакты

## Rules
- Не редактировать `dist/index.html` вручную
- Не редактировать `dist/legal.html` / `legal.html` / `build/legal.html` вручную
- Не добавлять новые deploy/build скрипты вне `build.sh`/`deploy.sh`
- Весь runtime-код изменять только в `/index.html` и `/src/**`

## Runtime Architecture (Fixed)

### 1) Shell layer (layout + routing by sections)
- `hero/topbar/menu/view-mode` и sticky-summary — только каркас страницы.
- Навигация всегда через `data-nav="section-*"` и `id="section-*"` якоря.
- Shell не содержит бизнес-логики бронирования/контента.

### 2) Feature layer (isolated modules)
- `booking`:
  - source IDs: `desktop-booking-card`, `mobileBookingCard`
  - единый state/action pipeline, различается только view-конфиг.
- `content sections`:
  - about, journey, programs, photos, videos, reviews, faq, team, stay, contacts, legal.
  - данные рендерятся из `mediaContent` и локального state без дублирования логики.
- `overlay/modals`:
  - media viewer, section modal, booking modal.
  - отдельный слой UI-состояния, без изменения доменных данных.

### 3) Cross-cutting layer
- analytics/track, timers, viewport sync, scroll tracking, a11y helpers.
- не внедрять доменную логику в обработчики кликов напрямую.

## JS Structure Contract (`src/scripts/main.js`)

### Canonical module order (inside one file, до полной декомпозиции)
1. Config/constants (`BOOKING_VIEWS`, feature flags, selectors)
2. State normalization/init
3. Pure helpers (format/date/labels)
4. Booking actions + booking render
5. Content/media actions + render
6. View mode switchers (`desktop/mobile`, `full/compact`)
7. Event binding
8. Orchestrator (`renderAll`) + boot/init

### Required boundaries
- Любой render-функции передаётся view/config, а не raw-id строки.
- Любой click handler вызывает action-функцию, а не меняет DOM напрямую.
- Desktop/mobile рендеры должны быть fault-isolated: падение одной ветки не ломает вторую.

## CSS Structure Contract (`src/styles/main.css`)

### Cascade layers by blocks (logical, через комментарии и секции)
1. tokens (`:root`, variables)
2. base/reset/utilities
3. shell (`hero`, menu, topbar, layout)
4. booking (общие правила + desktop/mobile deltas)
5. sections (`section-*`)
6. overlays/modals
7. responsive overrides (`@media`)

### Naming and selector rules
- Source-of-truth IDs:
  - `#desktop-booking-card`
  - `#mobileBookingCard`
- Для мобильных отличий: модификаторы/контекстные классы, а не дублирующие ветки логики.
- Запрещены новые селекторы с legacy-вариантами ID (например, kebab/camel дубль одного блока).

## Render Pipeline Contract
- Единый порядок:
1. normalize state
2. render booking (all renderable views)
3. render content sections
4. render compact/mobile projections
5. sync hints/timers/summary bars
- `renderAll()` — единственная точка полной перерисовки.

## Known Current Risks (Based on current runtime)
- Высокая концентрация кода в одном JS/CSS entrypoint:
  - `src/scripts/main.js` ~6.8k lines
  - `src/styles/main.css` ~11.7k lines
- Регрессии чаще возникают на стыке desktop/mobile представлений и селекторной связности.

## Recommended Migration (No big-bang refactor)
1. Зафиксировать module boundaries и contracts (этот документ).
2. Дальше выносить код порциями в `src/scripts/modules/*` и `src/styles/blocks/*` через `@import`, без смены runtime entrypoint.
3. Для каждого этапа: parity-check desktop/mobile + smoke test stage1→stage4 booking.
