# Legacy Inventory v1-final

Date: 2026-04-05  
Owner: codex

## Active canonical path

- Hero: `hero_v3_simple` visual/interaction path.
- Booking: single-step (`age + phone + consent + submit`) as target runtime contour.
- Runtime invoke: `safeInvoke(...)` + `window.AC_FEATURES.*.create(...)`.
- Content loading: `loadBlock/loadBlocks` + fallback.

## Legacy branches (open)

1. Offer flow legacy/current dual layout (`offerLayout`, offer overlay render branches).
2. Booking stage 2/3/4 runtime and style branches in active desktop/mobile card.
3. Debug actions (`debug-booking-*`) still reachable in action-dispatcher.
4. Legacy booking/offer copy/state transitions still coupled in `main.js`.
5. Legacy CSS heavy zones for booking stages and mobile-preview overrides.

## Fallback chains (open)

1. Hero variant fallback meta in main runtime wrappers.
2. Telemetry + notify fallback branches in main runtime wrappers.
3. Offer state fallback routes in main and offer-flow helpers.
4. Content fallback is valid; duplicate fallback invocations still present in runtime hot-path.

## Debug-only paths in hot-path (open)

1. Debug control actions in action dispatcher.
2. Debug close action normalization in runtime close-button pass.
3. Debug stage forcing hooks in booking debug flow wiring.

## Public entrypoints snapshot

- Core:
  - `window.AC_FEATURES.actionDispatcher.createActionDispatcher(...)`
  - `window.AC_FEATURES.globalUiBindings.init(...)`
  - `window.AC_FEATURES.bookingRuntimeBridge.create(...)`
  - `window.AC_FEATURES.modularRuntime.create(...)`
  - `window.AC_FEATURES.contentAdapter.create(...)`
- Feature:
  - `heroAbFlow.create(...)`
  - `heroVariantFlow.create(...)`
  - `bookingRuntime.create(...)`
  - `calendarFlow.create(...)`
  - `offerFlow.create(...)`
  - `telemetryFlow.create(...)`

## Runtime events snapshot

- `state:sync`
- `hero:*`
- `booking:*`
- `calendar:*`
- `content:*`
- `tracking:*`

## Baseline guard counters

Source: `docs/quality/legacy-baseline.env`

- `LEGACY_MAIN_OFFER_STAGE_REFS=23`
- `LEGACY_MAIN_OFFER_LAYOUT_REFS=11`
- `LEGACY_MAIN_LEGACY_WORD_REFS=22`
- `LEGACY_MAIN_DEBUG_ACTION_REFS=4`
- `LEGACY_MAIN_INNERHTML_ASSIGNMENTS=25`
- `LEGACY_CSS_BOOKING_STAGE2_REFS=178`
- `LEGACY_CSS_BOOKING_STAGE3_REFS=117`
- `LEGACY_CSS_BOOKING_STAGE4_REFS=143`

## Batch removal map

1. Batch 2-4: remove booking/offer branching from `main.js` active-path.
2. Batch 5-6: remove calendar/modal and telemetry legacy duplicates.
3. Batch 7-8: remove runtime copy/fallback duplicates.
4. Batch 9-10: remove booking stage legacy CSS and hero legacy chains.
5. Batch 11-12: enforce gates + clean dead code + 3x acceptance runs.
