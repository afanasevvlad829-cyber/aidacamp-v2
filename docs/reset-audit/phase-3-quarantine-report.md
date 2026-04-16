# Stage A / Phase 3-4 Quarantine Report

Date: 2026-04-08 (Europe/Moscow)

## Executed Batches

## QG-01 — Legacy `.bak` quarantine
- Moved: 10 files
- From: `dist/index.html.bak*`
- To: `archive/non-runtime/quarantine/stage-a-dist-bak/`

## QG-02 — Orphan assets quarantine
- Moved: 18 files
- From: `dist/images/**`, `dist/icons/**`
- To: `archive/non-runtime/quarantine/stage-a-orphan-assets/`

## QG-03 — Inline fragment quarantine (non-destructive)
- Updated `dist/index.html` inline fallback blocks with guards:
  - `window.__AC_INLINE_RUNTIME_QUARANTINE_FAQ===true`
  - `window.__AC_INLINE_RUNTIME_QUARANTINE_SHIFTS===true`
- Enabled toggles in page runtime:
  - `window.__AC_INLINE_RUNTIME_QUARANTINE_FAQ=true`
  - `window.__AC_INLINE_RUNTIME_QUARANTINE_SHIFTS=true`
- Result: inline FAQ/Shift fallback scripts remain in file but are no-op.

## Rollback Point
- Archive:
  - `archive/non-runtime/quarantine/rollback/stage-a-qg01-qg02-20260408_071346.tar.gz`
- Pre-inline snapshot:
  - `archive/non-runtime/quarantine/rollback/dist.index.phase4.inline-before-20260408_071525.html`

## Validation (after quarantine)
1. `bash ./build.sh` -> PASS
2. `./tools/quality-check.sh` -> FAIL (existing `dist_*` baseline thresholds)
3. `node ./tools/smoke-booking-ui-playwright.mjs` -> PASS

## Observed Effects
- Runtime smoke remains green on desktop/mobile booking flow.
- No destructive delete applied.
- Quarantine is reversible via rollback artifacts.
