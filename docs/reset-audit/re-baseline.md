# Phase 0 — Re-Baseline (Real Dist-Centric Architecture)

Date: 2026-04-08 (Europe/Moscow)

## Confirmed runtime model
- `dist/index.html` is canonical runtime shell in current pipeline.
- Runtime CSS artifact: `dist/cdn/app.css` (served as `/cdn/app.css`).
- Runtime JS artifact: `dist/cdn/app.bundle.js` (served as `/cdn/app.bundle.js`).
- `cdn/*` is mirror artifact layer of dist CDN outputs.

## Confirmed active source inputs
- `src/styles/main.css`
- `src/scripts/main.js`
- `src/scripts/features/**`
- `src/scripts/config/**`
- `src/scripts/core/booking-runtime-bridge.js`
- `src/pages/legal.html`

## Baseline metrics

| Metric | Value |
|---|---:|
| src CSS lines (`src/styles/main.css`) | 13,349 |
| src JS lines (`src/scripts/main.js`) | 2,662 |
| active JS lines (main+features+config+bridge) | 27,857 |
| `!important` count (active source CSS) | 234 |
| `dist/index.html` bytes | 177,440 |
| `dist/index.html` max line length | 108,835 |
| active asset roots in runtime shell | 6 |
| external URL refs in runtime shell | 34 |
| legacy-token matches in `dist/cdn/app.css` | 430 |
| compatibility layers in source JS (`*compat*.js`) | 2 |
| orphan candidates (`dist/images` + `dist/icons`) | 0 |

## Active asset roots seen in runtime shell
- `/_astro`
- `/assets`
- `/cdn`
- `/icons`
- `/images`
- `/legal#privacy`

## Validation baseline (phase-end)
- `bash ./build.sh` -> PASS
- `node ./tools/smoke-booking-ui-playwright.mjs` -> PASS
- `./tools/quality-check.sh` -> FAIL (`dist_max_line_length`)
- `./tools/quality-gate.sh` -> FAIL (`dist_bytes`, `dist_max_line_length` vs baseline)

## Baseline conclusion
- Runtime is stable and dist-centric.
- Gate failures are threshold/baseline alignment issues, not phase-0 regressions.
