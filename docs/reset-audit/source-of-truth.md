# Phase 1 — Source of Truth Declaration

Date: 2026-04-08 (Europe/Moscow)

## Runtime truth (current architecture)
- Canonical runtime shell: `dist/index.html`
- Runtime CSS artifact: `dist/cdn/app.css` (served via `/cdn/app.css`)
- Runtime JS artifact: `dist/cdn/app.bundle.js` (served via `/cdn/app.bundle.js`)

## Authoring truth (active inputs)
- CSS source input: `src/styles/main.css`
- JS source inputs:
  - `src/scripts/main.js`
  - `src/scripts/features/*.js`
  - `src/scripts/config/*.js`
  - `src/scripts/core/booking-runtime-bridge.js`
- legal content source input: `src/pages/legal.html`

## Asset truth (current)
- Runtime markup consumes `/images/**` and `/icons/**`.
- Build pipeline also maintains `/assets/**` mirror flows into CDN artifact space.

## Generated-only declaration
Treat as generated/mirror artifacts (no manual business edits):
- `dist/cdn/*`
- `cdn/*`
- `dist/legal.html`
- `legal.html`
- `build/legal.html`

## Runtime-shell discipline for current phase set
- `dist/index.html` is canonical runtime shell and part of active path.
- Any cleanup touching shell markup/scripts must be quarantine-first with rollback.

## Winner / loser for current state
- Winner: dist-centric runtime path (`dist/index.html` + `/cdn/app.css` + `/cdn/app.bundle.js`)
- Loser: assumptions about Astro-only runtime in current pass

## Future simplification note
- Migration to stricter Astro/Tailwind ownership is possible only after dist-centric active-surface reduction is completed safely.
