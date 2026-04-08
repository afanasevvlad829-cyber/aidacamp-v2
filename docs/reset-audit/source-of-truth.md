# Source of Truth Declaration (Stage A / Phase 1)

Date: 2026-04-08 (Europe/Moscow)

## Strict declaration for current snapshot

## 1) Runtime source-of-truth (current, pre-migration)
- Page runtime source-of-truth: `dist/index.html`
- Runtime style artifact: `dist/cdn/app.css` (served as `/cdn/app.css`)
- Runtime script artifact: `dist/cdn/app.bundle.js` (served as `/cdn/app.bundle.js`)

Reason: current `build.sh` enforces and rewrites `dist/index.html` and regenerates CDN bundles from `src/**`.

## 2) Authoring source-of-truth (code inputs feeding runtime)
- CSS authoring input: `src/styles/main.css`
- JS authoring input: `src/scripts/main.js` + `src/scripts/config/*.js` + `src/scripts/features/*.js` + `src/scripts/core/booking-runtime-bridge.js`
- Legal page authoring input: `src/pages/legal.html`

## 3) Asset source-of-truth (current)
- Primary media roots consumed by runtime: `/images/**`, `/icons/**`
- Build-time sync source for CDN mirrors: `/assets/**` -> `/dist/cdn/assets/**` and `/cdn/assets/**`

## 4) Generated-only declaration
Treat as generated/runtime artifacts, not manual-edit targets:
- `dist/index.html`
- `dist/cdn/app.css`
- `dist/cdn/app.bundle.js`
- `dist/cdn/app.tilda.js`
- `cdn/app.css`
- `cdn/app.bundle.js`
- `cdn/app.tilda.js`
- `legal.html`
- `build/legal.html`

## 5) Documentation drift found (must be fixed in later cleanup pass)
- `docs/project-map.md` declares `/index.html` as source-of-truth/runtime entry, but `/index.html` is absent in this repository.
- Effective runtime is `dist/index.html` controlled by `build.sh`.

## 6) Winner/loser statement (cleanup-first mode)
- Winner (current active path): `dist/index.html` + `/cdn/app.css` + `/cdn/app.bundle.js`
- Loser (not active in current local runtime): `/index.html` path contract from outdated docs

This declaration is temporary for Stage A cleanup.
Astro+Tailwind convergence is explicitly deferred until active-surface reduction is complete.
