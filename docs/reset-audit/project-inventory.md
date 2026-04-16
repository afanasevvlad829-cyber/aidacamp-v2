# Stage A / Phase 2 — Project Inventory (Active Surface)

Date: 2026-04-08 (Europe/Moscow)
Scope: current active surface only (runtime chain + build inputs + runtime assets + near-runtime artifacts).

## Classification Summary

| Status | Count |
|---|---:|
| ACTIVE | 72 |
| CONDITIONAL | 4 |
| LEGACY | 10 |
| ORPHAN | 18 |
| UNKNOWN | 0 |
| GENERATED | 9 |

## Rules Used

- `ACTIVE`: directly in active runtime/build path.
- `CONDITIONAL`: active only under feature flags / variant runtime logic.
- `LEGACY`: backup/manual legacy artifacts not in active chain.
- `ORPHAN`: file present in active-surface directories but not referenced by current `dist/index.html`.
- `GENERATED`: output produced by build pipeline.
- `UNKNOWN`: not mapped (none in this pass).

## Full Inventory (by file)

| File | Status | Rationale |
|---|---|---|
| `dist/index.html` | ACTIVE | runtime entry used by current active path |
| `src/styles/main.css` | ACTIVE | build/runtime source input |
| `src/pages/legal.html` | ACTIVE | build/runtime source input |
| `build.sh` | ACTIVE | build/runtime source input |
| `tools/quality-check.sh` | ACTIVE | build/runtime source input |
| `tools/quality-gate.sh` | ACTIVE | build/runtime source input |
| `src/scripts/config/booking-views-runtime.js` | ACTIVE | build/runtime source input |
| `src/scripts/config/docs-runtime-content.js` | ACTIVE | build/runtime source input |
| `src/scripts/config/hero-ab-runtime.js` | CONDITIONAL | feature-flag/variant controlled flow in active bundle |
| `src/scripts/config/hero-variant-runtime.js` | ACTIVE | build/runtime source input |
| `src/scripts/config/runtime-calendar-config.js` | ACTIVE | build/runtime source input |
| `src/scripts/config/runtime-observability-config.js` | ACTIVE | build/runtime source input |
| `src/scripts/config/runtime-policy-config.js` | ACTIVE | build/runtime source input |
| `src/scripts/config/runtime-quality-config.js` | ACTIVE | build/runtime source input |
| `src/scripts/config/runtime-storage-config.js` | ACTIVE | build/runtime source input |
| `src/scripts/config/runtime-ui-modes-config.js` | ACTIVE | build/runtime source input |
| `src/scripts/config/telemetry-runtime-config.js` | ACTIVE | build/runtime source input |
| `src/scripts/core/booking-runtime-bridge.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/action-dispatcher.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/analytics.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/audit.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/booking-calendar-runtime-flow.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/booking-hint-flow.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/booking-runtime.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/booking-view-flow.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/events.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/funnel.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/global-ui-bindings.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/guided-state-flow.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/hero-ab-flow.js` | CONDITIONAL | feature-flag/variant controlled flow in active bundle |
| `src/scripts/features/hero-background-flow.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/hero-v3-simple-flow.js` | CONDITIONAL | feature-flag/variant controlled flow in active bundle |
| `src/scripts/features/hero-variant-flow.js` | CONDITIONAL | feature-flag/variant controlled flow in active bundle |
| `src/scripts/features/menu.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/offer-flow.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/overlays.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/shift-options-flow.js` | ACTIVE | build/runtime source input |
| `src/scripts/features/toggle.js` | ACTIVE | build/runtime source input |
| `src/scripts/main.js` | ACTIVE | build/runtime source input |
| `dist/cdn/app.css` | GENERATED | produced by build pipeline |
| `dist/cdn/app.bundle.js` | GENERATED | produced by build pipeline |
| `dist/cdn/app.tilda.js` | GENERATED | produced by build pipeline |
| `cdn/app.css` | GENERATED | produced by build pipeline |
| `cdn/app.bundle.js` | GENERATED | produced by build pipeline |
| `cdn/app.tilda.js` | GENERATED | produced by build pipeline |
| `dist/legal.html` | GENERATED | produced by build pipeline |
| `legal.html` | GENERATED | produced by build pipeline |
| `build/legal.html` | GENERATED | produced by build pipeline |
| `dist/images/contacts/contacts-map-01.webp` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/gallery/IMG_7209.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/IMG_7212.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/IMG_7219.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/gallery-01.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/gallery-02.jpg` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/gallery/gallery-03.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/gallery-04.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/gallery-05.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/gallery-06.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/gallery-07.jpg` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/gallery/gallery-08.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/gallery-09.jpg` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/gallery/gallery-10.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/gallery-11.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/gallery/gallery-12.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/hero-custom-2026-04-07.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/reviews/review-01.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/reviews/review-02.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/reviews/review-03.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/reviews/review-04.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/reviews/review-05.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/reviews/review-06.jpg` | ACTIVE | referenced directly in runtime markup |
| `dist/images/shifts/shift-1-modal.avif` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/stay/stay-bathroom-01.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/stay/stay-bathroom-01.webp` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/stay/stay-lounge-01.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/stay/stay-lounge-01.webp` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/stay/stay-room-01.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/stay/stay-room-01.webp` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/team/team-alex-main-01.png` | ACTIVE | referenced directly in runtime markup |
| `dist/images/team/team-book-01.webp` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/team/team-book-main-01.webp` | ACTIVE | referenced directly in runtime markup |
| `dist/images/team/team-daria-01.webp` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/team/team-daria-main-01.png` | ACTIVE | referenced directly in runtime markup |
| `dist/images/team/team-daria-vorontsova-main-01.png` | ACTIVE | referenced directly in runtime markup |
| `dist/images/team/team-ivan-01.webp` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/team/team-nikita-main-01.png` | ACTIVE | referenced directly in runtime markup |
| `dist/images/team/team-olesya-01.webp` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/team/team-omar-main-01.png` | ACTIVE | referenced directly in runtime markup |
| `dist/images/videos/video-01.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/videos/video-01.jpg` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/videos/video-02.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/videos/video-02.jpg` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/videos/video-03.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/videos/video-03.jpg` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/videos/video-04.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/videos/video-04.jpg` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/images/videos/video-05.avif` | ACTIVE | referenced directly in runtime markup |
| `dist/images/videos/video-05.jpg` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/icons/faq/check.svg` | ORPHAN | asset present but not referenced in dist/index.html |
| `dist/icons/faq/food.svg` | ACTIVE | referenced directly in runtime markup |
| `dist/icons/faq/lock.svg` | ACTIVE | referenced directly in runtime markup |
| `dist/icons/faq/med.svg` | ACTIVE | referenced directly in runtime markup |
| `dist/icons/faq/phone-mobile.svg` | ACTIVE | referenced directly in runtime markup |
| `dist/index.html.bak.docs-object-1775594180` | LEGACY | manual backup artifact not in runtime chain |
| `dist/index.html.bak.faq-click-20260407_2320` | LEGACY | manual backup artifact not in runtime chain |
| `dist/index.html.bak.faq-fallback-20260407_2328` | LEGACY | manual backup artifact not in runtime chain |
| `dist/index.html.bak.faq-fallback-20260407_2332` | LEGACY | manual backup artifact not in runtime chain |
| `dist/index.html.bak.footer-ref-1775594374` | LEGACY | manual backup artifact not in runtime chain |
| `dist/index.html.bak.footer-width-1775594278` | LEGACY | manual backup artifact not in runtime chain |
| `dist/index.html.bak.shift-actions-lock-1775594700` | LEGACY | manual backup artifact not in runtime chain |
| `dist/index.html.bak.shift-booking-modal-1775594421` | LEGACY | manual backup artifact not in runtime chain |
| `dist/index.html.bak.shift-modal-clean-1775594474` | LEGACY | manual backup artifact not in runtime chain |
| `dist/index.html.bak.shifts-icons-booking-popup-1775594594` | LEGACY | manual backup artifact not in runtime chain |