# Phase 1 — Active Path Map (Dist-Centric Consolidation)

Date: 2026-04-08 (Europe/Moscow)

## Canonical active path
1. `build.sh`
2. `dist/index.html` (runtime shell)
3. `src/styles/main.css` -> `dist/cdn/app.css` -> `/cdn/app.css`
4. `src/scripts/config/*.js` + `src/scripts/features/*.js` + `src/scripts/core/booking-runtime-bridge.js` + `src/scripts/main.js`
5. JS bundle output: `dist/cdn/app.bundle.js` -> `/cdn/app.bundle.js`
6. Mirror artifacts: `cdn/app.css`, `cdn/app.bundle.js`, `cdn/app.tilda.js`

## Active runtime files (fixed)
- `dist/index.html`
- `dist/cdn/app.css`
- `dist/cdn/app.bundle.js`
- `dist/cdn/app.tilda.js`
- `dist/legal.html`

## Active source inputs (fixed)
- `src/styles/main.css`
- `src/scripts/main.js`
- `src/scripts/features/**`
- `src/scripts/config/**`
- `src/scripts/core/booking-runtime-bridge.js`
- `src/pages/legal.html`

## Runtime asset roots (observed)
- `/images`
- `/icons`
- `/assets`
- `/cdn`
- `/_astro`
- `/legal#privacy`

## Generated-only zones
- `dist/cdn/*`
- `cdn/*`
- `dist/legal.html`
- `legal.html`
- `build/legal.html`

## Runtime shell zone
- `dist/index.html` is treated as canonical runtime shell for current architecture.
- Cleanup must preserve runtime contracts referenced from this shell.

## Quarantine zones
- `archive/non-runtime/quarantine/**`
- fragment-level quarantine targets listed in:
  - `docs/reset-audit/quarantine-candidates.md`
  - `docs/reset-audit/delete-manifest.md`

## Mirror zones
- `cdn/*` (GitHub/jsDelivr mirror artifacts)
- `dist/cdn/*` (primary generated runtime artifacts)

## Ambiguity removed
- Project is not documented as Astro-only in current state.
- Current reality: dist-centric runtime fed by source inputs from `src/**`.

## Phase-end validation
- `bash ./build.sh` -> PASS
- `node ./tools/smoke-booking-ui-playwright.mjs` -> PASS
- `./tools/quality-check.sh` -> FAIL (known dist line-length threshold)
- `./tools/quality-gate.sh` -> FAIL (known dist baseline mismatch)
