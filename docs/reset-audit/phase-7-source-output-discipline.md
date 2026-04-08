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
