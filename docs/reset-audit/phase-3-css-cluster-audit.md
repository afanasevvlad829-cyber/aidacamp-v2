# Phase 3 — CSS Cluster Audit (Dist-Centric)

Date: 2026-04-08 (Europe/Moscow)
Scope: `src/styles/main.css` as active source input for `dist/cdn/app.css`
Policy: classify first, quarantine first, no blind delete

## Baseline for this phase
- `src/styles/main.css` lines: `13,349`
- `!important` count: `234`
- Estimated selector groups: `1,741`

## Domain signal counts (token-frequency scan)
- HERO: `406`
- BOOKING (booking/shift/calendar/stage): `3,841`
- HEADER/NAV: `113`
- CARDS/SECTIONS: `1,465`
- FORMS/MODALS: `464`
- UTILITIES/VARIABLES: `881`
- LEGACY/COMPAT/FALLBACK tokens: `559`

## Highest-risk clusters
1. Booking stage-legacy cluster (`booking-stage-two-legacy`, `booking-stage-three-legacy`, `booking-stage-four-legacy`)
- Very high selector density and coupling between desktop/mobile paths.
- Active in runtime, cannot be removed directly.

2. Offer-legacy styling cluster
- Dense nested selectors with stage-specific modifiers.
- Requires behavior proof before quarantine.

3. Compat/fallback style zones
- Includes explicit `legacy/compat/fallback` token surfaces.
- Must be split into explicit compat layer over time.

## Status classification (phase-3 audit)
- `ACTIVE REQUIRED`: booking core, hero phone dropdown, footer/contact layout glue.
- `COMPAT REQUIRED`: stage-legacy booking selectors still consumed by current runtime init.
- `CANDIDATE FOR QUARANTINE`: duplicated cosmetic legacy selectors not referenced by active stage classes (needs proof pass).
- `SAFE REMOVE AFTER PROOF`: only post-quarantine and runtime smoke confirmation.

## Quarantine-first candidates (wave P3-Q1)
- Candidate group A: booking visual duplicates that share identical declarations across stage-legacy branches.
- Candidate group B: duplicated mobile/desktop style fragments that are redundant under unified runtime class set.
- Candidate group C: non-critical legacy visual polish rules with no impact on hero/booking/footer/contact flows.

## Guardrails
- Do not remove selectors referenced by:
  - `#desktop-booking-card`
  - `#mobileBookingCard`
  - `.booking-stage-*-legacy`
  - hero dropdown and contact CTA elements
- Any uncertain selector remains `COMPAT REQUIRED` for this pass.
