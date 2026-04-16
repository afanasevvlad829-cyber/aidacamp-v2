# Phase 5 — Asset Normalization Plan

Date: 2026-04-08 (Europe/Moscow)

## Objective
Reduce multi-root ambiguity without breaking dist-centric runtime references.

## Current risks
- Dual artifact roots: `dist/cdn/*` and `cdn/*`.
- Mixed ownership between `/images`, `/icons`, `/assets`.

## Normalization policy (current wave)
1. Do not rewrite runtime shell asset paths blindly.
2. Keep `/images` and `/icons` as explicit runtime roots.
3. Keep `/cdn` as artifact-only runtime root.
4. Treat `cdn/*` as mirror-only publishing root.
5. Any consolidation is quarantine-first with 404 scan + smoke proof.

## Immediate safe action
- Document and enforce source/output ownership before path rewrites.
- Localize any remaining external runtime assets to local roots.

## Verified current ownership (runtime)
- Shell markup: `dist/index.html`
- Runtime CSS/JS artifacts: `dist/cdn/app.css`, `dist/cdn/app.bundle.js`, `dist/cdn/app.tilda.js`
- Mirror artifacts for publish: `cdn/app.css`, `cdn/app.bundle.js`, `cdn/app.tilda.js`
- Asset roots in active runtime refs: `/images`, `/icons`, `/assets`, `/cdn`

## Phase-5 status
- No destructive root merge executed yet.
- Policy locked: quarantine-first for any root consolidation.
- Runtime validation before/after remains stable (build PASS, smoke PASS).
