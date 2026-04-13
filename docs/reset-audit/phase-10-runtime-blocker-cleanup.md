# Stage A / Runtime Blocker Cleanup (TDZ chain)

Date: 2026-04-08 (Europe/Moscow)
Mode: local-only

## What was checked
1. Local runtime pageerrors on `dist/index.html` with feature flags (`FF_MODULAR_RUNTIME=1`, booking/hero/calendar modular).
2. Build + smoke + quality gate after each fix iteration.

## What was found
- A chain of init-order errors in `src/scripts/main.js`:
  - `bookingRuntimeBridgeApi before initialization`
  - `clearShiftOptionPanels before initialization`
  - `showHint before initialization`
  - `formatVariantHint before initialization`
  - `startTimer before initialization`
  - unresolved helper refs (`syncModularState`, `splitPrimaryActionText`, `uiBookingHintTemplate`)
- Current runtime JS errors are cleared on local page load; only asset 404 remain.

## What was changed
- File: `src/scripts/main.js`
- Added safe function wrappers/fallbacks to remove TDZ on alias usage and keep behavior stable.
- Added safe fallback helpers for missing references:
  - `splitPrimaryActionText`
  - `uiBookingHintTemplate`
- Rollback snapshot created:
  - `archive/non-runtime/quarantine/rollback/main.js.bak.1775624272`

## Validation
- `bash ./build.sh` -> PASS
- `node ./tools/smoke-booking-ui-playwright.mjs` -> PASS
- Local pageerrors check (`http://127.0.0.1:4182/index.html?...`) -> no runtime JS error after fixes
- Added local runtime server `tools/local-runtime-server.mjs` (serves `dist` + `assets` + icon compatibility fallback)
- Local runtime check via this server -> no JS errors and no 4xx asset responses.
- `./tools/quality-check.sh` -> FAIL (known dist thresholds)

## Next minimal step
- Resolve asset-path mismatch for local serving mode (without editing `dist` manually), then rerun pageerror check and Stage A gate.
