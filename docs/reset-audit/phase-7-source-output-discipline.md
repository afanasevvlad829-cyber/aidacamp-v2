# Phase 7 — Source vs Output Discipline (Dist-Centric)

Date: 2026-04-08 (Europe/Moscow)

## Current discipline contract

### Source inputs (editable)
- `src/styles/main.css`
- `src/scripts/main.js`
- `src/scripts/features/**`
- `src/scripts/config/**`
- `src/scripts/core/booking-runtime-bridge.js`
- `src/pages/legal.html`
- build orchestration: `build.sh`

### Runtime shell (canonical in current architecture)
- `dist/index.html`

### Generated artifacts
- `dist/cdn/app.css`
- `dist/cdn/app.bundle.js`
- `dist/cdn/app.tilda.js`
- `dist/legal.html`
- `legal.html`
- `build/legal.html`

### Mirror artifacts
- `cdn/app.css`
- `cdn/app.bundle.js`
- `cdn/app.tilda.js`

## Rules
1. Functional/style logic changes go to source inputs first.
2. Build must regenerate runtime/mirror artifacts.
3. `dist/index.html` cleanup is allowed only with quarantine-first + rollback.
4. Mirror layer (`cdn/*`) is not a second source-of-truth.

## Guard intent
- Prevent manual drift between source and generated layers.
- Keep dist-centric runtime stable while reducing legacy surface.

## Build proof (implementation-level)
Verified in `build.sh`:
1. CSS bundle is rebuilt from `src/styles/main.css` (with `@import` expansion).
2. JS bundle is rebuilt from ordered `src/scripts/config/**`, `src/scripts/core/**`, `src/scripts/features/*.js`, `src/scripts/main.js`.
3. Runtime shell policy is explicit in build output:
   - `Canonical runtime source: dist/index.html (not rewritten unless AC_ALLOW_DIST_REWRITE=1)`.
4. Runtime artifacts are regenerated each run:
   - `dist/cdn/app.css`, `dist/cdn/app.bundle.js`, `dist/cdn/app.tilda.js`.
5. Mirror artifacts are regenerated each run:
   - `cdn/app.css`, `cdn/app.bundle.js`, `cdn/app.tilda.js`.

## Manual-edit policy (current phase)
1. `dist/index.html`:
   - allowed only for runtime-shell cleanup with rollback + quarantine-first proof.
2. `dist/cdn/*` and `cdn/*`:
   - no manual logic/style edits; these are generated artifacts.
3. business/style changes:
   - must be authored in `src/*` and propagated via `bash ./build.sh`.

## Validation evidence
- Rerun proof: `docs/reset-audit/phase-checks/phase-7-rerun-20260408_102946.md`
- build: PASS
- smoke: PASS
- quality-check/gate: known dist-threshold FAIL class only
