# Active Path Map (Stage A / Phase 0-1)

Date: 2026-04-08 (Europe/Moscow)
Mode: local-only

## Phase 0 — Freeze baseline

### Command baseline
1. `bash ./build.sh` -> PASS
2. `./tools/quality-check.sh` -> FAIL
3. `node ./tools/smoke-booking-ui-playwright.mjs` -> PASS
4. Visual baseline -> NOT RUN (no standalone local visual command detected in this repo snapshot)

### Baseline details
- Build output refresh succeeded:
  - `dist/index.html`
  - `dist/cdn/app.bundle.js`
  - `dist/cdn/app.css`
  - `dist/cdn/app.tilda.js`
  - `cdn/app.bundle.js`
  - `cdn/app.css`
  - `cdn/app.tilda.js`
- `quality-gate` fails on dist thresholds:
  - `dist_max_line_length=117808 > 1100`
  - `dist_bytes=185027 > baseline`
- UI smoke script now passes on both desktop and mobile checks.

## Phase 1 — Re-discover active path

## 1) Active page entry
- Active runtime entry file: `dist/index.html`
- Evidence:
  - `build.sh` hard-checks presence of `dist/index.html` and exits if missing.
  - `build.sh` injects runtime links into `dist/index.html` (`ac-build-main-css`, `ac-build-main-js`).

## 2) Active layout/template chain
- Current chain:
  1. `dist/index.html` (runtime shell + markup)
  2. build-time injection by `build.sh`
  3. runtime behavior from generated JS bundle (`/cdn/app.bundle.js`)
- `src/components/*.html` is metadata for build manifest (`ac-build-components`), not direct runtime template rendering.
- `src/pages/legal.html` is active only for legal mirrors (`dist/legal.html`, `legal.html`, `build/legal.html`).

## 3) Active CSS
- Runtime CSS entry: `/cdn/app.css`
- Source feeder: `src/styles/main.css` (single monolith, no active `@import` chain in current snapshot)
- Build writes CSS artifacts to:
  - `dist/cdn/app.css`
  - `cdn/app.css`

## 4) Active JS
- Runtime JS entry: `/cdn/app.bundle.js`
- Build source chain (existing files actually included):
  - `src/scripts/config/*.js` (11 files)
  - `src/scripts/core/booking-runtime-bridge.js`
  - `src/scripts/features/*.js` (20 files)
  - `src/scripts/main.js`
- Total active JS source files included by build in current snapshot: 33.

## 5) Active asset roots
- Runtime asset roots observed in `dist/index.html`:
  - `/images` (dominant)
  - `/icons`
  - `/cdn` (bundles)
- Build sync source for `/assets/**` into CDN mirrors is active in `build.sh` (`dist/cdn/assets` and `cdn/assets`).

## 6) Active path summary
- Runtime path actually serving UI right now:
  - `dist/index.html` -> `/cdn/app.css` + `/cdn/app.bundle.js` -> assets from `/images`, `/icons`, and CDN-synced `/cdn/assets`.
- This is the cleanup target surface for Stage A.

## Stage A status update (after Phase 5 delete batch)

Date: 2026-04-08 (Europe/Moscow)

- Inline fallback fragments for FAQ/Shifts removed from `dist/index.html` after quarantine validation.
- Batch runner report:
  - `docs/reset-audit/batch-runs/stage-a-batch-phase5-delete-inline-full-20260408_072805.md`
- Validation snapshot:
  - `build` -> PASS
  - `smoke` -> PASS
  - `quality-check` / `quality-gate` -> FAIL (known dist baseline thresholds)

Current active-path runtime status:
- `smoke=PASS`
- Duplicate-event regression for FAQ/Shifts: not detected.
